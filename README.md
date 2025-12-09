# WORK360

WORK360, gestione aziendale per imprese edili e di imbiancatura.

## Struttura del Progetto

```
WORK360/
├── client/          # Frontend React + Vite
├── server/          # Backend Node.js + Express + PostgreSQL
└── README.md
```

## Setup Locale

### Backend (Server)

```bash
cd server
npm install
cp .env.example .env  # Configura le variabili d'ambiente
npm run dev
```

### Frontend (Client)

```bash
cd client
npm install
npm run dev
```

---

## Backup e Ripristino Dati

### Panoramica

WORK360 include un sistema di backup automatico che esporta tutti i dati di tutte le aziende in un file JSON.

### Configurazione

1. **Imposta la directory di backup** aggiungendo al file `.env`:

   ```env
   BACKUP_DIR=./backups
   ```

   > ⚠️ In produzione, `BACKUP_DIR` dovrebbe puntare a uno storage persistente (es. volume montato su Railway).

2. **Esegui il backup manualmente**:

   ```bash
   npm run backup:all
   ```

   Questo creerà un file `work360-backup-YYYYMMDD-HHmmss.json` nella directory specificata.

### Export Dati Singola Azienda

Gli owner possono esportare i dati della propria azienda tramite l'endpoint:

```
GET /api/company/export
```

Richiede autenticazione e ruolo `owner`. Restituisce un file JSON scaricabile con tutti i dati dell'azienda.

---

## Backup Automatico con Railway Scheduled Job

Per eseguire il backup automaticamente ogni giorno alle 03:00, configura un **Scheduled Job** su Railway:

### Passaggi

1. **Accedi al tuo progetto Railway**
   - Vai su [railway.app](https://railway.app) e apri il tuo progetto WORK360

2. **Crea un nuovo Scheduled Job**
   - Nella sidebar, clicca su **"+ New"** → **"Scheduled Job"** (o **"Cron Job"**)
   - Seleziona il repository del progetto

3. **Configura il comando**
   - **Root Directory**: `server` (o la cartella del backend)
   - **Build Command**: `npm install`
   - **Start Command**: `npm run backup:all`

4. **Imposta lo schedule (cron)**
   - Usa la sintassi cron: `0 3 * * *`
   - Questo significa: "ogni giorno alle 03:00 (UTC)"
   
   > 💡 Per le 03:00 ora italiana (CET/CEST), usa `0 2 * * *` in inverno o `0 1 * * *` in estate.

5. **Configura le variabili d'ambiente**
   - Assicurati che il job abbia accesso alle stesse variabili del servizio principale:
     - `DATABASE_URL` (o `POSTGRES_URL`)
     - `BACKUP_DIR` - imposta a un percorso persistente, es. `/data/backups`
   
   > ⚠️ Se usi un volume persistente su Railway, monta il volume e punta `BACKUP_DIR` a quel percorso.

6. **Salva e attiva il job**
   - Clicca su **"Create"** o **"Save"**
   - Il job verrà eseguito automaticamente ogni giorno alle 03:00

### Verifica

- Controlla i log del job per confermare che il backup sia stato completato
- Il file di backup includerà tutti i dati di tutte le aziende

---

## Soft-Delete

WORK360 utilizza il **soft-delete** per le entità critiche:

- **Cantieri** (`construction_sites`)
- **Economie** (`economias`)

Quando elimini un cantiere o un'economia:
- Il record **non viene cancellato** dal database
- Viene impostato il campo `deleted_at` con la data corrente
- Il record non appare più nelle liste normali dell'app
- Il record **è incluso** nei backup e negli export per mantenere la storicità

### Ripristino

Per ripristinare un record soft-deleted, imposta `deleted_at = NULL` direttamente nel database.

---

## Sicurezza

WORK360 implementa diversi livelli di sicurezza:

1. **Level 1**: Autenticazione JWT + RBAC (owner/worker)
2. **Level 2**: Rate limiting + Helmet headers
3. **Level 3**: Input validation con express-validator
4. **Level 4**: Data protection + Backup automatici

---

## Licenza

Proprietario
