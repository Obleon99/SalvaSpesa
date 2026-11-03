import type { ChainAdapter } from "./adapter";
import { aldiAdapter } from "./adapters/aldi";
import { conadAdapter } from "./adapters/conad";
import { coopAdapter } from "./adapters/coop";
import { tigrosAdapter } from "./adapters/ebsn";
import { ekomAdapter } from "./adapters/ekom";
import { esselungaAdapter } from "./adapters/esselunga";
import { eurospinAdapter } from "./adapters/eurospin";
import { lidlAdapter } from "./adapters/lidl";
import { pennyAdapter } from "./adapters/penny";

export type { AdapterResult, ChainAdapter, RejectedItem } from "./adapter";
export { scraperConfig } from "./config";
export { sha1Hex } from "./hash";
export { setPdfExtractor, type PdfExtractor, type PdfTextItem } from "./pdf";

export const adapters: ChainAdapter[] = [lidlAdapter, pennyAdapter, eurospinAdapter, esselungaAdapter, tigrosAdapter, ekomAdapter, aldiAdapter, conadAdapter, coopAdapter];
