import { useEffect, useRef, type ComponentType } from "react";
import { StyleSheet } from "react-native";
import { WebView as RNWebView, type WebViewMessageEvent } from "react-native-webview";
import { CHAIN_NAMES, type StoreWithDistance } from "@salvaspesa/app-core";
import { LOGOS } from "./logos";
import { BRAND_BADGES } from "./theme";

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

// Mappa OpenStreetMap con Leaflet dentro una WebView (nessuna chiave Google Maps).
// La pagina è sempre la stessa e si carica una volta sola: i negozi arrivano dopo con injectJavaScript.
// I segnaposto sono cerchi disegnati su canvas: molto più leggeri di centinaia di elementi HTML sui telefoni meno recenti.
const HTML = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#map{height:100%;margin:0;background:#e8efe9}
.me{width:16px;height:16px;border-radius:50%;background:#0284c7;border:3px solid #fff;box-shadow:0 0 0 2px rgba(2,132,199,.4)}
.m{box-sizing:border-box;width:32px;height:32px;border-radius:50%;background:#fff center/72% no-repeat;border:3px solid #94a3b8;box-shadow:0 1px 4px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font:800 9px/1 sans-serif;overflow:hidden;transition:transform .12s}
.m.k{border-color:#ea580c}
.m.f{border-color:#15803d;box-shadow:0 0 0 3px rgba(21,128,61,.28),0 1px 4px rgba(0,0,0,.35)}
.m.s{transform:scale(1.28)}
.leaflet-div-icon{background:none;border:0}</style>
</head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var post=function(m){window.ReactNativeWebView.postMessage(m)};
var map=L.map("map",{zoomControl:false,attributionControl:true,preferCanvas:true,renderer:L.canvas({tolerance:10})}).setView([42.5,12.5],6);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"&copy; OpenStreetMap",updateWhenIdle:true,keepBuffer:1}).addTo(map);
var layer=L.layerGroup().addTo(map),me=null,stores=[],markers={},favs={},selected=null;
function setLogos(css){var e=document.createElement("style");e.textContent=css;document.head.appendChild(e)}
function style(s){var f=favs[s.id],sel=selected===s.id,hide=markers[s.id]&&markers[s.id].m;
if(hide)return {radius:1,weight:0,fillOpacity:0,opacity:0};
return {radius:sel?13:f?11:9,weight:sel?4:2,color:sel?"#0f5f2e":"#fff",fillColor:f?"#15803d":s.k?"#ea580c":"#94a3b8",fillOpacity:1,opacity:1}}
function icon(s,cls){var b=s.b;return L.divIcon({className:"",html:'<div class="'+cls+(b?'" style="background:'+b[0]+';color:'+b[1]+'">'+b[2]:'">')+'</div>',iconSize:[32,32],iconAnchor:[16,16]})}
function cls(s){return "m"+(s.b?"":" l-"+s.c)+(s.k?" k":"")+(favs[s.id]?" f":"")+(selected===s.id?" s":"")}
function render(){var want={};if(map.getZoom()>=13){var bd=map.getBounds().pad(0.1),n=0;stores.forEach(function(s){if(n<70&&bd.contains([s.lat,s.lng])){want[s.id]=1;n++}})}
Object.keys(markers).forEach(function(id){var e=markers[id];
if(!want[id]){if(e.m){map.removeLayer(e.m);e.m=null;e.c.setStyle(style(e.s))}return}
var c=cls(e.s);
if(!e.m){e.m=L.marker([e.s.lat,e.s.lng],{icon:icon(e.s,c),zIndexOffset:100}).on("click",function(){post(id)}).addTo(map);e.cls=c;e.c.setStyle(style(e.s))}
else if(e.cls!==c){e.m.setIcon(icon(e.s,c));e.cls=c}
e.m.setZIndexOffset(selected===id?900:favs[id]?500:100)})}
function paint(){render();Object.keys(markers).forEach(function(id){var e=markers[id];e.c.setStyle(style(e.s));if(selected===id&&!e.m)e.c.bringToFront()})}
function setData(center,list,fit){layer.clearLayers();Object.keys(markers).forEach(function(id){if(markers[id].m)map.removeLayer(markers[id].m)});markers={};stores=list;
if(me)map.removeLayer(me);me=L.marker([center.lat,center.lng],{icon:L.divIcon({className:"",html:'<div class="me"></div>',iconSize:[16,16],iconAnchor:[8,8]}),interactive:false}).addTo(map);
list.forEach(function(s){var c=L.circleMarker([s.lat,s.lng],style(s)).addTo(layer);c.on("click",function(){post(s.id)});markers[s.id]={c:c,s:s,m:null,cls:""}});
if(list.length&&fit){var b=L.latLngBounds(list.slice(0,25).map(function(s){return [s.lat,s.lng]}));b.extend([center.lat,center.lng]);map.fitBounds(b,{padding:[30,30],maxZoom:16,animate:false})}
else if(fit)map.setView([center.lat,center.lng],14,{animate:false});
paint()}
function setState(f,sel){favs={};f.forEach(function(id){favs[id]=true});selected=sel;paint();if(sel&&markers[sel])map.panTo([markers[sel].s.lat,markers[sel].s.lng])}
map.on("moveend",function(){var c=map.getCenter();render();post("c:"+c.lat+","+c.lng)});
post("ready");
</script></body></html>`;

// Le insegne con logo ottengono una classe CSS con l'immagine incorporata; le altre un badge colorato con il nome.
const key = (chainId: string) => chainId.replace(/[^a-z0-9]/gi, "_");
const LOGO_CSS = Object.entries(LOGOS)
  .map(([id, uri]) => `.l-${key(id)}{background-image:url("${uri}")}`)
  .join("");

export function StoresMap({ stores, favoriteIds, center, selectedId, onSelect, onMove }: Props) {
  const ref = useRef<WebHandle>(null);
  const ready = useRef(false);

  const pushStores = () => {
    if (!ready.current) return;
    const list = stores.map((s) => {
      const badge = BRAND_BADGES[s.chainId];
      const fallback = (s.chainName === "Altro" ? s.name : s.chainName).slice(0, 2).toLowerCase();
      return { id: s.id, c: key(s.chainId), b: LOGOS[s.chainId] ? undefined : [badge?.color ?? "#64748b", badge?.text ?? "#fff", badge?.label ?? fallback], k: s.chainId in CHAIN_NAMES, lat: s.lat, lng: s.lng };
    });
    ref.current?.injectJavaScript(`setData(${JSON.stringify(center)},${JSON.stringify(list).replace(/</g, "\\u003c")},true);setState(${JSON.stringify(favoriteIds)},${JSON.stringify(selectedId)});true;`);
  };
  const pushState = () => {
    if (ready.current) ref.current?.injectJavaScript(`setState(${JSON.stringify(favoriteIds)},${JSON.stringify(selectedId)});true;`);
  };

  // Nuova ricerca: si sostituiscono i segnaposto. Preferiti e selezione si aggiornano da soli, senza ridisegnare tutto.
  useEffect(pushStores, [stores, center]);
  useEffect(pushState, [favoriteIds, selectedId]);

  return (
    <WebView
      ref={ref}
      style={styles.map}
      originWhitelist={["*"]}
      source={{ html: HTML, baseUrl: "https://spesachiara.app" }}
      javaScriptEnabled
      androidLayerType="hardware"
      onMessage={(event: WebViewMessageEvent) => {
        const message = event.nativeEvent.data;
        if (message === "ready") {
          ready.current = true;
          ref.current?.injectJavaScript(`setLogos(${JSON.stringify(LOGO_CSS)});true;`);
          pushStores();
        } else if (message.startsWith("c:")) {
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
