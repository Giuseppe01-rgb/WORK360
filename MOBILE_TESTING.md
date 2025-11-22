# Guida al Testing Mobile per WORK360

Questa guida ti aiuterà a testare l'applicazione WORK360 sul tuo dispositivo mobile (smartphone o tablet) per verificare le funzionalità touch, la geolocalizzazione e l'integrazione con la fotocamera.

## 1. Avviare l'Applicazione in Modalità Rete

Per accedere all'applicazione dal tuo telefono, il tuo computer e il telefono devono essere connessi alla **stessa rete Wi-Fi**.

1.  Apri il terminale nel progetto.
2.  Avvia il server di sviluppo con il flag `--host`:
    ```bash
    npm run dev -- --host
    ```
3.  Il terminale mostrerà un indirizzo IP locale, simile a:
    ```
    ➜  Local:   http://localhost:5173/
    ➜  Network: http://192.168.1.X:5173/
    ```
4.  Apri il browser sul tuo telefono (Chrome su Android, Safari su iOS) e digita l'indirizzo **Network** (es. `http://192.168.1.X:5173`).

## 2. Testare la Geolocalizzazione (Timbratura)

La funzionalità di timbratura richiede l'accesso al GPS.

1.  Accedi come **Operaio** (o crea un nuovo account operaio).
2.  Vai alla Dashboard.
3.  Seleziona un cantiere dal menu a tendina.
4.  Premi **"▶️ Timbra Entrata"**.
5.  Il browser ti chiederà il permesso di accedere alla posizione. **Consenti**.
    *   *Nota: Se non appare la richiesta, verifica nelle impostazioni del browser che i permessi di localizzazione non siano bloccati per questo sito.*
    *   *Nota: Su alcuni dispositivi iOS, la geolocalizzazione potrebbe richiedere che il sito sia servito via HTTPS. In ambiente di sviluppo locale (HTTP), potrebbe non funzionare su tutti i browser iOS. Chrome per iOS è spesso più permissivo.*
6.  Verifica che appaia il messaggio di successo e l'orario di entrata.

## 3. Testare l'Upload di Foto

1.  Nella Dashboard Operaio, vai alla scheda **"Foto"**.
2.  Premi il pulsante per caricare una foto.
3.  Il telefono dovrebbe offrirti la scelta tra **Scatta Foto** (Camera) o **Libreria Foto**.
4.  Prova a scattare una foto direttamente.
5.  Verifica che l'anteprima appaia correttamente.
6.  Premi "Carica Foto" e attendi la conferma.

## 4. Testare la Firma Digitale (Proprietario)

1.  Accedi come **Proprietario** (Owner).
2.  Vai alla pagina **"Firma"** (dal menu laterale).
3.  Usa il dito per disegnare la tua firma nel riquadro tratteggiato.
4.  Verifica che il tratto sia fluido e segua il dito.
5.  Premi **"Salva Firma"**.
6.  Verifica che l'immagine della firma salvata appaia sotto.

## 5. Testare l'Invio WhatsApp (Preventivi)

1.  Vai alla pagina **"Preventivi"**.
2.  Crea un nuovo preventivo o modificane uno esistente.
3.  Assicurati di inserire un numero di telefono valido nel campo cliente (incluso prefisso, es. `+39...`).
4.  Premi **"Procedi all'invio"**.
5.  Nel modale di invio, premi **"💬 Invia via WhatsApp"**.
6.  Dovrebbe aprirsi automaticamente l'app di WhatsApp (se installata) con il messaggio precompilato e il link al preventivo.

## Risoluzione Problemi Comuni

*   **Pagina bianca o errore di connessione:** Verifica che il firewall del computer non stia bloccando la connessione sulla porta 5173.
*   **Geolocalizzazione fallita:** Assicurati che il GPS del telefono sia attivo e che tu abbia concesso i permessi al browser.
*   **Layout rotto:** Se noti elementi sovrapposti o troppo piccoli, segnalalo indicando il modello del telefono. L'interfaccia è progettata per adattarsi, ma schermi molto piccoli potrebbero richiedere aggiustamenti.
