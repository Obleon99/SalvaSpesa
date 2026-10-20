"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CATEGORIES, buildComparisonGroups, qualityLabels, summarizeGroups } from "@salvaspesa/deal-logic";
import { BrandTracker } from "./brand-tracker";
import { ComparisonSections } from "./comparison-sections";
import { FilterBar, type FilterOption } from "./filter-bar";
import { Icon } from "./icon";
import { InsightBanner } from "./insight-banner";
import { MethodologyFooter } from "./methodology-footer";
import { PageToolbar } from "./page-toolbar";
import { ProductModal } from "./product-modal";
import { ReportModal } from "./report-modal";
import { ScoringModal } from "./scoring-modal";
import type { ComparisonView } from "./view-toggle";
import { useActiveOffers, type CompareGroup, type CompareOffer } from "@/lib/use-comparison";
import { useUserState } from "@/lib/user-state";

function groupsToCsv(groups: CompareGroup[]): string {
  const header = ["Categoria", "Tipo di prodotto", "Livello", "Insegna", "Prodotto", "Formato", "Prezzo", "Prezzo al kg/l", "Unità", "Sconto %", "Punteggio"];
  const cardTier = new Map(groups.flatMap((g) => g.cards.map((c) => [c.scored.offer.id, c.tier] as const)));
  const rows = groups.flatMap((group) =>
    group.offers.map((entry) => [
      CATEGORIES.find((c) => c.id === group.family.category)?.label ?? "",
      group.family.title,
      cardTier.get(entry.offer.id) ?? entry.brandTier,
      entry.offer.chainName,
      entry.offer.name,
      entry.offer.packageText ?? "",
      entry.offer.price.toFixed(2).replace(".", ","),
      entry.unitPrice.toFixed(2).replace(".", ","),
      group.family.unit,
      entry.offer.discountPercent ?? "",
      entry.score.toFixed(1).replace(".", ","),
    ]),
  );
  const quote = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  return "﻿" + [header, ...rows].map((row) => row.map(quote).join(";")).join("\r\n");
}

function downloadCsv(groups: CompareGroup[]) {
  const blob = new Blob([groupsToCsv(groups)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `spesachiara-confronto-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function ConfrontaView() {
  const router = useRouter();
  const { ready, favorites, cart, offersStatus } = useUserState();
  const active = useActiveOffers();
  const [view, setView] = useState<ComparisonView>("cards");
  const [category, setCategory] = useState("all");
  const [hidden, setHidden] = useState<string[]>([]);
  const [opened, setOpened] = useState<CompareOffer | null>(null);
  const [modal, setModal] = useState<"scoring" | "report" | null>(null);

  const chains = useMemo(() => {
    const map = new Map<string, string>();
    for (const offer of active) map.set(offer.chainId, offer.chainName);
    return [...map.entries()].map(([id, label]): FilterOption => ({ id, label }));
  }, [active]);

  const visibleOffers = useMemo(() => active.filter((offer) => !hidden.includes(offer.chainId)), [active, hidden]);

  const allGroups = useMemo(() => buildComparisonGroups(visibleOffers), [visibleOffers]);
  const bioGroups = useMemo(
    () => buildComparisonGroups(visibleOffers.filter((offer) => qualityLabels(offer.name, offer.description, offer.brand).includes("Bio"))),
    [visibleOffers],
  );

  const groups = category === "all" ? allGroups : category === "bio" ? bioGroups : allGroups.filter((g) => g.family.category === category);
  const summary = useMemo(() => summarizeGroups(allGroups), [allGroups]);

  const categories: FilterOption[] = [
    { id: "all", label: "Tutte le Categorie", count: allGroups.length },
    ...CATEGORIES.map((c) => ({ id: c.id, label: c.label, icon: c.icon, count: allGroups.filter((g) => g.family.category === c.id).length })),
    { id: "bio", label: "Bio & Filiera", icon: "eco", count: bioGroups.length },
  ];

  const cartSavings = cart.reduce((sum, item) => sum + Math.max(0, (item.originalPrice ?? item.price) - item.price) * (item.quantity ?? 1), 0);

  function toggleChain(id: string) {
    setHidden((current) => {
      if (current.includes(id)) return current.filter((c) => c !== id);
      return chains.length - current.length <= 1 ? current : [...current, id];
    });
  }

  function compareInTracker(offer: CompareOffer) {
    router.push(`/?q=${encodeURIComponent(offer.name)}#tracker`);
  }

  const noFavorites = ready && favorites.length === 0;

  return (
    <>
      <PageToolbar view={view} onView={setView} />
      <FilterBar
        categories={categories}
        category={category}
        onCategory={setCategory}
        chains={chains}
        selectedChains={hidden.length === 0 ? [] : chains.filter((c) => !hidden.includes(c.id)).map((c) => c.id)}
        onToggleChain={toggleChain}
      />

      <InsightBanner groups={allGroups} summary={summary} cartSavings={cartSavings} cartItems={cart.length} onDownload={() => downloadCsv(groups.length ? groups : allGroups)} />

      {noFavorites ? (
        <div className="bg-surface-container-low rounded-2xl p-space-md flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
          <div className="flex items-center gap-space-sm">
            <Icon name="storefront" className="text-primary text-3xl" />
            <p className="font-body-md text-body-md text-on-surface">Scegli i supermercati preferiti: i confronti useranno le loro offerte reali.</p>
          </div>
          <Link href="/supermercati" className="shrink-0 px-space-md py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold shadow-sm text-center">
            Scegli i supermercati
          </Link>
        </div>
      ) : null}

      {offersStatus === "loading" ? (
        <div role="status" className="bg-surface-container-low rounded-2xl p-space-md flex items-center gap-space-sm">
          <Icon name="progress_activity" className="text-primary text-2xl animate-spin" />
          <span className="font-body-md text-body-md text-on-surface">Carico le offerte dei tuoi supermercati…</span>
        </div>
      ) : null}

      {!noFavorites && offersStatus === "idle" && groups.length === 0 ? (
        <p className="font-body-md text-body-md text-on-surface-variant">
          Nessun confronto disponibile per questo filtro: servono almeno due offerte dello stesso tipo di prodotto nei supermercati selezionati.
        </p>
      ) : null}

      <ComparisonSections groups={groups} view={view} onOpen={setOpened} onCompare={compareInTracker} onScoring={() => setModal("scoring")} />

      <BrandTracker />
      <MethodologyFooter onScoring={() => setModal("scoring")} onReport={() => setModal("report")} />

      {opened ? <ProductModal offer={opened} onClose={() => setOpened(null)} /> : null}
      {modal === "scoring" ? <ScoringModal onClose={() => setModal(null)} /> : null}
      {modal === "report" ? <ReportModal onClose={() => setModal(null)} /> : null}
    </>
  );
}
