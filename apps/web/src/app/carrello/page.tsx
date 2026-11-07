import type { Metadata } from "next";
import { CarrelloView } from "@/components/carrello-view";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Carrello Risparmio Famiglia · SalvaSpesa" };

export default function CarrelloPage() {
  return (
    <PageShell>
      <CarrelloView />
    </PageShell>
  );
}
