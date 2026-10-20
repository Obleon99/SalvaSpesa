"use client";

import { useState, type FormEvent } from "react";
import { Icon } from "./icon";
import { Modal } from "./modal";
import type { UserLocation } from "@/lib/geo";
import { useUserState } from "@/lib/user-state";

async function fetchLocations(params: string): Promise<UserLocation[]> {
  const response = await fetch(`/api/geocode?${params}`);
  const data = (await response.json()) as { results?: UserLocation[]; error?: string };
  if (!response.ok) throw new Error(data.error ?? "Ricerca non riuscita");
  return data.results ?? [];
}

export function LocationDialog() {
  const { location, radiusKm, setLocation, closeDialog } = useUserState();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserLocation[]>([]);
  const [selected, setSelected] = useState<UserLocation | null>(location);
  const [radius, setRadius] = useState(radiusKm);
  const [busy, setBusy] = useState<"search" | "geolocate" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSearch(event: FormEvent) {
    event.preventDefault();
    if (query.trim().length < 3) {
      setMessage("Inserisci almeno 3 caratteri (CAP, città o indirizzo).");
      return;
    }
    setBusy("search");
    setMessage(null);
    try {
      const found = await fetchLocations(`q=${encodeURIComponent(query.trim())}`);
      setResults(found);
      if (found.length === 0) setMessage("Nessun risultato: prova con un CAP o il nome della città.");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(null);
    }
  }

  function onGeolocate() {
    if (!navigator.geolocation) {
      setMessage("Il tuo browser non supporta la geolocalizzazione.");
      return;
    }
    setBusy("geolocate");
    setMessage(null);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const [found] = await fetchLocations(`lat=${coords.latitude}&lng=${coords.longitude}`);
          setSelected(found ?? { lat: coords.latitude, lng: coords.longitude, label: "La mia posizione" });
          setResults([]);
        } catch {
          setSelected({ lat: coords.latitude, lng: coords.longitude, label: "La mia posizione" });
        } finally {
          setBusy(null);
        }
      },
      () => {
        setBusy(null);
        setMessage("Non riesco a leggere la posizione: consenti l'accesso nel browser oppure inserisci il CAP.");
      },
      { enableHighAccuracy: false, timeout: 15000 },
    );
  }

  function onSave() {
    if (!selected) return;
    setLocation(selected, radius);
    closeDialog();
  }

  return (
    <Modal title="Dove fai la spesa?" onClose={closeDialog}>
      <p className="font-body-sm text-body-sm text-on-surface-variant -mt-space-xs">
        Usiamo la tua posizione solo per trovare i supermercati vicini. Resta salvata su questo dispositivo.
      </p>

      <button
        type="button"
        onClick={onGeolocate}
        disabled={busy !== null}
        className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-container disabled:opacity-60 text-on-primary font-body-sm text-body-sm font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
      >
        <Icon name="my_location" className="text-base" />
        {busy === "geolocate" ? "Cerco la tua posizione…" : "Usa la mia posizione"}
      </button>

      <form onSubmit={onSearch} className="flex flex-col gap-space-xs">
        <label htmlFor="location-query" className="font-label-caps text-label-caps text-on-surface-variant uppercase">
          Oppure cerca CAP, città o indirizzo
        </label>
        <div className="flex gap-space-xs">
          <input
            id="location-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="es. 20146 oppure Via Lorenteggio, Milano"
            className="flex-1 min-w-0 bg-surface-container-low px-space-sm py-2 rounded-xl font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={busy !== null}
            className="px-space-md py-2 rounded-xl bg-surface-container hover:bg-surface-container-high disabled:opacity-60 text-on-surface font-body-sm text-body-sm font-semibold transition-colors"
          >
            {busy === "search" ? "…" : "Cerca"}
          </button>
        </div>
      </form>

      {message ? <p className="font-body-sm text-body-sm text-error">{message}</p> : null}

      {results.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {results.map((result) => (
            <li key={`${result.lat},${result.lng}`}>
              <button
                type="button"
                onClick={() => {
                  setSelected(result);
                  setResults([]);
                }}
                className="w-full text-left px-space-sm py-2 rounded-xl bg-surface-container-low hover:bg-surface-container font-body-sm text-body-sm text-on-surface flex items-center gap-space-xs"
              >
                <Icon name="location_on" className="text-tertiary text-lg shrink-0" />
                {result.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {selected ? (
        <div className="flex items-center gap-space-xs bg-primary-fixed/30 px-space-sm py-2 rounded-xl">
          <Icon name="check_circle" className="text-primary text-lg shrink-0" filled />
          <span className="font-body-sm text-body-sm text-on-surface font-semibold">{selected.label}</span>
        </div>
      ) : null}

      <div className="flex flex-col gap-space-xs">
        <label htmlFor="radius" className="flex items-center justify-between font-body-sm text-body-sm text-on-surface">
          <span className="font-semibold">Raggio di ricerca</span>
          <span className="font-bold text-primary tabular-nums">{radius} km</span>
        </label>
        <input
          id="radius"
          type="range"
          min={1}
          max={20}
          step={1}
          value={radius}
          onChange={(event) => setRadius(Number(event.target.value))}
          className="w-full accent-primary"
        />
      </div>

      <div className="flex justify-end gap-space-xs pt-space-xs">
        <button
          type="button"
          onClick={closeDialog}
          className="px-space-md py-2 rounded-xl text-on-surface hover:bg-surface-container-high font-body-sm text-body-sm font-semibold transition-colors"
        >
          Annulla
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!selected}
          className="px-space-md py-2 rounded-xl bg-primary hover:bg-primary-container disabled:opacity-50 text-on-primary font-body-sm text-body-sm font-semibold transition-colors shadow-sm"
        >
          Salva posizione
        </button>
      </div>
    </Modal>
  );
}
