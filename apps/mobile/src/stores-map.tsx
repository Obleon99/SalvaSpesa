import { useEffect, useRef, type ComponentType } from "react";
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

// Mappa OpenStreetMap con Leaflet dentro una WebView (nessuna chiave Google Maps).
// La pagina è sempre la stessa e si carica una volta sola: i negozi arrivano dopo con injectJavaScript.
// I segnaposto sono cerchi disegnati su canvas: molto più leggeri di centinaia di elementi HTML sui telefoni meno recenti.
const HTML = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#map{height:100%;margin:0;background:#e8efe9}
.me{width:16px;height:16px;border-radius:50%;background:#0284c7;border:3px solid #fff;box-shadow:0 0 0 2px rgba(2,132,199,.4)}
.fav{display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:#15803d;border:2px solid #fff;color:#fff;font:700 13px sans-serif;box-shadow:0 1px 4px rgba(0,0,0,.4)}</style>
</head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var post=function(m){window.ReactNativeWebView.postMessage(m)};
var map=L.map("map",{zoomControl:false,attributionControl:true,preferCanvas:true,renderer:L.canvas({tolerance:10})}).setView([42.5,12.5],6);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"&copy; OpenStreetMap",updateWhenIdle:true,keepBuffer:1}).addTo(map);
var layer=L.layerGroup().addTo(map),me=null,stores=[],markers={},favs={},selected=null;
function style(s){var f=favs[s.id],sel=selected===s.id;
return {radius:sel?13:f?0.1:9,weight:sel?4:2,color:sel?"#0f5f2e":"#fff",fillColor:s.k?"#ea580c":"#94a3b8",fillOpacity:1}}
function paint(){Object.keys(markers).forEach(function(id){var e=markers[id];
if(favs[id]){if(!e.fav){e.fav=L.marker([e.s.lat,e.s.lng],{icon:L.divIcon({className:"",html:'<div class="fav">'+e.s.l+'</div>',iconSize:[26,26],iconAnchor:[13,13]}),zIndexOffset:500}).on("click",function(){post(id)}).addTo(map)}}
else if(e.fav){map.removeLayer(e.fav);e.fav=null}
e.c.setStyle(style(e.s));if(selected===id)e.c.bringToFront()})}
function setData(center,list,fit){layer.clearLayers();Object.keys(markers).forEach(function(id){if(markers[id].fav)map.removeLayer(markers[id].fav)});markers={};stores=list;
if(me)map.removeLayer(me);me=L.marker([center.lat,center.lng],{icon:L.divIcon({className:"",html:'<div class="me"></div>',iconSize:[16,16],iconAnchor:[8,8]}),interactive:false}).addTo(map);
list.forEach(function(s){var c=L.circleMarker([s.lat,s.lng],style(s)).addTo(layer);c.on("click",function(){post(s.id)});markers[s.id]={c:c,s:s,fav:null}});
paint();
if(list.length&&fit){var b=L.latLngBounds(list.slice(0,25).map(function(s){return [s.lat,s.lng]}));b.extend([center.lat,center.lng]);map.fitBounds(b,{padding:[30,30],maxZoom:16,animate:false})}
else if(fit)map.setView([center.lat,center.lng],14,{animate:false})}
function setState(f,sel){favs={};f.forEach(function(id){favs[id]=true});selected=sel;paint();if(sel&&markers[sel])map.panTo([markers[sel].s.lat,markers[sel].s.lng])}
map.on("moveend",function(){var c=map.getCenter();post("c:"+c.lat+","+c.lng)});
post("ready");
</script></body></html>`;

export function StoresMap({ stores, favoriteIds, center, selectedId, onSelect, onMove }: Props) {
  const ref = useRef<WebHandle>(null);
  const ready = useRef(false);

  const pushStores = () => {
    if (!ready.current) return;
    const list = stores.map((s) => ({ id: s.id, l: (s.chainName === "Altro" ? s.name : s.chainName).charAt(0).toUpperCase(), k: s.chainId in CHAIN_NAMES, lat: s.lat, lng: s.lng }));
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
