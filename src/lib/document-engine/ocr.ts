// OCR compartido por el Motor Documental Universal.
// Primario: OCR.space. Fallback: Gemini Vision (cuando OCR.space falla o no devuelve texto util).

const MIN_TEXT_LENGTH = 10;

async function extractTextWithOcrSpace(fileLike: Blob, fileName: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', fileLike, fileName);
  formData.append('language', 'spa');
  formData.append('isOverlayRequired', 'false');
  formData.append('OCREngine', '2');
  formData.append('isCreateSearchablePdf', 'false');

  const response = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: { apikey: process.env.OCR_SPACE_API_KEY || 'helloworld' },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`OCR.space API error: ${await response.text()}`);
  }

  const data = await response.json();

  if (data?.IsErroredOnProcessing) {
    const details = Array.isArray(data?.ErrorMessage) ? data.ErrorMessage.join(' ') : data?.ErrorMessage;
    throw new Error(details || 'OCR.space no pudo procesar el archivo.');
  }

  const parsedText = Array.isArray(data?.ParsedResults)
    ? data.ParsedResults.map((item: any) => item?.ParsedText || '').join('\n')
    : '';

  return parsedText.trim();
}

async function extractTextWithGeminiVision(fileLike: Blob, mimeType: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY no configurada para el fallback de OCR.');

  const buffer = Buffer.from(await fileLike.arrayBuffer());
  const base64Data = buffer.toString('base64');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: 'Extrae todo el texto visible de este documento, tal cual aparece, sin resumir ni traducir.' },
              { inline_data: { mime_type: mimeType, data: base64Data } },
            ],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini OCR fallback error: ${await response.text()}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return text.trim();
}

export async function extractTextFromFile(fileLike: Blob, fileName: string, mimeType: string): Promise<string> {
  try {
    const text = await extractTextWithOcrSpace(fileLike, fileName);
    if (text.length >= MIN_TEXT_LENGTH) return text;
  } catch (error) {
    console.error('[document-engine/ocr] OCR.space failed, trying Gemini fallback:', error);
  }

  return extractTextWithGeminiVision(fileLike, mimeType);
}
