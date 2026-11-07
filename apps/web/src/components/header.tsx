"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { HeaderSearch } from "./header-search";
import { Icon } from "./icon";
import { NotificationsBell } from "./notifications-bell";
import { formatPrice } from "@/lib/offer-search";
import { useUserState } from "@/lib/user-state";

const navItems = [
  { label: "Offerte", href: "/volantini" },
  { label: "Confronta", href: "/" },
];

const navBase = "px-space-sm py-1.5 rounded-lg transition-all whitespace-nowrap shrink-0 font-body-sm text-body-sm";
const navActive = `${navBase} bg-primary text-on-primary font-bold shadow-sm`;
const navIdle = `${navBase} font-medium text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface`;

function AccountMenu() {
  const { ready, account, accountReady, profile, openDialog, signOut } = useUserState();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (ready && accountReady && !account) {
    return (
      <div className="flex items-center gap-space-xs">
        <button
          onClick={() => openDialog("profile")}
          aria-label="Apri il profilo"
          className="hidden sm:flex p-1.5 rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant"
        >
          <Icon name="person" className="text-xl" />
        </button>
        <button
          onClick={() => openDialog("auth")}
          className="px-space-sm py-1.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold shadow-sm transition-colors whitespace-nowrap"
        >
          Accedi
        </button>
      </div>
    );
  }

  const shownName = profile.name || account?.name || "";
  const initial = shownName.trim().charAt(0).toUpperCase() || account?.email.charAt(0).toUpperCase() || "";

  return (
    <div ref={box} className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        aria-label="Menu account"
        aria-expanded={open}
        className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-bold hover:opacity-90 transition-opacity"
      >
        {initial || <Icon name="person" className="text-lg" />}
      </button>
      {open ? (
        <div className="absolute right-0 mt-2 w-60 bg-surface-container-lowest rounded-2xl shadow-xl p-space-xs flex flex-col z-50">
          <div className="px-space-sm py-space-xs border-b border-outline-variant/40 mb-space-xxs">
            <p className="font-body-sm text-body-sm font-bold text-on-surface truncate">{shownName || "Il tuo account"}</p>
            {account ? <p className="font-label-unit text-label-unit text-on-surface-variant truncate">{account.email}</p> : null}
          </div>
          <button
            onClick={() => {
              setOpen(false);
              openDialog("profile");
            }}
            className="flex items-center gap-space-xs px-space-sm py-2 rounded-xl hover:bg-surface-container-high text-left font-body-sm text-body-sm text-on-surface"
          >
            <Icon name="person" className="text-lg" /> Il mio profilo
          </button>
          <button
            onClick={() => {
              setOpen(false);
              void signOut();
            }}
            className="flex items-center gap-space-xs px-space-sm py-2 rounded-xl hover:bg-surface-container-high text-left font-body-sm text-body-sm text-on-surface"
          >
            <Icon name="logout" className="text-lg" /> Esci
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function Header() {
  const pathname = usePathname();
  const { ready, location, favorites, cart } = useUserState();
  const cartSavings = cart.reduce((sum, item) => sum + Math.max(0, (item.originalPrice ?? item.price) - item.price) * (item.quantity ?? 1), 0);
  const cartBadge = cartSavings > 0 ? formatPrice(cartSavings) : cart.length > 0 ? String(cart.length) : null;

  const links = [...navItems, { label: "Carrello", href: "/carrello" }];
  const mapActive = pathname === "/supermercati";

  const nav = links.map((item) => {
    const current = item.href === pathname;
    return (
      <Link key={item.href} href={item.href} aria-current={current ? "page" : undefined} className={`${current ? navActive : navIdle} inline-flex items-center gap-space-xs`}>
        {item.label}
        {item.href === "/carrello" && cartBadge ? (
          <span className="font-label-caps text-label-caps px-space-xs py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-bold tracking-tight">{cartBadge}</span>
        ) : null}
      </Link>
    );
  });

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="max-w-7xl mx-auto px-margin md:px-margin-tablet lg:px-margin-desktop">
        <div className="h-16 flex items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-lg min-w-0">
            <Link href="/" className="flex items-center gap-space-sm shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-on-primary">
                <Icon name="eco" className="text-lg" />
              </div>
              <span className="font-title-md text-title-md text-primary font-bold tracking-tight">SalvaSpesa</span>
            </Link>
            <nav className="hidden lg:flex items-center gap-space-xs">{nav}</nav>
          </div>

          <div className="flex items-center gap-space-sm min-w-0">
            <HeaderSearch />
            <Link
              href="/supermercati"
              aria-label="La mia zona e i miei supermercati"
              aria-current={mapActive ? "page" : undefined}
              className={`flex items-center gap-space-xs rounded-full py-1.5 px-space-sm min-w-0 transition-colors ${
                mapActive ? "bg-primary text-on-primary" : "bg-surface-container-lowest hover:bg-surface-container-high text-on-surface shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
              }`}
            >
              <Icon name="location_on" className={`text-lg shrink-0 ${mapActive ? "" : "text-tertiary"}`} />
              <span className="hidden md:block font-body-sm text-body-sm font-semibold max-w-[11rem] truncate">
                {!ready ? "…" : location ? location.label : "Imposta posizione"}
              </span>
              {ready && favorites.length > 0 ? (
                <span className={`font-label-caps text-label-caps px-space-xs rounded-full font-bold ${mapActive ? "bg-on-primary/20" : "bg-secondary-fixed text-on-secondary-fixed"}`}>
                  {favorites.length}
                </span>
              ) : null}
            </Link>
            <NotificationsBell />
            <AccountMenu />
          </div>
        </div>
        <nav className="lg:hidden flex items-center gap-space-xs overflow-x-auto scrollbar-none h-10 pb-1">{nav}</nav>
      </div>
    </header>
  );
}
