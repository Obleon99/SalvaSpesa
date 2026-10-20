"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./icon";
import { useNotifications } from "@/lib/notifications";

export function NotificationsBell() {
  const { items, unread, markAllSeen } = useNotifications();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        aria-label="Notifiche volantini in scadenza"
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
          if (!open) markAllSeen();
        }}
        className="relative p-1.5 rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant hover:text-on-surface flex items-center justify-center"
      >
        <Icon name="notifications" className="text-xl" />
        {unread.length > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 font-label-caps text-[10px] w-4 h-4 bg-error text-on-error rounded-full flex items-center justify-center font-bold">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-80 max-w-[85vw] bg-surface-container-lowest rounded-2xl shadow-xl p-space-xs z-[70]">
          <div className="px-space-sm py-space-xs font-label-caps text-label-caps text-on-surface-variant uppercase font-bold">Notifiche</div>
          {items.length === 0 ? (
            <p className="px-space-sm pb-space-sm font-body-sm text-body-sm text-on-surface-variant">
              Nessuna notifica. Imposta un avviso prezzo o aggiungi offerte al carrello: ti avviso quando il prezzo scende o l&apos;offerta sta per scadere.
            </p>
          ) : (
            <ul className="flex flex-col max-h-80 overflow-y-auto">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex gap-space-xs px-space-sm py-space-xs rounded-xl hover:bg-surface-container-low"
                  >
                    <Icon name={item.icon} className={`text-lg shrink-0 mt-0.5 ${item.kind === "alert" ? "text-primary" : "text-error"}`} filled />
                    <span className="min-w-0">
                      <span className="block font-body-sm text-body-sm font-semibold text-on-surface line-clamp-2">{item.title}</span>
                      <span className="block font-label-unit text-label-unit text-on-surface-variant">{item.detail}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
