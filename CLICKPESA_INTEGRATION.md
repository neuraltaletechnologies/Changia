# ClickPesa Payment Integration — Changia

## Overview

Changia now integrates with **ClickPesa** for real mobile money payments in Tanzania. This enables:
- **Donations**: Donors approve USSD push prompts on their phones to contribute to campaigns.
- **Payouts**: Admins send approved payouts to mobile money accounts (M-Pesa, Tigo Pesa, etc.).

When ClickPesa is disabled (dev mode), the system falls back to simulation/mock behavior so development works without credentials.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CHANGIA BACKEND                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────────┐    ┌───────────────┐ │
│  │   Donation    │    │   Payout Service  │    │   Webhook     │ │
│  │   Service     │    │                  │    │   Controller  │ │
│  │              │    │  previewPayout() │    │              │ │
│  │ createPay-   │    │  markPaid()      │    │ handleWebhook│ │
│  │ mentAttempt()│    │                  │    │              │ │
│  └──────┬───────┘    └────────┬─────────┘    └──────┬───────┘ │
│         │                     │                      │         │
│         ▼                     ▼                      ▼         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   utils/clickPesa.js                     │   │
│  │                                                         │   │
│  │  getToken()          — JWT auth token (cached 55 min)   │   │
│  │  initiateUssdPush()  — Collection (donations)           │   │
│  │  previewPayout()     — Fee quote before payout          │   │
│  │  createPayout()      — Send money to recipient          │   │
│  │  queryPayment()      — Status check for collection      │   │
│  │  queryPayout()       — Status check for disbursement    │   │
│  │  createChecksum()    — HMAC-SHA256 for webhook security │   │
│  │  validateChecksum()  — Verify incoming webhooks         │   │
│  └─────────────────────────┬───────────────────────────────┘   │
│                            │                                   │
└────────────────────────────┼───────────────────────────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │     ClickPesa API            │
              │  api.clickpesa.com           │
              │                              │
              │  POST /generate-token        │
              │  POST /payments/initiate-*   │
              │  GET  /payments/{ref}        │
              │  POST /payouts/preview-*     │
              │  POST /payouts/create-*      │
              │  GET  /payouts/{ref}         │
              └──────────────────────────────┘
```

---

## Files Created/Modified

| File | Change |
|---|---|
| `backend/utils/clickPesa.js` | **NEW** — Core utility: token management, API calls, checksum, phone normalization |
| `backend/config.js` | Added ClickPesa env vars |
| `backend/.env.example` | Added ClickPesa env var documentation |
| `backend/modules/donation/service.js` | `createPaymentAttempt()` now calls ClickPesa USSD push |
| `backend/modules/donation/clickPesaWebhookController.js` | **NEW** — Handles ClickPesa webhook callbacks |
| `backend/routes/webhooks.js` | **NEW** — Webhook route registration |
| `backend/app.js` | Registered `/webhooks` route |
| `backend/modules/payout/service.js` | `markPaid()` now calls ClickPesa payout; added `previewPayout()` |
| `backend/modules/payout/controller.js` | Added `preview` controller |
| `backend/modules/payout/routes.js` | Added `POST /:id/preview` route |
| `backend/modules/payout/validation.js` | Added `previewSchema`, updated `paidSchema` |

---

## Donation Flow (Collection)

### 1. Payment Attempt Created

```
Frontend                    Backend                     ClickPesa
   │                           │                           │
   │  POST /campaigns/:id/     │                           │
   │  attempts                 │                           │
   │  { amount, donorPhone }   │                           │
   │ ─────────────────────────▶│                           │
   │                           │                           │
   │                           │ 1. Validate amount/campaign│
   │                           │ 2. Generate orderReference │
   │                           │ 3. INSERT payment_attempts │
   │                           │    (status='PENDING')      │
   │                           │                           │
   │                           │ 4. POST /payments/initiate │
   │                           │    -ussd-push-request      │
   │                           │ ─────────────────────────▶│
   │                           │                           │
   │                           │ ◀── { id, status:         │
   │                           │      'PROCESSING' }       │
   │                           │                           │
   │                           │ 5. UPDATE payment_attempts │
   │                           │    SET gateway_ref = cp_id │
   │                           │                           │
   │  ◀─────────────────────── │                           │
   │  { attemptId, status,     │                           │
   │    message: "Approve on   │                           │
   │    your phone" }          │                           │
   │                           │                           │
   │                           │        ┌──────────────┐   │
   │                           │        │  Donor phone │   │
   │                           │        │  USSD prompt │   │
   │                           │        │  "Pay TZS    │   │
   │                           │        │   10000 to   │   │
   │                           │        │   Changia?"  │   │
   │                           │        └──────────────┘   │
```

### 2. Webhook Confirmation (or Simulation)

```
ClickPesa                  Backend                     Database
   │                         │                           │
   │  POST /webhooks/        │                           │
   │  clickpesa              │                           │
   │  { event: "PAYMENT      │                           │
   │    RECEIVED",            │                           │
   │    data: {               │                           │
   │      orderReference,     │                           │
   │      status: "SUCCESS"   │                           │
   │    }}                    │                           │
   │ ────────────────────────▶│                           │
   │                          │                           │
   │                          │ 1. Validate checksum      │
   │                          │ 2. Record gateway_event   │
   │                          │    (idempotent)           │
   │                          │                           │
   │                          │ 3. Find payment_attempts  │
   │                          │    by orderReference      │
   │                          │                           │
   │                          │ 4. resolvePaymentAttempt()│
   │                          │    - INSERT donations     │
   │                          │    - UPDATE campaigns     │
   │                          │      raised_amount        │
   │                          │    - INSERT audit_log     │
   │                          │                           │
   │  ◀────────────────────── │                           │
   │  200 OK                  │                           │
```

### Dev Mode (ClickPesa disabled)

When `CLICKPESA_ENABLED=false`:
- `createPaymentAttempt()` skips the ClickPesa call and returns the attempt as-is
- `simulate-callback` endpoint still works for testing
- Public `simulate-confirm` endpoint still works

---

## Payout Flow (Disbursement)

> **Updated (Sep 2026):** the payout module no longer has a separate "checkout"
> step or a super-admin `POST /payouts/:id/paid`. The mobile-money destination is
> captured with the request, and after both approvals the **requesting
> `CAMPAIGN_MANAGER` calls `POST /payouts/:id/confirm`**, which runs
> `clickPesa.createPayout()` inside a `db.withTransaction` row lock and moves the
> payout to `PAID` (a gateway failure rolls back to `APPROVED`). The
> `previewPayout()` helper below is retained in `utils/clickPesa.js` but is no
> longer wired to an endpoint. The diagrams below describe the retired flow.

### 1. Preview Payout (shows fee breakdown)

```
Admin                       Backend                     ClickPesa
  │                           │                           │
  │  POST /payouts/:id/       │                           │
  │  preview                  │                           │
  │  { phoneNumber }          │                           │
  │ ────────────────────────▶ │                           │
  │                           │                           │
  │                           │ 1. Verify payout APPROVED │
  │                           │                           │
  │                           │ 2. POST /payouts/preview- │
  │                           │    mobile-money-payout    │
  │                           │ ─────────────────────────▶│
  │                           │                           │
  │                           │ ◀── { amount, fee,        │
  │                           │      channelProvider }    │
  │                           │                           │
  │  ◀────────────────────────│                           │
  │  { amount, providerFee,   │                           │
  │    channelProvider,       │                           │
  │    receiverAccountName }  │                           │
```

### 2. Execute Payout

```
Admin                       Backend                     ClickPesa
  │                           │                           │
  │  POST /payouts/:id/paid   │                           │
  │  { phoneNumber }          │                           │
  │ ────────────────────────▶ │                           │
  │                           │                           │
  │                           │ 1. Verify payout APPROVED │
  │                           │                           │
  │                           │ 2. POST /payouts/create-  │
  │                           │    mobile-money-payout    │
  │                           │ ─────────────────────────▶│
  │                           │                           │
  │                           │ ◀── { id, status:         │
  │                           │      'AUTHORIZED', fee }  │
  │                           │                           │
  │                           │ 3. UPDATE payouts         │
  │                           │    SET status = 'PAID',   │
  │                           │    gateway_ref = cp_id    │
  │                           │                           │
  │  ◀────────────────────────│                           │
  │  { payout, clickPesa:     │                           │
  │    { id, status, fee } }  │                           │
```

---

## Environment Variables

```bash
# In backend/.env:
CLICKPESA_ENABLED=true
CLICKPESA_BASE_URL=https://api.clickpesa.com/third-parties
CLICKPESA_CLIENT_ID=your_application_client_id
CLICKPESA_API_KEY=your_secret_api_key
CLICKPESA_USE_CHECKSUM=false
CLICKPESA_CHECKSUM_SECRET=your_checksum_secret
CLICKPESA_TIMEOUT_MS=15000
```

---

## Webhook Events

| Event | Source | Handler Action |
|---|---|---|
| `PAYMENT RECEIVED` | ClickPesa → `/webhooks/clickpesa` | Confirms donation, credits campaign |
| `PAYMENT FAILED` | ClickPesa → `/webhooks/clickpesa` | Marks payment attempt as failed |
| `PAYOUT INITIATED` | ClickPesa → `/webhooks/clickpesa` | When `data.status=SUCCESS`, marks the payout paid and notifies staff (idempotent) |
| `PAYOUT REFUNDED` | ClickPesa → `/webhooks/clickpesa` | Restores reserved payout funds |
| `PAYOUT REVERSED` | ClickPesa → `/webhooks/clickpesa` | Restores reserved payout funds |

---

## Key Design Decisions

1. **Idempotent by `orderReference`**: Each ClickPesa request uses a unique 16-char reference (`CHG26XXXXXXXXX`). Stored in `payment_attempts.idempotency_key`. ClickPesa rejects duplicate references, so we never reuse one.

2. **Webhook-first, query as fallback**: Webhooks are the primary async confirmation path. The `queryPayment()`/`queryPayout()` functions exist for reconciliation jobs and retry logic.

3. **Checksum verification**: When enabled, every webhook is verified with HMAC-SHA256 before trusting the payload. Duplicate events are caught via `gateway_events.idempotency_key`.

4. **Dev mode safe**: When `CLICKPESA_ENABLED=false`:
   - USSD push is skipped (no phone prompt)
   - Payout preview returns mock data
   - `simulate-callback` and `simulate-confirm` endpoints still work

5. **Token caching**: ClickPesa JWT is cached for 55 minutes and auto-refreshed on 401.

6. **Phone normalization**: All phone numbers are normalized to E.164 format (`255XXXXXXXXX`) before sending to ClickPesa.

---

## API Endpoints

### Donations (authenticated)
- `POST /api/v1/donations/campaigns/:campaignId/attempts` — Create payment attempt (triggers USSD push)
- `POST /api/v1/donations/simulate-callback` — Dev-only gateway simulation

### Donations (public)
- `POST /api/v1/public/donations/campaigns/:campaignId/contributions` — Public contribution (triggers USSD push)
- `GET /api/v1/public/donations/contributions/:attemptId` — Poll contribution status
- `POST /api/v1/public/donations/contributions/:attemptId/simulate-confirm` — Dev-only

### Payouts (authenticated)
- `POST /api/v1/payouts/:id/confirm` — `CAMPAIGN_MANAGER` (requester) confirms an `APPROVED` payout; atomically executes the ClickPesa mobile-money transfer and moves it to `PAID`

### Webhooks (unauthenticated)
- `POST /webhooks/clickpesa` — ClickPesa event receiver
- `POST /webhooks/clickpesa/payment-received` — Alias
- `POST /webhooks/clickpesa/payout-initiated` — Alias
- `POST /webhooks/clickpesa/payout-refunded` — Alias
- `POST /webhooks/clickpesa/payout-reversed` — Alias

---

## Production Checklist

- [ ] Complete ClickPesa KYC and enable Payment + Payout features
- [ ] Store credentials in deployment secrets (never commit `.env`)
- [ ] Set real public HTTPS webhook URL in ClickPesa dashboard
- [ ] Enable checksum in ClickPesa and set `CLICKPESA_USE_CHECKSUM=true`
- [ ] Test successful, failed, refunded, and duplicate webhook scenarios
- [ ] Configure IP whitelisting if required
- [ ] Verify fee accounting with business/finance team
- [ ] Set up reconciliation job for pending transactions


Known Donor (in the donor pool)

1. Campaign APPROVED
   → System sends email with link to all donors in the pool
 
2. Donor receives email → clicks "Donate Now"
   → Opens public campaign page
 
3. Donor enters phone + amount → clicks Contribute
 
4. Backend: createPaymentAttempt()
   → normalizePhone("0785226584") → "255785226584"
   → Finds donor in donors table ✅ (donor_id = 123)
   → Finds matching campaign_donor_targets entry ✅ (campaign_donor_target_id = 456)
   → Saves payment_attempts row with donor_id + campaign_donor_target_id
   → Sends ClickPesa USSD push to phone
 
5. Donor approves USSD prompt on phone → enters PIN
 
6. ClickPesa webhook → PAYMENT RECEIVED
   → resolvePaymentAttempt() → recordConfirmedDonation()
   → Creates donation linked to donor_id 123
   → Updates campaign raised_amount + donor_count
   → Calculates total paid vs expected for this donor
   → Updates campaign_donor_targets: actual_amount, payment_status (PARTIAL or PAID_FULL)
 
7. Admin dashboard shows:
   "John Doe — paid TZS 10,000 of 50,000 expected — PARTIAL"

New Donor (not in the pool)

1. Donor sees campaign link shared on social media / WhatsApp / etc.
 
2. Donor opens campaign page → enters phone + amount → clicks Contribute
 
3. Backend: createPaymentAttempt()
   → normalizePhone → "255785226584"
   → Finds NO donor in donors table ❌ (donor_id = null)
   → No campaign_donor_targets match (campaignDonorTargetId = null)
   → Saves payment_attempts row with donor_id = null
 
4. Sends ClickPesa USSD push → donor approves
 
5. ClickPesa webhook → PAYMENT RECEIVED
   → recordConfirmedDonation()
   → Phone lookup: still not found → creates new "Unknown" anomalous donor
   → Assigns them to the campaign manager's anomalous pool
   → Creates donation linked to this new donor
   → Updates campaign totals
   → No campaign_donor_targets update (not a targeted donor)
 
6. Admin dashboard shows:
   - New donor appears in "Anomalous" pool with name "Unknown"
   - Admin can edit the donor profile (name, email, etc.)
   - Admin can move them to the correct donor pool


Testing your use cases

Donor fills form:
  Phone: 0785226584
  Email: donor@example.com    ← NEW FIELD
  Amount: 5000
  → Clicks "Contribute now"
     ↓
USSD push sent → donor approves on phone
     ↓
Webhook confirms → recordConfirmedDonation():
  1. Creates donation with donor_email stored
  2. Updates campaign totals
  3. Sends receipt email to donor@example.com with:
     - Transaction ID
     - Receipt number (CHG-2026-XXXXXX)
     - Amount paid
     - Campaign name
     - "View Campaign" button
     ↓
Frontend polls → detects SUCCESS → shows:
  ✅ (green checkmark)
  "Asante! Thank you!"
  "Your payment was successful!"
  ┌─────────────────────────────┐
  │ Amount Paid     TZS 5,000   │
  │ Receipt Number  CHG-2026-... │
  │ Transaction ID  #42          │
  └─────────────────────────────┘
  📧 "A receipt has been sent to your email address."
  [Contribute again]
