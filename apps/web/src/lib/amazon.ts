import type { AmazonItem, AmazonResult } from "./amazon-types";

// Integrazione con la Creators API ufficiale di Amazon (successore della PA-API 5).
// Si attiva solo con le credenziali del programma Affiliazione Amazon, impostate in apps/web/.env.local.
const CLIENT_ID = process.env.AMAZON_CREATORS_CLIENT_ID;
const CLIENT_SECRET = process.env.AMAZON_CREATORS_CLIENT_SECRET;
const TOKEN_URL = process.env.AMAZON_CREATORS_TOKEN_URL;
const PARTNER_TAG = process.env.AMAZON_PARTNER_TAG;
const API_BASE = process.env.AMAZON_CREATORS_API_BASE ?? "https://creatorsapi.amazon/catalog/v1";
const MARKETPLACE = "www.amazon.it";
const CACHE_TTL_MS = 15 * 60 * 1000;
const MIN_REQUEST_GAP_MS = 1100;
const MAX_ITEMS = 8;

export const isAmazonConfigured = () => Boolean(CLIENT_ID && CLIENT_SECRET && TOKEN_URL && PARTNER_TAG);

export function amazonSearchUrl(query: string): string {
  const params = new URLSearchParams({ k: query });
  if (PARTNER_TAG) params.set("tag", PARTNER_TAG);
  return `https://www.amazon.it/s?${params}`;
}

let token: { value: string; expiresAt: number } | null = null;
const cache = new Map<string, { at: number; items: AmazonItem[] }>();
let lastRequestAt = 0;

async function getToken(): Promise<string> {
  if (token && Date.now() < token.expiresAt - 60_000) return token.value;
  const response = await fetch(TOKEN_URL as string, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope: "creatorsapi::default",
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`token: HTTP ${response.status}`);
  const data = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("token: risposta senza access_token");
  token = { value: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return token.value;
}

interface RawItem {
  asin?: string;
  detailPageURL?: string;
  images?: { primary?: { medium?: { url?: string } } };
  itemInfo?: { title?: { displayValue?: string } };
  offersV2?: {
    listings?: {
      price?: {
        money?: { amount?: number; currency?: string };
        savings?: { percentage?: number };
        savingBasis?: { money?: { amount?: number } };
      };
    }[];
  };
}

function toItem(raw: RawItem): AmazonItem | null {
  const title = raw.itemInfo?.title?.displayValue;
  const price = raw.offersV2?.listings?.[0]?.price;
  const amount = price?.money?.amount;
  if (!raw.asin || !title || !raw.detailPageURL || typeof amount !== "number") return null;
  const basis = price?.savingBasis?.money?.amount;
  return {
    asin: raw.asin,
    title,
    url: raw.detailPageURL,
    imageUrl: raw.images?.primary?.medium?.url ?? null,
    price: amount,
    originalPrice: typeof basis === "number" && basis > amount ? basis : null,
    discountPercent: price?.savings?.percentage ? Math.round(price.savings.percentage) : null,
  };
}

export async function searchAmazon(query: string): Promise<AmazonResult> {
  const searchUrl = amazonSearchUrl(query);
  if (!isAmazonConfigured()) return { configured: false, items: [], searchUrl, fetchedAt: null };

  const key = query.toLowerCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return { configured: true, items: cached.items, searchUrl, fetchedAt: new Date(cached.at).toISOString() };
  }

  try {
    const wait = lastRequestAt + MIN_REQUEST_GAP_MS - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastRequestAt = Date.now();

    const response = await fetch(`${API_BASE}/searchItems`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await getToken()}`,
        "Content-Type": "application/json",
        "x-marketplace": MARKETPLACE,
      },
      body: JSON.stringify({
        keywords: query,
        partnerTag: PARTNER_TAG,
        searchIndex: "All",
        itemCount: 10,
        marketplace: MARKETPLACE,
        languagesOfPreference: ["it_IT"],
        resources: ["images.primary.medium", "itemInfo.title", "offersV2.listings.price"],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (response.status === 401 || response.status === 403) {
      token = null;
      return { configured: true, items: [], searchUrl, fetchedAt: null, error: "Amazon ha rifiutato le credenziali o l'accesso all'API non è attivo per questo account." };
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = (await response.json()) as { searchResult?: { items?: RawItem[] } };
    const items = (data.searchResult?.items ?? []).map(toItem).filter((item): item is AmazonItem => item !== null).slice(0, MAX_ITEMS);
    cache.set(key, { at: Date.now(), items });
    return { configured: true, items, searchUrl, fetchedAt: new Date().toISOString() };
  } catch {
    return { configured: true, items: [], searchUrl, fetchedAt: null, error: "Non riesco a leggere i prezzi Amazon in questo momento." };
  }
}
