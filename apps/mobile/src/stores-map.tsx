import { useEffect, useMemo, useRef, type ComponentType } from "react";
import { StyleSheet } from "react-native";
import { WebView as RNWebView, type WebViewMessageEvent } from "react-native-webview";
import { CHAIN_NAMES, type StoreWithDistance } from "@salvaspesa/app-core";

// I tipi di react-native-webview risolvono @types/react 18 (quello del sito): si usa un tipo più largo per il componente.
const WebView = RNWebView as unknown as ComponentType<Record<string, unknown>>;
interface WebHandle {
  injectJavaScript(script: string): void;
}

interface Props {
  stores: StoreWithDistance[];
  favoriteIds: string[];
  center: { lat: number; lng: number };
  selectedId: string | null;
  onSelect: (id: string) => void;
  // Centro della mappa dopo ogni spostamento: serve per cercare i supermercati in un'altra zona.
  onMove?: (center: { lat: number; lng: number }) => void;
}

// Mappa OpenStreetMap con Leaflet dentro una WebView: nessuna chiave Google Maps da configurare.
function buildHtml(stores: StoreWithDistance[], center: { lat: number; lng: number }): string {
  const data = JSON.stringify({
    center,
    stores: stores.map((s) => ({ id: s.id, name: s.name, label: s.chainName === "Altro" ? s.name : s.chainName, supported: s.chainId in CHAIN_NAMES, lat: s.lat, lng: s.lng })),
  }).replace(/</g, "\\u003c");
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#map{height:100%;margin:0}
.pin{display:flex;align-items:center;justify-content:center;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);color:#fff;font:700 12px sans-serif}
.me{width:16px;height:16px;border-radius:50%;background:#0284c7;border:3px solid #fff;box-shadow:0 0 0 2px rgba(2,132,199,.4)}</style>
</head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var data=${data};var favs={};var selected=null;var markers={};
var map=L.map("map",{zoomControl:false,attributionControl:true}).setView([data.center.lat,data.center.lng],14);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"&copy; OpenStreetMap"}).addTo(map);
L.marker([data.center.lat,data.center.lng],{icon:L.divIcon({className:"",html:'<div class="me"></div>',iconSize:[16,16],iconAnchor:[8,8]}),interactive:false}).addTo(map);
function esc(t){return String(t).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function icon(s){var fav=favs[s.id],sel=selected===s.id,size=sel?40:30;
return L.divIcon({className:"",html:'<div class="pin" style="width:'+size+'px;height:'+size+'px;background:'+(fav?"#15803d":s.supported?"#ea580c":"#94a3b8")+(sel?";box-shadow:0 0 0 4px rgba(21,128,61,.35)":"")+'">'+esc(s.label.charAt(0).toUpperCase())+'</div>',iconSize:[size,size],iconAnchor:[size/2,size/2]})}
data.stores.forEach(function(s){var m=L.marker([s.lat,s.lng],{icon:icon(s)}).addTo(map);
m.on("click",function(){window.ReactNativeWebView.postMessage(s.id)});markers[s.id]={m:m,s:s}});
function setState(f,sel){favs={};f.forEach(function(id){favs[id]=true});selected=sel;
Object.keys(markers).forEach(function(id){var e=markers[id];e.m.setIcon(icon(e.s));e.m.setZIndexOffset(id===sel?1000:favs[id]?500:0)});
if(sel&&markers[sel])map.panTo(markers[sel].m.getLatLng())}
map.on("moveend",function(){var c=map.getCenter();window.ReactNativeWebView.postMessage("c:"+c.lat+","+c.lng)});
if(data.stores.length){var b=L.latLngBounds(data.stores.slice(0,25).map(function(s){return [s.lat,s.lng]}));b.extend([data.center.lat,data.center.lng]);map.fitBounds(b,{padding:[30,30],maxZoom:16})}
</script></body></html>`;
}

export function StoresMap({ stores, favoriteIds, center, selectedId, onSelect, onMove }: Props) {
  const ref = useRef<WebHandle>(null);
  // La pagina si rigenera solo quando cambiano i negozi o il centro; preferiti e selezione si aggiornano senza ricaricarla.
  const html = useMemo(() => buildHtml(stores, center), [stores, center]);

  const sync = () => ref.current?.injectJavaScript(`setState(${JSON.stringify(favoriteIds)},${JSON.stringify(selectedId)});true;`);
  useEffect(sync, [favoriteIds, selectedId]);

  return (
    <WebView
      ref={ref}
      style={styles.map}
      originWhitelist={["*"]}
      source={{ html, baseUrl: "https://spesachiara.app" }}
      javaScriptEnabled
      onLoadEnd={sync}
      onMessage={(event: WebViewMessageEvent) => {
        const message = event.nativeEvent.data;
        if (message.startsWith("c:")) {
          const [lat, lng] = message.slice(2).split(",").map(Number);
          if (Number.isFinite(lat) && Number.isFinite(lng)) onMove?.({ lat, lng });
        } else {
          onSelect(message);
        }
      }}
    />
  );
}

const styles = StyleSheet.create({ map: { flex: 1 } });
