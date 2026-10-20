import { ScrapedOfferSchema, type ScrapedOffer } from "@salvaspesa/shared-types";

export interface RejectedItem {
  externalId: string | null;
  name: string | null;
  reason: string;
}

export interface AdapterResult {
  offers: ScrapedOffer[];
  rejected: RejectedItem[];
  pages: string[];
}

export interface ChainAdapter {
  chainId: string;
  chainName: string;
  scrape(): Promise<AdapterResult>;
}

// Valida un candidato con lo schema condiviso: gli scarti finiscono in `rejected` con il motivo.
export function collect(candidate: unknown, offers: ScrapedOffer[], rejected: RejectedItem[]): void {
  const parsed = ScrapedOfferSchema.safeParse(candidate);
  if (parsed.success) {
    offers.push(parsed.data);
    return;
  }
  const raw = candidate as { externalId?: string; name?: string };
  const issue = parsed.error.issues[0];
  rejected.push({
    externalId: raw.externalId ?? null,
    name: raw.name ?? null,
    reason: `${issue.path.join(".")}: ${issue.message}`,
  });
}
