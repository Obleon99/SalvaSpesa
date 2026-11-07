export interface LatLng {
  lat: number;
  lng: number;
}

export interface UserLocation extends LatLng {
  label: string;
}

export interface RawStore extends LatLng {
  id: string;
  name: string;
  chainId: string;
  chainName: string;
  address: string;
}

export interface StoreWithDistance extends RawStore {
  distanceKm: number | null;
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

const SAME_STORE_KM = 0.12;
const normalizeName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

// Su OpenStreetMap un negozio può essere mappato due volte (punto e edificio): stessa insegna, stesso nome e a pochi metri = lo stesso.
export function isSameStore(a: RawStore | { id: string; name: string; chainId: string; lat: number; lng: number }, b: typeof a): boolean {
  if (a.id === b.id) return true;
  return a.chainId === b.chainId && normalizeName(a.name) === normalizeName(b.name) && haversineKm(a, b) <= SAME_STORE_KM;
}

export function dedupeStores<T extends { id: string; name: string; chainId: string; lat: number; lng: number }>(stores: T[]): T[] {
  const unique: T[] = [];
  for (const store of stores) if (!unique.some((u) => isSameStore(u, store))) unique.push(store);
  return unique;
}

export function formatDistance(km: number | null): string {
  if (km === null) return "";
  if (km < 1) return `${Math.round(km * 10) * 100} m`;
  return `${km.toLocaleString("it-IT", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} km`;
}
