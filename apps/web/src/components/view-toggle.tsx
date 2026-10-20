"use client";

import { Icon } from "./icon";

const activeClasses =
  "flex items-center gap-1.5 px-space-sm py-1 rounded-lg bg-surface-container-lowest text-primary font-title-md text-title-md shadow-sm transition-all";
const inactiveClasses =
  "flex items-center gap-1.5 px-space-sm py-1 rounded-lg text-on-surface-variant hover:text-on-surface font-body-sm text-body-sm transition-all";

export type ComparisonView = "cards" | "table";

export function ViewToggle({ view, onChange }: { view: ComparisonView; onChange: (view: ComparisonView) => void }) {
  return (
    <div className="flex items-center gap-space-xs self-start md:self-auto bg-surface-container-low p-1.5 rounded-xl shadow-sm">
      <button className={view === "cards" ? activeClasses : inactiveClasses} onClick={() => onChange("cards")} aria-pressed={view === "cards"}>
        <Icon name="grid_view" className="text-lg" />
        <span className="hidden sm:inline font-body-sm text-body-sm font-semibold">Schede Matrice</span>
      </button>
      <button className={view === "table" ? activeClasses : inactiveClasses} onClick={() => onChange("table")} aria-pressed={view === "table"}>
        <Icon name="table_rows" className="text-lg" />
        <span className="hidden sm:inline font-body-sm text-body-sm">Tabella Rapida</span>
      </button>
    </div>
  );
}
