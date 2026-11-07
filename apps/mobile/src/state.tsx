import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { dedupeStores, isSameStore, loadOffers, pruneStorage, type FavoriteRef, type OffersResponse } from "@salvaspesa/app-core";
import { MAX_LIST_ITEMS, type ListItem } from "./list";
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
  list: ListItem[];
}

const EMPTY: Persisted = { favorites: [], categories: [], profile: { name: "", adults: 1, children: 0, weeklyBudget: null }, location: null, onboarded: false, list: [] };

interface AppState extends Persisted {
  ready: boolean;
  data: OffersResponse | null;
  // Schermata di caricamento: solo quando non c'è ancora nessun dato da mostrare.
  loading: boolean;
  // Aggiornamento in corso in secondo piano (i dati già presenti restano visibili).
  updating: boolean;
  progress: string;
  // Vero quando le offerte in cache sono scadute o mancano: la home propone l'aggiornamento manuale.
  needsUpdate: boolean;
  toggleFavorite: (store: FavoriteRef) => void;
  toggleCategory: (id: string) => void;
  setProfile: (profile: Profile) => void;
  setLocation: (location: SavedLocation) => void;
  completeOnboarding: (profile: Profile, categories: string[]) => void;
  restartOnboarding: () => void;
  refresh: (force?: boolean) => Promise<void>;
  addToList: (item: ListItem) => void;
  updateListItem: (id: string, patch: Partial<ListItem>) => void;
  removeFromList: (id: string) => void;
  clearDone: () => void;
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
  const again = useRef(false);
  const latest = useRef<(force?: boolean, cacheOnly?: boolean, background?: boolean) => Promise<void>>(async () => undefined);
  const previous = useRef<FavoriteRef[]>([]);
  const started = useRef(false);

  useEffect(() => {
    readText(STATE_KEY).then((raw) => {
      if (raw) {
        try {
          const saved = JSON.parse(raw) as Partial<Persisted>;
          const favorites = dedupeStores(saved.favorites ?? []);
          setPersisted({ ...EMPTY, ...saved, favorites, list: (saved.list ?? []).slice(0, MAX_LIST_ITEMS), profile: { ...EMPTY.profile, ...saved.profile } });
          // Pulizia dei file non più utili, a comodo e senza bloccare l'avvio.
          setTimeout(() => void pruneStorage(favorites, snapshotStorage), 3000);
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
    async (force = false, cacheOnly = false, background = false) => {
      // Se un aggiornamento è già in corso se ne accoda uno solo per dopo, così nessuna modifica va persa.
      if (busy.current) {
        again.current = true;
        return;
      }
      busy.current = true;
      // In secondo piano non si mostra nulla: l'app resta quella di prima finché i dati nuovi sono pronti.
      setUpdating(!cacheOnly && !background);
      try {
        // Prima si mostra subito quello che è già sul telefono; la schermata di caricamento resta solo se non c'è nulla.
        const cached = await loadOffers(persisted.favorites, snapshotStorage, { cacheOnly: true });
        if (cached.offers.length > 0 || cacheOnly) setData(cached);
        else setLoading(true);
        if (!cacheOnly) {
          const fresh = await loadOffers(persisted.favorites, snapshotStorage, { force, background, onProgress: background ? undefined : setProgress });
          // Un respiro prima di consegnare i dati nuovi alle schermate.
          if (background) await new Promise<void>((resolve) => setTimeout(resolve, 50));
          setData(fresh);
        }
      } finally {
        setUpdating(false);
        busy.current = false;
        setLoading(false);
        setProgress("");
        if (again.current) {
          again.current = false;
          setTimeout(() => void latest.current(false, false, true), 2000);
        }
      }
    },
    [persisted.favorites],
  );
  latest.current = refresh;

  // Quando cambiano i preferiti si ricarica, ma con calma: più scelte ravvicinate diventano un solo aggiornamento,
  // e togliere un negozio non usa la rete. Gli snapshot recenti sono riusati, solo ciò che manca viene scaricato.
  useEffect(() => {
    if (!ready) return;
    const before = previous.current;
    previous.current = persisted.favorites;
    const onlyRemoved = before.length > 0 && persisted.favorites.every((f) => before.some((p) => p.id === f.id));
    // All'apertura dell'app si mostra solo ciò che è in cache, senza rete: l'aggiornamento lo decide l'utente dalla home.
    // Togliere un preferito non usa la rete. Aggiungerne uno scarica in silenzio solo i dati di quel negozio, dopo una pausa.
    const opening = !started.current;
    started.current = true;
    const timer = setTimeout(
      () => {
        void refresh(false, opening || onlyRemoved, !opening && !onlyRemoved);
      },
      opening || onlyRemoved ? 0 : 4000,
    );
    return () => clearTimeout(timer);
  }, [ready, refresh, persisted.favorites]);

  // Le offerte restano in cache con la loro scadenza: se un negozio non ha più offerte valide serve aggiornare.
  const needsUpdate = useMemo(() => {
    if (!ready || !data || persisted.favorites.length === 0) return false;
    const now = Date.now();
    return persisted.favorites.some((f) => {
      const source = data.sources.find((s) => s.storeId === f.id);
      if (!source || (source.status === "unsupported" || source.status === "unresolved")) return false;
      return source.status !== "ok" || !source.validUntil || Date.parse(source.validUntil) < now;
    });
  }, [ready, data, persisted.favorites]);

  const value = useMemo<AppState>(
    () => ({
      ...persisted,
      ready,
      data,
      loading,
      updating,
      progress,
      needsUpdate,
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
      addToList: (item) => update({ ...persisted, list: persisted.list.some((x) => x.id === item.id) ? persisted.list : [item, ...persisted.list].slice(0, MAX_LIST_ITEMS) }),
      updateListItem: (id, patch) => update({ ...persisted, list: persisted.list.map((x) => (x.id === id ? { ...x, ...patch } : x)) }),
      removeFromList: (id) => update({ ...persisted, list: persisted.list.filter((x) => x.id !== id) }),
      clearDone: () => update({ ...persisted, list: persisted.list.filter((x) => !x.done) }),
      toggleCategory: (id) =>
        update({ ...persisted, categories: persisted.categories.includes(id) ? persisted.categories.filter((c) => c !== id) : [...persisted.categories, id] }),
    }),
    [persisted, ready, data, loading, updating, progress, needsUpdate, refresh, update],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const value = useContext(Ctx);
  if (!value) throw new Error("AppProvider mancante");
  return value;
}
