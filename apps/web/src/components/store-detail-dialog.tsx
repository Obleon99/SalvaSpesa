"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icon";
import { Modal } from "./modal";
import { formatDistance, type StoreWithDistance } from "@/lib/geo";
import { DAY_NAMES, formatSlots, openStatus, parseOpeningHours } from "@/lib/opening-hours";
import { useUserState } from "@/lib/user-state";

interface Details {
  address: string;
  hours: string | null;
  phone: string | null;
  website: string | null;
}

export function StoreDetailDialog({ store, onClose }: { store: StoreWithDistance; onClose: () => void }) {
  const { isFavorite, toggleFavorite } = useUserState();
  const [details, setDetails] = useState<Details | null>(null);
  const [error, setError] = useState(false);
  const favorite = isFavorite(store.id);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/stores/details?id=${encodeURIComponent(store.id)}&lat=${store.lat}&lng=${store.lng}`, { signal: controller.signal })
      .then((response) => (response.ok ? (response.json() as Promise<Details>) : Promise.reject(new Error(String(response.status)))))
      .then(setDetails)
      .catch((e: Error) => {
        if (e.name !== "AbortError") setError(true);
      });
    return () => controller.abort();
  }, [store.id, store.lat, store.lng]);

  const address = details?.address || store.address;
  const week = details?.hours ? parseOpeningHours(details.hours) : null;
  const status = week ? openStatus(week) : null;
  const today = (new Date().getDay() + 6) % 7;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lng}`;
  const website = details?.website && /^https?:\/\//i.test(details.website) ? details.website : null;

  return (
    <Modal title={store.name} onClose={onClose}>
      <div className="flex flex-col gap-space-md">
        <p className="font-body-sm text-body-sm text-on-surface-variant -mt-space-sm">
          {store.chainName} · a {formatDistance(store.distanceKm)} da te
        </p>

        <div className="flex items-start gap-space-sm">
          <Icon name="location_on" className="text-tertiary text-xl shrink-0" />
          <div className="flex flex-col">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Indirizzo</span>
            {!details && !error && !address ? (
              <span className="font-body-md text-body-md text-on-surface-variant">Cerco l&apos;indirizzo…</span>
            ) : (
              <span className="font-body-md text-body-md text-on-surface">{address || "Indirizzo non disponibile"}</span>
            )}
          </div>
        </div>

        <div className="flex items-start gap-space-sm">
          <Icon name="schedule" className="text-tertiary text-xl shrink-0" />
          <div className="flex flex-col gap-space-xs w-full">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Orari di apertura</span>
            {!details && !error ? (
              <span className="font-body-md text-body-md text-on-surface-variant">Carico gli orari…</span>
            ) : error ? (
              <span className="font-body-md text-body-md text-error">Non riesco a leggere gli orari in questo momento.</span>
            ) : week ? (
              <>
                {status ? (
                  <span className={`font-body-sm text-body-sm font-bold ${status.open ? "text-primary" : "text-error"}`}>{status.text}</span>
                ) : null}
                <ul className="flex flex-col">
                  {DAY_NAMES.map((name, index) => (
                    <li key={name} className={`flex justify-between py-0.5 font-body-sm text-body-sm ${index === today ? "font-bold text-on-surface" : "text-on-surface-variant"}`}>
                      <span>{name}</span>
                      <span className="tabular-nums">{formatSlots(week[index])}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : details?.hours ? (
              <span className="font-body-md text-body-md text-on-surface">{details.hours}</span>
            ) : (
              <span className="font-body-md text-body-md text-on-surface-variant">Orari non indicati per questo punto vendita: controlla sul sito della catena o su Google Maps.</span>
            )}
          </div>
        </div>

        {details?.phone ? (
          <div className="flex items-center gap-space-sm">
            <Icon name="call" className="text-tertiary text-xl shrink-0" />
            <a href={`tel:${details.phone.replace(/[^+\d]/g, "")}`} className="font-body-md text-body-md text-primary font-semibold">
              {details.phone}
            </a>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-space-xs pt-space-xs">
          <a
            href={directions}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-[10rem] flex items-center justify-center gap-1.5 px-space-md py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold shadow-sm transition-colors"
          >
            <Icon name="directions" className="text-base" /> Indicazioni
          </a>
          <button
            onClick={() => toggleFavorite(store)}
            aria-pressed={favorite}
            className="flex-1 min-w-[10rem] flex items-center justify-center gap-1.5 px-space-md py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm text-body-sm font-semibold transition-colors"
          >
            <Icon name="star" className="text-base" filled={favorite} /> {favorite ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
          </button>
          {website ? (
            <a href={website} target="_blank" rel="noopener noreferrer" className="w-full text-center font-body-sm text-body-sm text-primary font-semibold hover:underline">
              Sito del negozio
            </a>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
