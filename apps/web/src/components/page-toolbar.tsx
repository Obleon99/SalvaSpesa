"use client";

import { ViewToggle, type ComparisonView } from "./view-toggle";

interface Props {
  view: ComparisonView;
  onView: (view: ComparisonView) => void;
}

export function PageToolbar({ view, onView }: Props) {
  return (
    <div className="flex items-center justify-between gap-space-sm">
      <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Confronta prezzi</h1>
      <ViewToggle view={view} onChange={onView} />
    </div>
  );
}
