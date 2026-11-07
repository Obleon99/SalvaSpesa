import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { classifyProduct, normalizeText } from "@salvaspesa/deal-logic";
import type { OfferView } from "@salvaspesa/app-core";
import { useApp } from "./state";

export interface Prepared {
  offer: OfferView;
  group: string;
  text: string;
}

const NONE: OfferView[] = [];
const MEMO_LIMIT = 8000;

// Categoria e testo normalizzato di un prodotto si ricordano: dopo un aggiornamento si classificano solo le offerte nuove.
const memo = new Map<string, { group: string; text: string }>();

// La preparazione di un insieme di offerte è condivisa tra le schermate e pubblica i risultati man mano:
// le più scontate (già ordinate) compaiono subito, il resto si aggiunge a blocchi senza bloccare l'interfaccia.
interface Job {
  snapshot: Prepared[];
  finished: boolean;
  subscribers: Set<() => void>;
}
const jobs = new WeakMap<OfferView[], Job>();

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
const CHUNK = 100;

async function run(offers: OfferView[], job: Job): Promise<void> {
  if (memo.size > MEMO_LIMIT) memo.clear();
  const ordered = [...offers].sort((a, b) => (b.discountPercent ?? -1) - (a.discountPercent ?? -1));
  const out: Prepared[] = [];
  const publish = () => {
    job.snapshot = out.slice();
    for (const notify of job.subscribers) notify();
  };
  for (let i = 0; i < ordered.length; i += CHUNK) {
    for (const offer of ordered.slice(i, i + CHUNK)) {
      const key = `${offer.chainId}|${offer.name}|${offer.brand ?? ""}`;
      let entry = memo.get(key);
      if (!entry) {
        entry = { group: classifyProduct(offer).group, text: normalizeText(`${offer.name} ${offer.brand ?? ""}`) };
        memo.set(key, entry);
      }
      out.push({ offer, group: entry.group, text: entry.text });
    }
    // Il primo blocco subito, poi uno ogni tanto: ogni pubblicazione ridisegna le liste.
    if (i === 0 || (i / CHUNK) % 6 === 0) publish();
    await tick();
  }
  job.finished = true;
  publish();
}

function jobFor(offers: OfferView[]): Job {
  let job = jobs.get(offers);
  if (!job) {
    job = { snapshot: [], finished: false, subscribers: new Set() };
    jobs.set(offers, job);
    void run(offers, job);
  }
  return job;
}

// Tutte le offerte preparate (senza filtro per categorie): servono alla lista della spesa.
// Finché la preparazione di un nuovo set non è partita restano a schermo quelle precedenti.
export function usePreparedState(): { prepared: Prepared[]; preparing: boolean } {
  const { data } = useApp();
  const offers = data?.offers ?? NONE;
  const [shown, setShown] = useState<{ prepared: Prepared[]; preparing: boolean }>(() => {
    const job = jobs.get(offers);
    return { prepared: job?.snapshot ?? [], preparing: offers.length > 0 && !job?.finished };
  });
  useEffect(() => {
    const job = jobFor(offers);
    const sync = () => setShown((old) => (job.snapshot.length === 0 && old.prepared.length > 0 && !job.finished ? old : { prepared: job.snapshot, preparing: !job.finished }));
    job.subscribers.add(sync);
    sync();
    return () => {
      job.subscribers.delete(sync);
    };
  }, [offers]);
  return shown;
}

export const usePrepared = (): Prepared[] => usePreparedState().prepared;

// Vero finché le offerte in cache non sono state lette e preparate: la schermata mostra un caricamento, non «nessuna offerta».
export function useOffersSettling(): boolean {
  const { ready, data, favorites } = useApp();
  const { preparing } = usePreparedState();
  return favorites.length > 0 && (!ready || data === null || preparing);
}

// Offerte dei supermercati preferiti, filtrate per categorie del profilo e per testo, dalle più scontate.
// La ricerca è "differita": mentre si scrive la tastiera resta fluida e la lista si aggiorna appena possibile.
export function useVisibleOffers(query = ""): OfferView[] {
  const { categories } = useApp();
  const deferred = useDeferredValue(query);
  const prepared = usePrepared();
  return useMemo(() => {
    const term = normalizeText(deferred);
    const all = categories.length === 0 && !term;
    const wantsPet = term ? classifyProduct({ name: term }).group === "animali" : false;
    return prepared
      .filter((p) => (p.group !== "animali" || wantsPet) && (all || ((categories.length === 0 || categories.includes(p.group)) && (!term || p.text.includes(term)))))
      .map((p) => p.offer);
  }, [prepared, categories, deferred]);
}
