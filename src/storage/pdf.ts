import * as pdfjs from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();

const MIN_EMBEDDED_TEXT_LENGTH = 24;
const OCR_SCALE = 2;
const LOCAL_TESSDATA_PATH = '/tessdata';

export async function extractPdfText(file: File, onProgress?: (message: string) => void): Promise<string> {
  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    onProgress?.(`Extrayendo texto con pdf.js... ${pageNumber}/${pdf.numPages}`);
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    pages.push(text);
  }

  const embeddedText = pages.join('\n\n');
  if (normalizeText(embeddedText).length >= MIN_EMBEDDED_TEXT_LENGTH) return embeddedText;

  onProgress?.('PDF sin capa de texto. Aplicando OCR...');
  return extractPdfTextWithOcr(pdf, onProgress);
}

async function extractPdfTextWithOcr(pdf: any, onProgress?: (message: string) => void): Promise<string> {
  const worker = await createWorker('spa+eng', 1, {
    cacheMethod: 'readOnly',
    gzip: false,
    langPath: LOCAL_TESSDATA_PATH
  });
  const pages: string[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      onProgress?.(`Aplicando OCR... ${pageNumber}/${pdf.numPages}`);
      const page = await pdf.getPage(pageNumber);
      const canvas = await renderPdfPage(page);
      const result = await worker.recognize(canvas);
      pages.push(result.data.text);
      canvas.width = 0;
      canvas.height = 0;
    }
  } finally {
    await worker.terminate();
  }

  return pages.join('\n\n');
}

async function renderPdfPage(page: any): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale: OCR_SCALE });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) throw new Error('No se pudo inicializar el canvas para OCR.');

  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  await page.render({ canvasContext: context, viewport }).promise;
  return canvas;
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
