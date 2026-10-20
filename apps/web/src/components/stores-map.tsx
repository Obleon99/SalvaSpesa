"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type { Circle, LayerGroup, Map as LeafletMap } from "leaflet";
import type { StoreWithDistance, UserLocation } from "@/lib/geo";

interface Props {
  stores: StoreWithDistance[];
  favoriteIds: Set<string>;
  center: UserLocation;
  radiusKm: number;
  selectedId: string | null;
  onSelect: (store: StoreWithDistance) => void;
}

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

export function StoresMap({ stores, favoriteIds, center, radiusKm, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const circleRef = useRef<Circle | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current || mapRef.current) return;
      const map = L.map(containerRef.current, { zoomControl: true }).setView([center.lat, center.lng], 13);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      redraw(L);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
      circleRef.current = null;
    };
    // la mappa si crea una sola volta; i marcatori si ridisegnano nell'effetto successivo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function redraw(L: typeof import("leaflet")) {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    circleRef.current?.remove();
    circleRef.current = L.circle([center.lat, center.lng], { radius: radiusKm * 1000, color: "#0284c7", weight: 1, fillOpacity: 0.04, interactive: false }).addTo(map);

    L.marker([center.lat, center.lng], {
      icon: L.divIcon({ className: "", html: '<div class="w-4 h-4 rounded-full bg-tertiary border-2 border-white shadow"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }),
      title: "La tua posizione",
      keyboard: false,
    }).addTo(layer);

    for (const store of stores) {
      const favorite = favoriteIds.has(store.id);
      const selected = store.id === selectedId;
      const size = selected ? 38 : 30;
      const marker = L.marker([store.lat, store.lng], {
        title: store.name,
        zIndexOffset: selected ? 1000 : favorite ? 500 : 0,
        icon: L.divIcon({
          className: "",
          html: `<div class="flex items-center justify-center rounded-full border-2 border-white shadow-md font-bold text-white ${favorite ? "bg-primary" : "bg-outline"} ${selected ? "ring-4 ring-primary-fixed" : ""}" style="width:${size}px;height:${size}px;font-size:${selected ? 15 : 12}px">${escapeHtml(store.chainName.charAt(0))}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        }),
      });
      marker.on("click", () => onSelectRef.current(store));
      marker.addTo(layer);
    }
  }

  useEffect(() => {
    import("leaflet").then((L) => redraw(L));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stores, favoriteIds, selectedId, radiusKm, center.lat, center.lng]);

  useEffect(() => {
    const store = stores.find((s) => s.id === selectedId);
    if (store && mapRef.current) mapRef.current.panTo([store.lat, store.lng]);
  }, [selectedId, stores]);

  return <div ref={containerRef} className="w-full h-[420px] rounded-2xl overflow-hidden shadow-sm z-0" role="region" aria-label="Mappa dei supermercati" />;
}
