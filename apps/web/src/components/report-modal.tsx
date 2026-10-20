"use client";

import { useState, type FormEvent } from "react";
import { Modal } from "./modal";
import { useUserState } from "@/lib/user-state";

export function ReportModal({ onClose, initialProduct = "" }: { onClose: () => void; initialProduct?: string }) {
  const { favorites, addReport } = useUserState();
  const [product, setProduct] = useState(initialProduct);
  const [store, setStore] = useState(favorites[0] ? `${favorites[0].chainName} ${favorites[0].address || favorites[0].name}`.trim() : "");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);

  const parsedPrice = price.trim() === "" ? null : Number(price.replace(",", "."));
  const priceInvalid = parsedPrice !== null && (!Number.isFinite(parsedPrice) || parsedPrice <= 0 || parsedPrice > 1000);
  const canSend = product.trim().length >= 2 && !priceInvalid;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSend) return;
    const report = { product: product.trim(), store: store.trim(), seenPrice: parsedPrice, note: note.trim() };
    addReport(report);
    try {
      await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(report) });
    } catch {
      // la segnalazione resta comunque salvata nel browser
    }
    setSent(true);
  }

  const field =
    "bg-surface-container-low px-space-sm py-2 rounded-xl font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary";
  const label = "font-label-caps text-label-caps text-on-surface-variant uppercase";

  return (
    <Modal title="Segnala un prezzo" onClose={onClose}>
      {sent ? (
        <div className="flex flex-col gap-space-sm">
          <p className="font-body-md text-body-md text-on-surface">
            Grazie! Ho salvato la segnalazione: la userò per controllare il prezzo al prossimo aggiornamento dei volantini.
          </p>
          <button onClick={onClose} className="self-end px-space-md py-2 rounded-xl bg-primary text-on-primary font-body-sm text-body-sm font-semibold">
            Chiudi
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-space-sm">
          <p className="font-body-sm text-body-sm text-on-surface-variant -mt-space-xs">
            Hai visto un prezzo diverso da quello che mostriamo? Dimmelo e lo verifico.
          </p>
          <div className="flex flex-col gap-1">
            <label htmlFor="report-product" className={label}>Prodotto</label>
            <input id="report-product" value={product} onChange={(e) => setProduct(e.target.value)} maxLength={120} placeholder="es. Barilla spaghetti 500 g" className={field} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="report-store" className={label}>Supermercato</label>
            <input id="report-store" value={store} onChange={(e) => setStore(e.target.value)} maxLength={120} placeholder="es. Esselunga Via Lorenteggio" className={field} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="report-price" className={label}>Prezzo che hai visto (€)</label>
            <input id="report-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="es. 1,49" aria-invalid={priceInvalid} className={field} />
            {priceInvalid ? <p className="font-body-sm text-body-sm text-error">Inserisci un prezzo valido.</p> : null}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="report-note" className={label}>Note (facoltativo)</label>
            <textarea id="report-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={3} className={field} />
          </div>
          <div className="flex justify-end gap-space-xs">
            <button type="button" onClick={onClose} className="px-space-md py-2 rounded-xl text-on-surface hover:bg-surface-container-high font-body-sm text-body-sm font-semibold">
              Annulla
            </button>
            <button type="submit" disabled={!canSend} className="px-space-md py-2 rounded-xl bg-primary hover:bg-primary-container disabled:opacity-50 text-on-primary font-body-sm text-body-sm font-semibold shadow-sm">
              Invia segnalazione
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
