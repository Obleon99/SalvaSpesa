import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export interface PdfTextItem {
  str: string;
  x: number;
  y: number;
  size: number;
}

// Restituisce, per ogni pagina, i frammenti di testo con posizione (origine in basso a sinistra, come nel PDF).
export async function extractPdfPages(data: Uint8Array): Promise<PdfTextItem[][]> {
  const document = await getDocument({ data, useSystemFonts: true, isEvalSupported: false }).promise;
  const pages: PdfTextItem[][] = [];
  for (let number = 1; number <= document.numPages; number++) {
    const page = await document.getPage(number);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .filter((item): item is typeof item & { str: string; transform: number[] } => "str" in item && item.str.trim() !== "")
        .map((item) => ({ str: item.str.trim(), x: item.transform[4], y: item.transform[5], size: Math.abs(item.transform[3]) })),
    );
  }
  return pages;
}
