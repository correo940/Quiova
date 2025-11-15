// scripts/extract-pdfs.ts
import fs from 'fs';
import path from 'path';
import fse from 'fs-extra';
import pdf from 'pdf-parse';

const SOURCE_DIR = path.join(process.cwd(), 'my-pdfs'); // pon aquí la carpeta con tus PDFs
const PDF_DIR = path.join(process.cwd(), 'public', 'docs');
const CONTENT_DIR = path.join(process.cwd(), 'content', 'docs');

async function run() {
  await fse.ensureDir(PDF_DIR);
  await fse.ensureDir(CONTENT_DIR);
  const files = await fs.promises.readdir(SOURCE_DIR);
  for (const f of files.filter(x => x.toLowerCase().endsWith('.pdf'))) {
    const buffer = await fs.promises.readFile(path.join(SOURCE_DIR, f));
    const pdfData = await pdf(buffer);
    const safeName = `${Date.now()}-${f}`.replace(/\s+/g, '_');
    await fs.promises.writeFile(path.join(PDF_DIR, safeName), buffer);
    const json = {
      title: (pdfData.info && pdfData.info.Title) || f,
      author: (pdfData.info && pdfData.info.Author) || '',
      pages: pdfData.numpages || null,
      text: pdfData.text || '',
      publicUrl: `/docs/${safeName}`,
      uploadDate: new Date().toISOString()
    };
    const jsonName = safeName.replace(/\.pdf$/i, '.json');
    await fs.promises.writeFile(path.join(CONTENT_DIR, jsonName), JSON.stringify(json, null, 2), 'utf8');
    console.log('Processed', f);
  }
}
run().catch(e => { console.error(e); process.exit(1); });