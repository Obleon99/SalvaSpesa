import { Icon } from "./icon";
import { categoryTabs, chainTags } from "@/lib/mock-data";

export function FilterBar() {
  return (
    <div className="bg-surface-container-lowest p-space-sm rounded-2xl shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-space-sm">
      <div className="flex items-center gap-space-xs overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
        {categoryTabs.map((tab, index) => (
          <button
            key={tab.label}
            className={
              index === 0
                ? "px-space-sm py-1.5 rounded-full bg-primary text-on-primary font-body-sm text-body-sm font-semibold whitespace-nowrap shadow-sm"
                : "px-space-sm py-1.5 rounded-full bg-surface-container-low text-on-surface hover:bg-surface-container text-body-sm font-body-sm whitespace-nowrap transition-colors flex items-center gap-1"
            }
          >
            {tab.icon ? <Icon name={tab.icon} className="text-base" /> : null}
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-space-xs flex-wrap">
        <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">Insegne:</span>
        {chainTags.map((chain) => (
          <span
            key={chain.name}
            className="px-2 py-0.5 rounded-md bg-surface-container text-on-surface text-label-unit font-label-unit font-bold flex items-center gap-1"
          >
            <span className={`w-2 h-2 rounded-full ${chain.dotColorClass}`} /> {chain.name}
          </span>
        ))}
      </div>
    </div>
  );
}
