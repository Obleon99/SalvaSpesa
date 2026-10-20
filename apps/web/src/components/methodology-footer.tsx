"use client";

import { Icon } from "./icon";

export function MethodologyFooter({ onScoring, onReport }: { onScoring: () => void; onReport: () => void }) {
  return (
    <div className="bg-surface-container-low rounded-2xl p-space-md flex flex-col md:flex-row items-center justify-between gap-space-md">
      <div className="flex items-center gap-space-sm">
        <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed shrink-0">
          <Icon name="fact_check" className="text-xl" />
        </div>
        <div className="flex flex-col">
          <span className="font-title-md text-title-md font-bold text-on-surface">Come calcoliamo la convenienza e i risparmi?</span>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Confrontiamo le offerte attive dei tuoi supermercati sul prezzo al chilogrammo o al litro, distinguendo marca leader, marchio del distributore e altre
            marche; il punteggio tiene conto anche dello sconto e delle etichette di qualità dichiarate.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-space-sm shrink-0">
        <button
          onClick={onScoring}
          className="px-space-md py-2 rounded-xl bg-surface-container-lowest hover:bg-surface-container text-on-surface font-body-sm text-body-sm font-semibold shadow-sm transition-colors"
        >
          Criteri di Scoring
        </button>
        <button
          onClick={onReport}
          className="px-space-md py-2 rounded-xl bg-surface-container-lowest hover:bg-surface-container text-primary font-body-sm text-body-sm font-semibold shadow-sm transition-colors flex items-center gap-1"
        >
          <Icon name="flag" className="text-base" />
          <span>Segnala un Prezzo</span>
        </button>
      </div>
    </div>
  );
}
