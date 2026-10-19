import { median } from "./stats";

export type DealTier =
  | "minimo-storico"
  | "vero-affare"
  | "sconto-normale"
  | "finto-sconto"
  | "nessuno";

const VERO_AFFARE_THRESHOLD = 0.85;
const FINTO_SCONTO_TOLERANCE = 1.02;

export interface ScoreDealInput {
  unitPrice: number;
  originalUnitPrice?: number | null;
  historicalUnitPrices: number[];
}

export function scoreDeal(input: ScoreDealInput): DealTier {
  const { unitPrice, originalUnitPrice, historicalUnitPrices } = input;
  const hasDiscount = originalUnitPrice != null && originalUnitPrice > unitPrice;

  if (originalUnitPrice != null && originalUnitPrice <= unitPrice * FINTO_SCONTO_TOLERANCE) {
    return "finto-sconto";
  }

  if (historicalUnitPrices.length === 0) {
    return hasDiscount ? "sconto-normale" : "nessuno";
  }

  const lowestObserved = Math.min(...historicalUnitPrices);
  if (unitPrice <= lowestObserved) {
    return "minimo-storico";
  }

  const trailingMedian = median(historicalUnitPrices);
  if (unitPrice <= trailingMedian * VERO_AFFARE_THRESHOLD) {
    return "vero-affare";
  }

  return hasDiscount ? "sconto-normale" : "nessuno";
}

export interface ChainOffer {
  chainId: string;
  unitPrice: number;
}

export function cheapestOffer<T extends ChainOffer>(offers: T[]): T | null {
  if (offers.length === 0) return null;
  return offers.reduce((best, current) => (current.unitPrice < best.unitPrice ? current : best));
}
