"use client";

import { Icon } from "./icon";
import { ViewToggle, type ComparisonView } from "./view-toggle";
import { useUserState } from "@/lib/user-state";

interface Props {
  view: ComparisonView;
  onView: (view: ComparisonView) => void;
}

export function PageToolbar({ view, onView }: Props) {
  const { ready, location, radiusKm, offersGeneratedAt } = useUserState();
  const time = offersGeneratedAt
    ? new Date(offersGeneratedAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
      <div className="flex flex-col">
        <div className="flex items-center gap-space-xxs text-on-surface-variant font-label-unit text-label-unit mb-1">
          <span>Home</span>
          <Icon name="chevron_right" className="text-xs" />
          <span>Confronto Intelligente</span>
          <Icon name="chevron_right" className="text-xs" />
          <span className="text-on-surface font-semibold">Marche Leader vs MDD</span>
        </div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Confronto Prezzi &amp; Marchi di Qualità</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
          {ready && location ? (
            <>
              Supermercati preferiti vicino a <span className="font-semibold text-on-surface">{location.label}</span> (raggio {radiusKm} km)
              {time ? ` • Rilevamento offerte delle ${time}` : ""}
            </>
          ) : (
            "Imposta la tua posizione e scegli i supermercati preferiti per confrontare le offerte."
          )}
        </p>
      </div>
      <ViewToggle view={view} onChange={onView} />
    </div>
  );
}
