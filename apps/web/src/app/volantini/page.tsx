import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { VolantiniView } from "@/components/volantini-view";

export const metadata: Metadata = { title: "Volantini & Offerte · SalvaSpesa" };

export default function VolantiniPage() {
  return (
    <PageShell>
      <VolantiniView />
    </PageShell>
  );
}
