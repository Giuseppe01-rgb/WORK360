# 🔒 Guida Backup Dati WORK360

## 0. ✉️ Backup Automatico via Email (NUOVO!)

Per ricevere i backup via email, aggiungi questa variabile su Railway:

| Variabile | Valore |
|-----------|--------|
| `BACKUP_RECIPIENT_EMAIL` | La tua email (es: tuonome@gmail.com) |

Le email verranno inviate usando le credenziali SMTP esistenti (`EMAIL_USER`, `EMAIL_PASSWORD`).

---

## 1. Backup Automatici Railway (già attivi)

Railway esegue backup automatici ogni notte alle **03:00**.
- Conservati per 7 giorni (piano Pro)
- Ripristino: Railway Dashboard → PostgreSQL → Backups → Restore

---

## 2. Export Dati via API (Nuovo!)

### Scaricare tutti i dati aziendali

**Da browser (loggato come admin):**
```
https://work360-bay.vercel.app/api/backup/export-all
```

**Oppure da terminale:**
```bash
curl -H "Authorization: Bearer IL_TUO_TOKEN" \
  https://work360-production.up.railway.app/api/backup/export-all \
  -o backup_work360_$(date +%Y%m%d).json
```

### Endpoint disponibili:

| Endpoint | Descrizione |
|----------|-------------|
| `GET /api/backup/export-all` | Tutti i dati aziendali (JSON) |
| `GET /api/backup/export-attendances` | Solo presenze |
| `GET /api/backup/stats` | Statistiche (quanti record) |

---

## 3. Backup Manuale PostgreSQL

### Prerequisiti:
```bash
brew install postgresql  # Solo prima volta
```

### Comando backup:
```bash
pg_dump "postgresql://postgres:PASSWORD@HOST:PORT/railway" \
  > backup_work360_$(date +%Y%m%d).sql
```

### Ripristino:
```bash
psql "NUOVA_CONNECTION_STRING" < backup_work360_20231211.sql
```

---

## 4. Dove trovare la Connection String

1. Vai su [Railway Dashboard](https://railway.app)
2. Clicca su **PostgreSQL**
3. Tab **Connect**
4. Copia **Connection String**

---

## 5. Strategia Consigliata

| Frequenza | Azione |
|-----------|--------|
| Automatico | Railway backup ogni notte |
| Settimanale | Scaricare JSON via /api/backup/export-all |
| Mensile | pg_dump completo su storage esterno |

---

## 6. Cosa fare in caso di emergenza

### Se Railway è down:
1. Aspetta - i dati sono al sicuro nei loro datacenter
2. Controlla status: https://railway.instatus.com/

### Se dati corrotti:
1. Railway Dashboard → PostgreSQL → Backups
2. Seleziona backup precedente → Restore

### Se Railway chiude:
1. Hai i file JSON/SQL di backup
2. Crea nuovo database PostgreSQL (es. Supabase, Neon)
3. Importa dati con: `psql "NUOVA_URL" < backup.sql`

---

**⚠️ IMPORTANTE:** Conserva sempre almeno un backup recente in un luogo diverso da Railway (Google Drive, Dropbox, hard disk locale).
