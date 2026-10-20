"use client";

import { CATEGORIES, offerLabel, type ComparisonCard } from "@salvaspesa/deal-logic";
import { ComparisonTierCard } from "./comparison-tier-card";
import { Icon } from "./icon";
import { formatPrice, formatUnitPrice } from "@/lib/offer-search";
import type { CompareGroup, CompareOffer } from "@/lib/use-comparison";

interface SectionProps {
  groups: CompareGroup[];
  view: "cards" | "table";
  onOpen: (offer: CompareOffer) => void;
  onCompare: (offer: CompareOffer) => void;
  onScoring: () => void;
}

const categoryLabel = (group: CompareGroup) => CATEGORIES.find((c) => c.id === group.family.category)?.label ?? "";

const stripClass = { leader: "bg-surface-container-low", winner: "bg-primary-fixed/25", discount: "bg-surface-container-low" } as const;
const tierWord = { leader: "Marca leader", winner: "Miglior scelta", discount: "Massimo risparmio" } as const;

function FeaturedGroup({ group, onOpen, onCompare, onScoring }: Omit<SectionProps, "groups" | "view"> & { group: CompareGroup }) {
  const winner = group.cards.find((c) => c.tier === "winner") ?? group.cards.find((c) => c.tier === "discount");
  return (
    <div className="flex flex-col gap-space-sm">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1">
        <div>
          <span className="font-label-caps text-label-caps text-primary uppercase font-bold tracking-wider">
            {categoryLabel(group)} • Confronto marche e prezzi
          </span>
          <h3 className="font-headline-md text-headline-md text-on-surface">
            {group.family.title} <span className="text-on-surface-variant font-semibold">(al {group.family.unit})</span>
          </h3>
        </div>
        <span className="font-label-unit text-label-unit text-on-surface-variant">
          Confronto aggiornato a oggi su {group.bestByChain.length} {group.bestByChain.length === 1 ? "catena" : "catene"} • {group.offers.length} offerte
        </span>
      </div>

      {group.recommendation && winner ? (
        <div className="bg-secondary-fixed/50 text-on-secondary-fixed p-space-sm rounded-xl flex items-center justify-between gap-space-xs shadow-sm">
          <div className="flex items-center gap-space-xs">
            <Icon name="recommend" className="text-secondary text-xl shrink-0" />
            <p className="font-body-sm text-body-sm">
              <strong className="font-bold">CONSIGLIO SPESACHIARA:</strong> {group.recommendation}
            </p>
          </div>
          <button
            onClick={() => onOpen(winner.scored.offer)}
            className="shrink-0 px-3 py-1 bg-surface-container-lowest text-on-surface text-label-unit font-label-unit font-bold rounded-lg shadow-sm hover:bg-surface-container transition-colors"
          >
            Vedi scheda prodotto
          </button>
        </div>
      ) : null}

      <div className={`grid grid-cols-1 gap-space-md ${group.cards.length >= 3 ? "md:grid-cols-3" : group.cards.length === 2 ? "md:grid-cols-2" : ""}`}>
        {group.cards.map((card) => (
          <ComparisonTierCard key={card.scored.offer.id} card={card} unit={group.family.unit} leaderLabel={group.referenceLabel} onOpen={onOpen} onCompare={onCompare} onScoring={onScoring} />
        ))}
      </div>
    </div>
  );
}

function StripRow({ card, unit, onOpen }: { card: ComparisonCard<CompareOffer>; unit: "kg" | "l"; onOpen: (offer: CompareOffer) => void }) {
  const offer = card.scored.offer;
  const winner = card.tier === "winner";
  return (
    <button onClick={() => onOpen(offer)} className={`p-space-xs rounded-xl flex items-center justify-between gap-space-xs text-left w-full ${stripClass[card.tier]}`}>
      <div className="flex items-center gap-space-xs min-w-0">
        <div className="w-10 h-14 rounded bg-surface-container-lowest flex items-center justify-center shrink-0 overflow-hidden">
          {offer.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="w-full h-full object-contain" src={offer.imageUrl} alt={offer.name} />
          ) : (
            <Icon name="image" className="text-outline" />
          )}
        </div>
        <div className="min-w-0">
          <div className={`font-title-md text-title-md font-bold truncate ${winner ? "text-primary" : "text-on-surface"}`}>{offer.name}</div>
          <div className={`font-label-unit text-label-unit truncate ${winner ? "text-primary font-medium" : "text-on-surface-variant"}`}>
            {tierWord[card.tier]} • {offerLabel(card.scored)}
          </div>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className={`font-label-price-sm text-label-price-sm tabular-nums ${card.tier === "leader" ? "text-on-surface" : "text-primary font-bold"}`}>{formatPrice(offer.price)}</div>
        <div className="font-label-unit text-label-unit text-on-surface-variant tabular-nums">
          {card.savingsPercent ? `-${card.savingsPercent}% • ` : ""}
          {formatUnitPrice({ unitPrice: card.scored.unitPrice, unit })}
        </div>
      </div>
    </button>
  );
}

function BentoGroup({ group, onOpen, onCompare }: { group: CompareGroup; onOpen: SectionProps["onOpen"]; onCompare: SectionProps["onCompare"] }) {
  const first = group.cards[0]?.scored.offer;
  return (
    <div className="bg-surface-container-lowest rounded-3xl p-space-md md:p-space-lg shadow-sm flex flex-col justify-between gap-space-sm">
      <div className="flex flex-col gap-space-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="font-label-caps text-label-caps uppercase font-bold tracking-wider text-primary">{categoryLabel(group)}</span>
          <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface text-label-unit font-label-unit">Prezzo al {group.family.unit}</span>
        </div>
        <h4 className="font-headline-sm text-headline-sm text-on-surface font-bold">{group.family.title}</h4>
        {group.recommendation ? <p className="font-body-sm text-body-sm text-on-surface-variant">{group.recommendation}</p> : null}
        <div className="mt-space-xs flex flex-col gap-space-xs">
          {group.cards.map((card) => (
            <StripRow key={card.scored.offer.id} card={card} unit={group.family.unit} onOpen={onOpen} />
          ))}
        </div>
      </div>
      <div className="pt-space-xs flex items-center justify-between text-label-unit font-label-unit text-on-surface-variant">
        <span className="flex items-center gap-1">
          <Icon name="balance" className="text-sm text-secondary" /> {group.offers.length} offerte confrontate in {group.bestByChain.length}{" "}
          {group.bestByChain.length === 1 ? "catena" : "catene"}
        </span>
        {first ? (
          <button onClick={() => onCompare(first)} className="text-primary font-bold hover:underline">
            Cerca nel tracker
          </button>
        ) : null}
      </div>
    </div>
  );
}

function MatrixTable({ groups, onOpen }: { groups: CompareGroup[]; onOpen: SectionProps["onOpen"] }) {
  const chains = [...new Map(groups.flatMap((g) => g.bestByChain.map((e) => [e.offer.chainId, e.offer.chainName] as const))).entries()];
  return (
    <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse">
        <thead>
          <tr className="bg-surface-container-low">
            <th className="sticky left-0 z-10 bg-surface-container-low text-left px-space-sm py-space-xs font-label-caps text-label-caps text-on-surface-variant uppercase">Prodotto (al kg/l)</th>
            {chains.map(([id, name]) => (
              <th key={id} className="px-space-sm py-space-xs font-label-caps text-label-caps text-on-surface-variant uppercase text-right">{name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((group, index) => {
            const cells = new Map(group.bestByChain.map((e) => [e.offer.chainId, e]));
            const units = group.bestByChain.map((e) => e.unitPrice);
            const min = Math.min(...units);
            const max = Math.max(...units);
            const rowBg = index % 2 === 0 ? "bg-surface-container-lowest" : "bg-surface";
            return (
              <tr key={group.family.id} className={rowBg}>
                <th scope="row" className={`sticky left-0 z-10 ${rowBg} text-left px-space-sm py-space-xs`}>
                  <div className="font-title-md text-title-md text-on-surface font-bold">{group.family.label}</div>
                  <div className="font-label-unit text-label-unit text-on-surface-variant">{categoryLabel(group)} • €/{group.family.unit}</div>
                </th>
                {chains.map(([id]) => {
                  const entry = cells.get(id);
                  if (!entry) return <td key={id} className="px-space-sm py-space-xs text-right text-outline">—</td>;
                  const best = entry.unitPrice === min && max > min;
                  return (
                    <td key={id} className={`px-space-sm py-space-xs text-right ${best ? "bg-primary-fixed/25" : ""}`}>
                      <button onClick={() => onOpen(entry.offer)} className="text-right" title={entry.offer.name}>
                        <div className={`font-label-price-sm text-label-price-sm tabular-nums ${best ? "text-primary font-bold" : "text-on-surface"}`}>
                          {formatPrice(entry.unitPrice)}
                        </div>
                        <div className="font-label-unit text-label-unit text-on-surface-variant tabular-nums">{formatPrice(entry.offer.price)}</div>
                        {best ? (
                          <span className="inline-block mt-0.5 px-1.5 rounded-full bg-primary text-on-primary font-label-unit text-label-unit font-bold">
                            -{formatPrice(max - min)}/{group.family.unit}
                          </span>
                        ) : null}
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ComparisonSections({ groups, view, onOpen, onCompare, onScoring }: SectionProps) {
  if (groups.length === 0) return null;
  if (view === "table") return <MatrixTable groups={groups} onOpen={onOpen} />;

  const [featured, ...rest] = groups;
  return (
    <>
      <FeaturedGroup group={featured} onOpen={onOpen} onCompare={onCompare} onScoring={onScoring} />
      {rest.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
          {rest.map((group) => (
            <BentoGroup key={group.family.id} group={group} onOpen={onOpen} onCompare={onCompare} />
          ))}
        </div>
      ) : null}
    </>
  );
}
