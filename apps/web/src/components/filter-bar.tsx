"use client";

import { Icon } from "./icon";

export interface FilterOption {
  id: string;
  label: string;
  icon?: string;
  count?: number;
}

interface Props {
  categories: FilterOption[];
  category: string;
  onCategory: (id: string) => void;
  chains: FilterOption[];
  selectedChains: string[];
  onToggleChain: (id: string) => void;
}

export function FilterBar({ categories, category, onCategory, chains, selectedChains, onToggleChain }: Props) {
  return (
    <div className="bg-surface-container-lowest p-space-sm rounded-2xl shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-space-sm">
      <div className="flex items-center gap-space-xs overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
        {categories.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onCategory(tab.id)}
            aria-pressed={category === tab.id}
            className={
              category === tab.id
                ? "px-space-sm py-1.5 rounded-full bg-primary text-on-primary font-body-sm text-body-sm font-semibold whitespace-nowrap shadow-sm flex items-center gap-1"
                : "px-space-sm py-1.5 rounded-full bg-surface-container-low text-on-surface hover:bg-surface-container text-body-sm font-body-sm whitespace-nowrap transition-colors flex items-center gap-1"
            }
          >
            {tab.icon ? <Icon name={tab.icon} className="text-base" /> : null}
            {tab.label}
            {tab.count !== undefined ? <span className="opacity-70">({tab.count})</span> : null}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-space-xs flex-wrap">
        <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">Insegne:</span>
        {chains.length === 0 ? <span className="font-label-unit text-label-unit text-on-surface-variant">scegli i preferiti</span> : null}
        {chains.map((chain) => {
          const on = selectedChains.length === 0 || selectedChains.includes(chain.id);
          return (
            <button
              key={chain.id}
              onClick={() => onToggleChain(chain.id)}
              aria-pressed={on}
              className={`px-2 py-0.5 rounded-md text-label-unit font-label-unit font-bold flex items-center gap-1 transition-colors ${
                on ? "bg-surface-container text-on-surface" : "bg-surface-container-low text-outline line-through"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${on ? "bg-primary" : "bg-outline-variant"}`} /> {chain.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
