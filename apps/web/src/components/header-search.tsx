"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Icon } from "./icon";

export function HeaderSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const query = value.trim();
    if (query.length < 2) return;
    router.push(`/?q=${encodeURIComponent(query)}#tracker`);
  }

  return (
    <form onSubmit={onSubmit} role="search" className="relative hidden sm:flex items-center">
      <Icon name="search" className="absolute left-3 text-outline text-lg pointer-events-none" />
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-label="Cerca prodotti o marche"
        className="w-48 xl:w-72 bg-surface-container-lowest pl-9 pr-3 py-1.5 rounded-full font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
        placeholder="Cerca prodotti, marchi es. Nutella, Barilla..."
        type="search"
      />
    </form>
  );
}
