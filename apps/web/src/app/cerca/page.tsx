import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogView } from "@/components/catalog-view";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Cerca Prodotti · SalvaSpesa" };

export default function CercaPage() {
  return (
    <PageShell>
      <Suspense>
        <CatalogView />
      </Suspense>
    </PageShell>
  );
}
