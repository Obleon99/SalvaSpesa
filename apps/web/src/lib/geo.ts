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

export function formatDistance(km: number | null): string {
  if (km === null) return "";
  if (km < 1) return `${Math.round(km * 10) * 100} m`;
  return `${km.toLocaleString("it-IT", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} km`;
}
