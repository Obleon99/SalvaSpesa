"use client";

import { Icon } from "./icon";
import { ViewToggle } from "./view-toggle";
import { useUserState } from "@/lib/user-state";

export function PageToolbar() {
  const { ready, location, radiusKm } = useUserState();

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
      <div className="flex flex-col">
        <div className="flex items-center gap-space-xxs text-on-surface-variant font-label-unit text-label-unit mb-1">
          <span className="hover:text-primary cursor-pointer transition-colors">Home</span>
          <Icon name="chevron_right" className="text-xs" />
          <span className="hover:text-primary cursor-pointer transition-colors">Confronto Intelligente</span>
          <Icon name="chevron_right" className="text-xs" />
          <span className="text-on-surface font-semibold">Marche Leader vs MDD</span>
        </div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
          Confronto Prezzi &amp; Marchi di Qualità
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
          {ready && location ? (
            <>
              Supermercati rilevati a <span className="font-semibold text-on-surface">{location.label}</span> (raggio{" "}
              {radiusKm} km) • Dati dimostrativi
            </>
          ) : (
            "Imposta la tua posizione per vedere i supermercati vicino a te • Dati dimostrativi"
          )}
        </p>
      </div>
      <ViewToggle />
    </div>
  );
}
