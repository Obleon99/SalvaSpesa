"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icon";
import { formatPrice } from "@/lib/offer-search";
import type { AmazonResult } from "@/lib/amazon-types";

export function AmazonResults({ query }: { query: string }) {
  const [result, setResult] = useState<AmazonResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setResult(null);
    if (query.length < 2) return;
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/amazon?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then((response) => (response.ok ? (response.json() as Promise<AmazonResult>) : null))
      .then((data) => {
        setResult(data);
        setLoading(false);
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") setLoading(false);
      });
    return () => controller.abort();
  }, [query]);

  if (query.length < 2) return null;

  const updatedAt = result?.fetchedAt
    ? new Date(result.fetchedAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <section className="bg-surface-container-low rounded-2xl p-space-md flex flex-col gap-space-sm" aria-label="Offerte su Amazon">
      <div className="flex flex-wrap items-center justify-between gap-space-xs">
        <div className="flex items-center gap-space-xs">
          <Icon name="local_shipping" className="text-secondary text-xl" />
          <h4 className="font-title-md text-title-md font-bold text-on-surface">Su Amazon.it</h4>
        </div>
        {result ? (
          <a
            href={result.searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-label-unit text-label-unit font-bold text-primary hover:underline flex items-center gap-1"
          >
            Cerca «{query}» su Amazon <Icon name="open_in_new" className="text-sm" />
          </a>
        ) : null}
      </div>

      {loading ? (
        <div role="status" className="flex items-center gap-space-xs font-body-sm text-body-sm text-on-surface-variant">
          <Icon name="progress_activity" className="text-primary animate-spin" /> Cerco su Amazon…
        </div>
      ) : null}

      {result && !result.configured ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Per vedere qui i prodotti e i prezzi Amazon serve collegare l&apos;API ufficiale di Amazon (programma Affiliazione):
          le istruzioni sono in <code>docs/FUNZIONALITA.md</code>. Nel frattempo il link qui sopra apre la tua ricerca su Amazon.it.
        </p>
      ) : null}

      {result?.error ? <p className="font-body-sm text-body-sm text-error">{result.error}</p> : null}

      {result?.configured && !result.error && result.items.length === 0 ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant">Nessun prodotto con prezzo trovato su Amazon per questa ricerca.</p>
      ) : null}

      {result && result.items.length > 0 ? (
        <>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-sm">
            {result.items.slice(0, 8).map((item) => (
              <li key={item.asin} className="bg-surface-container-lowest rounded-xl p-space-sm flex flex-col gap-space-xs shadow-sm">
                <div className="h-24 flex items-center justify-center">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.title} className="max-h-full object-contain" />
                  ) : (
                    <Icon name="image" className="text-outline text-3xl" />
                  )}
                </div>
                <p className="font-body-sm text-body-sm text-on-surface line-clamp-3">{item.title}</p>
                <div className="mt-auto flex items-baseline justify-between gap-2">
                  <span className="font-label-price-sm text-label-price-sm text-on-surface tabular-nums">{formatPrice(item.price)}</span>
                  {item.originalPrice ? (
                    <span className="font-label-unit text-label-unit text-outline line-through tabular-nums">{formatPrice(item.originalPrice)}</span>
                  ) : null}
                </div>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="text-center py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high font-label-unit text-label-unit font-bold text-on-surface transition-colors"
                >
                  Vedi su Amazon{item.discountPercent ? ` (-${item.discountPercent}%)` : ""}
                </a>
              </li>
            ))}
          </ul>
          <p className="font-label-unit text-label-unit text-outline">
            Prezzi e disponibilità Amazon aggiornati alle {updatedAt} e soggetti a variazioni. Come Affiliato Amazon, SpesaChiara
            riceve un guadagno dagli acquisti idonei.
          </p>
        </>
      ) : null}
    </section>
  );
}
