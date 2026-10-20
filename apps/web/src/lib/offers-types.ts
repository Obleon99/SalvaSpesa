import type { ScrapedOffer } from "@salvaspesa/shared-types";

export interface FavoriteRef {
  id: string;
  name: string;
  chainId: string;
  chainName: string;
  lat: number;
  lng: number;
}

export interface OfferView extends ScrapedOffer {
  chainName: string;
  storeIds: string[];
}

export const offerKey = (offer: Pick<OfferView, "chainId" | "storeCode" | "externalId">) =>
  `${offer.chainId}:${offer.storeCode ?? ""}:${offer.externalId}`;

export type SourceStatus = "ok" | "stale" | "unsupported" | "unresolved" | "error";

export interface SourceInfo {
  storeId: string;
  storeName: string;
  chainId: string;
  chainName: string;
  status: SourceStatus;
  offerCount: number;
  scrapedAt: string | null;
  storeCode: string | null;
  note?: string;
}

export interface OffersResponse {
  generatedAt: string | null;
  offers: OfferView[];
  sources: SourceInfo[];
}

export interface HistoryPoint {
  date: string;
  price: number;
  originalPrice: number | null;
}
