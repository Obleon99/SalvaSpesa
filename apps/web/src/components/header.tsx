"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeaderSearch } from "./header-search";
import { Icon } from "./icon";
import { NotificationsBell } from "./notifications-bell";
import { formatPrice } from "@/lib/offer-search";
import { householdSize, useUserState } from "@/lib/user-state";

const navItems = [
  { label: "Volantini & Offerte", href: "/volantini" },
  { label: "Confronta Prodotti & Prezzi", href: "/" },
  { label: "Mappa Supermercati", href: "/supermercati" },
];

const navBase = "px-space-sm py-1.5 rounded-lg transition-all whitespace-nowrap shrink-0 font-body-sm text-body-sm";
const navActive = `${navBase} bg-primary text-on-primary font-bold shadow-sm`;
const navIdle = `${navBase} font-medium text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface`;

export function Header() {
  const pathname = usePathname();
  const { ready, profile, location, radiusKm, stores, storesStatus, favorites, offersGeneratedAt, cart, openDialog } = useUserState();
  const cartSavings = cart.reduce((sum, item) => sum + Math.max(0, (item.originalPrice ?? item.price) - item.price) * (item.quantity ?? 1), 0);
  const cartBadge = cartSavings > 0 ? `Risparmi ${formatPrice(cartSavings)}` : cart.length > 0 ? `${cart.length} ${cart.length === 1 ? "articolo" : "articoli"}` : null;

  const nearbyCount = stores.length;
  const favoriteCount = favorites.length;
  const activeLabel =
    favoriteCount > 0
      ? `${favoriteCount} ${favoriteCount === 1 ? "preferito" : "preferiti"}`
      : storesStatus === "loading"
        ? "Cerco supermercati…"
        : `${nearbyCount} ${nearbyCount === 1 ? "supermercato vicino" : "supermercati vicini"}`;
  const people = householdSize(profile);
  const initial = profile.name.trim().charAt(0).toUpperCase();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-24 max-w-7xl mx-auto px-margin md:px-margin-tablet lg:px-margin-desktop flex flex-col justify-between py-space-xs">
        <div className="flex items-center justify-between gap-space-md">
          <Link href="/" className="flex items-center gap-space-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-on-primary">
              <Icon name="eco" className="text-lg" />
            </div>
            <div className="flex flex-col">
              <span className="font-title-md text-title-md text-primary font-bold leading-none tracking-tight">
                SpesaChiara
              </span>
              <span className="font-label-caps text-label-caps text-on-surface-variant font-medium mt-0.5">
                Volantini &amp; Risparmio Intelligente
              </span>
            </div>
          </Link>

          <div className="hidden lg:flex items-center gap-space-xs bg-surface-container-lowest py-space-xxs px-space-sm rounded-full shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <Icon name="location_on" className="text-tertiary text-lg" />
            <span className="font-body-sm text-body-sm font-semibold text-on-surface max-w-[18rem] truncate">
              {!ready ? "…" : location ? location.label : "Imposta la tua posizione"}
            </span>
            <button
              onClick={() => openDialog("location")}
              className="font-label-unit text-label-unit font-bold text-primary hover:text-primary-container px-space-xs py-0.5 bg-surface-container-low rounded-md transition-colors"
            >
              {location ? "Cambia" : "Imposta"}
            </button>
            {location ? (
              <>
                <span className="h-3 w-px bg-outline-variant mx-1" />
                <button
                  onClick={() => openDialog("location")}
                  className="flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface"
                >
                  <Icon name="radar" className="text-sm" />
                  <span>Raggio: {radiusKm} km</span>
                </button>
                <Link
                  href="/supermercati"
                  className="font-label-caps text-label-caps bg-secondary-fixed text-on-secondary-fixed px-space-xs py-0.5 rounded-full font-bold ml-1"
                >
                  {activeLabel}
                </Link>
              </>
            ) : null}
          </div>

          <div className="flex items-center gap-space-sm">
            <HeaderSearch />
            <button
              onClick={() => openDialog("location")}
              aria-label="Imposta la posizione"
              className="lg:hidden p-1.5 rounded-full hover:bg-surface-container-high transition-colors text-tertiary flex items-center justify-center"
            >
              <Icon name="location_on" className="text-xl" />
            </button>
            <NotificationsBell />
            <button
              onClick={() => openDialog("profile")}
              aria-label="Apri il profilo"
              className="flex items-center gap-space-xs pl-space-xs rounded-full hover:bg-surface-container-high transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-bold">
                {initial || <Icon name="person" className="text-lg" />}
              </div>
              <div className="hidden xl:flex flex-col text-left pr-space-xs">
                <span className="font-body-sm text-body-sm font-bold text-on-surface leading-tight">
                  {profile.name || "Il tuo profilo"}
                </span>
                <span className="font-label-caps text-[10px] text-on-surface-variant">
                  {ready ? `Famiglia ${people} pers.` : ""}
                </span>
              </div>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-space-xxs gap-space-sm">
          <nav className="flex items-center gap-space-xs overflow-x-auto scrollbar-none">
            {navItems.map((item) => {
              const current = item.href === pathname;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={current ? "page" : undefined}
                  className={current ? navActive : navIdle}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/carrello"
              aria-current={pathname === "/carrello" ? "page" : undefined}
              className={`${pathname === "/carrello" ? navActive : navIdle} inline-flex items-center gap-space-xs`}
            >
              <span>Carrello Risparmio Famiglia</span>
              {cartBadge ? (
                <span className="font-label-caps text-label-caps px-space-xs py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-bold tracking-tight">
                  {cartBadge}
                </span>
              ) : null}
            </Link>
          </nav>
          <div className="hidden md:flex items-center gap-space-xs text-outline font-label-unit text-label-unit shrink-0">
            <Icon name="verified" className="text-sm text-primary" />
            <span>
              {offersGeneratedAt
                ? `Offerte aggiornate: ${new Date(offersGeneratedAt).toLocaleString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
                : "Scegli i preferiti per vedere le offerte"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
