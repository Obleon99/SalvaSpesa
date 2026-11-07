# SalvaSpesa — Funzionalità

Progetto di Obleon.

Legenda stato: **[FATTO]** implementato · **[PROSSIMO]** subito dopo · **[FUTURO]** più avanti

## 1. Posizione e supermercati vicini
- **[FATTO]** Interfaccia semplificata: un'unica barra con menu (Offerte, Confronta, Cerca, Carrello), ricerca, «La mia zona» (posizione, preferiti e mappa nella stessa pagina) e account
- **[FATTO]** Posizione dell'utente: geolocalizzazione del browser oppure inserimento manuale (CAP, città, indirizzo)
- **[FATTO]** Raggio di ricerca regolabile (1–20 km)
- **[FATTO]** Elenco dei supermercati nel raggio (da OpenStreetMap), con catena riconosciuta, indirizzo e distanza
- **[FATTO]** Filtro per catena, ordinamento per distanza
- **[FATTO]** Mappa interattiva (OpenStreetMap/Leaflet) con i punti vendita nel raggio: preferiti in verde, scheda del negozio al tocco del pin, filtri per insegna e preferiti, vista Mappa/Elenco
- **[FUTURO]** Orari di apertura e stato "aperto ora"
- **[FUTURO]** Tempo di percorrenza (a piedi / auto) invece della sola distanza in linea d'aria

## 2. Supermercati preferiti
- **[FATTO]** Segna/rimuovi preferiti da elenco; i preferiti restano salvati e sono sempre in cima
- **[FATTO]** Il conteggio dei supermercati "attivi" nell'header = preferiti (se presenti) altrimenti vicini
- **[FATTO]** Il tracker prezzi usa solo i supermercati preferiti; per Esselunga si risolve il negozio preferito → codice negozio ufficiale (per coordinate) e si scaricano le offerte di quel negozio al volo (se i dati hanno più di 6 ore)
- **[FATTO]** Volantini, confronti, carrello e notifiche usano solo le offerte dei supermercati preferiti
- **[FUTURO]** Suggerimento automatico dei preferiti in base a risparmio storico e distanza

## 3. Profilo e nucleo familiare
- **[FATTO]** Nome, adulti, bambini, budget di spesa settimanale (opzionale)
- **[PROSSIMO]** Preferenze alimentari (bio, senza glutine, senza lattosio, vegetariano…) che filtrano offerte e confronti
- **[PROSSIMO]** Marchi/prodotti "irrinunciabili" (es. Barilla) per cui non si accettano sostituzioni
- **[FUTURO]** Più profili in famiglia e condivisione della lista della spesa
- **[FATTO]** Registrazione e accesso con email e password: posizione, preferiti, carrello, avvisi e profilo si salvano nell'account e si ritrovano su ogni dispositivo (account in `data/accounts`, password con scrypt, sessione in cookie httpOnly). All'uscita il browser viene svuotato.
- **[PROSSIMO]** Recupero password via email e database vero al posto dei file quando l'app esce dal computer di casa

## 4. Volantini e offerte
- **[FATTO]** Pagina «Volantini & Offerte»: un riquadro per ogni volantino dei preferiti (offerte, scadenza, link al sito) e un esploratore di tutte le offerte attive (ricerca, insegna, categoria, ordinamento per sconto / prezzo / prezzo al kg-l / scadenza), con aggiunta al carrello, avviso e scheda prodotto
- **[FATTO]** Avviso nella campanella per le offerte del carrello in scadenza (entro 2 giorni)
- **[FUTURO]** Sfoglia il volantino originale pagina per pagina

## 4b. Catalogo, ricerca e categorie
- **[FATTO]** Pagina **«Cerca Prodotti»** (`/cerca`, anche dalla barra di ricerca in alto): cerca in **tutti i prodotti dei supermercati preferiti**, unendo le offerte del volantino e il **listino completo** (prezzi a scaffale) dove il sito lo pubblica. Risultati ordinati per prezzo al kg/l, con il prodotto più conveniente indicato (confrontando solo la stessa unità: kg, litro o pezzo)
- **[FATTO]** Categorie riorganizzate in 8 gruppi con sottocategorie: **Proteine** (carne, salumi, pesce, latticini e formaggi, uova), **Carboidrati** (pasta, riso, pane e pizza, crackers e grissini, farine e cereali), **Frutta e verdura** (frutta, verdura, zuppe e vellutate, legumi e conserve), **Grassi** (olio, burro e margarina, avocado, frutta secca e semi), **Casa e cura persona** (detersivi, carta, shampoo/saponi/bagnoschiuma, dentifrici, creme), **Dolci** (biscotti, merendine, marmellate/miele/creme, torte, gelati, cioccolato e caramelle), **Bevande** (acqua, gassate, energetiche, succhi, bevande vegetali, birra e vino), **Bevande calde** (caffè, tè, tisane) e **Animali** (cani, gatti, lettiere e accessori): il cibo per animali non compare più tra le proteine né nei confronti, ma solo nella categoria Animali. I prodotti non classificabili (snack salati, ecc.) restano in «Altro». La classificazione è a regole sul nome e sul reparto del sito: sbaglia su qualche caso limite (circa il 5% finisce in «Altro»)
- **[FATTO]** **Carne e pesce freschi o surgelati**: scorciatoie «Carne fresca / Carne surgelata / Pesce fresco / Pesce surgelato» e filtro di conservazione (fresco, surgelato, in scatola/conserva); vale anche per frutta e verdura (anche surgelate) e zuppe
- **[FATTO]** **Frutta e verdura di stagione**: il mese corrente è indicato («Di stagione a ottobre») con l'elenco dei prodotti del mese; nei risultati e nei volantini i prodotti di stagione compaiono per primi con l'etichetta, gli altri come «Fuori stagione». Calendario italiano sintetizzato (frutta e verdura fresche; i prodotti lavorati non hanno stagione)
- **[FATTO]** Listini completi (nome, marca, formato, prezzo, €/kg-l, immagine) in `data/catalog/<catena>/latest.json`, aggiornati al volo se mancanti e ogni 24 ore: comando `pnpm --filter @salvaspesa/scrapers exec tsx src/run.ts --catalog [catena]`
- Cosa dà ogni insegna oggi: **Aldi** ~500 prodotti con prezzo; **Conad** ~150 (il sito mostra il prezzo solo per una parte dei prodotti); **Tigros** ~1.700 (il sito mostra il prezzo online solo per una parte del suo catalogo da ~11.400 prodotti); **Eurospin** solo ~80 (sul sito ha prezzo pubblico solo chi è in offerta, su ~4.600 prodotti); **Lidl, Penny, Esselunga, Ekom**: solo offerte del volantino (non pubblicano un listino completo con prezzi). Per le insegne senza dati la pagina lo dice esplicitamente
- **[PROSSIMO]** Raggruppare lo stesso prodotto tra insegne (EAN o nome+formato) in una sola riga con il prezzo di ogni supermercato

## 5. Prezzi e storico
- **[FATTO]** Prezzo normalizzato al kg o al litro (dal volantino o calcolato dal formato) per confrontare formati diversi
- **[FATTO]** Amazon.it nel tracker (link di ricerca; prezzi e prodotti con le credenziali dell'API ufficiale, vedi sotto)
- **[FATTO]** Tracker dinamico: ricerca per marca/prodotto sulle offerte attive dei preferiti, miglior prezzo ora con scadenza, confronto con le altre catene, elenco di tutte le offerte trovate
- **[FATTO]** Storico prezzi: ogni scraping salva uno snapshot giornaliero; il grafico a 30 giorni compare dal secondo giorno di dati
- **[FATTO]** Storico anche per i prodotti a listino (Aldi, Tigros, Eurospin, Conad) e non solo per quelli in volantino: `data/history/<catena>/` tiene un punto a ogni cambio di prezzo per ogni prodotto visto, ricostruito dagli snapshot già salvati la prima volta. Il listino completo non è pubblico per Lidl, Penny, Esselunga ed Ekom: per loro lo storico riguarda i prodotti che compaiono in volantino.
- **[PROSSIMO]** Etichette affare: minimo storico, vero affare, sconto normale, finto sconto
- **[FATTO]** «Segnala un prezzo»: modulo che salva la segnalazione nel browser e in `data/reports.jsonl`

## 6. Confronti (pagina «Confronta Prodotti & Prezzi»)
- **[FATTO]** Confronti calcolati sulle offerte reali dei preferiti, per oltre 40 tipi di prodotto (biscotti, pasta, riso, caffè, latte, parmigiano, pollo, manzo, salmone, olio, burro, passata, detersivi, shampoo, dentifricio…): schede **Marca leader / Miglior scelta qualità-prezzo / Massimo risparmio**, risparmio sempre rispetto alla marca leader, consiglio SalvaSpesa generato dai dati
- **[FATTO]** Vista **Schede** e vista **Tabella rapida** (matrice prodotto × insegna con la cella migliore evidenziata e il risparmio al kg/l)
- **[FATTO]** Filtri per categoria (le 8 categorie nutrizionali: Proteine, Carboidrati, Frutta e verdura, Grassi, Casa e cura persona, Dolci, Bevande, Bevande calde, più Bio & Filiera) e per insegna (ricalcolano i confronti)
- **[FATTO]** Banner d'analisi con risparmio medio, benchmark marca leader vs alternativa, risparmio del carrello e **download del confronto in CSV**
- **[FATTO]** «Criteri di scoring»: spiega come si raggruppano i prodotti, come si distinguono marca leader / marchio del distributore / altra marca e come si calcola il punteggio
- **[FATTO]** Scheda prodotto (dettagli, etichette di qualità, storico, link al sito), ricerca dall'header che apre il tracker già compilato, pulsante «confronta»
- Il **punteggio (0–10)** misura la **convenienza**: 60% prezzo al kg/l rispetto agli altri, 20% sconto, 20% etichette dichiarate (Bio, DOP/IGP, 100% italiano, senza olio di palma…). Non esprime il gusto né la provenienza verificata: le frasi «audit indipendente» o «stesso stabilimento» del disegno originale non si possono ricavare dai dati dei volantini e non sono state riprodotte
- **[PROSSIMO]** Preferenze alimentari del profilo (senza glutine, senza lattosio…) come filtro dei confronti
- **[FUTURO]** Equivalenze «stesso stabilimento» tra marca e private label (servono dati esterni, es. etichette)

## 7. Lista della spesa e carrello risparmio
- **[FATTO]** Pagina «Carrello Risparmio Famiglia»: articoli raggruppati per negozio con quantità, totale, risparmio dalle offerte e confronto con il budget settimanale del profilo
- **[FATTO]** «Dividi la spesa»: cerca gli stessi prodotti (stesso EAN o stessa marca/nome e formato) negli altri preferiti e calcola il piano migliore con 1, 2 o 3 negozi (totale, articoli coperti, risparmio, barra per negozio), con «Applica questo piano»
- **[FATTO]** Prodotti salvati (segnalibro) e avvisi prezzo gestibili dalla pagina; badge «Risparmi X €» dal carrello nel menu
- **[PROSSIMO]** Lista della spesa con quantità suggerite in base al nucleo familiare
- **[FUTURO]** Ottimizzazione del percorso tra più negozi

## 8. Avvisi
- **[FATTO]** Imposta l'avviso (soglia suggerita −10%) e il "Carrello Smart" dal tracker: salvati nel browser
- **[FATTO]** Campanella con le notifiche reali: prezzo raggiunto (avviso scattato) e offerte del carrello in scadenza; il numero rosso conta quelle non ancora lette
- **[FUTURO]** Avviso quando un prodotto scende sotto una soglia anche ad app chiusa (notifica push/email)
- **[FUTURO]** Riepilogo settimanale delle migliori offerte nei preferiti
- **[FUTURO]** Notifiche push (app mobile) ed email

## 9. Dati e infrastruttura
- **[FATTO]** Posizione e punti vendita: OpenStreetMap (Nominatim per gli indirizzi, Overpass per i supermercati)
- **[FATTO]** Profilo, posizione e preferiti salvati nel browser (localStorage)
- **[FATTO]** Pacchetto `apps/scrapers`: adapter per catena, validazione con schema condiviso (`ScrapedOffer`), snapshot JSON in `data/offers/<catena>/latest.json` (comando: `pnpm --filter @salvaspesa/scrapers scrape [catena]`)
- **[FATTO]** Aggiornamento automatico giornaliero: l'app scrive in `data/tracked.json` le insegne e i negozi Esselunga che segui; lo script `apps/scrapers/scripts/scrape-daily.cmd` (`pnpm --filter @salvaspesa/scrapers scrape:tracked`) li aggiorna e salva lo snapshot del giorno; lo stesso script aggiorna anche i listini completi (`--catalog`), che alimenta lo storico dei prezzi. È pianificato in Windows come attività «SalvaSpesa aggiornamento volantini» ogni giorno alle 07:30 (esito in `data/scrape.log`). Per cambiarlo o toglierlo: `schtasks /Delete /TN "SalvaSpesa aggiornamento volantini" /F`. Il PC deve essere acceso a quell'ora; se non lo è, i dati si aggiornano comunque alla prima apertura dell'app (dati più vecchi di 6 ore)
- **[PROSSIMO]** Abbinare le offerte ai prodotti canonici tra catene (EAN dove c'è, altrimenti marca + nome + formato)
- **[FATTO]** App mobile (Expo) autonoma: scarica e analizza i volantini direttamente sul telefono, senza server

### Fonti dati per catena (verificate il 20/10/2026)
| Catena | Stato | Cosa fornisce |
|---|---|---|
| Lidl | **[FATTO]** 439 offerte | JSON nella pagina: prezzo, prezzo barrato, sconto, €/kg, grammatura, immagine, descrizione, categoria, validità; prezzi Lidl Plus segnati come "richiede carta" |
| Penny | **[FATTO]** 33 offerte | Schede nell'HTML: prezzo con/senza PENNYCard, €/kg, validità; immagine dalla scheda prodotto. La pagina espone solo il volantino corrente (poche offerte) |
| Eurospin | **[FATTO]** 79 offerte | API JSON del sito (`productlisting.model.json`): marca, grammatura, prezzo, prezzo barrato, €/kg, scadenza, immagine. Prezzi "Family" segnati come "richiede carta" |
| Esselunga | **[FATTO]** ~1.500–3.000 offerte per negozio | JSON della "griglia digitale" per negozio: prezzo promo, prezzo normale, sconto, €/kg, validità, immagine. Il negozio si ricava dal preferito (coordinate → codice ufficiale) e si scarica al volo; da CLI: `ESSELUNGA_STORES="AFF,LOR"`. Promozioni complesse (es. 3x2) escluse |
| Tigros | **[FATTO]** 1.653 offerte | Catalogo e-commerce (`promo=true`): marca, formato, prezzo promo, prezzo normale, €/kg, EAN, immagine, validità, "solo con Tigros Card". **Sono prezzi della spesa online**, segnalati come tali; escluse le promozioni multipack (2x1, "% su 2 pezzi") |
| Ekom | **[FATTO]** 154 offerte (77 per regione) | Volantino PDF per regione (Liguria-Piemonte, Toscana): il testo del PDF viene letto con un parser a layout (3 formati di riquadro) e i prezzi vengono ricontrollati (prezzo < prezzo pieno, sconto plausibile). La regione si ricava dalla posizione del negozio preferito. Senza immagini; fuori da queste regioni l'app lo segnala |
| Basko | **[FUTURO]** | Il sito mostra i prezzi solo dopo aver scelto un negozio (nessun dato anonimo) e i volantini sono su un servizio esterno (volantinoggi.it) |
| Gulliver | **[FUTURO]** | Offerte per punto vendita su un'app che richiede la scelta del negozio, volantino digitale a immagini: serve un browser automatico |
| Carrefour | **[PROSSIMO]** | Volantino generato da un servizio esterno (youroperator): serve capire se espone dati o solo immagini |
| Conad | **[FATTO, parziale]** ~150 prodotti con prezzo | Spesa online (`spesaonline.conad.it`): il sito mostra il prezzo solo per circa l'8% dei prodotti (come Tigros, serve scegliere un negozio per il resto), senza prezzi barrati. Sono prezzi del negozio online predefinito, che possono differire dal tuo punto vendita. Il volantino (viewer Shopfully, immagini) e il file Excel dei volantini (vietato dal robots.txt del sito) non sono usati |
| Pam | **[FUTURO]** | Contenuto caricato via JavaScript o URL diversi per punto vendita: serve un browser automatico (Playwright) |
| Aldi | **[FATTO]** ~500 prodotti (di cui ~80 con prezzo barrato = offerte) | Pagine categoria del sito (`/prodotti/.../k/<id>?page=N`): marca, formato, prezzo, prezzo barrato, €/kg-l, immagine. Aldi non ha un volantino a scadenza fissa online: le offerte sono i prodotti con prezzo barrato, il resto è listino. Esclusi abbigliamento, arredo, stagionali e prodotti «disponibili dal» giorno futuro |
| MD | **[FUTURO]** | Il sito pubblica solo il volantino come immagini/viewer, nessun elenco prodotti con prezzo leggibile. Riconosciuto sulla mappa e tra i preferiti, ma l'app segnala «non ancora disponibile» |
| iN's Mercato | **[FUTURO]** | Volantino in un viewer esterno (immagini): nessun dato strutturato. Riconosciuto sulla mappa, segnalato come non disponibile |
| Coop | **[FATTO, solo Liguria]** ~146 offerte valide oggi | Volantini di Coop Liguria pubblicati da Volantino Più: il negozio preferito si abbina (entro 400 m) all'elenco dei punti vendita, la pagina del negozio rimanda ai PDF dei volantini in corso (PDF con testo, letto con un parser a layout come Ekom). Ogni pagina riporta il proprio periodo («dal 15 al 28 ottobre», «fino al 21 ottobre», sezioni a due settimane): lo scraper tiene solo le offerte valide il giorno in cui gira. Prezzi «solo soci» segnati come tali; le promozioni senza prezzo (es. «20% sui prodotti dei produttori locali») non sono lette. Senza immagini. Le altre cooperative (Lombardia, ecc.) hanno altri canali e non sono ancora collegate |
| Iper Tosano | **[FUTURO]** | Il sito pubblica solo il volantino a immagini. Riconosciuto sulla mappa (insegna «Iper Tosano»), segnalato come non disponibile |
| L'Iper | **[FUTURO]** | `volantini.iper.it` usa un servizio di ricerca (Algolia) con chiave pubblica nel codice, ma il nome dell'indice non è esposto e l'elenco indici richiede una chiave amministrativa: non l'ho aggirato. Riconosciuto sulla mappa, segnalato come non disponibile |

Limiti del tracker: una ricerca generica (es. "tonno") confronta anche prodotti diversi (pizza al tonno) perché si ordina per prezzo al kg/l; funziona meglio con marca e prodotto ("Barilla linguine"). I negozi Esselunga "La Esse" non hanno volantino online.

Limiti noti: Lidl e Penny hanno un unico listino nazionale (oggi si prende il primo listino regionale); la marca è dedotta solo quando il titolo la scrive in maiuscolo; Penny non fornisce categoria né marca.

### Amazon nel confronto prezzi
Nel tracker, sotto i risultati dei supermercati, compare il blocco "Su Amazon.it" per la stessa ricerca.
- **Senza configurazione**: mostra il pulsante "Cerca «…» su Amazon" che apre la tua ricerca su Amazon.it. Non leggo le pagine di Amazon in automatico: le sue condizioni d'uso lo vietano.
- **Con l'API ufficiale** (Creators API di Amazon, che ha sostituito la PA-API 5): mostra fino a 8 prodotti con prezzo, prezzo di listino e sconto, con link per l'acquisto. Per attivarla:
  1. iscriviti al programma Affiliazione Amazon (programma-affiliazione.amazon.it) e genera le credenziali Creators API;
  2. copia `apps/web/.env.example` in `apps/web/.env.local` e compila `AMAZON_CREATORS_CLIENT_ID`, `AMAZON_CREATORS_CLIENT_SECRET`, `AMAZON_CREATORS_TOKEN_URL` (l'indirizzo di autenticazione mostrato con le credenziali) e `AMAZON_PARTNER_TAG` (il tuo tag affiliato);
  3. riavvia `pnpm --filter @salvaspesa/web dev`.
- Requisiti Amazon: fonti non ufficiali indicano che l'accesso all'API richiede un minimo di vendite qualificate (circa 10 ogni 30 giorni); verificalo nel tuo account Affiliazione. Se l'accesso non è attivo, il blocco mostra un avviso e resta il link di ricerca.
- Stato: il client è verificato contro un server simulato che riproduce il formato documentato (token, `searchItems`, prezzi, sconto), ma **non ancora con credenziali Amazon reali**.
- Le risposte si memorizzano 15 minuti e le chiamate sono distanziate di almeno 1,1 secondi.
- Per le regole Amazon i prezzi vanno mostrati con data/ora di aggiornamento e l'indicazione di affiliazione: sono già nel blocco.

## Note
- I dati dei punti vendita sono © contributori OpenStreetMap (licenza ODbL): l'attribuzione va mostrata in app.
- Nominatim e Overpass sono servizi pubblici con limiti d'uso: i risultati vengono messi in cache nel browser e le richieste sono poche e mirate.
