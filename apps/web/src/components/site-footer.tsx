const footerColumns = [
  {
    title: "Supermercati Partner",
    links: ["Esselunga, Conad, Coop", "Eurospin, Lidl, Aldi", "Carrefour & Bennet", "Invia volantino locale"],
  },
  {
    title: "Trasparenza Prezzi",
    links: [
      "Metodologia Benchmark €/kg",
      "Segnalazione Errore Prezzo",
      "Archivio Storico Rincari",
      "Informativa Trasparenza GDO",
    ],
  },
  {
    title: "Consigli per il Risparmio",
    links: [
      "Strategia Spesa Divisa Multi-Store",
      "Guida Stagionale Frutta e Verdura",
      "Anti-Spreco & Fine Volantino",
      "Calcolatore Spesa Mensile",
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-surface-container-low">
      <div className="max-w-7xl mx-auto w-full px-margin md:px-margin-tablet lg:px-margin-desktop py-space-2xl flex flex-col gap-space-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-lg">
          <div className="flex flex-col gap-space-xs">
            <span className="font-title-md text-title-md text-primary font-bold">SpesaChiara</span>
            <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xs">
              La piattaforma indipendente italiana per il confronto intelligente dei volantini, dei prezzi al
              chilogrammo e dell&apos;ottimizzazione del carrello familiare.
            </p>
          </div>
          {footerColumns.map((column) => (
            <div key={column.title} className="flex flex-col gap-space-xs">
              <span className="font-title-md text-title-md text-on-surface font-bold">{column.title}</span>
              <ul className="flex flex-col gap-1.5">
                {column.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-space-sm pt-space-md border-t border-outline-variant/40">
          <p className="font-label-unit text-label-unit text-on-surface-variant">
            © 2025 SpesaChiara S.r.l. - Tutti i marchi e i volantini appartengono ai rispettivi proprietari della GDO.
          </p>
          <div className="flex items-center gap-space-md">
            <a href="#" className="font-label-unit text-label-unit text-on-surface-variant hover:text-primary">
              Privacy Policy
            </a>
            <a href="#" className="font-label-unit text-label-unit text-on-surface-variant hover:text-primary">
              Termini di Utilizzo
            </a>
            <a href="#" className="font-label-unit text-label-unit text-on-surface-variant hover:text-primary">
              Preferenze Cookie
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
