import { Suspense } from "react";
import { ConfrontaView } from "@/components/confronta-view";
import { PageShell } from "@/components/page-shell";

export default function HomePage() {
  return (
    <PageShell>
      <Suspense>
        <ConfrontaView />
      </Suspense>
    </PageShell>
  );
}
