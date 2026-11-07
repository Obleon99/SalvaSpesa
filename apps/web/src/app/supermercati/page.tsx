import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { StoresView } from "@/components/stores-view";

export const metadata: Metadata = {
  title: "La mia zona · SalvaSpesa",
};

export default function StoresPage() {
  return (
    <PageShell>
      <StoresView />
    </PageShell>
  );
}
