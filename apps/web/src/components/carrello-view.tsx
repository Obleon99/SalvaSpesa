"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { planBasket, type BasketPlan } from "@salvaspesa/deal-logic";
import { Icon } from "./icon";
import { daysLeft, expiryLabel, formatPrice } from "@/lib/offer-search";
import { useActiveOffers } from "@/lib/use-comparison";
import { useOfferActions } from "@/lib/use-offer-actions";
import { useUserState, type CartItem } from "@/lib/user-state";

const SEGMENT_COLORS = ["bg-primary", "bg-tertiary", "bg-secondary-container"];

const qtyOf = (item: CartItem) => item.quantity ?? 1;
const money = (value: number) => Math.round(value * 100) / 100;

export function CarrelloView() {
  const { ready, cart, setCartQuantity, clearCart, toggleCartItem, profile, savedProducts, toggleSavedProduct, alerts, removeAlert } = useUserState();
  const active = useActiveOffers();
  const actions = useOfferActions();
  const [selectedStores, setSelectedStores] = useState<number | null>(null);

  const total = money(cart.reduce((sum, item) => sum + item.price * qtyOf(item), 0));
  const savings = money(cart.reduce((sum, item) => sum + Math.max(0, (item.originalPrice ?? item.price) - item.price) * qtyOf(item), 0));
  const budget = profile.weeklyBudget;

  const groups = useMemo(() => {
    const map = new Map<string, { title: string; items: CartItem[] }>();
    for (const item of cart) {
      const key = `${item.chainName}|${item.storeName}`;
      const place = item.storeName && item.storeName !== item.chainName ? ` • ${item.storeName}` : "";
      map.set(key, { title: `${item.chainName}${place}`, items: [...(map.get(key)?.items ?? []), item] });
    }
    return [...map.values()];
  }, [cart]);

  const plansView = useMemo(() => {
    if (cart.length === 0) return [] as ReturnType<typeof weigh>[];
    const lines = cart.map((item) => ({ key: item.key, chainId: item.chainId, price: item.price, brand: item.brand ?? null, name: item.name, packageText: item.packageText ?? null, ean: item.ean ?? null }));
    return planBasket(lines, active).plans.map((plan) => weigh(plan, cart));
  }, [cart, active]);

  const best = plansView.slice().sort((a, b) => b.covered - a.covered || b.savings - a.savings)[0];
  const shown = plansView.find((p) => p.stores === selectedStores) ?? best ?? null;

  function applyPlan(view: ReturnType<typeof weigh>) {
    const byId = new Map(active.map((offer) => [offer.id, offer]));
    for (const assignment of view.assignments) {
      const item = cart.find((c) => c.key === assignment.lineKey);
      const offer = byId.get(assignment.offerId);
      if (!item || !offer || item.key === offer.id) continue;
      const quantity = qtyOf(item);
      toggleCartItem(item);
      actions.toggleCart(offer);
      setCartQuantity(offer.id, quantity);
    }
  }

  if (ready && cart.length === 0) {
    return (
      <>
        <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Carrello Risparmio Famiglia</h1>
        <div className="bg-surface-container-low rounded-3xl p-space-xl flex flex-col items-center text-center gap-space-sm">
          <div className="w-14 h-14 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed">
            <Icon name="shopping_cart" className="text-3xl" />
          </div>
          <h2 className="font-headline-sm text-headline-sm text-on-surface">Il carrello è vuoto</h2>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
            Aggiungi le offerte che ti interessano da «Volantini &amp; Offerte» o dai confronti: qui vedrai il totale per negozio e come dividere la spesa per risparmiare.
          </p>
          <div className="flex flex-wrap justify-center gap-space-sm">
            <Link href="/volantini" className="px-space-md py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold shadow-sm">Sfoglia le offerte</Link>
            <Link href="/" className="px-space-md py-2.5 rounded-xl bg-surface-container-lowest hover:bg-surface-container text-primary font-body-sm text-body-sm font-semibold shadow-sm">Vai ai confronti</Link>
          </div>
        </div>
        <SavedAndAlerts savedProducts={savedProducts} alerts={alerts} onUnsave={toggleSavedProduct} onRemoveAlert={removeAlert} />
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-sm">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Carrello Risparmio Famiglia</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {cart.length} {cart.length === 1 ? "articolo" : "articoli"} in {groups.length} {groups.length === 1 ? "negozio" : "negozi"}. I prezzi sono quelli dei volantini attivi.
          </p>
        </div>
        <button onClick={clearCart} className="self-start md:self-auto px-space-md py-2 rounded-xl bg-surface-container-lowest hover:bg-surface-container text-error font-body-sm text-body-sm font-semibold shadow-sm flex items-center gap-1">
          <Icon name="delete" className="text-base" /> Svuota il carrello
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        <div className="lg:col-span-7 flex flex-col gap-space-sm">
          {groups.map((group) => {
            const subtotal = money(group.items.reduce((sum, item) => sum + item.price * qtyOf(item), 0));
            return (
              <section key={group.title} className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm flex flex-col gap-space-xs">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-title-md text-title-md font-bold text-on-surface flex items-center gap-space-xs">
                    <Icon name="storefront" className="text-primary text-xl" /> {group.title}
                  </h2>
                  <span className="font-title-md text-title-md font-bold text-primary tabular-nums">{formatPrice(subtotal)}</span>
                </div>
                <ul className="flex flex-col divide-y divide-outline-variant/30">
                  {group.items.map((item) => (
                    <li key={item.key} className="py-space-xs flex items-center gap-space-sm">
                      <div className="w-12 h-12 rounded-lg bg-surface-container-low flex items-center justify-center shrink-0 overflow-hidden">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" />
                        ) : (
                          <Icon name="image" className="text-outline" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-body-sm text-body-sm font-semibold text-on-surface line-clamp-2">{item.name}</div>
                        <div className="font-label-unit text-label-unit text-on-surface-variant">
                          {formatPrice(item.price)} cad.
                          {item.originalPrice && item.originalPrice > item.price ? ` • risparmi ${formatPrice((item.originalPrice - item.price) * qtyOf(item))}` : ""}
                          {item.validTo && daysLeft(item.validTo) <= 2 ? <span className="text-error font-bold"> • {expiryLabel(item.validTo)}</span> : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button aria-label="Diminuisci quantità" onClick={() => setCartQuantity(item.key, qtyOf(item) - 1)} className="w-7 h-7 rounded-full bg-surface-container text-primary flex items-center justify-center">
                          <Icon name={qtyOf(item) <= 1 ? "delete" : "remove"} className="text-base" />
                        </button>
                        <span className="w-6 text-center font-title-md text-title-md tabular-nums">{qtyOf(item)}</span>
                        <button aria-label="Aumenta quantità" onClick={() => setCartQuantity(item.key, qtyOf(item) + 1)} className="w-7 h-7 rounded-full bg-surface-container text-primary flex items-center justify-center">
                          <Icon name="add" className="text-base" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        <aside className="lg:col-span-5 flex flex-col gap-space-sm lg:sticky lg:top-28">
          <section className="bg-surface-container-lowest rounded-2xl p-space-md shadow-md flex flex-col gap-space-xs">
            <div className="flex items-baseline justify-between">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase font-bold">Totale carrello</span>
              <span className="font-label-price-lg text-label-price-lg text-on-surface tabular-nums">{formatPrice(total)}</span>
            </div>
            {savings > 0 ? (
              <div className="flex items-center justify-between bg-primary-fixed/30 px-space-sm py-1.5 rounded-xl">
                <span className="font-body-sm text-body-sm text-on-primary-fixed font-semibold flex items-center gap-1"><Icon name="savings" className="text-base" /> Risparmi con le offerte</span>
                <span className="font-title-md text-title-md font-bold text-primary tabular-nums">{formatPrice(savings)}</span>
              </div>
            ) : null}
            {budget ? (
              <div className="flex flex-col gap-1 mt-1">
                <div className="flex justify-between font-body-sm text-body-sm text-on-surface">
                  <span>Budget settimanale</span>
                  <span className={`font-semibold tabular-nums ${total > budget ? "text-error" : "text-on-surface"}`}>
                    {formatPrice(total)} / {formatPrice(budget)}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${total > budget ? "bg-error" : "bg-primary"}`} style={{ width: `${Math.min(100, Math.round((total / budget) * 100))}%` }} />
                </div>
                <span className="font-label-unit text-label-unit text-on-surface-variant">
                  {total > budget ? `Sei sopra il budget di ${formatPrice(total - budget)}` : `Ti restano ${formatPrice(budget - total)} del budget settimanale`}
                </span>
              </div>
            ) : (
              <p className="font-label-unit text-label-unit text-on-surface-variant">Imposta la spesa settimanale nel tuo profilo per confrontarla con il carrello.</p>
            )}
          </section>

          <section className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm flex flex-col gap-space-sm" aria-label="Divisione della spesa">
            <div>
              <h2 className="font-title-md text-title-md font-bold text-on-surface flex items-center gap-space-xs">
                <Icon name="call_split" className="text-primary text-xl" /> Dividi la spesa tra più negozi
              </h2>
              <p className="font-label-unit text-label-unit text-on-surface-variant">Cerco gli stessi prodotti (stessa marca e formato) nei tuoi supermercati preferiti.</p>
            </div>

            {plansView.length === 0 ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant">Non trovo gli stessi prodotti in altri supermercati preferiti: aggiungine altri per confrontare.</p>
            ) : (
              <>
                <div className="flex gap-space-xs">
                  {plansView.map((plan) => (
                    <button
                      key={plan.stores}
                      onClick={() => setSelectedStores(plan.stores)}
                      aria-pressed={shown?.stores === plan.stores}
                      className={`flex-1 px-space-xs py-1.5 rounded-xl font-body-sm text-body-sm font-semibold ${shown?.stores === plan.stores ? "bg-primary text-on-primary shadow-sm" : "bg-surface-container text-on-surface hover:bg-surface-container-high"}`}
                    >
                      {plan.stores} {plan.stores === 1 ? "negozio" : "negozi"}
                    </button>
                  ))}
                </div>

                {shown ? (
                  <div className="flex flex-col gap-space-xs">
                    <div className="flex items-baseline justify-between">
                      <span className="font-body-sm text-body-sm text-on-surface font-semibold">{shown.chainNames.join(" + ")}</span>
                      <span className="font-title-md text-title-md font-bold text-on-surface tabular-nums">{formatPrice(shown.total)}</span>
                    </div>
                    <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden flex">
                      {shown.perChain.map((entry, index) => (
                        <div key={entry.chainId} className={`${SEGMENT_COLORS[index % SEGMENT_COLORS.length]} h-full`} style={{ width: `${(entry.count / Math.max(1, shown.covered)) * 100}%` }} title={`${entry.chainName}: ${entry.count} articoli`} />
                      ))}
                    </div>
                    <ul className="flex flex-col gap-0.5">
                      {shown.perChain.map((entry, index) => (
                        <li key={entry.chainId} className="flex items-center justify-between font-label-unit text-label-unit text-on-surface-variant">
                          <span className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${SEGMENT_COLORS[index % SEGMENT_COLORS.length]}`} /> {entry.chainName}: {entry.count} {entry.count === 1 ? "articolo" : "articoli"}</span>
                          <span className="tabular-nums font-semibold">{formatPrice(entry.total)}</span>
                        </li>
                      ))}
                    </ul>
                    <p className={`font-body-sm text-body-sm ${shown.savings > 0 ? "text-primary font-semibold" : "text-on-surface-variant"}`}>
                      {shown.covered < shown.lines ? `Copre ${shown.covered} articoli su ${shown.lines}. ` : ""}
                      {shown.savings > 0
                        ? `Risparmi ${formatPrice(shown.savings)} rispetto a come hai composto il carrello.`
                        : "Non c'è un risparmio rispetto al carrello attuale."}
                    </p>
                    {shown.savings > 0 ? (
                      <button onClick={() => applyPlan(shown)} className="py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold shadow-sm flex items-center justify-center gap-1.5">
                        <Icon name="published_with_changes" className="text-base" /> Applica questo piano
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </>
            )}
          </section>
        </aside>
      </div>

      <SavedAndAlerts savedProducts={savedProducts} alerts={alerts} onUnsave={toggleSavedProduct} onRemoveAlert={removeAlert} />
    </>
  );
}

// Totali pesati per quantità e riepilogo per negozio di un piano.
function weigh(plan: BasketPlan, cart: CartItem[]) {
  const byKey = new Map(cart.map((item) => [item.key, item]));
  const perChain = new Map<string, { chainId: string; chainName: string; count: number; total: number }>();
  let total = 0;
  let baselineCovered = 0;
  for (const assignment of plan.assignments) {
    const item = byKey.get(assignment.lineKey);
    const quantity = item ? qtyOf(item) : 1;
    total += assignment.price * quantity;
    baselineCovered += (item?.price ?? assignment.price) * quantity;
    const entry = perChain.get(assignment.chainId) ?? { chainId: assignment.chainId, chainName: assignment.chainName, count: 0, total: 0 };
    entry.count += 1;
    entry.total += assignment.price * quantity;
    perChain.set(assignment.chainId, entry);
  }
  return {
    stores: plan.stores,
    chainNames: plan.chainNames,
    covered: plan.covered,
    lines: plan.lines,
    assignments: plan.assignments,
    total: money(total),
    savings: money(baselineCovered - total),
    perChain: [...perChain.values()].map((entry) => ({ ...entry, total: money(entry.total) })),
  };
}

function SavedAndAlerts({
  savedProducts,
  alerts,
  onUnsave,
  onRemoveAlert,
}: {
  savedProducts: ReturnType<typeof useUserState>["savedProducts"];
  alerts: ReturnType<typeof useUserState>["alerts"];
  onUnsave: ReturnType<typeof useUserState>["toggleSavedProduct"];
  onRemoveAlert: (key: string) => void;
}) {
  if (savedProducts.length === 0 && alerts.length === 0) return null;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
      {savedProducts.length > 0 ? (
        <section className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm flex flex-col gap-space-xs">
          <h2 className="font-title-md text-title-md font-bold text-on-surface flex items-center gap-space-xs"><Icon name="bookmark" className="text-primary text-xl" filled /> Prodotti salvati</h2>
          <ul className="flex flex-col divide-y divide-outline-variant/30">
            {savedProducts.map((product) => (
              <li key={product.key} className="py-space-xs flex items-center justify-between gap-space-sm">
                <Link href={`/?q=${encodeURIComponent(product.name)}#tracker`} className="min-w-0 hover:underline">
                  <div className="font-body-sm text-body-sm font-semibold text-on-surface truncate">{product.name}</div>
                  <div className="font-label-unit text-label-unit text-on-surface-variant">{product.chainName} • {formatPrice(product.price)}</div>
                </Link>
                <button aria-label="Rimuovi dai salvati" onClick={() => onUnsave({ key: product.key, name: product.name, chainName: product.chainName, price: product.price, imageUrl: product.imageUrl })} className="p-1.5 rounded-full text-outline hover:text-error hover:bg-surface-container-low">
                  <Icon name="close" className="text-lg" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {alerts.length > 0 ? (
        <section className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm flex flex-col gap-space-xs">
          <h2 className="font-title-md text-title-md font-bold text-on-surface flex items-center gap-space-xs"><Icon name="notifications_active" className="text-secondary text-xl" filled /> Avvisi prezzo</h2>
          <ul className="flex flex-col divide-y divide-outline-variant/30">
            {alerts.map((alert) => (
              <li key={alert.key} className="py-space-xs flex items-center justify-between gap-space-sm">
                <div className="min-w-0">
                  <div className="font-body-sm text-body-sm font-semibold text-on-surface truncate">{alert.name}</div>
                  <div className="font-label-unit text-label-unit text-on-surface-variant">{alert.chainName} • avviso sotto {formatPrice(alert.threshold)}</div>
                </div>
                <button aria-label="Togli l'avviso" onClick={() => onRemoveAlert(alert.key)} className="p-1.5 rounded-full text-outline hover:text-error hover:bg-surface-container-low">
                  <Icon name="close" className="text-lg" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
