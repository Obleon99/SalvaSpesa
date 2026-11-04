"use client";

import { Icon } from "./icon";
import { formatPrice } from "@/lib/offer-search";
import type { CompareGroup } from "@/lib/use-comparison";
import type { ComparisonSummary } from "@salvaspesa/deal-logic";

interface Props {
  groups: CompareGroup[];
  summary: ComparisonSummary;
  cartSavings: number;
  cartItems: number;
  onDownload: () => void;
}

export function InsightBanner({ groups, summary, cartSavings, cartItems, onDownload }: Props) {
  const benchmark = groups.find((g) => g.potentialSavingsPercent !== null && g.cards.some((c) => c.tier === "leader"));
  const leader = benchmark?.cards.find((c) => c.tier === "leader");
  const alternative = benchmark?.cards.filter((c) => c.tier !== "leader").sort((a, b) => (b.savingsPercent ?? 0) - (a.savingsPercent ?? 0))[0];
  const hasBenchmark = benchmark && leader && alternative;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-surface-container-low p-space-md md:p-space-xl shadow-md">
      <div className="absolute -top-12 -right-12 w-96 h-96 bg-primary-fixed/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 left-1/3 w-80 h-80 bg-secondary-fixed/40 rounded-full blur-2xl pointer-events-none" />
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-center">
        <div className="lg:col-span-8 flex flex-col gap-space-xs">
          <div className="inline-flex items-center gap-space-xs px-space-sm py-1 rounded-full bg-surface-container-lowest text-primary font-label-caps text-label-caps uppercase tracking-wider w-fit shadow-sm">
            <Icon name="psychology_alt" className="text-sm text-primary" />
            <span>Analisi SalvaSpesa • sui tuoi supermercati</span>
          </div>
          {summary.averageSavingsPercent !== null && summary.best ? (
            <>
              <h2 className="font-headline-md text-headline-md md:font-headline-lg md:text-headline-lg text-on-surface leading-tight">
                Scegliendo l&apos;alternativa più conveniente alla marca leader risparmi in media{" "}
                <span className="text-primary underline decoration-primary-fixed decoration-4 underline-offset-4">il {summary.averageSavingsPercent}%</span> al kg.
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
                Su {summary.groupsWithLeader} tipi di prodotto con una marca leader in offerta, il caso migliore è{" "}
                <strong className="text-on-surface font-bold">{summary.best.familyTitle.toLowerCase()}</strong> con un risparmio del{" "}
                <strong className="text-on-surface font-bold">{summary.best.savingsPercent}%</strong>. Sono confronti sul prezzo al kg o al litro delle offerte attive.
              </p>
            </>
          ) : (
            <>
              <h2 className="font-headline-md text-headline-md md:font-headline-lg md:text-headline-lg text-on-surface leading-tight">
                Confronta marche e marchi del distributore sulle offerte dei tuoi supermercati.
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
                Scegli i supermercati preferiti: mostrerò dove conviene la marca leader e dove un&apos;alternativa costa meno al kg o al litro.
              </p>
            </>
          )}
          <div className="mt-space-xs flex flex-wrap items-center gap-space-sm">
            <div className="flex items-center gap-2 bg-surface-container-lowest px-space-sm py-2 rounded-xl shadow-sm">
              <Icon name="savings" className="text-primary text-xl" />
              <div>
                <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">Risparmio nel tuo carrello</p>
                <p className="font-title-md text-title-md font-bold text-primary tabular-nums">
                  {cartItems > 0 ? formatPrice(cartSavings) : "Carrello vuoto"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-surface-container-lowest px-space-sm py-2 rounded-xl shadow-sm">
              <Icon name="fact_check" className="text-tertiary text-xl" />
              <div>
                <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">Offerte confrontate</p>
                <p className="font-title-md text-title-md font-bold text-on-surface tabular-nums">
                  {summary.comparedOffers.toLocaleString("it-IT")} in {summary.groups} categorie
                </p>
              </div>
            </div>
            <button
              onClick={onDownload}
              disabled={groups.length === 0}
              className="bg-primary hover:bg-primary-container disabled:opacity-50 text-on-primary font-body-sm text-body-sm font-semibold px-space-md py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <span>Scarica il confronto (CSV)</span>
              <Icon name="download" className="text-sm" />
            </button>
          </div>
        </div>

        <div className="lg:col-span-4 bg-surface-container-lowest p-space-md rounded-2xl shadow-sm flex flex-col gap-space-sm">
          {hasBenchmark ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase font-bold tracking-wider">
                  Benchmark {benchmark.family.label.toLowerCase()}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-secondary-fixed text-on-secondary-fixed text-label-unit font-bold">-{alternative.savingsPercent}% prezzo</span>
              </div>
              <div className="flex flex-col gap-space-xs my-1">
                <div className="flex items-center justify-between gap-2 text-body-sm font-body-sm">
                  <span className="font-semibold text-on-surface truncate">{benchmark.referenceLabel}</span>
                  <span className="font-bold text-on-surface tabular-nums shrink-0">{formatPrice(leader.scored.unitPrice)}/{benchmark.family.unit}</span>
                </div>
                <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-outline rounded-full" style={{ width: "100%" }} />
                </div>
                <div className="flex items-center justify-between gap-2 text-body-sm font-body-sm mt-1">
                  <span className="font-semibold text-primary truncate">
                    {alternative.scored.offer.chainName}: {alternative.scored.offer.name.slice(0, 28)}
                  </span>
                  <span className="font-bold text-primary tabular-nums shrink-0">{formatPrice(alternative.scored.unitPrice)}/{benchmark.family.unit}</span>
                </div>
                <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${Math.max(8, Math.round((alternative.scored.unitPrice / leader.scored.unitPrice) * 100))}%` }}
                  />
                </div>
              </div>
              <div className="bg-surface-container-low p-2.5 rounded-xl text-on-surface-variant text-label-unit font-label-unit flex items-start gap-2">
                <Icon name="info" className="text-primary text-base shrink-0 mt-0.5" />
                <span>Confronto sul prezzo al {benchmark.family.unit} delle offerte attive. Il punteggio e le regole sono spiegati in «Criteri di scoring».</span>
              </div>
            </>
          ) : (
            <div className="flex items-start gap-2 text-on-surface-variant font-body-sm text-body-sm">
              <Icon name="info" className="text-primary text-base shrink-0 mt-0.5" />
              <span>Il confronto tra marca leader e alternativa compare quando i tuoi supermercati hanno in offerta lo stesso tipo di prodotto.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
