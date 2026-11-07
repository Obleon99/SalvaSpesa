export interface PdfTextItem {
  str: string;
  x: number;
  y: number;
  size: number;
}

export type PdfExtractor = (data: Uint8Array) => Promise<PdfTextItem[][]>;

let extractor: PdfExtractor | null = null;

// Il motore che legge i PDF dipende dalla piattaforma (Node: pdfjs; telefono: pdfjs in una WebView): lo fornisce l'app che usa gli scraper.
export function setPdfExtractor(next: PdfExtractor): void {
  extractor = next;
}

// Restituisce, per ogni pagina, i frammenti di testo con posizione (origine in basso a sinistra, come nel PDF).
export async function extractPdfPages(data: Uint8Array): Promise<PdfTextItem[][]> {
  if (!extractor) throw new Error("Lettore PDF non configurato");
  return extractor(data);
}
