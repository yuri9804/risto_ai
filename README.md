# Risto AI - Sistema di Ottimizzazione Menù Ristorante mediante Intelligenza Artificiale

Sistema completo per l'analisi e ottimizzazione del menù di un ristorante attraverso tecniche avanzate di analisi dati e algoritmi di intelligenza artificiale.

## Obiettivi

- **Incremento dei margini di profitto**: identificazione e promozione di piatti ad alta marginalità
- **Riduzione della complessità operativa**: eliminazione di piatti con ingredienti poco utilizzati
- **Aumento della soddisfazione del cliente**: miglioramento della qualità percepita del menù
- **Decisioni strategiche basate su dati**: scelte supportate da analisi concrete

## Architettura del Sistema

### Moduli Principali

1. **Menu AI** - Analisi e ottimizzazione menù
   - Menu Engineering (classificazione Star, Plow Horse, Puzzle, Dog)
   - Analisi correlazione ingredienti-piatti
   - Analisi preferenze clienti
   - Raccomandazioni strategiche

2. **Sistema Previsioni Flussi Clienti**
   - Previsioni giornaliere e settimanali
   - Integrazione dati meteo (OpenWeatherMap)
   - Gestione eventi e festività
   - Classificazione giornate (bassa/media/alta affluenza)

3. **CRM & Segmentazione Clienti**
   - Segmentazione dinamica (RFM analysis)
   - Customer Lifetime Value (CLV)
   - Tracking preferenze e comportamenti
   - Gestione consensi marketing

4. **Marketing Campaign Engine**
   - Campagne automatizzate basate su previsioni
   - Matrice 9 offerte (3 tipi × 3 varianti)
   - Selezione offerta personalizzata per cliente
   - Controlli anti-spam

5. **Sistema Prenotazioni**
   - Gestione disponibilità tavoli
   - Overbooking controllato
   - Conferme e promemoria automatici

6. **WhatsApp Integration**
   - Invio messaggi promozionali
   - Chatbot per prenotazioni
   - Tracking delivery e lettura

7. **Gestione Personale**
   - Scheduling basato su previsioni
   - Rispetto preferenze dipendenti
   - Bilanciamento carichi di lavoro
   - Clock-in/Clock-out

## Stack Tecnologico

- **Backend**: Python 3.10+, FastAPI
- **Database**: PostgreSQL con SQLAlchemy ORM
- **ML/AI**: Prophet, Scikit-learn, Pandas, NumPy
- **Task Queue**: Celery con Redis
- **API Esterne**: WhatsApp Business API, OpenWeatherMap

## Installazione

### Prerequisiti

- Python 3.10+
- PostgreSQL 14+
- Redis

### Setup

```bash
# Clone del repository
git clone <repository-url>
cd risto_ai

# Creazione ambiente virtuale
python -m venv venv
source venv/bin/activate  # Linux/Mac
# oppure: venv\Scripts\activate  # Windows

# Installazione dipendenze
pip install -e ".[dev]"

# Configurazione ambiente
cp .env.example .env
# Modificare .env con le proprie credenziali

# Inizializzazione database
# Assicurarsi che PostgreSQL sia in esecuzione
python -c "from risto_ai.database import init_db; import asyncio; asyncio.run(init_db())"
```

### Avvio

```bash
# Avvio server API
uvicorn risto_ai.main:app --reload

# L'API sarà disponibile su http://localhost:8000
# Documentazione: http://localhost:8000/docs
```

## Configurazione

### Variabili d'Ambiente

| Variabile | Descrizione |
|-----------|-------------|
| `DATABASE_URL` | URL connessione PostgreSQL (async) |
| `REDIS_URL` | URL connessione Redis |
| `SECRET_KEY` | Chiave segreta per JWT |
| `OPENWEATHER_API_KEY` | API key OpenWeatherMap |
| `WHATSAPP_PHONE_NUMBER_ID` | ID numero WhatsApp Business |
| `WHATSAPP_ACCESS_TOKEN` | Token accesso WhatsApp API |

## API Endpoints

### Menu

- `POST /api/v1/menu/analyze` - Esegui analisi completa menù
- `GET /api/v1/menu/recommendations/marketing` - Ottieni piatti consigliati per campagne
- `GET /api/v1/menu/engineering/history` - Storico analisi menu engineering

### Clienti

- `GET /api/v1/customers/{id}` - Profilo cliente completo
- `POST /api/v1/customers/segmentation/run` - Esegui segmentazione
- `GET /api/v1/customers/targetable` - Clienti targetabili per campagne

### Prenotazioni

- `GET /api/v1/reservations/availability` - Verifica disponibilità
- `POST /api/v1/reservations` - Crea prenotazione
- `POST /api/v1/reservations/{code}/confirm` - Conferma prenotazione

### Marketing

- `POST /api/v1/marketing/campaigns/plan` - Genera piano campagna
- `POST /api/v1/marketing/campaigns` - Crea campagna
- `POST /api/v1/marketing/campaigns/{id}/execute` - Esegui campagna

### Previsioni

- `POST /api/v1/predictions/generate` - Genera previsioni
- `GET /api/v1/predictions/day/{date}` - Analisi giornata
- `GET /api/v1/predictions/accuracy` - Metriche accuratezza modello

### Staff

- `GET /api/v1/staff/requirements/{date}` - Requisiti personale
- `GET /api/v1/staff/suggestions/{date}` - Suggerimenti scheduling
- `POST /api/v1/staff/auto-schedule` - Scheduling automatico

### Webhooks

- `GET/POST /api/v1/webhooks/whatsapp` - Webhook WhatsApp

## Flusso Operativo

### 1. Raccolta Dati
- Import dati vendite dal gestionale
- Sincronizzazione prenotazioni
- Aggiornamento previsioni meteo

### 2. Analisi Quotidiana
- Esecuzione previsioni customer flow
- Classificazione giornata
- Calcolo requisiti personale

### 3. Campagne Marketing
- Generazione automatica campagne per giorni a bassa affluenza
- Selezione offerte personalizzate
- Invio via WhatsApp

### 4. Gestione Prenotazioni
- Chatbot WhatsApp per prenotazioni
- Conferme automatiche
- Promemoria giorno prima

### 5. Analisi Periodica
- Menu Engineering settimanale/mensile
- Aggiornamento segmentazione clienti
- Retraining modelli predittivi

## Struttura Progetto

```
risto_ai/
├── src/
│   └── risto_ai/
│       ├── api/
│       │   ├── app.py              # FastAPI application
│       │   └── routes/             # API endpoints
│       ├── database/
│       │   ├── connection.py       # Database setup
│       │   └── models/             # SQLAlchemy models
│       ├── services/
│       │   ├── menu_ai.py          # Menu Engineering
│       │   ├── prediction.py       # Customer flow prediction
│       │   ├── customer.py         # CRM & segmentation
│       │   ├── marketing.py        # Campaign engine
│       │   ├── reservation.py      # Reservation management
│       │   └── staff.py            # Staff scheduling
│       ├── integrations/
│       │   ├── whatsapp.py         # WhatsApp Business API
│       │   └── weather.py          # Weather API
│       ├── config.py               # Settings
│       └── main.py                 # Entry point
├── tests/                          # Test suite
├── pyproject.toml                  # Project configuration
├── .env.example                    # Environment template
└── README.md                       # This file
```

## Menu Engineering

### Classificazione Piatti

| Categoria | Popolarità | Profittabilità | Azione |
|-----------|------------|----------------|--------|
| **Star** | Alta | Alta | Promuovere, mantenere |
| **Plow Horse** | Alta | Bassa | Ottimizzare costi/prezzi |
| **Puzzle** | Bassa | Alta | Aumentare visibilità |
| **Dog** | Bassa | Bassa | Rivalutare/eliminare |

### Analisi Ingredienti

Il sistema identifica:
- Ingredienti esclusivi (usati in un solo piatto)
- Ingredienti a basso utilizzo (< 10% dei piatti)
- Impact analysis sui costi operativi

## Previsioni

### Input
- Storico vendite
- Dati meteo
- Calendario eventi/festività
- Giorno della settimana

### Output
- Coperti previsti (con intervallo di confidenza)
- Ricavi previsti
- Classificazione giornata
- Breakdown orario

## Licenza

MIT License

## Supporto

Per supporto e feedback: [repository issues]
