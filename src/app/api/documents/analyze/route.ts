import { NextRequest, NextResponse } from 'next/server';
import { checkApiLimit, getAuthUser, recordApiUsage } from '@/lib/api-limit';
import { extractTextFromFile } from '@/lib/document-engine/ocr';
import { extractStructuredJson } from '@/lib/document-engine/llm-extract';

export const runtime = 'nodejs';

const ALLOWED_CATEGORIES = ['Identidad', 'Vehiculo', 'Seguro', 'Hogar', 'Salud', 'Finanzas', 'Hipoteca', 'Suministro', 'Otros'];
const MAX_METADATA_FIELDS = 12;
const MIN_EXTRACTED_TEXT_LENGTH = 20;

type DocumentAnalysis = {
  title: string;
  category: string;
  expiration_date: string | null;
  issuer: string | null;
  summary: string;
  tags: string[];
  confidence: number;
  document_type: string | null;
  metadata: Record<string, string | number | boolean | null>;
  extracted_text_preview?: string;
};

function sanitizeText(value: string | null | undefined) {
  return value?.trim() || null;
}

function detectDates(text: string) {
  const matches = text.match(/\b(\d{2}[\/.-]\d{2}[\/.-]\d{4}|\d{4}[\/.-]\d{2}[\/.-]\d{2})\b/g) || [];
  return [...new Set(matches)].slice(0, 6);
}

function normalizeDate(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const slashMatch = trimmed.match(/^(\d{2})[\/.-](\d{2})[\/.-](\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${year}-${month}-${day}`;
  }
  return null;
}

function sanitizeMetadata(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {} as Record<string, string | number | boolean | null>;
  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>)
      .filter(([key, value]) => {
        const validType = ['string', 'number', 'boolean'].includes(typeof value) || value === null;
        return key.trim() && validType;
      })
      .slice(0, MAX_METADATA_FIELDS)
      .map(([key, value]) => [key.trim(), value as string | number | boolean | null])
  );
}

function inferDocumentType(category: string, lower: string) {
  if (category === 'Identidad') {
    if (/\bdni\b/.test(lower)) return 'DNI';
    if (/\bnie\b/.test(lower)) return 'NIE';
    if (/pasaporte/.test(lower)) return 'Pasaporte';
    if (/permiso de conducir|carnet/.test(lower)) return 'Carnet de conducir';
    return 'Documento de identidad';
  }
  if (category === 'Vehiculo') {
    if (/itv/.test(lower)) return 'ITV';
    if (/permiso de circulacion/.test(lower)) return 'Permiso de circulacion';
    if (/ficha tecnica/.test(lower)) return 'Ficha tecnica';
    return 'Documento de vehiculo';
  }
  if (category === 'Seguro') return /hogar/.test(lower) ? 'Seguro de hogar' : /salud/.test(lower) ? 'Seguro de salud' : /coche|vehiculo/.test(lower) ? 'Seguro de vehiculo' : 'Poliza';
  if (category === 'Salud') return /receta/.test(lower) ? 'Receta' : /analitica/.test(lower) ? 'Analitica' : /informe/.test(lower) ? 'Informe medico' : 'Documento de salud';
  if (category === 'Finanzas') return /factura/.test(lower) ? 'Factura' : /recibo/.test(lower) ? 'Recibo' : /nomina/.test(lower) ? 'Nomina' : 'Documento financiero';
  if (category === 'Hogar') return /contrato/.test(lower) ? 'Contrato' : /garantia/.test(lower) ? 'Garantia' : 'Documento de hogar';
  if (category === 'Suministro') {
    if (/electricidad|\bluz\b|kwh|endesa|iberdrola|naturgy/i.test(lower)) return 'Factura de electricidad';
    if (/\bagua\b|suministro.{0,10}agua/i.test(lower)) return 'Factura de agua';
    if (/\bgas\b|gas\s+natural|butano|propano/i.test(lower)) return 'Factura de gas';
    if (/internet|fibra|adsl|\bwifi\b/i.test(lower)) return 'Factura de internet';
    if (/m[oó]vil|tarifa\s+m[oó]vil|\bgb\b|\bsim\b/i.test(lower)) return 'Factura de móvil';
    if (/contrato/i.test(lower)) return 'Contrato de suministro';
    return 'Documento de suministro';
  }
  if (category === 'Hipoteca') {
    if (/escritura|notari/.test(lower)) return 'Escritura de hipoteca';
    if (/amortizaci[oó]n|cuadro/.test(lower)) return 'Cuadro de amortizacion';
    if (/saldo\s+pendiente|certif/.test(lower)) return 'Certificado de saldo pendiente';
    if (/novaci[oó]n|subrogaci[oó]n/.test(lower)) return 'Novacion hipotecaria';
    return 'Documento hipotecario';
  }
  return null;
}

function buildMetadataHints(category: string, extractedText: string) {
  const text = extractedText.replace(/\s+/g, ' ').trim();
  const lower = text.toLowerCase();
  const metadata: Record<string, string | number | boolean | null> = {};
  const dates = detectDates(text);

  if (category === 'Identidad') {
    const documentNumber = text.match(/\b\d{8}[A-Z]\b|\b[XYZ]\d{7}[A-Z]\b/i)?.[0] || null;
    const birthDate = normalizeDate(dates[0] || null);
    const expirationDate = normalizeDate(dates[dates.length - 1] || null);
    if (documentNumber) metadata.numero_documento = documentNumber.toUpperCase();
    if (birthDate) metadata.fecha_nacimiento = birthDate;
    if (expirationDate) metadata.fecha_validez = expirationDate;
    metadata.requiere_doble_cara = !/direccion|domicilio|equipo|sexo|valido hasta|soporte/.test(lower);
  }

  if (category === 'Vehiculo') {
    const plate = text.match(/\b\d{4}\s?[A-Z]{3}\b|\b[A-Z]{1,2}-\d{4}-[A-Z]{1,2}\b/i)?.[0] || null;
    const vin = text.match(/\b[A-HJ-NPR-Z0-9]{17}\b/)?.[0] || null;
    if (plate) metadata.matricula = plate.toUpperCase().replace(/\s+/g, ' ');
    if (vin) metadata.bastidor = vin;
    if (dates[0]) metadata.fecha_documento = normalizeDate(dates[0]);
  }

  if (category === 'Seguro') {
    const policy = text.match(/(?:poliza|p\u00f3liza)\s*[:#-]?\s*([A-Z0-9\-\/]+)/i)?.[1] || null;
    const phone = text.match(/\b(?:6|7|8|9)\d{8}\b/)?.[0] || null;
    // Detectar prima/coste anual y normalizar siempre a la clave 'prima'
    const priceMatch =
      text.match(/(?:prima|importe|coste|precio|recibo)\s*(?:anual|total)?\s*:?\s*([\d.,]+)\s*\u20ac/i) ||
      text.match(/\u20ac\s*([\d.,]+)\s*(?:al a\u00f1o|anuales?)/i) ||
      text.match(/\b([\d]{2,5}[.,]\d{2})\s*\u20ac/);
    const price = priceMatch?.[1] ?? null;
    if (policy) metadata.numero_poliza = policy;
    if (phone) metadata.telefono_asistencia = phone;
    // Normalizar a punto decimal y guardar como 'prima' (clave can\u00f3nica)
    if (price) metadata.prima = price.replace(/\./g, '').replace(',', '.');
  }

  if (category === 'Salud') {
    if (dates[0]) metadata.fecha_documento = normalizeDate(dates[0]);
    const patient = text.match(/paciente\s*:?\s*([A-Z\u00c1\u00c9\u00cd\u00d3\u00da\u00d1\s]{5,})/i)?.[1]?.trim() || null;
    if (patient) metadata.paciente = patient;
  }

  if (category === 'Finanzas') {
    const amount = text.match(/\b\d+[\.,]\d{2}\s?\u20ac\b|\b\u20ac\s?\d+[\.,]\d{2}\b/)?.[0] || null;
    const iban = text.match(/\bES\d{2}[A-Z0-9]{20}\b/i)?.[0] || null;
    if (amount) metadata.importe = amount.replace(/\s+/g, '');
    if (iban) metadata.iban = `${iban.slice(0, 6)}...${iban.slice(-4)}`;
  }

  if (category === 'Suministro') {
    const reference = text.match(/(?:referencia|n[u\u00fa]mero\s+de\s+contrato|contrato)\s*[:#-]?\s*([A-Z0-9][\w\-\/]{4,})/i)?.[1] || null;
    const cups = text.match(/\bES\d{16}[A-Z0-9]{0,4}\b/i)?.[0] || null;
    const monthly =
      text.match(/(?:importe|total|cuota|coste)\s*(?:mensual|a\s+pagar)?\s*:?\s*([\d.,]+)\s*\u20ac/i)?.[1] ||
      text.match(/\b(\d{1,4}[.,]\d{2})\s*\u20ac/)?.[1] || null;
    const tariff = text.match(/tarifa\s*:?\s*([^\n,]{3,30})/i)?.[1]?.trim() || null;
    const power =
      text.match(/potencia\s+(?:contratada|instalada|facturada)?\s*:?\s*([\d.,]+)\s*kW/i)?.[1] ||
      text.match(/(\d+[.,]\d+)\s*kW\b/i)?.[1] || null;
    if (reference) metadata.referencia_contrato = reference.toUpperCase();
    if (cups) metadata.cups = cups.toUpperCase();
    if (monthly) metadata.importe_mensual = monthly.replace(/\./g, '').replace(',', '.');
    if (tariff) metadata.tarifa = tariff;
    if (power) metadata.potencia_contratada = power.replace(',', '.');
    if (dates[0]) metadata.fecha_inicio = normalizeDate(dates[0]);
  }

  if (category === 'Hipoteca') {
    const loanNumber = text.match(/(?:pr[e\u00e9]stamo|hipoteca)[^A-Z0-9]{0,5}([A-Z0-9][\w\-\/]{4,})/i)?.[1] || null;
    const tin = text.match(/\bTIN\b\s*:?\s*(\d+[.,]\d+)\s*%/i)?.[1] || null;
    const tae = text.match(/\bTAE\b\s*:?\s*(\d+[.,]\d+)\s*%/i)?.[1] || null;
    const spread = text.match(/diferencial\s*:?\s*(\d+[.,]\d+)\s*%/i)?.[1] || null;
    const monthly = text.match(/cuota\s*(?:mensual)?\s*:?\s*([\d.,]+)\s*\u20ac/i)?.[1] || null;
    const capital = text.match(/capital\s*(?:inicial|concedido|prestado)?\s*:?\s*([\d.,]+)\s*\u20ac/i)?.[1] || null;
    const pending = text.match(/(?:capital|saldo|deuda)\s+pendiente\s*:?\s*([\d.,]+)\s*\u20ac/i)?.[1] || null;
    if (loanNumber) metadata.numero_prestamo = loanNumber.toUpperCase();
    if (tin) metadata.tin = tin.replace(',', '.');
    if (tae) metadata.tae = tae.replace(',', '.');
    if (spread) metadata.diferencial = spread.replace(',', '.');
    if (monthly) metadata.cuota_mensual = monthly;
    if (capital) metadata.capital_inicial = capital;
    if (pending) metadata.capital_pendiente = pending;
    if (dates[0]) metadata.fecha_inicio = normalizeDate(dates[0]);
    if (dates.length > 1) metadata.fecha_revision = normalizeDate(dates[dates.length - 1]);
    if (/euribor/i.test(lower)) metadata.indice_referencia = 'euribor';
    else if (/irph/i.test(lower)) metadata.indice_referencia = 'irph';
    if (/\bmixto\b|\bmixta\b/i.test(lower)) metadata.tipo_tasa = 'mixto';
    else if (/tipo\s+fijo|\btasa\s+fija\b|\bfijo\b/i.test(lower) && !/variable/i.test(lower)) metadata.tipo_tasa = 'fijo';
    else if (/variable|euribor|irph/i.test(lower)) metadata.tipo_tasa = 'variable';
  }

  return sanitizeMetadata(metadata);
}

function buildFallbackAnalysis(fileName: string, extractedText: string): DocumentAnalysis {
  const lower = `${fileName} ${extractedText}`.toLowerCase();

  let category = 'Otros';
  if (/(dni|pasaporte|nie|permiso de conducir|carnet)/.test(lower)) category = 'Identidad';
  else if (/(seguro|poliza|aseguradora)/.test(lower)) category = 'Seguro';
  else if (/(factura|iban|banco|recibo|nomina|impuesto)/.test(lower)) category = 'Finanzas';
  else if (/(salud|medico|clinica|hospital|receta|analitica)/.test(lower)) category = 'Salud';
  else if (/(coche|vehiculo|itv|matricula|circulacion|bastidor)/.test(lower)) category = 'Vehiculo';
  else if (/(hipoteca|euribor|prestamo|pr[eé]stamo|amortizaci[oó]n|\btin\b|\btae\b)/.test(lower)) category = 'Hipoteca';
  else if (/(electricidad|\bluz\b|kwh|endesa|iberdrola|\bagua\b|\bgas\b|gas\s+natural|internet|fibra|adsl|\bwifi\b|tarifa\s+m[oó]vil|telefon[ií]a\s+m[oó]vil|factura.*suministro)/.test(lower)) category = 'Suministro';
  else if (/(hogar|vivienda|alquiler|comunidad|garantia)/.test(lower)) category = 'Hogar';

  const rawTitle = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim();
  const title = rawTitle ? rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1) : 'Documento';
  const preview = extractedText.trim().slice(0, 240);
  const metadata = buildMetadataHints(category, extractedText);
  const documentType = inferDocumentType(category, lower);
  const expirationFromMetadata = typeof metadata.fecha_validez === 'string' ? normalizeDate(metadata.fecha_validez) : null;

  return {
    title,
    category,
    expiration_date: expirationFromMetadata,
    issuer: null,
    summary: preview ? `Texto detectado: ${preview}` : 'No se pudo resumir automaticamente el documento.',
    tags: documentType ? [category, documentType] : [category],
    confidence: extractedText.trim() ? 0.45 : 0.2,
    document_type: documentType,
    metadata,
    extracted_text_preview: extractedText.slice(0, 400),
  };
}

function normalizeAnalysis(data: any, fallback: DocumentAnalysis): DocumentAnalysis {
  const category = ALLOWED_CATEGORIES.includes(data?.category) ? data.category : fallback.category;
  const expiration = normalizeDate(data?.expiration_date) || fallback.expiration_date || null;
  const tags = Array.isArray(data?.tags)
    ? data.tags.filter((tag: unknown) => typeof tag === 'string').slice(0, 8)
    : fallback.tags;
  const confidence = typeof data?.confidence === 'number'
    ? Math.max(0, Math.min(1, data.confidence))
    : fallback.confidence;
  const metadata = { ...fallback.metadata, ...sanitizeMetadata(data?.metadata) };

  return {
    title: typeof data?.title === 'string' && data.title.trim() ? data.title.trim() : fallback.title,
    category,
    expiration_date: expiration,
    issuer: sanitizeText(data?.issuer) || fallback.issuer,
    summary: typeof data?.summary === 'string' && data.summary.trim() ? data.summary.trim() : fallback.summary,
    tags: tags.length > 0 ? tags : fallback.tags,
    confidence,
    document_type: sanitizeText(data?.document_type) || fallback.document_type,
    metadata,
    extracted_text_preview: fallback.extracted_text_preview,
  };
}

const DOCUMENT_ANALYSIS_SYSTEM_PROMPT = `Eres un clasificador documental preciso. Debes extraer metadatos utiles de documentos personales y del hogar. En el campo summary incluye los datos clave visibles de forma breve y util. Para documentos de identidad intenta mencionar nombre completo, numero de documento, fecha de nacimiento, fecha de validez y si falta la cara trasera. Para vehiculo intenta matricula, bastidor e ITV. Para seguros extrae: numero de poliza (clave 'numero_poliza'), cobertura (clave 'cobertura'), telefono de asistencia (clave 'telefono_asistencia') e importe o prima anual en euros (clave 'prima' — usa SIEMPRE esta clave, nunca prima_anual, importe, coste_anual ni precio_anual). Para salud intenta paciente, centro, fecha y tipo de informe. Para finanzas intenta emisor, importe, periodo e iban parcial. Para hipotecas extrae: entidad prestamista, numero de prestamo, capital inicial, capital pendiente, cuota mensual, TIN (%), TAE (%), diferencial (%), indice de referencia (euribor/irph/fijo), tipo (fijo/variable/mixto), fecha de inicio y fecha proxima revision del tipo; usa las claves: numero_prestamo, capital_inicial, capital_pendiente, cuota_mensual, tin, tae, diferencial, indice_referencia, tipo_tasa, fecha_inicio, fecha_revision. Para suministros (luz, agua, gas, internet, movil) extrae: referencia de contrato (clave 'referencia_contrato'), importe o cuota mensual en euros (clave 'importe_mensual' — usa SIEMPRE esta clave), tarifa contratada (clave 'tarifa'), potencia contratada en kW para electricidad (clave 'potencia_contratada'), CUPS si aparece (clave 'cups'), direccion de suministro (clave 'direccion_suministro') y numero de linea movil si aplica (clave 'numero_linea'). Responde solo JSON valido con este esquema exacto:
{
  "title": "string",
  "category": "Identidad|Vehiculo|Seguro|Hogar|Salud|Finanzas|Hipoteca|Suministro|Otros",
  "document_type": "string o null",
  "expiration_date": "YYYY-MM-DD o null",
  "issuer": "string o null",
  "summary": "string breve en espanol",
  "tags": ["tag1", "tag2"],
  "confidence": 0.0,
  "metadata": {"clave": "valor"}
}
Si un dato no esta claro, usa null o no lo pongas en metadata.`;

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const limitCheck = await checkApiLimit(user.id, user.email || null, 'document-analysis');
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: `Has alcanzado el limite mensual de ${limitCheck.limit} analisis. (${limitCheck.used}/${limitCheck.limit})`,
        },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No se ha enviado ningun archivo.' }, { status: 400 });
    }

    const fileName = file.name || 'documento';
    const fileType = file.type || '';
    const isPdf = fileType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf');
    const isImage = fileType.startsWith('image/');

    if (!isPdf && !isImage) {
      return NextResponse.json(
        { error: 'Solo se admiten PDF o imagenes para el analisis automatico.' },
        { status: 400 }
      );
    }

    const extractedText = await extractTextFromFile(file, fileName, fileType || (isPdf ? 'application/pdf' : 'image/jpeg'));

    if (!extractedText || extractedText.trim().length < MIN_EXTRACTED_TEXT_LENGTH) {
      return NextResponse.json(
        { error: 'No se pudo extraer suficiente texto del documento. Si es un PDF escaneado, prueba con mejor calidad o subelo como imagen.' },
        { status: 422 }
      );
    }

    const fallback = buildFallbackAnalysis(fileName, extractedText);
    let analysis = fallback;

    const userPrompt = `Nombre del archivo: ${fileName}\n\nTexto extraido:\n${extractedText.slice(0, 14000)}`;
    const { data: parsed, provider } = await extractStructuredJson(DOCUMENT_ANALYSIS_SYSTEM_PROMPT, userPrompt);
    if (parsed) {
      analysis = normalizeAnalysis(parsed, fallback);
    }

    await recordApiUsage(user.id, 'document-analysis');

    return NextResponse.json({
      analysis,
      source: isPdf ? 'pdf' : 'image',
      model: provider || 'fallback',
    });
  } catch (error: any) {
    console.error('[Document Analyze] Error:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
