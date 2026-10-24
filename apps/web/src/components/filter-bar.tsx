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
}

export function FilterBar({ categories, category, onCategory }: Props) {
  return (
    <div className="bg-surface-container-lowest p-space-sm rounded-2xl shadow-sm flex items-center">
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
    </div>
  );
}
