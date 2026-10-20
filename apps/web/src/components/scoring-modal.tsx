"use client";

import { Icon } from "./icon";
import { Modal } from "./modal";

const steps = [
  {
    icon: "category",
    title: "Quali prodotti si confrontano",
    text: "Le offerte attive nei tuoi supermercati preferiti vengono raggruppate per tipo di prodotto (biscotti, pasta, olio, tonno…) leggendo il nome. Ogni offerta è confrontata solo con quelle dello stesso tipo e con lo stesso criterio di prezzo.",
  },
  {
    icon: "scale",
    title: "Il prezzo si confronta al kg o al litro",
    text: "Il prezzo di scaffale non basta: una confezione da 500 g e una da 1 kg non sono confrontabili. Usiamo il prezzo al chilogrammo o al litro indicato dal volantino, oppure lo calcoliamo dal formato. I prezzi anomali (per esempio campioncini) vengono scartati.",
  },
  {
    icon: "sell",
    title: "Marca leader, marchio del distributore, altra marca",
    text: "«Marca leader» è una marca nazionale molto diffusa (Barilla, Mulino Bianco, Mutti, Rio Mare…); «Marchio del distributore» è la marca propria dell'insegna (Esselunga, Coop, Lidl con Milbona o Sondey…); il resto sono altre marche. L'elenco è nostro e può contenere errori.",
  },
  {
    icon: "grade",
    title: "Punteggio di convenienza (0–10)",
    text: "60% prezzo al kg/l rispetto agli altri prodotti dello stesso tipo (il più basso vale di più), 20% profondità dello sconto (fino al 50%), 20% etichette di qualità dichiarate nel nome o nella descrizione: Bio, DOP/IGP, 100% italiano, senza olio di palma, pesca sostenibile, integrale, allevamento all'aperto, extravergine (ne contano al massimo 3).",
  },
  {
    icon: "military_tech",
    title: "Le tre schede",
    text: "«Marca leader»: la marca nota più economica trovata. «Miglior scelta»: tra i prodotti che costano meno della marca leader, quello con il punteggio più alto. «Massimo risparmio»: il più economico al kg/l. Il risparmio è sempre calcolato rispetto alla marca leader.",
  },
];

export function ScoringModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Come calcoliamo i risparmi" onClose={onClose}>
      <ul className="flex flex-col gap-space-sm">
        {steps.map((step) => (
          <li key={step.title} className="flex gap-space-sm">
            <div className="w-9 h-9 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center shrink-0">
              <Icon name={step.icon} className="text-lg" />
            </div>
            <div>
              <h3 className="font-title-md text-title-md text-on-surface font-bold">{step.title}</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">{step.text}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="bg-surface-container-low rounded-xl p-space-sm flex gap-space-xs">
        <Icon name="info" className="text-secondary text-lg shrink-0 mt-0.5" />
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Non facciamo assaggi né analisi di laboratorio e non possiamo dire se due prodotti escono dallo stesso stabilimento: il
          punteggio misura la convenienza e le caratteristiche dichiarate, non il gusto.
        </p>
      </div>
    </Modal>
  );
}
