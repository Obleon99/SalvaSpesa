"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { haversineKm, type RawStore, type StoreWithDistance, type UserLocation } from "./geo";

export interface UserProfile {
  name: string;
  adults: number;
  children: number;
  weeklyBudget: number | null;
}

export type StoresStatus = "idle" | "loading" | "error";
export type DialogName = "location" | "profile" | null;

interface StoresMeta {
  key: string;
  fetchedAt: number;
}

interface PersistedState {
  profile: UserProfile;
  location: UserLocation | null;
  radiusKm: number;
  favorites: RawStore[];
  stores: RawStore[];
  storesMeta: StoresMeta | null;
}

interface UserState {
  ready: boolean;
  profile: UserProfile;
  setProfile: (profile: UserProfile) => void;
  location: UserLocation | null;
  radiusKm: number;
  setLocation: (location: UserLocation, radiusKm: number) => void;
  stores: StoreWithDistance[];
  storesStatus: StoresStatus;
  refreshStores: () => void;
  favorites: StoreWithDistance[];
  isFavorite: (storeId: string) => boolean;
  toggleFavorite: (store: RawStore) => void;
  dialog: DialogName;
  openDialog: (dialog: Exclude<DialogName, null>) => void;
  closeDialog: () => void;
}

const STORAGE_KEY = "salvaspesa:v1";
const STORES_CACHE_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RADIUS_KM = 5;
const DEFAULT_PROFILE: UserProfile = { name: "", adults: 2, children: 0, weeklyBudget: null };

const UserStateContext = createContext<UserState | null>(null);

function loadPersisted(): Partial<PersistedState> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<PersistedState>) : {};
  } catch {
    return {};
  }
}

function withDistance(store: RawStore, location: UserLocation | null): StoreWithDistance {
  return { ...store, distanceKm: location ? haversineKm(location, store) : null };
}

function byDistance(a: StoreWithDistance, b: StoreWithDistance): number {
  return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) || a.name.localeCompare(b.name);
}

export function UserStateProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfileState] = useState<UserProfile>(DEFAULT_PROFILE);
  const [location, setLocationState] = useState<UserLocation | null>(null);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [favoriteRaw, setFavoriteRaw] = useState<RawStore[]>([]);
  const [rawStores, setRawStores] = useState<RawStore[]>([]);
  const [storesStatus, setStoresStatus] = useState<StoresStatus>("idle");
  const [refreshToken, setRefreshToken] = useState(0);
  const [dialog, setDialog] = useState<DialogName>(null);
  const storesMetaRef = useRef<StoresMeta | null>(null);

  useEffect(() => {
    const persisted = loadPersisted();
    if (persisted.profile) setProfileState({ ...DEFAULT_PROFILE, ...persisted.profile });
    if (persisted.location) setLocationState(persisted.location);
    if (persisted.radiusKm) setRadiusKm(persisted.radiusKm);
    if (persisted.favorites) setFavoriteRaw(persisted.favorites);
    if (persisted.stores) setRawStores(persisted.stores);
    storesMetaRef.current = persisted.storesMeta ?? null;
    setReady(true);
  }, []);

  const locationKey = location ? `${location.lat.toFixed(3)},${location.lng.toFixed(3)},${radiusKm}` : null;

  useEffect(() => {
    if (!ready || !location || !locationKey) return;
    const meta = storesMetaRef.current;
    if (meta && meta.key === locationKey && Date.now() - meta.fetchedAt < STORES_CACHE_MS) return;

    const controller = new AbortController();
    if (meta?.key !== locationKey) setRawStores([]);
    setStoresStatus("loading");
    fetch(`/api/stores/nearby?lat=${location.lat}&lng=${location.lng}&radius=${radiusKm}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<{ stores: RawStore[] }>;
      })
      .then((data) => {
        storesMetaRef.current = { key: locationKey, fetchedAt: Date.now() };
        setRawStores(data.stores);
        setStoresStatus("idle");
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") setStoresStatus("error");
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, locationKey, refreshToken]);

  useEffect(() => {
    if (!ready) return;
    const state: PersistedState = {
      profile,
      location,
      radiusKm,
      favorites: favoriteRaw,
      stores: rawStores,
      storesMeta: storesMetaRef.current,
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage pieno o non disponibile: i dati restano solo in memoria
    }
  }, [ready, profile, location, radiusKm, favoriteRaw, rawStores, storesStatus]);

  const setProfile = useCallback((next: UserProfile) => setProfileState(next), []);

  const setLocation = useCallback((next: UserLocation, nextRadiusKm: number) => {
    setLocationState(next);
    setRadiusKm(nextRadiusKm);
  }, []);

  const refreshStores = useCallback(() => {
    storesMetaRef.current = null;
    setRefreshToken((token) => token + 1);
  }, []);

  const toggleFavorite = useCallback((store: RawStore) => {
    setFavoriteRaw((current) =>
      current.some((s) => s.id === store.id) ? current.filter((s) => s.id !== store.id) : [...current, store],
    );
  }, []);

  const stores = useMemo(() => rawStores.map((s) => withDistance(s, location)).sort(byDistance), [rawStores, location]);
  const favorites = useMemo(
    () => favoriteRaw.map((s) => withDistance(s, location)).sort(byDistance),
    [favoriteRaw, location],
  );
  const favoriteIds = useMemo(() => new Set(favoriteRaw.map((s) => s.id)), [favoriteRaw]);
  const isFavorite = useCallback((storeId: string) => favoriteIds.has(storeId), [favoriteIds]);

  const openDialog = useCallback((name: Exclude<DialogName, null>) => setDialog(name), []);
  const closeDialog = useCallback(() => setDialog(null), []);

  const value: UserState = {
    ready,
    profile,
    setProfile,
    location,
    radiusKm,
    setLocation,
    stores,
    storesStatus,
    refreshStores,
    favorites,
    isFavorite,
    toggleFavorite,
    dialog,
    openDialog,
    closeDialog,
  };

  return <UserStateContext.Provider value={value}>{children}</UserStateContext.Provider>;
}

export function useUserState(): UserState {
  const context = useContext(UserStateContext);
  if (!context) throw new Error("useUserState va usato dentro UserStateProvider");
  return context;
}

export function householdSize(profile: UserProfile): number {
  return profile.adults + profile.children;
}
