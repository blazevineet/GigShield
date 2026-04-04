# 🛵 GigShield — AI-Powered Parametric Income Insurance for Q-Commerce Delivery Partners

**Guidewire DEVTrails 2026 | Hackathon Submission | Phase 1**

> **India's first real-time income insurance for gig workers — powered by parametric triggers, zero paperwork, and instant UPI payouts.**

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

---

### 1. Differentiation: Genuine Stranded Partner vs. GPS Spoofer

GigShield does not rely on GPS coordinates alone. Every claim validation runs a **Behavioral Coherence Score (BCS)** — a composite signal that asks: *does the totality of this worker's observable behavior match what we would expect from someone genuinely caught in a disruption?*

A legitimate stranded worker shows a specific, consistent behavioral signature:

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

---

### 2. Data Points: Detecting a Coordinated Fraud Ring

Individual spoofing is hard. Coordinated syndicate behavior at scale produces statistically anomalous patterns that are detectable at the **zone and time-window level**, not just the individual level.

**Signal Layer 1 — Individual Device Forensics**

- **GPS signal quality metadata:** Spoofing apps produce GPS signals with abnormally perfect accuracy (±0 meter jitter). Genuine outdoor GPS in heavy rain shows typical ±10–30m drift. We flag claims where GPS precision is *suspiciously high* during a reported severe weather event.
- **Mock location flag:** Android's `Location.isFromMockProvider()` API and iOS equivalent are checked at every GPS ping. Any claim where mock location was active during the event window is immediately flagged.
- **Background process fingerprint:** At KYC onboarding, GigShield's PWA collects device capability consent. Known GPS-spoofing app signatures (process names, battery drain patterns) are cross-referenced during active event windows.
- **IP geolocation vs. GPS:** If the worker's IP resolves to a residential ISP (home broadband) while their GPS claims they are in a flooded outdoor zone, this is a high-confidence fraud signal.

**Signal Layer 2 — Platform Behavioral Cross-Validation**

- **Order attempt log:** The delivery platform API provides a log of order requests received and accepted/rejected per worker. A genuine disruption shows orders *offered and declined* due to zone shutdown — not zero activity. A spoofer at home shows *no order attempts at all* during the window.
- **Dark store operational status:** GigShield directly queries whether the worker's assigned dark store was actually shut down during the event. If the store remained operational but a worker claims income loss, that is a contradiction.
- **Peer activity comparison:** If 80% of active workers in the same zone continued working during an event a worker claims as disruptive, that is a strong counter-signal.

**Signal Layer 3 — Syndicate / Ring Detection (Graph Analysis)**

This is the critical layer for defeating *coordinated* fraud, not just individual spoofing.

- **Temporal clustering analysis:** If 50+ claims fire within the same 15-minute window from the same zone during a single event, this is statistically anomalous. Genuine disruptions cause claim rates to rise gradually as workers become stranded — not spike simultaneously.
- **Social graph modeling:** Workers who share the same Telegram group, WhatsApp contact, or device network (same IP subnet at onboarding) are grouped into a risk graph. A fraud ring activating simultaneously shows up as a connected cluster firing claims in lockstep. This is detectable using graph anomaly detection (Isolation Forest on the adjacency matrix of claim co-occurrence).
- **Device fingerprint deduplication:** Fraudsters in a syndicate often use the same spoofing app configuration or purchase accounts in bulk. Identical device fingerprints, OS versions, and GPS metadata signatures across multiple "different" accounts is a strong syndicate signal.
- **New account velocity:** Accounts created within 2 weeks of a major weather event and immediately triggering claims are high-risk. Legitimate workers have a claims history baseline.

---

### 3. UX Balance: Handling Flagged Claims Without Penalizing Honest Workers

This is the most critical design constraint. **A false positive — denying a genuine worker their payout in the middle of a flood — causes real financial harm and destroys trust.** The system must be aggressive against fraud while being humane toward legitimate workers.

GigShield uses a **three-tier claim disposition model** rather than a binary approve/reject:

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
                                    │                      │
                          Auto-resolves if BCS     Can submit soft
                          rises above 0.85         evidence (optional)
                          within 2 hours
                                    │
                          If still < 0.85 at 2hr:
                          Route to Tier 3
```

**Tier 1 — Auto-Approved (BCS ≥ 0.85)**
Instant payout. No friction for the majority of legitimate workers. Target: 90%+ of all genuine claims should clear this threshold without human intervention.

**Tier 2 — Soft Hold (BCS 0.50–0.85)**
The claim is held for a maximum of 2 hours while the system passively collects additional telemetry. No action is required from the worker. This handles the common case of a genuine worker in a bad-signal environment whose BCS is temporarily low due to poor data quality (e.g., no GPS signal in a flooded basement). If BCS rises above threshold within the hold window, the payout fires automatically. The worker sees: *"Your claim is being verified — you'll hear back within 2 hours."*

**Tier 3 — Hard Hold (BCS < 0.50 or syndicate flag)**
Claim is queued for human review. The worker is notified via SMS/app: *"We need to verify your claim. You may optionally share a photo or platform screenshot — but this is not required to receive your payout if our review confirms the event."* Critically: **the burden of proof is on GigShield, not the worker.** The worker is not asked to prove their innocence. The reviewer uses the insurer dashboard's fraud queue to examine the full signal stack and approve or deny within 4 hours. Denied claims include a plain-language explanation and a one-tap appeals link.

**Why this approach is fair:**

- Honest workers experiencing genuine network drops in bad weather have poor GPS signal quality — *which is itself evidence of a real weather event.* This is factored positively into the BCS, not negatively.
- The soft-hold window is short enough (2 hours) that even Tier 2 workers receive same-day payouts during most events.
- No worker is ever asked to submit documentation as a prerequisite to receiving a payout.
- The appeals process is lightweight: a single tap, no paperwork, 24-hour resolution SLA.

**Anti-Discrimination Safeguard:**
The BCS model is audited quarterly for demographic bias. Workers in historically underserved zones (which may have worse cell tower coverage, older devices, and lower GPS signal quality) must not be disproportionately routed to Tier 3. If zone-level Tier 3 routing rates exceed 15%, that zone's BCS thresholds are recalibrated.

---

## 🤖 AI/ML Integration Plan

### 1. Dynamic Premium Engine
- **Model Type:** Gradient Boosted Trees (XGBoost / LightGBM)
- **Input Features:** Zone risk score, worker history, seasonal index, past claims
- **Output:** Weekly premium multiplier (0.75x – 1.25x of base)
- **Training Data:** Synthetic data (Phase 1-2), real data from pilot (Phase 3+)

### 2. Fraud Detection System
- **Behavioral Coherence Score (BCS):** XGBoost classifier on multi-signal behavioral stack (see Adversarial Defense section)
- **Anomaly Detection:** Isolation Forest on claim patterns and temporal clustering
- **GPS Spoofing Detection:** Mock location API flag + GPS jitter analysis + cell tower triangulation cross-validation
- **Syndicate Ring Detection:** Graph anomaly detection on claim co-occurrence adjacency matrix
- **Duplicate Claim Prevention:** Fingerprint matching on event + time + zone + worker ID
- **Behavioral Profiling:** Flag workers whose inactivity pattern doesn't match disruption event window
- **Rule-based hard filters:** Mock location active during event = immediate flag

### 3. Risk Heatmap (Insurer Dashboard)
- **Model:** Time-series forecasting (Prophet / LSTM) on historical disruption + claims data
- **Output:** Next-week risk score by pin code — helps insurer pre-price risk and manage exposure

### 4. NLP-based Social Disruption Monitor
- **Approach:** Keyword + entity extraction on local news feeds and social media (Twitter/X)
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
| Device Forensics | Android mock location API + device telemetry (PWA permissions) |

**Infrastructure**

| Component | Technology |
|---|---|
| Hosting | Vercel (frontend) + Railway / Render (backend) |
| CI/CD | GitHub Actions |
| Monitoring | Sentry (errors) + Grafana (metrics) |

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

---

## 🗺 Development Plan

### Phase 1 (Mar 4–20): Ideation & Foundation ✅
- Define persona, disruption triggers, and premium model
- Finalize tech stack
- Write README (this document) — including Adversarial Defense architecture
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

**Why Weekly pricing over Daily?** Weekly aligns exactly with platform payout cycles, is simple enough for low-literacy users to understand, and reduces premium collection friction. Daily would create cognitive overload; monthly is misaligned with gig income rhythms.

**Why Parametric over Traditional Insurance?** Zero-touch. No claim forms. No adjuster visits. No documentation. The trigger either fires or it doesn't. This is the only model that can realistically serve a gig worker population at scale in India.

**Why a three-tier claim disposition over binary approve/reject?** Binary systems either over-approve (exploitable) or over-reject (unfair to honest workers). A soft-hold tier with passive re-evaluation handles the ambiguous middle ground — poor signal quality in bad weather — without penalizing legitimate claimants or requiring them to prove their innocence.

---

## ⚠️ Known Limitations & Risks

| Limitation | Mitigation |
|---|---|
| Dependency on platform APIs for order data | Mock APIs in Phase 1–2; partnership agreements in production |
| False negatives in low-data zones (sparse GPS, poor cell coverage) | BCS model recalibrated quarterly per zone; low signal in bad weather treated as positive fraud indicator |
| Weather API reliability (Open-Meteo free tier) | IMD RSS feeds as fallback; dual-source validation before any trigger fires |
| New worker cold-start problem (no claim history) | Default to zone-average risk profile for first 4 weeks |
| Moral hazard at 80% coverage | Deliberate design cap — 20% uninsured keeps workers partially incentivised to work when safe |

---

## 🚫 Out of Scope (By Design)

The following are explicitly excluded per the problem statement and our design:

- ❌ Health insurance or hospitalization coverage
- ❌ Life insurance or accidental death benefits
- ❌ Vehicle repair or damage coverage
- ❌ Fuel cost reimbursement
- ❌ Any coverage that requires manual claim filing or documentation

---

## 🖼️ UI/UX — Screen Descriptions

*(Wireframes to be added in Phase 2. Described below for evaluators.)*

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
- **Guidewire ClaimCenter** — Hard-hold claims (BCS < 0.50) are pushed into ClaimCenter as structured claim records for human adjuster review. The BCS score, signal breakdown, and fraud flags are passed as claim attributes — giving adjusters a full context view without manual investigation.
- **Guidewire DataHub** — Aggregated claims and loss ratio data flows into DataHub for actuarial analysis, enabling dynamic pricing refinement over time.

This architecture means GigShield's parametric automation handles 90%+ of claims with zero human touch — and Guidewire's enterprise tooling handles the remaining edge cases at scale.

---

## 🌊 Payout Sustainability & Black Swan Risk

A major flood or city-wide heat wave could trigger thousands of simultaneous claims. GigShield addresses this at three levels:

**1. Maximum Aggregated Zone Limit (MAZL)**
Each pin code zone has a weekly aggregated payout cap. If total claims in a zone exceed the MAZL, individual payouts are pro-rated. Workers are notified of this cap at onboarding.

**2. Reinsurance Layer**
A reinsurance treaty covers aggregate claims exceeding 150% of expected weekly loss ratio per city. This is standard parametric insurance practice and is built into the pricing model.

**3. Dynamic Exposure Management**
The insurer dashboard's risk heatmap (Prophet/LSTM forecasting) gives insurers advance warning of high-risk weeks — allowing temporary policy cap reductions or premium adjustments before a predicted event window.

---

## 🔒 Data Governance & Privacy

GigShield collects sensitive device and behavioural signals. The following principles govern all data collection:

| Principle | Implementation |
|---|---|
| **Minimal collection** | Device signals (accelerometer, GPS, app logs) collected only during the active 7-day policy window — never outside it |
| **Purpose limitation** | Behavioural data used exclusively for BCS fraud scoring — never sold, profiled, or used for marketing |
| **Anonymisation** | Worker identity is hashed in the ML pipeline — models train on anonymised zone + signal data, not named individuals |
| **Consent-first** | All device permissions requested explicitly at onboarding with plain-language Tamil/Hindi/English explanations |
| **Retention** | Raw device telemetry deleted after 30 days; aggregated zone-level model features retained for 12 months |
| **Right to explanation** | Any denied or held claim includes a plain-language BCS breakdown — workers can see exactly which signals flagged |

GigShield complies with the **Digital Personal Data Protection Act (DPDPA) 2023** framework for data fiduciaries.

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

## 📁 Repository Structure

```
gigshield/
├── README.md                  ← This file
├── frontend/                  ← React PWA (worker-facing)
│   ├── src/
│   └── public/
├── backend/                   ← Node.js + Express API
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   └── workers/           ← BullMQ job processors
│   └── prisma/                ← DB schema
├── ml/                        ← Python ML microservice
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

*GigShield — Because every delivery partner deserves a safety net.*
