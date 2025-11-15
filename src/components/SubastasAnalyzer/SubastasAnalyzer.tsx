'use client';

import React, { useState } from 'react';
import styles from './SubastasAnalyzer.module.css';

interface Analysis {
  inmueble?: {
    tipo: string;
    ubicacion: string;
    superficie: string;
    dormitorios: number;
    baños: number;
    año_construccion: string;
    descripcion: string;
  };
  cargas?: {
    ibi: string;
    comunidad: string;
    hipoteca: string;
    embargos: string;
    otros: string;
  };
  riesgos?: string[];
  oportunidades?: string[];
  presupuesto?: {
    precio_puja: string;
    itp: string;
    cargas_preferentes: string;
    reformas: string;
    gastos: string;
    total: string;
  };
  rentabilidad?: {
    valor_mercado: string;
    valor_post_reforma: string;
    beneficio_potencial: string;
    roi: string;
  };
  recomendacion?: {
    puja_maxima: string;
    viabilidad: string;
    explicacion: string;
  };
  text?: string;
}

export default function SubastasAnalyzer() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles.filter((f) => f.type === 'application/pdf')]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    if (files.length === 0) {
      setError('Por favor selecciona un archivo PDF.');
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const formData = new FormData();
      formData.append('file', files[0]); // Analiza solo el primer archivo

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || 'Error al procesar el archivo');
      }

      setAnalysis(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>🤖 Analizador IA de Subastas Inmobiliarias</h1>
        <p>Sube tus documentos PDF y obtén un análisis exhaustivo con IA</p>
      </div>

      <div className={styles.uploadSection}>
        <div
          className={styles.uploadArea}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('fileInput')?.click()}
        >
          <h3>📤 Arrastra y suelta tus documentos aquí</h3>
          <p>O haz clic para seleccionar archivos (solo PDF)</p>
          <input
            id="fileInput"
            type="file"
            multiple
            accept=".pdf"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>

        {files.length > 0 && (
          <div className={styles.filesList}>
            <h3>Archivos seleccionados:</h3>
            {files.map((file, index) => (
              <div key={index} className={styles.fileItem}>
                <span>📄 {file.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className={styles.removeBtn}
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          className={styles.analyzeBtn}
          onClick={handleAnalyze}
          disabled={loading || files.length === 0}
        >
          {loading ? 'Analizando...' : `Analizar ${files.length} archivo(s) con IA`}
        </button>

        {error && <div className={styles.error}>{error}</div>}
      </div>

      {loading && <div className={styles.loader}>Cargando análisis...</div>}

      {analysis && (
        <div className={styles.results}>
          <h2>📊 Análisis del Inmueble</h2>

          {analysis.inmueble && (
            <section className={styles.section}>
              <h3>🏠 Información del Inmueble</h3>
              <div className={styles.grid}>
                <p>
                  <strong>Tipo:</strong> {analysis.inmueble.tipo}
                </p>
                <p>
                  <strong>Ubicación:</strong> {analysis.inmueble.ubicacion}
                </p>
                <p>
                  <strong>Superficie:</strong> {analysis.inmueble.superficie}
                </p>
                <p>
                  <strong>Dormitorios:</strong> {analysis.inmueble.dormitorios}
                </p>
                <p>
                  <strong>Baños:</strong> {analysis.inmueble.baños}
                </p>
                <p>
                  <strong>Año construcción:</strong> {analysis.inmueble.año_construccion}
                </p>
              </div>
              <p className={styles.description}>{analysis.inmueble.descripcion}</p>
            </section>
          )}

          {analysis.cargas && (
            <section className={styles.section}>
              <h3>💰 Cargas Registrales</h3>
              <div className={styles.charges}>
                <p>
                  <strong>IBI:</strong> {analysis.cargas.ibi}
                </p>
                <p>
                  <strong>Comunidad:</strong> {analysis.cargas.comunidad}
                </p>
                <p>
                  <strong>Hipoteca:</strong> {analysis.cargas.hipoteca}
                </p>
                <p>
                  <strong>Embargos:</strong> {analysis.cargas.embargos}
                </p>
              </div>
            </section>
          )}

          {analysis.riesgos && analysis.riesgos.length > 0 && (
            <section className={`${styles.section} ${styles.warning}`}>
              <h3>⚠️ Riesgos Identificados</h3>
              <ul>
                {analysis.riesgos.map((riesgo, i) => (
                  <li key={i}>{riesgo}</li>
                ))}
              </ul>
            </section>
          )}

          {analysis.oportunidades && analysis.oportunidades.length > 0 && (
            <section className={`${styles.section} ${styles.success}`}>
              <h3>✅ Oportunidades</h3>
              <ul>
                {analysis.oportunidades.map((oport, i) => (
                  <li key={i}>{oport}</li>
                ))}
              </ul>
            </section>
          )}

          {analysis.presupuesto && (
            <section className={styles.section}>
              <h3>💵 Presupuesto de Inversión</h3>
              <div className={styles.budget}>
                <p>
                  <strong>Puja estimada:</strong> {analysis.presupuesto.precio_puja}
                </p>
                <p>
                  <strong>ITP:</strong> {analysis.presupuesto.itp}
                </p>
                <p>
                  <strong>Cargas preferentes:</strong> {analysis.presupuesto.cargas_preferentes}
                </p>
                <p>
                  <strong>Reformas:</strong> {analysis.presupuesto.reformas}
                </p>
                <p>
                  <strong>Gastos varios:</strong> {analysis.presupuesto.gastos}
                </p>
                <p className={styles.total}>
                  <strong>TOTAL:</strong> {analysis.presupuesto.total}
                </p>
              </div>
            </section>
          )}

          {analysis.rentabilidad && (
            <section className={styles.section}>
              <h3>📈 Rentabilidad Estimada</h3>
              <div className={styles.profitability}>
                <p>
                  <strong>Valor mercado:</strong> {analysis.rentabilidad.valor_mercado}
                </p>
                <p>
                  <strong>Valor post-reforma:</strong> {analysis.rentabilidad.valor_post_reforma}
                </p>
                <p>
                  <strong>Beneficio potencial:</strong> {analysis.rentabilidad.beneficio_potencial}
                </p>
                <p className={styles.roi}>
                  <strong>ROI estimado:</strong> {analysis.rentabilidad.roi}
                </p>
              </div>
            </section>
          )}

          {analysis.recomendacion && (
            <section className={`${styles.section} ${styles.recommendation}`}>
              <h3>🎯 Recomendación</h3>
              <p>
                <strong>Puja máxima recomendada:</strong> {analysis.recomendacion.puja_maxima}
              </p>
              <p>
                <strong>Viabilidad:</strong> {analysis.recomendacion.viabilidad}
              </p>
              <p>{analysis.recomendacion.explicacion}</p>
            </section>
          )}

          {analysis.text && (
            <section className={styles.section}>
              <h3>📝 Análisis Completo (Texto)</h3>
              <pre className={styles.rawText}>{analysis.text}</pre>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
