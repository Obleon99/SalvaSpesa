# SalvaSpesa — Funzionalità

Legenda stato: **[FATTO]** implementato · **[PROSSIMO]** subito dopo · **[FUTURO]** più avanti

## 1. Posizione e supermercati vicini
- **[FATTO]** Posizione dell'utente: geolocalizzazione del browser oppure inserimento manuale (CAP, città, indirizzo)
- **[FATTO]** Raggio di ricerca regolabile (1–20 km)
- **[FATTO]** Elenco dei supermercati nel raggio (da OpenStreetMap), con catena riconosciuta, indirizzo e distanza
- **[FATTO]** Filtro per catena, ordinamento per distanza
- **[PROSSIMO]** Mappa interattiva con i punti vendita e selezione dal pin
- **[FUTURO]** Orari di apertura e stato "aperto ora"
- **[FUTURO]** Tempo di percorrenza (a piedi / auto) invece della sola distanza in linea d'aria

## 2. Supermercati preferiti
- **[FATTO]** Segna/rimuovi preferiti da elenco; i preferiti restano salvati e sono sempre in cima
- **[FATTO]** Il conteggio dei supermercati "attivi" nell'header = preferiti (se presenti) altrimenti vicini
- **[PROSSIMO]** Tutte le sezioni (volantini, confronti, carrello) usano solo i preferiti come insegne di riferimento
- **[FUTURO]** Suggerimento automatico dei preferiti in base a risparmio storico e distanza

## 3. Profilo e nucleo familiare
- **[FATTO]** Nome, adulti, bambini, budget di spesa settimanale (opzionale)
- **[PROSSIMO]** Preferenze alimentari (bio, senza glutine, senza lattosio, vegetariano…) che filtrano offerte e confronti
- **[PROSSIMO]** Marchi/prodotti "irrinunciabili" (es. Barilla) per cui non si accettano sostituzioni
- **[FUTURO]** Più profili in famiglia e condivisione della lista della spesa
- **[FUTURO]** Account e sincronizzazione tra dispositivi (oggi i dati stanno nel browser)

## 4. Volantini e offerte
- **[PROSSIMO]** Volantini settimanali per catena (solo preferiti), con validità e giorni rimanenti
- **[PROSSIMO]** Offerte estratte dai volantini come schede prodotto (prezzo, sconto, prezzo €/kg o €/L)
- **[PROSSIMO]** Filtri per categoria, catena, scadenza, sconto minimo
- **[FUTURO]** Avviso per volantini in scadenza
- **[FUTURO]** Sfoglia il volantino originale pagina per pagina

## 5. Prezzi e storico
- **[PROSSIMO]** Prezzo normalizzato (€/kg, €/L, €/pezzo) per confrontare formati diversi
- **[PROSSIMO]** Storico prezzi per prodotto e catena (andamento 30/90 giorni)
- **[PROSSIMO]** Etichette affare: minimo storico, vero affare, sconto normale, finto sconto
- **[FUTURO]** Segnalazione di un prezzo errato da parte dell'utente

## 6. Confronti
- **[FATTO]** Pagina Confronta Prodotti & Prezzi con dati dimostrativi (marca leader vs marchio del distributore vs discount)
- **[PROSSIMO]** Confronti calcolati sui dati reali dei preferiti
- **[PROSSIMO]** Punteggio qualità/prezzo spiegabile (provenienza, stabilimento, test indipendenti, prezzo €/kg)
- **[FUTURO]** Equivalenze "stesso stabilimento" tra marca e private label

## 7. Lista della spesa e carrello risparmio
- **[PROSSIMO]** Lista della spesa con prodotti e quantità adattati al nucleo familiare
- **[PROSSIMO]** Per ogni articolo: dove costa meno tra i preferiti
- **[PROSSIMO]** Totale per singolo supermercato vs spesa divisa tra due/tre negozi, con risparmio stimato
- **[FUTURO]** Confronto con il budget settimanale impostato nel profilo
- **[FUTURO]** Ottimizzazione automatica del percorso tra più negozi

## 8. Avvisi
- **[FUTURO]** Avviso quando un prodotto scende sotto una soglia
- **[FUTURO]** Riepilogo settimanale delle migliori offerte nei preferiti
- **[FUTURO]** Notifiche push (app mobile) ed email

## 9. Dati e infrastruttura
- **[FATTO]** Posizione e punti vendita: OpenStreetMap (Nominatim per gli indirizzi, Overpass per i supermercati)
- **[FATTO]** Profilo, posizione e preferiti salvati nel browser (localStorage)
- **[PROSSIMO]** Scraper dei volantini per catena → database Postgres (schema già pronto in `apps/backend/prisma`)
- **[PROSSIMO]** Collegamento web ↔ backend tRPC al posto dei dati dimostrativi
- **[FUTURO]** App mobile (Expo) sullo stesso backend

## Note
- I dati dei punti vendita sono © contributori OpenStreetMap (licenza ODbL): l'attribuzione va mostrata in app.
- Nominatim e Overpass sono servizi pubblici con limiti d'uso: i risultati vengono messi in cache nel browser e le richieste sono poche e mirate.
