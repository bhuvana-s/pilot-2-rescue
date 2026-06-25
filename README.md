# Enterprise AI Pilot Rescue Kit

Diagnose why an enterprise AI pilot is failing and get prioritized fixes.
A user describes their problem → the app matches known **failure patterns** via
vector search → **Amazon Bedrock Nova Pro** produces grounded root causes +
recommendations.

## Run

```bash
node index.js
# → http://localhost:3000
```

AWS credentials come from the default credential chain. Region defaults to
`ap-south-1`, where Nova Pro is **inference-profile only**, so the model id is
`apac.amazon.nova-pro-v1:0` (set in `.env`).

Bedrock model access for Nova Pro must be enabled for your account/region.
`GET /api/health` reports store mode, region, model, and Bedrock reachability.

## Endpoints

| Method | Path             | Purpose                                   |
| ------ | ---------------- | ----------------------------------------- |
| POST   | `/api/diagnose`  | `{ problemText, industry?, useCase?, stage? }` → diagnosis |
| GET    | `/api/history`   | recent rescue logs (`?limit=`)            |
| GET    | `/api/health`    | store mode + Bedrock check                |

## Architecture

```
problemText → embed() → store.vectorSearchPatterns() → attach recommendations
            → Bedrock Nova Pro (Converse, strict-JSON) → persist rescueLog
```

Collections (mock + Atlas share the same shapes): `pilotProfiles`,
`failurePatterns`, `recommendations`, `rescueLogs`.

- **Frontend**: single static file, no build (`public/index.html`).
- **Embeddings**: deterministic offline embedder (`src/utils/embeddings.js`) —
  swap for Bedrock Titan later behind the same interface.

## Switching between Mock and Real (Atlas)

The **only** thing that changes is one line in `.env`. Bedrock Nova Pro is real
in both modes — only the data layer differs.

| | `USE_REAL_ATLAS=false` (Mock) | `USE_REAL_ATLAS=true` (Real Atlas) |
| --- | --- | --- |
| Data store | In-memory + `src/data/store.local.json` | MongoDB Atlas cluster (`MONGODB_URI`) |
| Reasoning | **Real** Bedrock Nova Pro | **Real** Bedrock Nova Pro |
| Vector search | JS cosine over seeded vectors | Atlas `$vectorSearch` (cosine fallback until index built) |
| Seeding | Re-seeded each boot | Seeded into Atlas on first run if empty |
| Needs network/DB | No (offline-friendly) | Yes (Atlas + IP allow-listed) |
| `GET /api/health` → `store` | `"mock"` | `"atlas"` |

`src/data/store.js` is the swap point — it exports `mockStore` or `atlasStore`
based on the flag. Both implement the same interface, so nothing else changes.

### Use Mock (default, no external DB)
```bash
# .env
USE_REAL_ATLAS=false
node index.js     # startup log: "store: mock"
```

### Use Real Atlas
1. Set in `.env`:
   ```
   USE_REAL_ATLAS=true
   MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/pilotrescue?appName=pilot-rescue-kit
   ```
2. Atlas → **Network Access** → allow your current IP.
3. (For native vector search) Atlas → **Atlas Search** → create a **Vector
   Search index** named `failurePatterns_vec` on collection `failurePatterns`:
   ```json
   {
     "fields": [
       { "type": "vector", "path": "embedding", "numDimensions": 10, "similarity": "cosine" }
     ]
   }
   ```
   `numDimensions` = `EMBED_DIM` in `src/utils/embeddings.js`. Until the index
   exists the app auto-falls back to an in-DB cosine scan (still works).
4. `node index.js` — startup log shows `store: atlas`; it connects and seeds the
   reference collections on first run.

> Tip: test without editing `.env` — `USE_REAL_ATLAS=true node index.js`
> (dotenv does not override an already-set env var).

> `.env` is gitignored. `.env.example` documents every variable with redacted
> placeholders.

## Testing — sample inputs & expected output

Bedrock Nova Pro runs at `temperature: 0.2`, so wording varies slightly between
runs and the `diagnosis` text is **not** byte-for-byte deterministic. What is
stable: which **failure patterns** match (and their rough ranking) and the
response **shape**. Expected results below are the same in Mock and Real mode —
only the `score` source differs (JS cosine vs `$vectorSearch`).

### 0. Health check
```bash
curl -s localhost:3000/api/health | python3 -m json.tool
```
Expected (Mock): `"store": "mock"`, `"bedrock": "ok"`.
Expected (Real): `"store": "atlas"`, `"bedrock": "ok"`.
If `"bedrock": "error"` → enable Nova Pro model access in the Bedrock console.

### 1. Adoption + ROI
```bash
curl -s -X POST localhost:3000/api/diagnose -H 'Content-Type: application/json' \
  -d '{"problemText":"Our support copilot demoed great but agents stopped using it after 3 weeks and leadership cant see any ROI"}'
```
Expected matched patterns (top-3, ranked): **low_adoption** (~0.82),
**wrong_use_case** (~0.82), **unclear_roi** (~0.33).
Expected diagnosis: 2–4 `rootCauses` (adoption + ROI dominant), 3–5
`recommendations` (e.g. "define baseline KPIs", "embed into daily workflow"),
`confidence` ≈ 0.85, no `fallback` flag.

### 2. Governance / compliance
```bash
curl -s -X POST localhost:3000/api/diagnose -H 'Content-Type: application/json' \
  -d '{"problemText":"Legal flagged privacy risks and we cant get approval to move our clinical summarization pilot to production"}'
```
Expected: top match **governance_block** (~0.95), then latency_cost /
integration_gap (low scores). Recommendations center on bringing
security/legal/compliance in early and adding guardrails + PII redaction.
`confidence` ≈ 0.9.

### 3. Hallucination / trust
```bash
curl -s -X POST localhost:3000/api/diagnose -H 'Content-Type: application/json' \
  -d '{"problemText":"Our RAG chatbot keeps giving confidently wrong answers and users no longer trust it"}'
```
Expected top match **hallucination_trust**. Recommendations: ground answers in
retrieved sources with citations, add confidence thresholds / human-in-the-loop.

### 4. History persistence
```bash
curl -s "localhost:3000/api/history?limit=5" | python3 -m json.tool
```
Expected: the diagnoses you just ran, newest first, each with
`matchedPatternKeys`, `problemText`, `diagnosis`, `model`, `createdAt`.

- **Mock**: persists to `src/data/store.local.json` — survives restarts.
- **Real**: persists to the `rescueLogs` collection in Atlas — verify in the
  Atlas UI (`pilotrescue` database).

### Response shape (both modes)
```jsonc
{
  "pilotProfileId": "…",
  "rescueLogId": "…",
  "matchedPatterns": [ { "key": "low_adoption", "name": "…", "severity": "high", "score": 0.82, ... } ],
  "diagnosis": {
    "rootCauses":      [ { "cause": "…", "evidence": "…", "severity": "high|medium|low" } ],
    "recommendations": [ { "action": "…", "rationale": "…", "effort": "…", "impact": "…" } ],
    "confidence": 0.85
    // "fallback": true  // only present if Nova returned unparseable JSON
  }
}
```

### Verifying which mode you're in
- Startup log line: `store: mock` vs `store: atlas`.
- `GET /api/health` → `store` field.
- Real mode only: collections appear/grow in the Atlas UI under `pilotrescue`.
