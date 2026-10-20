"use client";

import { useState } from "react";
import { Icon } from "./icon";
import { brandTracker as data } from "@/lib/mock-data";

export function BrandTracker() {
  const [searchValue, setSearchValue] = useState(data.searchValue);

  return (
    <div className="bg-surface-container-lowest rounded-3xl p-space-md md:p-space-xl shadow-md flex flex-col gap-space-md">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-sm">
        <div>
          <span className="font-label-caps text-label-caps text-secondary uppercase font-bold tracking-wider">
            Tracker Dinamico Volantini
          </span>
          <h3 className="font-headline-md text-headline-md text-on-surface">
            Trova il Miglior Prezzo per la Tua Marca Preferita
          </h3>
          <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
            Digita il marchio che non vuoi sostituire: scansioniamo 12 volantini attivi e la storia dei rincari a
            Milano.
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-label-unit text-label-unit text-outline">Frequenti:</span>
          {data.frequentBrands.map((brand) => (
            <button
              key={brand}
              className="px-2.5 py-1 rounded-full bg-surface-container text-on-surface font-label-unit text-label-unit font-bold hover:bg-primary-fixed hover:text-on-primary-fixed transition-colors"
              onClick={() => setSearchValue(brand)}
            >
              {brand}
            </button>
          ))}
        </div>
      </div>

      <div className="relative w-full">
        <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-primary text-2xl" />
        <input
          className="w-full bg-surface-container-low pl-12 pr-32 py-3.5 rounded-2xl font-body-lg text-body-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
        />
        <button className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-primary hover:bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold px-space-md py-2 rounded-xl transition-all shadow-sm">
          Cerca Offerte
        </button>
      </div>

      <div className="bg-surface-container-low rounded-2xl p-space-md flex flex-col lg:flex-row items-stretch justify-between gap-space-lg">
        <div className="flex-1 flex flex-col justify-between gap-space-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-xs">
              <span className="px-2.5 py-0.5 rounded-md bg-primary text-on-primary font-label-unit text-label-unit font-bold">
                MIGLIOR PREZZO ORA
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">{data.validUntilNote}</span>
            </div>
            <span className="font-label-caps text-label-caps text-error font-bold flex items-center gap-1">
              <Icon name="alarm" className="text-sm" /> {data.expiresNote}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm bg-surface-container-lowest p-space-sm rounded-xl shadow-sm">
            <div className="flex items-center gap-space-sm">
              <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center font-bold text-primary text-lg">
                <Icon name="storefront" />
              </div>
              <div>
                <h5 className="font-title-md text-title-md font-bold text-on-surface">{data.bestStore}</h5>
                <p className="font-body-sm text-body-sm text-on-surface-variant">{data.bestStoreNote}</p>
              </div>
            </div>
            <div className="flex items-baseline sm:flex-col sm:items-end justify-between">
              <span className="font-label-price-lg text-label-price-lg text-primary tabular-nums">{data.bestPrice}</span>
              <span className="font-label-unit text-label-unit text-outline-variant line-through tabular-nums">
                {data.originalPrice}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {data.nearbyPrices.map((nearby) => (
              <div key={nearby.store} className="p-2 rounded-xl bg-surface-container-lowest text-center">
                <span className="font-label-unit text-label-unit text-on-surface-variant block">{nearby.store}</span>
                <span
                  className={`font-title-md text-title-md font-bold tabular-nums ${
                    nearby.isHighlighted ? "text-error" : "text-on-surface"
                  }`}
                >
                  {nearby.price}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full lg:w-80 flex flex-col justify-between gap-space-xs bg-surface-container-lowest p-space-sm rounded-2xl shadow-sm">
          <div>
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase font-bold">
                Andamento 30 giorni
              </span>
              <span className="font-label-unit text-label-unit font-bold text-primary flex items-center">
                <Icon name="trending_down" className="text-xs" /> {data.trendChangeLabel}
              </span>
            </div>
            <div className="w-full h-20 my-2">
              <svg className="w-full h-full text-primary" fill="none" stroke="currentColor" viewBox="0 0 280 70">
                <defs>
                  <linearGradient id="sparkGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={`${data.sparklineFillPath}`} fill="url(#sparkGradient)" />
                <path d={data.sparklineLinePath} strokeLinecap="round" strokeWidth="2.5" />
                <circle className="fill-primary" cx="280" cy="15" r="4.5" />
                <circle className="stroke-primary fill-none opacity-40" cx="280" cy="15" r="8" />
              </svg>
            </div>
            <div className="flex justify-between text-label-unit font-label-unit text-outline">
              {data.timelineLabels.map((label, index) => (
                <span key={label} className={index === data.timelineLabels.length - 1 ? "text-primary font-bold" : ""}>
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <button className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm">
              <Icon name="shopping_cart_checkout" className="text-base" />
              <span>Blocca al Carrello Smart</span>
            </button>
            <button className="w-full py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm text-body-sm font-medium transition-colors flex items-center justify-center gap-1">
              <Icon name="notification_add" className="text-base text-secondary" />
              <span>{data.alertThresholdNote}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
