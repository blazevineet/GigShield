# 🛵 GigShield — AI-Powered Parametric Income Insurance for Q-Commerce Delivery Partners

**Guidewire DEVTrails 2026 | Hackathon Submission | Phase 1**

> **India's first real-time income insurance for gig workers — powered by parametric triggers, zero paperwork, and instant UPI payouts.**

📄 **[Full Project Report & Documentation (PDF)](https://drive.google.com/file/d/13jHeDluTmdZh7aFXyD4fvhiywEnlDDcm/view?usp=sharing)**

---

## 📋 Table of Contents

- [Problem Statement](#-problem-statement)
- [Persona](#-persona-q-commerce-delivery-partner-zepto--blinkit)
- [Application Workflow](#-application-workflow)
- [Demo Walkthrough](#-demo-walkthrough)
- [Weekly Premium Model](#-weekly-premium-model)
- [Parametric Triggers](#-parametric-triggers)
- [Adversarial Defense & Anti-Spoofing Strategy](#️-adversarial-defense--anti-spoofing-strategy)
- [AI/ML Integration Plan](#-aiml-integration-plan)
- [Tech Stack](#-tech-stack)
- [Repository Structure](#-repository-structure)
- [Running Locally](#-running-locally)
- [Expected Impact](#-expected-impact)
- [Key Engineering Decisions](#-key-engineering-decisions)
- [Development Plan](#-development-plan)
- [Business Model](#-business-model)
- [Guidewire Ecosystem Integration](#️-guidewire-ecosystem-integration)
- [Payout Sustainability & Black Swan Risk](#-payout-sustainability--black-swan-risk)
- [Data Governance & Privacy](#-data-governance--privacy)
- [System Architecture](#️-system-architecture)
- [Known Limitations & Risks](#️-known-limitations--risks)

---

## 🎯 Problem Statement

India's Q-Commerce delivery partners (Zepto, Blinkit, Swiggy Instamart) operate under extreme time pressure with razor-thin income margins. A single disrupted day — due to heavy rain, floods, severe heat, or sudden area curfews — can wipe out 20–30% of their weekly earnings. These workers have no income safety net against such uncontrollable external events.

GigShield is an AI-powered parametric insurance platform that automatically detects disruptions, validates their impact, and delivers instant income compensation — with zero paperwork and zero claim filing required from the worker.

---

## 👤 Persona: Q-Commerce Delivery Partner (Zepto / Blinkit)

**Who They Are**
- Age: 19–35, semi-urban / urban India
- Earns ₹600–₹1,200/day depending on order volume and hours logged
- Works 6–10 hours/day, 6 days/week → ~₹4,000–₹7,000/week
- Operates within a fixed dark store zone (1–5 km radius)
- Highly sensitive to hyperlocal disruptions — a flooded lane or zone lockdown can halt all deliveries in their cluster
- Low financial literacy; prefers simple, vernacular UX
- Pays weekly — not monthly — and expects weekly payouts

**Key Pain Points**

| Pain Point | Detail |
|---|---|
| Income volatility | Earnings drop sharply during weather events |
| No safety net | No employer insurance; gig status = no benefits |
| Zero awareness | No access to traditional insurance products |
| Time-poor | Cannot afford complex onboarding or claim processes |

**Persona-Based Scenario**

**Scenario 1 — Heavy Rain, Chennai (Typical)**
Arjun, a Blinkit delivery partner in Velachery, earns ₹900/day. On a Tuesday evening, the IMD issues a red alert. His dark store shuts down at 4 PM. He loses ~₹400 for that day. With GigShield active, a weather trigger fires automatically, a claim is initiated, and ₹320 (80% of estimated loss) is credited to his UPI within 2 hours — no action required from Arjun.

**Scenario 2 — Area Curfew / Local Strike**
Priya, a Zepto partner in Dharavi, cannot access her pickup zone due to an unplanned local bandh. GigShield detects zone-level order drop-off via platform API signals and local news monitoring, initiates a social disruption claim, and pays out within the day.

**Scenario 3 — Extreme Heat Advisory**
During a heat wave (>42°C) in Delhi, city-level delivery volumes collapse. GigShield's weather trigger detects the anomaly, cross-validates with her GPS inactivity, and automatically compensates for lost hours — protecting her livelihood without her lifting a finger.

---

## 🔄 Application Workflow

**Platform Screens (Mobile-First PWA)**
1. Onboarding — KYC (Aadhaar-lite), platform linking, zone selection
2. Home Dashboard — Active coverage, this week's protection amount, disruption alerts
3. Policy View — Current week plan, premium paid, coverage terms
4. Claims History — Auto-triggered claims, payout status, timeline
5. Settings — Language (Hindi/Tamil/English), UPI ID, notifications

```
[Worker Onboarding]
        ↓
[Risk Profiling (AI)] ←→ [Platform API: Delivery History]
        ↓
[Weekly Policy Issuance + Premium Deduction]
        ↓
[Real-time Disruption Monitoring]
        ↓
[Parametric Trigger Fired?]
YES ↓                     NO → [Monitor continues]
[Fraud Validation (AI)]
        ↓
[Auto Claim Created]
        ↓
[Instant UPI Payout]
        ↓
[Worker Notified via App / SMS]
```

**Admin / Insurer Dashboard (Web)**
- Active policies by zone and city
- Live disruption events and triggered claims
- Loss ratio analytics
- Fraud flagged claims queue
- Predictive risk heatmap for the upcoming week

---

## 🎬 Demo Walkthrough

*Phase 2 simulation — what judges will see running live:*

1. **Trigger** — Chennai Open-Meteo API returns 38mm/hr rainfall for Velachery pin code
2. **Validate** — System confirms dark store shutdown + Arjun's GPS is stationary at zone boundary
3. **Claim** — Auto-claim created in under 3 seconds, BCS score computed as 0.91
4. **Payout** — ₹320 dispatched via Razorpay test mode to Arjun's UPI
5. **Notify** — Push notification + SMS: *"GigShield has credited ₹320 to your UPI for today's rain disruption."*

No action taken by Arjun at any point.

---

## 💰 Weekly Premium Model

**Philosophy**
Q-Commerce workers are paid weekly by platforms. GigShield mirrors this cycle — premiums are deducted weekly, coverage is active for exactly 7 days, and payouts are processed within the same weekly window.

**Pricing Tiers**

| Tier | Weekly Premium | Max Weekly Payout | Best For |
|---|---|---|---|
| Basic Shield | ₹29/week | ₹500 | Casual / part-time workers |
| Standard Shield | ₹49/week | ₹1,000 | Regular full-time workers |
| Pro Shield | ₹79/week | ₹2,000 | High-earning / high-risk zones |

**Dynamic Premium Calculation (AI-Driven)**

| Factor | Weight | Source |
|---|---|---|
| Historical weather risk of worker's zone | 30% | IMD / Open-Meteo historical data |
| Worker's average daily active hours (last 4 weeks) | 20% | Platform API |
| Zone-level claim frequency (past 8 weeks) | 20% | Internal claims database |
| Seasonal disruption index (monsoon, heat waves) | 20% | WeatherAPI + calendar |
| Worker tenure / claim history | 10% | Internal profile |

Example: A worker in a flood-prone zone during monsoon season may pay ₹55/week instead of ₹49 for Standard Shield. A worker in a historically stable zone may pay ₹43/week. The adjustment range is capped at ±25% of base premium to keep it predictable.

**Payout Formula**

```
Payout = (Disrupted Hours / Expected Daily Hours) × Daily Average Earnings × Coverage %
```

- Coverage % = 80% (to prevent moral hazard)
- Expected Daily Hours = rolling 4-week average from platform data
- Maximum single-event payout = capped by tier limit

---

## ⚡ Parametric Triggers

No claim needs to be filed. GigShield fires automatically when ANY of these triggers breach their thresholds:

| # | Trigger | Threshold | Data Source |
|---|---|---|---|
| 1 | Heavy Rainfall | > 35mm/hr in worker's pin code | Open-Meteo API / IMD |
| 2 | Extreme Heat | > 42°C sustained for 3+ hours | Open-Meteo API |
| 3 | Flood / Waterlogging Alert | District-level red alert issued | IMD API / Govt feeds |
| 4 | Severe Air Quality | AQI > 400 (Severe category) | CPCB API |
| 5 | Zone Order Collapse | >60% drop in zone-level orders vs same weekday average | Platform API (mock) |
| 6 | Curfew / Bandh Detection | Verified local curfew in worker's operational zone | News NLP Monitor |

**Trigger Validation Flow**

All triggers go through a 2-step validation before a claim is created:
1. **Event Validation** — Is the external event genuinely occurring? (API + threshold check)
2. **Worker Activity Validation** — Was the worker active (or trying to be) at the time? (GPS + login status check)

---

## 🛡️ Adversarial Defense & Anti-Spoofing Strategy

> **Context:** A coordinated syndicate of 500 delivery workers was identified spoofing GPS coordinates via third-party applications to fake presence inside active weather alert zones — triggering mass false parametric payouts. Simple GPS verification is insufficient against this attack vector. This section documents GigShield's multi-layered defense architecture.

### 1. Differentiation: Genuine Stranded Partner vs. GPS Spoofer

GigShield does not rely on GPS coordinates alone. Every claim validation runs a **Behavioral Coherence Score (BCS)** — a composite signal that asks: *does the totality of this worker's observable behavior match what we would expect from someone genuinely caught in a disruption?*

| Signal | Genuine Worker | GPS Spoofer |
|---|---|---|
| **App session activity** | App open, attempts to accept orders, connectivity drops | App closed or inactive; spoofing app running in background |
| **Platform login events** | Logged into delivery platform, orders attempted then dropped | Logged out or no order activity on platform |
| **Order acceptance rate** | Drop to 0 aligns exactly with disruption event window | Drop may precede or lag the event window suspiciously |
| **Battery & connectivity** | Intermittent signal consistent with bad weather | Stable connectivity — indoors on Wi-Fi |
| **Device motion sensor** | Accelerometer/gyroscope shows stationary or low-movement | Stationary — consistent with being at rest at home |
| **Cell tower triangulation** | Cell tower location corroborates GPS pin code | Cell tower location contradicts GPS coordinates |
| **Historical zone presence** | Worker's last 4 weeks of data shows genuine presence in claimed zone | Worker has no history of operating in the claimed zone |

The BCS model (XGBoost classifier) is trained on these combined signals. A claim with BCS below a confidence threshold is routed to **Pending Review**, not auto-rejected.

### 2. Data Points: Detecting a Coordinated Fraud Ring

**Signal Layer 1 — Individual Device Forensics**

- **GPS signal quality metadata:** Spoofing apps produce GPS signals with abnormally perfect accuracy (±0 meter jitter). Genuine outdoor GPS in heavy rain shows typical ±10–30m drift. We flag claims where GPS precision is *suspiciously high* during a reported severe weather event.
- **Mock location flag:** Android's `Location.isFromMockProvider()` API and iOS equivalent are checked at every GPS ping. Any claim where mock location was active during the event window is immediately flagged.
- **Background process fingerprint:** At KYC onboarding, GigShield's PWA collects device capability consent. Known GPS-spoofing app signatures (process names, battery drain patterns) are cross-referenced during active event windows.
- **IP geolocation vs. GPS:** If the worker's IP resolves to a residential ISP (home broadband) while their GPS claims they are in a flooded outdoor zone, this is a high-confidence fraud signal.

**Signal Layer 2 — Platform Behavioral Cross-Validation**

- **Order attempt log:** The delivery platform API provides a log of order requests received and accepted/rejected per worker. A genuine disruption shows orders *offered and declined* due to zone shutdown — not zero activity.
- **Dark store operational status:** GigShield directly queries whether the worker's assigned dark store was actually shut down during the event.
- **Peer activity comparison:** If 80% of active workers in the same zone continued working during an event a worker claims as disruptive, that is a strong counter-signal.

**Signal Layer 3 — Syndicate / Ring Detection (Graph Analysis)**

- **Temporal clustering analysis:** If 50+ claims fire within the same 15-minute window from the same zone during a single event, this is statistically anomalous.
- **Social graph modeling:** Workers who share the same device network (same IP subnet at onboarding) are grouped into a risk graph. A fraud ring activating simultaneously shows up as a connected cluster. This is detectable using graph anomaly detection (Isolation Forest on the adjacency matrix of claim co-occurrence).
- **Device fingerprint deduplication:** Fraudsters in a syndicate often use the same spoofing app configuration or purchase accounts in bulk.
- **New account velocity:** Accounts created within 2 weeks of a major weather event and immediately triggering claims are high-risk.

### 3. UX Balance: Three-Tier Claim Disposition Model

```
                     ┌──────────────────────────────────┐
                     │     CLAIM TRIGGERED (AUTO)        │
                     └──────────────┬───────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                      ▼
     BCS ≥ 0.85              0.50 ≤ BCS < 0.85         BCS < 0.50
   HIGH CONFIDENCE          SOFT FLAG ZONE           HIGH RISK FLAG
              │                     │                      │
              ▼                     ▼                      ▼
    AUTO-APPROVED            SOFT HOLD (2 hr)        HARD HOLD
    Instant UPI payout    Passive data collection   Human review queue
                          No worker action needed   Worker notified
```

**Tier 1 — Auto-Approved (BCS ≥ 0.85):** Instant payout. No friction for the majority of legitimate workers. Target: 90%+ of all genuine claims clear this threshold without human intervention.

**Tier 2 — Soft Hold (BCS 0.50–0.85):** Claim held for a maximum of 2 hours while the system passively collects additional telemetry. No action required from the worker. If BCS rises above threshold within the hold window, the payout fires automatically. Worker sees: *"Your claim is being verified — you'll hear back within 2 hours."*

**Tier 3 — Hard Hold (BCS < 0.50 or syndicate flag):** Claim queued for human review. Worker is notified and *may optionally* share a photo or platform screenshot — but this is not required. **The burden of proof is on GigShield, not the worker.** Denied claims include a plain-language explanation and a one-tap appeals link.

**Anti-Discrimination Safeguard:** The BCS model is audited quarterly for demographic bias. If zone-level Tier 3 routing rates exceed 15%, that zone's BCS thresholds are recalibrated.

---

## 🤖 AI/ML Integration Plan

### 1. Dynamic Premium Engine
- **Model Type:** Gradient Boosted Trees (XGBoost / LightGBM)
- **Input Features:** Zone risk score, worker history, seasonal index, past claims
- **Output:** Weekly premium multiplier (0.75x – 1.25x of base)

### 2. Fraud Detection System
- **Behavioral Coherence Score (BCS):** XGBoost classifier on multi-signal behavioral stack
- **Anomaly Detection:** Isolation Forest on claim patterns and temporal clustering
- **GPS Spoofing Detection:** Mock location API flag + GPS jitter analysis + cell tower cross-validation
- **Syndicate Ring Detection:** Graph anomaly detection on claim co-occurrence adjacency matrix
- **Rule-based hard filters:** Mock location active during event = immediate flag

### 3. Risk Heatmap (Insurer Dashboard)
- **Model:** Time-series forecasting (Prophet / LSTM) on historical disruption + claims data
- **Output:** Next-week risk score by pin code for insurer pre-pricing and exposure management

### 4. NLP-based Social Disruption Monitor
- **Approach:** Keyword + entity extraction on local news feeds and social media
- **Goal:** Detect curfews, strikes, bandhs in near real-time for zones not covered by official APIs

---

## 🛠 Tech Stack

**Frontend (Mobile-First PWA)**

| Layer | Technology |
|---|---|
| Framework | React + Vite |
| UI Components | Tailwind CSS + shadcn/ui |
| PWA Support | Workbox (offline-first) |
| Language Support | i18next (English, Hindi, Tamil) |
| Maps / Zone Viz | Leaflet.js |

**Backend**

| Layer | Technology |
|---|---|
| Runtime | Node.js + Express |
| Language | TypeScript |
| Database | PostgreSQL (policies, claims, workers) |
| Cache | Redis (live disruption state) |
| Auth | JWT + OTP-based (no password) |
| Queue | BullMQ (async claim processing) |

**AI/ML**

| Component | Technology |
|---|---|
| Premium Engine | Python + scikit-learn / XGBoost |
| Fraud Detection + BCS | Python + XGBoost + Isolation Forest |
| Syndicate Detection | Python + NetworkX (graph analysis) |
| NLP Monitor | Python + spaCy / HuggingFace |
| Serving | FastAPI (ML microservice) |

**Integrations (Phase 1-2)**

| Service | API / Approach |
|---|---|
| Weather | Open-Meteo (free, no key needed) |
| Air Quality | CPCB open data / OpenAQ |
| Payment Payout | Razorpay Test Mode |
| Platform Data | Mock API (simulated delivery history) |
| Disaster Alerts | IMD RSS feeds |

**Infrastructure**

| Component | Technology |
|---|---|
| Hosting | Vercel (frontend) + Railway / Render (backend) |
| CI/CD | GitHub Actions |
| Monitoring | Sentry (errors) + Grafana (metrics) |

---

## 📁 Repository Structure

```
gigshield/
├── README.md                  ← This file
├── docker-compose.yml         ← Spins up PostgreSQL + Redis locally
├── .env.example               ← Environment variable template
├── frontend/                  ← React PWA (worker-facing)
│   ├── package.json
│   ├── vite.config.ts
│   ├── src/
│   └── public/
├── backend/                   ← Node.js + Express API
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   └── workers/           ← BullMQ job processors
│   └── prisma/                ← DB schema + seed data
├── ml/                        ← Python ML microservice (FastAPI)
│   ├── requirements.txt
│   ├── premium_engine/
│   ├── fraud_detection/
│   │   ├── bcs_model/         ← Behavioral Coherence Score
│   │   └── syndicate_graph/   ← Ring detection
│   └── nlp_monitor/
├── mock-apis/                 ← Simulated platform & payment APIs
└── docs/
    └── architecture.png
```

---

## 🚀 Running Locally

This section covers everything you need to run GigShield on your machine. The project has three services: a React frontend, a Node.js backend, and a Python ML microservice. PostgreSQL and Redis are run via Docker.

### Prerequisites

Make sure you have the following installed:

| Tool | Version | Purpose |
|---|---|---|
| Node.js | v18+ | Frontend & Backend |
| npm | v9+ | Package management |
| Python | 3.10+ | ML microservice |
| pip | Latest | Python packages |
| Docker | Latest | PostgreSQL + Redis |
| Docker Compose | v2+ | Multi-container orchestration |
| Git | Any | Clone the repo |

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/gigshield.git
cd gigshield
```

### 2. Start Infrastructure (PostgreSQL + Redis via Docker)

GigShield uses PostgreSQL as its primary database and Redis for live disruption state and BullMQ job queues. Both are managed via Docker Compose.

```bash
docker-compose up -d
```

This starts:
- **PostgreSQL** on `localhost:5432` (database: `gigshield`, user: `gigshield`, password: `gigshield`)
- **Redis** on `localhost:6379`

Verify containers are running:

```bash
docker ps
```

You should see both `gigshield-postgres` and `gigshield-redis` containers with status `Up`.

> **To stop containers:** `docker-compose down`
> **To stop and wipe data:** `docker-compose down -v`

### 3. Environment Variables

Copy the example environment file and fill in the required values:

```bash
cp .env.example .env
```

Open `.env` and configure:

```env
# ─── Database ───────────────────────────────────────────
DATABASE_URL="postgresql://gigshield:gigshield@localhost:5432/gigshield"

# ─── Redis ──────────────────────────────────────────────
REDIS_URL="redis://localhost:6379"

# ─── Auth ───────────────────────────────────────────────
JWT_SECRET="your-super-secret-jwt-key-change-this"
JWT_EXPIRES_IN="7d"

# ─── Razorpay (Test Mode) ───────────────────────────────
RAZORPAY_KEY_ID="rzp_test_xxxxxxxxxxxx"
RAZORPAY_KEY_SECRET="your_razorpay_test_secret"

# ─── ML Service ─────────────────────────────────────────
ML_SERVICE_URL="http://localhost:8000"

# ─── External APIs (all free / no key needed) ───────────
OPEN_METEO_BASE_URL="https://api.open-meteo.com/v1"

# ─── App Config ─────────────────────────────────────────
NODE_ENV="development"
PORT=3001
FRONTEND_URL="http://localhost:5173"
```

> The weather API (Open-Meteo) requires no API key. Razorpay test keys are free — sign up at razorpay.com.

### 4. Backend Setup

```bash
cd backend
npm install
```

Run database migrations and seed initial data:

```bash
npm run db:migrate     # Applies all Prisma migrations
npm run db:seed        # Seeds mock workers, zones, and policies
```

Start the backend development server:

```bash
npm run dev
```

The backend will start at **http://localhost:3001**.

To run the BullMQ trigger worker (in a separate terminal):

```bash
npm run worker
```

### 5. Frontend Setup

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend will start at **http://localhost:5173**.

### 6. ML Microservice Setup

Open another terminal:

```bash
cd ml
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The ML service will start at **http://localhost:8000**.

API docs are auto-generated at **http://localhost:8000/docs** (Swagger UI).

### 7. Verify Everything Is Running

| Service | URL | Health Check |
|---|---|---|
| Frontend (React PWA) | http://localhost:5173 | Opens in browser |
| Backend API | http://localhost:3001 | GET `/health` → `{ status: "ok" }` |
| ML Microservice | http://localhost:8000 | GET `/health` → `{ status: "ok" }` |
| PostgreSQL | localhost:5432 | `docker ps` shows container Up |
| Redis | localhost:6379 | `docker ps` shows container Up |

### 8. Optional: Database GUI

To inspect the database visually via Prisma Studio:

```bash
cd backend
npm run db:studio
```

Prisma Studio opens at **http://localhost:5555** — browse workers, policies, claims, and disruption events.

### Quick Start Summary

```bash
# Terminal 1 — Infrastructure
docker-compose up -d

# Terminal 2 — Backend
cd backend && npm install && npm run db:migrate && npm run db:seed && npm run dev

# Terminal 3 — ML Service
cd ml && pip install -r requirements.txt && uvicorn main:app --reload --port 8000

# Terminal 4 — Frontend
cd frontend && npm install && npm run dev

# Terminal 5 (optional) — BullMQ Worker
cd backend && npm run worker
```

### Troubleshooting

| Issue | Fix |
|---|---|
| `ECONNREFUSED` on port 5432 | Docker isn't running. Start Docker Desktop and re-run `docker-compose up -d` |
| `ECONNREFUSED` on port 6379 | Redis container not up. Check `docker ps` and re-run `docker-compose up -d` |
| Prisma migration fails | Ensure `DATABASE_URL` in `.env` is correct and PostgreSQL is running |
| ML service import errors | Ensure Python 3.10+ is active. Try `python3 -m pip install -r requirements.txt` |
| Port already in use | Change `PORT` in `.env` or kill the existing process using that port |
| Frontend can't reach backend | Confirm `FRONTEND_URL` in `.env` matches your frontend origin (default: `http://localhost:5173`) |

---

## 📊 Expected Impact

| Metric | Target |
|---|---|
| Income volatility reduction | 25–40% for covered workers |
| Claim processing time | < 2 hours (auto-approved) · < 4 hours (human reviewed) |
| Fraud reduction vs naive GPS | > 80% |
| Premium as % of weekly earnings | < 4% at Standard Shield tier |
| Worker onboarding time | < 3 minutes |

---

## 🧠 Key Engineering Decisions

**Why XGBoost over neural networks for premium pricing?**
Weekly premium calculation requires explainability — insurers and regulators need to audit why a worker was charged more. XGBoost provides feature-level importance scores. A neural network is a black box at this data scale and would be impossible to justify to a regulator.

**Why PWA over Flutter or a native app?**
Delivery partners won't install a dedicated app. A PWA works in any browser, can be pinned to the home screen, works partially offline, and requires zero app store approval — critical for a hackathon demo and real-world adoption at scale.

**Why parametric over indemnity insurance?**
Indemnity requires loss assessment — impossible to do in real time for a ₹400 daily wage earner. Parametric removes the adjuster entirely. The trigger is the proof.

**Why PostgreSQL + Redis + Docker?**
PostgreSQL handles durable, relational storage for policies and claims. Redis provides sub-millisecond read performance for live disruption state and powers BullMQ's job queue. Docker ensures consistent infrastructure across environments — any developer can run `docker-compose up -d` and have the exact same stack.

**Why a three-tier claim disposition over binary approve/reject?**
Binary systems either over-approve (exploitable) or over-reject (unfair to honest workers). A soft-hold tier with passive re-evaluation handles the ambiguous middle ground — poor signal quality in bad weather — without penalizing legitimate claimants or requiring them to prove their innocence.

---

## 🗺 Development Plan

### Phase 1 (Mar 4–20): Ideation & Foundation ✅
- Define persona, disruption triggers, and premium model
- Finalize tech stack
- Write README — including Adversarial Defense architecture
- Record 2-minute strategy video
- Set up GitHub repository structure

### Phase 2 (Mar 21–Apr 4): Automation & Protection
- Worker registration + KYC flow
- Policy creation with dynamic weekly premium
- 3–5 automated disruption trigger integrations (weather, AQI, zone collapse)
- Zero-touch claim initiation pipeline
- Mock payout via Razorpay test mode
- Basic worker dashboard (PWA)
- **BCS model v1 — GPS mock detection + platform activity cross-validation**

### Phase 3 (Apr 5–17): Scale & Optimise
- Advanced fraud detection (GPS jitter analysis, syndicate ring detection, graph anomaly)
- Insurer analytics dashboard (loss ratios, risk heatmap, fraud queue)
- NLP-based social disruption monitor
- End-to-end demo simulation (fake rainstorm → auto claim → payout)
- Final pitch deck (PDF)
- 5-minute demo video

---

## 📌 Key Design Decisions

**Why Mobile-first PWA over Native App?** Delivery partners use their phones constantly but are unlikely to install a dedicated app. A PWA works in the browser, can be added to the home screen, works partially offline, and can be demonstrated easily during judging without app store dependencies.

**Why Q-Commerce (Zepto/Blinkit) over Food Delivery?** Q-Commerce riders operate in highly localized zones (dark store clusters), making hyperlocal risk modeling more precise and meaningful. Their deliveries are more sensitive to short, intense disruptions (a 2-hour rain event can halt an entire cluster), which is ideal for parametric insurance triggers.

**Why Weekly pricing over Daily?** Weekly aligns exactly with platform payout cycles, is simple enough for low-literacy users to understand, and reduces premium collection friction.

**Why Parametric over Traditional Insurance?** Zero-touch. No claim forms. No adjuster visits. No documentation. The trigger either fires or it doesn't. This is the only model that can realistically serve a gig worker population at scale in India.

---

## 🖼️ UI/UX — Screen Descriptions

**Worker Home Dashboard**
```
┌─────────────────────────────────┐
│  🛵 GigShield          [EN|HI|TA]│
│─────────────────────────────────│
│  This week's protection         │
│  ██████████████░░  ₹1,000 max   │
│                                 │
│  ⚠️  Rain alert — Velachery     │
│  Your claim is being verified   │
│                                 │
│  Last payout: ₹320  ✓ Today    │
│                                 │
│  [View Policy]  [Claim History] │
└─────────────────────────────────┘
```

**Insurer Admin Dashboard — Key Panels**
- Live disruption map (Leaflet.js) with active trigger zones highlighted in red
- Claim queue: Auto-approved / Soft hold / Hard hold counts with drill-down
- Loss ratio chart by zone and week
- Fraud flagged claims with BCS score breakdown and ring detection graph

---

## 💼 Business Model

GigShield is designed as a **B2B2C platform** — distribution through gig platforms, not direct-to-worker cold outreach.

| Layer | Detail |
|---|---|
| **Distribution** | Platform-embedded — Zepto, Blinkit, Swiggy Instamart integrate GigShield into their rider apps |
| **Premium collection** | Deducted automatically from weekly platform payouts — zero friction for the worker |
| **Revenue model** | 10–15% margin on premium after claims, reinsurance, and operational costs |
| **Insurer partnerships** | White-labelled underwriting partnerships with licensed insurers (IRDAI-regulated) |
| **Guidewire ecosystem** | PolicyCenter for micro-policy management · ClaimCenter via Cloud API for hard-hold human reviews |

**Unit Economics (Standard Shield)**
- Premium: ₹49/week · Expected claim rate: ~18% of active weeks · Avg payout: ₹280
- Expected loss ratio: ~65% · Margin before ops: ~35%
- Break-even at ~12,000 active weekly policies per city

---

## 🏗️ Guidewire Ecosystem Integration

GigShield is purpose-built to plug into the Guidewire insurance platform:

- **Guidewire PolicyCenter** — Back-end micro-policy lifecycle management. Each weekly GigShield policy is issued, renewed, and cancelled as a structured policy object in PolicyCenter via Cloud API.
- **Guidewire ClaimCenter** — Hard-hold claims (BCS < 0.50) are pushed into ClaimCenter as structured claim records for human adjuster review. The BCS score, signal breakdown, and fraud flags are passed as claim attributes.
- **Guidewire DataHub** — Aggregated claims and loss ratio data flows into DataHub for actuarial analysis, enabling dynamic pricing refinement over time.

This architecture means GigShield's parametric automation handles 90%+ of claims with zero human touch — and Guidewire's enterprise tooling handles the remaining edge cases at scale.

---

## 🌊 Payout Sustainability & Black Swan Risk

A major flood or city-wide heat wave could trigger thousands of simultaneous claims. GigShield addresses this at three levels:

**1. Maximum Aggregated Zone Limit (MAZL)**
Each pin code zone has a weekly aggregated payout cap. If total claims in a zone exceed the MAZL, individual payouts are pro-rated. Workers are notified of this cap at onboarding.

**2. Reinsurance Layer**
A reinsurance treaty covers aggregate claims exceeding 150% of expected weekly loss ratio per city. Built into the pricing model.

**3. Dynamic Exposure Management**
The insurer dashboard's risk heatmap (Prophet/LSTM forecasting) gives insurers advance warning of high-risk weeks — allowing temporary policy cap reductions or premium adjustments before a predicted event window.

---

## 🔒 Data Governance & Privacy

| Principle | Implementation |
|---|---|
| **Minimal collection** | Device signals collected only during the active 7-day policy window |
| **Purpose limitation** | Behavioural data used exclusively for BCS fraud scoring — never sold or profiled |
| **Anonymisation** | Worker identity is hashed in the ML pipeline — models train on anonymised data |
| **Consent-first** | All device permissions requested explicitly at onboarding with plain-language explanations |
| **Retention** | Raw device telemetry deleted after 30 days; aggregated zone-level features retained for 12 months |
| **Right to explanation** | Any denied or held claim includes a plain-language BCS breakdown |

GigShield complies with the **Digital Personal Data Protection Act (DPDPA) 2023** framework.

---

## 🗺️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     WORKER (Mobile PWA)                      │
│          React + Vite · Tailwind · Workbox offline           │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS
┌───────────────────────▼─────────────────────────────────────┐
│                   BACKEND API                                │
│        Node.js + TypeScript · Express · BullMQ               │
│        PostgreSQL (policies/claims) · Redis (live state)     │
└──────┬──────────────────────────────┬────────────────────────┘
       │                              │
┌──────▼──────────┐         ┌─────────▼──────────────────────┐
│   ML MICROSERVICE│         │        EXTERNAL DATA FEEDS      │
│  Python FastAPI  │         │  Open-Meteo · IMD · CPCB        │
│  XGBoost premium │         │  Platform API · NLP Monitor     │
│  BCS fraud model │         │  Razorpay (payouts)             │
│  NetworkX graphs │         └────────────────────────────────┘
│  spaCy NLP       │
└──────┬──────────┘
       │
┌──────▼──────────────────────────────────────────────────────┐
│              GUIDEWIRE CLOUD APIs                            │
│  PolicyCenter (policy lifecycle) · ClaimCenter (hard holds) │
│  DataHub (actuarial analytics)                              │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚠️ Known Limitations & Risks

| Limitation | Mitigation |
|---|---|
| Dependency on platform APIs for order data | Mock APIs in Phase 1–2; partnership agreements in production |
| False negatives in low-data zones (sparse GPS, poor cell coverage) | BCS model recalibrated quarterly per zone; low signal in bad weather treated as positive indicator |
| Weather API reliability (Open-Meteo free tier) | IMD RSS feeds as fallback; dual-source validation before any trigger fires |
| New worker cold-start problem (no claim history) | Default to zone-average risk profile for first 4 weeks |
| Moral hazard at 80% coverage | Deliberate design cap — 20% uninsured keeps workers partially incentivised to work when safe |

---

## 🚫 Out of Scope (By Design)

- ❌ Health insurance or hospitalization coverage
- ❌ Life insurance or accidental death benefits
- ❌ Vehicle repair or damage coverage
- ❌ Fuel cost reimbursement
- ❌ Any coverage that requires manual claim filing or documentation

---

📄 **[Full Project Report & Documentation (PDF)](https://drive.google.com/file/d/13jHeDluTmdZh7aFXyD4fvhiywEnlDDcm/view?usp=sharing)**

---

*GigShield — Because every delivery partner deserves a safety net.*
