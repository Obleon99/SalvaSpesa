import type { ReactNode } from "react";
import { Header } from "./header";
import { SiteFooter } from "./site-footer";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main className="w-full pt-[6.5rem] lg:pt-20 bg-surface min-h-screen">
        <div className="flex flex-col w-full">
          <div className="max-w-7xl mx-auto w-full px-margin md:px-margin-tablet lg:px-margin-desktop py-space-md flex flex-col gap-space-lg">
            {children}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
