# WORK360 - Note sulla Sicurezza

Questo documento descrive la gestione delle credenziali, dei dati sensibili e delle best practice di sicurezza per il progetto WORK360.

---

## 1. Dove sono Salvati i Dati

### Database di Produzione
- **Provider**: Railway (PostgreSQL)
- **Backup automatici**: Gestiti da Railway (snapshot giornalieri)
- **Backup manuale**: Disponibile via script `npm run backup:all` (salva in JSON)

### Backup Locali
I backup manuali vengono salvati nella cartella definita da `BACKUP_DIR` (default: `./backups`).  
⚠️ In produzione, questa cartella è **effimera** - i file vengono persi al rideploy. Per backup persistenti, configurare uno storage esterno o usare i backup di Railway.

---

## 2. Variabili d'Ambiente

### Server (`server/.env`)

| Variabile | Descrizione | Obbligatoria |
|-----------|-------------|--------------|
| `DATABASE_URL` | Stringa di connessione PostgreSQL | ✅ Sì |
| `JWT_SECRET` | Chiave per firmare i token JWT | ✅ Sì |
| `CLIENT_URL` | URL del frontend (per CORS) | ✅ Sì |
| `BACKUP_DIR` | Cartella per i backup JSON | ❌ No (default: `./backups`) |
| `NODE_ENV` | `development` o `production` | ❌ No |
| `EMAIL_USER` | Email per invio preventivi | ❌ No |
| `EMAIL_PASSWORD` | App Password Gmail | ❌ No |

### Client (`client/.env.local`)

| Variabile | Descrizione |
|-----------|-------------|
| `VITE_API_URL` | URL dell'API backend |

### Dove Configurare le Variabili

- **Sviluppo Locale**: File `.env` (NON committato nel repo)
- **Produzione (Railway)**: Dashboard Railway → Variables

---

## 3. Separazione Ambiente Dev / Prod

### ⚠️ REGOLA IMPORTANTE
Il **database di sviluppo** NON deve MAI essere lo stesso di **produzione**.

### Setup Consigliato

**Sviluppo Locale**:
```
DATABASE_URL=postgresql://user:pass@localhost:5432/work360_dev
```

**Produzione (Railway)**:
```
DATABASE_URL=postgresql://...@containers-us-east-xxx.railway.app/railway
```

### Come Distinguere
- In locale: usa `NODE_ENV=development` e un DB locale o di test
- In produzione: Railway imposta automaticamente le variabili

---

## 4. Accessi e Autenticazione

### Account con Accesso Privilegiato
I seguenti account devono avere **2FA (autenticazione a due fattori) attiva**:

- [ ] Account GitHub (proprietario del repo)
- [ ] Account Railway (dashboard di produzione)
- [ ] Account Vercel (se usato per frontend)
- [ ] Account email aziendale (per invio quote/SAL)

### Credenziali da NON Condividere Mai

❌ **Non condividere con clienti o terzi**:
- `JWT_SECRET`
- `DATABASE_URL` di produzione
- Password del database
- App Password email
- Token API di Railway/Vercel

### Sviluppatori Esterni

Se in futuro un collaboratore esterno lavora sul progetto:
1. Creare un ambiente di **staging/test** separato
2. Fornire accesso SOLO all'ambiente di test
3. Mai accesso diretto al database di produzione
4. Usare branch separati e code review prima del merge

---

## 5. File Ignorati dal Repository

I seguenti file sono esclusi dal versionamento (vedi `.gitignore`):

```
.env
.env.local
*.env
server/.env
client/.env.local
```

### Cosa Fare se...

**Hai committato per sbaglio un file con segreti:**
1. Rimuovi il file dal repo: `git rm --cached <file>`
2. Aggiungi a `.gitignore`
3. **Cambia TUTTE le credenziali** che erano nel file
4. Forza push per riscrivere la cronologia (opzionale ma consigliato)

---

## 6. Livelli di Sicurezza Implementati

| Level | Feature | Stato |
|-------|---------|-------|
| 1 | Autenticazione JWT + RBAC | ✅ |
| 2 | Rate Limiting + Helmet | ✅ |
| 3 | Input Validation | ✅ |
| 4 | Backup Automatici | ✅ |
| 5 | Audit Trail | ✅ |
| 6 | Healthcheck + Logging | ✅ |
| 7 | Gestione Chiavi | ✅ |

---

## 7. Contatti per Emergenze

In caso di:
- Sospetta compromissione delle credenziali
- Accesso non autorizzato
- Data breach

**Azioni immediate:**
1. Revocare/ruotare le credenziali compromesse
2. Controllare i log di Railway per attività sospette
3. Se necessario, mettere offline il servizio
