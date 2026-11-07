// Impostazioni scelte dall'app che esegue gli scraper (da riga di comando o dal telefono).
export const scraperConfig: { esselungaStores: string[]; coopStores: string[]; pauseMs: number } = {
  // Pausa dopo ogni pagina scaricata: più lunga negli aggiornamenti in secondo piano, così il telefono resta fluido.
  pauseMs: 8,
  esselungaStores: ["AFF"],
  coopStores: [],
};
