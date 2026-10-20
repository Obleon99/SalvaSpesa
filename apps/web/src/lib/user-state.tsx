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
import type { OfferView, OffersResponse, SourceInfo } from "./offers-types";

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

export interface CartItem {
  key: string;
  chainId: string;
  chainName: string;
  storeName: string;
  name: string;
  price: number;
  unitPrice: number | null;
  unit: string | null;
  imageUrl: string | null;
  addedAt: number;
  brand?: string | null;
  packageText?: string | null;
  ean?: string | null;
  originalPrice?: number | null;
  validTo?: string;
  quantity?: number;
}

export interface SavedProduct {
  key: string;
  name: string;
  chainName: string;
  price: number;
  imageUrl: string | null;
  savedAt: number;
}

export interface PriceReport {
  id: string;
  product: string;
  store: string;
  seenPrice: number | null;
  note: string;
  createdAt: number;
}

export interface PriceAlert {
  key: string;
  name: string;
  chainName: string;
  threshold: number;
  createdAt: number;
}

interface PersistedState {
  profile: UserProfile;
  location: UserLocation | null;
  radiusKm: number;
  favorites: RawStore[];
  stores: RawStore[];
  storesMeta: StoresMeta | null;
  cart: CartItem[];
  alerts: PriceAlert[];
  savedProducts: SavedProduct[];
  seenNotifications: string[];
  reports: PriceReport[];
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
  offers: OfferView[];
  offersStatus: StoresStatus;
  offerSources: SourceInfo[];
  offersGeneratedAt: string | null;
  refreshOffers: () => void;
  cart: CartItem[];
  toggleCartItem: (item: Omit<CartItem, "addedAt">) => void;
  setCartQuantity: (key: string, quantity: number) => void;
  clearCart: () => void;
  alerts: PriceAlert[];
  setAlert: (alert: Omit<PriceAlert, "createdAt">) => void;
  removeAlert: (key: string) => void;
  savedProducts: SavedProduct[];
  toggleSavedProduct: (item: Omit<SavedProduct, "savedAt">) => void;
  seenNotifications: string[];
  markNotificationsSeen: (ids: string[]) => void;
  reports: PriceReport[];
  addReport: (report: Omit<PriceReport, "id" | "createdAt">) => void;
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
  const [offers, setOffers] = useState<OfferView[]>([]);
  const [offersStatus, setOffersStatus] = useState<StoresStatus>("idle");
  const [offerSources, setOfferSources] = useState<SourceInfo[]>([]);
  const [offersGeneratedAt, setOffersGeneratedAt] = useState<string | null>(null);
  const [offersRefresh, setOffersRefresh] = useState(0);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [savedProducts, setSavedProducts] = useState<SavedProduct[]>([]);
  const [seenNotifications, setSeenNotifications] = useState<string[]>([]);
  const [reports, setReports] = useState<PriceReport[]>([]);
  const storesMetaRef = useRef<StoresMeta | null>(null);

  useEffect(() => {
    const persisted = loadPersisted();
    if (persisted.profile) setProfileState({ ...DEFAULT_PROFILE, ...persisted.profile });
    if (persisted.location) setLocationState(persisted.location);
    if (persisted.radiusKm) setRadiusKm(persisted.radiusKm);
    if (persisted.favorites) setFavoriteRaw(persisted.favorites);
    if (persisted.stores) setRawStores(persisted.stores);
    if (persisted.cart) setCart(persisted.cart);
    if (persisted.alerts) setAlerts(persisted.alerts);
    if (persisted.savedProducts) setSavedProducts(persisted.savedProducts);
    if (persisted.seenNotifications) setSeenNotifications(persisted.seenNotifications);
    if (persisted.reports) setReports(persisted.reports);
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
      cart,
      alerts,
      savedProducts,
      seenNotifications,
      reports,
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage pieno o non disponibile: i dati restano solo in memoria
    }
  }, [ready, profile, location, radiusKm, favoriteRaw, rawStores, storesStatus, cart, alerts, savedProducts, seenNotifications, reports]);

  const favoritesKey = favoriteRaw.map((s) => s.id).sort().join("|");

  useEffect(() => {
    if (!ready) return;
    if (favoriteRaw.length === 0) {
      setOffers([]);
      setOfferSources([]);
      setOffersGeneratedAt(null);
      setOffersStatus("idle");
      return;
    }
    const controller = new AbortController();
    setOffersStatus("loading");
    fetch("/api/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stores: favoriteRaw.map((s) => ({ id: s.id, name: s.name, chainId: s.chainId, chainName: s.chainName, lat: s.lat, lng: s.lng })),
      }),
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<OffersResponse>;
      })
      .then((data) => {
        setOffers(data.offers);
        setOfferSources(data.sources);
        setOffersGeneratedAt(data.generatedAt);
        setOffersStatus("idle");
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") setOffersStatus("error");
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, favoritesKey, offersRefresh]);

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

  const refreshOffers = useCallback(() => setOffersRefresh((token) => token + 1), []);

  const toggleCartItem = useCallback((item: Omit<CartItem, "addedAt">) => {
    setCart((current) =>
      current.some((c) => c.key === item.key) ? current.filter((c) => c.key !== item.key) : [...current, { ...item, addedAt: Date.now() }],
    );
  }, []);

  const setAlert = useCallback((alert: Omit<PriceAlert, "createdAt">) => {
    setAlerts((current) => [...current.filter((a) => a.key !== alert.key), { ...alert, createdAt: Date.now() }]);
  }, []);

  const removeAlert = useCallback((key: string) => setAlerts((current) => current.filter((a) => a.key !== key)), []);

  const setCartQuantity = useCallback((key: string, quantity: number) => {
    setCart((current) =>
      quantity <= 0 ? current.filter((c) => c.key !== key) : current.map((c) => (c.key === key ? { ...c, quantity: Math.min(quantity, 99) } : c)),
    );
  }, []);
  const clearCart = useCallback(() => setCart([]), []);

  const toggleSavedProduct = useCallback((item: Omit<SavedProduct, "savedAt">) => {
    setSavedProducts((current) =>
      current.some((p) => p.key === item.key) ? current.filter((p) => p.key !== item.key) : [...current, { ...item, savedAt: Date.now() }],
    );
  }, []);

  const markNotificationsSeen = useCallback((ids: string[]) => {
    setSeenNotifications((current) => [...new Set([...current, ...ids])].slice(-200));
  }, []);

  const addReport = useCallback((report: Omit<PriceReport, "id" | "createdAt">) => {
    setReports((current) => [...current, { ...report, id: `r${Date.now()}`, createdAt: Date.now() }].slice(-100));
  }, []);

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
    offers,
    offersStatus,
    offerSources,
    offersGeneratedAt,
    refreshOffers,
    cart,
    toggleCartItem,
    setCartQuantity,
    clearCart,
    alerts,
    setAlert,
    removeAlert,
    savedProducts,
    toggleSavedProduct,
    seenNotifications,
    markNotificationsSeen,
    reports,
    addReport,
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
