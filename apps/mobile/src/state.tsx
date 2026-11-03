import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { dedupeStores, isSameStore, loadOffers, type FavoriteRef, type OffersResponse } from "@salvaspesa/app-core";
import { readText, snapshotStorage, writeText } from "./storage";

export interface Profile {
  name: string;
  adults: number;
  children: number;
  weeklyBudget: number | null;
}

export interface SavedLocation {
  lat: number;
  lng: number;
  label: string;
}

interface Persisted {
  favorites: FavoriteRef[];
  categories: string[];
  profile: Profile;
  location: SavedLocation | null;
  onboarded: boolean;
}

const EMPTY: Persisted = { favorites: [], categories: [], profile: { name: "", adults: 1, children: 0, weeklyBudget: null }, location: null, onboarded: false };

interface AppState extends Persisted {
  ready: boolean;
  data: OffersResponse | null;
  // Schermata di caricamento: solo quando non c'è ancora nessun dato da mostrare.
  loading: boolean;
  // Aggiornamento in corso in secondo piano (i dati già presenti restano visibili).
  updating: boolean;
  progress: string;
  toggleFavorite: (store: FavoriteRef) => void;
  toggleCategory: (id: string) => void;
  setProfile: (profile: Profile) => void;
  setLocation: (location: SavedLocation) => void;
  completeOnboarding: (profile: Profile, categories: string[]) => void;
  restartOnboarding: () => void;
  refresh: (force?: boolean) => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);
const STATE_KEY = "state";

export function AppProvider({ children }: { children: ReactNode }) {
  const [persisted, setPersisted] = useState<Persisted>(EMPTY);
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<OffersResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [progress, setProgress] = useState("");
  const busy = useRef(false);

  useEffect(() => {
    readText(STATE_KEY).then((raw) => {
      if (raw) {
        try {
          const saved = JSON.parse(raw) as Partial<Persisted>;
          setPersisted({ ...EMPTY, ...saved, favorites: dedupeStores(saved.favorites ?? []), profile: { ...EMPTY.profile, ...saved.profile } });
        } catch {}
      }
      setReady(true);
    });
  }, []);

  const update = useCallback((next: Persisted) => {
    setPersisted(next);
    void writeText(STATE_KEY, JSON.stringify(next));
  }, []);

  const refresh = useCallback(
    async (force = false) => {
      if (busy.current) return;
      busy.current = true;
      setUpdating(true);
      try {
        // Prima si mostra subito quello che è già sul telefono; la schermata di caricamento resta solo se non c'è nulla.
        const cached = await loadOffers(persisted.favorites, snapshotStorage, { cacheOnly: true });
        if (cached.offers.length > 0) setData(cached);
        else setLoading(true);
        setData(await loadOffers(persisted.favorites, snapshotStorage, { force, onProgress: setProgress }));
      } finally {
        setUpdating(false);
        busy.current = false;
        setLoading(false);
        setProgress("");
      }
    },
    [persisted.favorites],
  );

  // Quando cambiano i preferiti si ricarica: gli snapshot recenti sono riusati, quelli vecchi scaricati di nuovo.
  useEffect(() => {
    if (ready) void refresh();
  }, [ready, refresh]);

  const value = useMemo<AppState>(
    () => ({
      ...persisted,
      ready,
      data,
      loading,
      updating,
      progress,
      refresh,
      toggleFavorite: (store) => {
        // Lo stesso negozio può comparire due volte su OpenStreetMap (punto e edificio): si considera uno solo.
        const same = persisted.favorites.filter((f) => isSameStore(f, store));
        update({ ...persisted, favorites: same.length > 0 ? persisted.favorites.filter((f) => !same.includes(f)) : [...persisted.favorites, store] });
      },
      setProfile: (profile) => update({ ...persisted, profile }),
      completeOnboarding: (profile, categories) => update({ ...persisted, profile, categories, onboarded: true }),
      restartOnboarding: () => update({ ...persisted, onboarded: false }),
      setLocation: (location) => update({ ...persisted, location }),
      toggleCategory: (id) =>
        update({ ...persisted, categories: persisted.categories.includes(id) ? persisted.categories.filter((c) => c !== id) : [...persisted.categories, id] }),
    }),
    [persisted, ready, data, loading, updating, progress, refresh, update],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const value = useContext(Ctx);
  if (!value) throw new Error("AppProvider mancante");
  return value;
}
