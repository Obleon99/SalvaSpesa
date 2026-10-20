import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AppDialogs } from "@/components/app-dialogs";
import { UserStateProvider } from "@/lib/user-state";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta-sans",
});

export const metadata: Metadata = {
  title: "SpesaChiara",
  description: "Confronto intelligente di volantini, prezzi e marchi di qualità dei supermercati italiani.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={plusJakartaSans.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
          rel="stylesheet"
        />
      </head>
      <body className="bg-surface font-body-md text-body-md text-on-surface antialiased">
        <UserStateProvider>
          {children}
          <AppDialogs />
        </UserStateProvider>
      </body>
    </html>
  );
}
