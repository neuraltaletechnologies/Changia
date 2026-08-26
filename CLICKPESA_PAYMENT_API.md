# ClickPesa Payment API Integration Guide

This document describes the ClickPesa integration already present in this project and the ClickPesa endpoints needed to collect wallet deposits and send mobile-money withdrawals. It is written for the AdReach backend (`backend/`), but the provider calls and formats apply to any server-side integration.

> **Never call ClickPesa directly from the React/browser application.** The API key, client ID, JWT, and checksum secret must remain on the server.

## 1. Integration used by this project

| Purpose | ClickPesa product / API type | Method and endpoint | Project entry point |
| --- | --- | --- | --- |
| Get a short-lived access token | Authentication | `POST /generate-token` | `backend/utils/clickPesa.js` |
| Add money to an AdReach wallet | Collection / Mobile Money USSD Push | `POST /payments/initiate-ussd-push-request` | `POST /user/wallet/deposit` |
| Confirm a deposit | Collection / Payment query | `GET /payments/{orderReference}` | automatic fallback and webhook handling |
| Validate a withdrawal and provider fee | Disbursement / Mobile Money payout preview | `POST /payouts/preview-mobile-money-payout` | `POST /user/wallet/withdraw` |
| Send money to a user | Disbursement / Mobile Money payout | `POST /payouts/create-mobile-money-payout` | `POST /user/wallet/withdraw` |
| Confirm a withdrawal | Disbursement / Payout query | `GET /payouts/{orderReference}` | automatic fallback and webhook handling |
| Receive final state changes | Webhook / callback | `POST /webhooks/clickpesa` | `backend/controllers/clickPesaWebhookController.js` |

The ClickPesa base URL is:

```text
https://api.clickpesa.com/third-parties
```

This project uses the direct API integration type. ClickPesa also offers Hosted Checkout links, Card Payment, BillPay control numbers, bank payouts, and payout links. Those are separate payment types and are not currently called by this codebase. Hosted Checkout is a good alternative when a browser redirect/payment page is preferred; it returns a `checkoutLink`. [ClickPesa integration overview](https://docs.clickpesa.com/home/integration-overview) · [Hosted Checkout endpoint](https://docs.clickpesa.com/api-reference/collection/generate-checkout-link/generate-checkout-link)

## 2. Account setup and required secrets

In the ClickPesa Merchant Dashboard, create an application under **Settings → Developers**, choose **API** as the integration type, and enable the features needed here:

- Payment API — required for USSD-push wallet deposits.
- Payout API — required for mobile-money withdrawals.

ClickPesa supplies an Application Client ID and API Key. The API Key is displayed once, so save it in a secrets manager. Tokens are valid for one hour; ClickPesa documents a rate limit of 120 requests/minute/IP and a pre-KYC limit of 100 API calls/day. [API application setup](https://docs.clickpesa.com/application/api-application-setup)

Create `backend/.env` from `backend/.env.example`, then set real production values without committing that file:

```dotenv
CLICKPESA_ENABLED=true
CLICKPESA_BASE_URL=https://api.clickpesa.com/third-parties
CLICKPESA_CLIENT_ID=your_application_client_id
CLICKPESA_API_KEY=your_secret_api_key

# Enable only after checksum is enabled for the ClickPesa application.
CLICKPESA_USE_CHECKSUM=true
CLICKPESA_CHECKSUM_SECRET=your_checksum_secret
CLICKPESA_TIMEOUT_MS=15000
```

Also configure the server's public IP in ClickPesa if IP whitelisting is enabled, and give ClickPesa publicly reachable HTTPS webhook URLs. Do not place any of the values above in frontend environment variables, responses, source control, logs, or screenshots.

## 3. Common rules for every request

### Authentication

First exchange the application credentials for a JWT. Send the API Key and Client ID only to the token endpoint:

```http
POST https://api.clickpesa.com/third-parties/generate-token
api-key: <CLICKPESA_API_KEY>
client-id: <CLICKPESA_CLIENT_ID>
```

Example response:

```json
{
  "success": true,
  "token": "Bearer eyJhbGciOi..."
}
```

For the remaining APIs send `Authorization: Bearer <JWT>`. The current backend caches a token for 55 minutes and regenerates it once after a `401`, which avoids requesting a token for every payment. [Generate authorization token](https://docs.clickpesa.com/api-reference/authorization/generate-token)

### Required data formats

| Field | Format and handling |
| --- | --- |
| `amount` | Positive monetary value. The USSD collection API expects a string; the mobile payout APIs expect a number. Store money as a fixed-decimal value, not floating-point arithmetic. |
| `currency` | USSD collection in this implementation is `TZS`. Payout supports `TZS` or `USD`, but mobile recipients receive TZS. |
| `phoneNumber` | Tanzania number with country code and no `+`, for example `255712345678`. The backend accepts common local forms and normalizes them. |
| `orderReference` | A unique merchant-generated idempotency/reference value. This project removes non-alphanumeric characters, uppercases it, and limits it to 20 characters. Never reuse a completed reference. |
| `checksum` | Optional only when checksum is enabled for the ClickPesa application. HMAC-SHA256 of the canonical JSON payload, excluding `checksum` and `checksumMethod`. |

### Checksum

When checksum support is enabled, recursively alphabetize object keys, stringify compact JSON, and generate an HMAC-SHA256 hex digest using `CLICKPESA_CHECKSUM_SECRET`. Add that digest to the request as `checksum`. Validate incoming webhook checksums the same way, after removing `checksum` and `checksumMethod`.

Changing checksum settings invalidates existing ClickPesa tokens, so regenerate the token after changing them. The project already implements this algorithm in `backend/utils/clickPesa.js`. [ClickPesa checksum specification](https://docs.clickpesa.com/home/checksum)

## 4. API details and sample formats

All paths below are relative to `https://api.clickpesa.com/third-parties`.

### A. Collect a wallet deposit — Mobile Money USSD Push

**API type:** Collection / payment initiation.  
**When to use:** A signed-in user adds funds and approves the prompt on their phone.  
**Endpoint:** `POST /payments/initiate-ussd-push-request`

Required body data:

```json
{
  "amount": "10000.00",
  "currency": "TZS",
  "orderReference": "ARDEP01ABC123",
  "phoneNumber": "255712345678",
  "checksum": "<only-when-enabled>"
}
```

Example immediate response:

```json
{
  "id": "PAY17C9LPL",
  "status": "PROCESSING",
  "channel": "MOBILE MONEY",
  "orderReference": "ARDEP01ABC123",
  "collectedAmount": "10000.00",
  "collectedCurrency": "TZS",
  "createdAt": "2026-08-20T08:30:00.000Z",
  "clientId": "APP123"
}
```

**How to handle it:**

1. Validate the local amount and phone number, create a local transaction with status `PROCESSING`, then call ClickPesa.
2. Tell the user the request was sent; `PROCESSING` does **not** mean money was received.
3. Credit the wallet only when the payment is confirmed as `SUCCESS`/`SETTLED` by a validated webhook or status query.
4. Leave the wallet unchanged for `FAILED`, `REFUNDED`, or `REVERSED`; if a previously credited deposit is later reversed, debit it exactly once.
5. A duplicate `orderReference` gets a conflict response, so generate a fresh reference for a new attempt rather than blindly retrying.

Common provider error body:

```json
{
  "message": "Invalid / unsupported phone number"
}
```

The project exposes this through its own authenticated API:

```http
POST /user/wallet/deposit
Authorization: Bearer <AdReach user JWT>
Content-Type: application/json

{ "amount": 10000, "phoneNumber": "0712345678" }
```

Its server response includes `pending`, `message`, the current `balance`, and the local `transaction`. The UI should use `pending` to show a waiting state, then reload transactions or listen for its `wallet_update` socket event. [Initiate USSD Push API](https://docs.clickpesa.com/api-reference/collection/ussd-push-requests/initiate-ussd-push-request)

### B. Query a payment

**API type:** Collection / payment-status lookup.  
**Endpoint:** `GET /payments/{orderReference}`  
**Required data:** `Authorization` header and the same unique `orderReference` in the path.

Example result (ClickPesa may return an array; this project uses the first item):

```json
[
  {
    "id": "PAY17C9LPL",
    "status": "SUCCESS",
    "paymentReference": "MNO-REFERENCE-123",
    "paymentPhoneNumber": "255712345678",
    "orderReference": "ARDEP01ABC123",
    "collectedAmount": 10000,
    "collectedCurrency": "TZS",
    "message": "success",
    "channel": "MOBILE MONEY"
  }
]
```

Use this as a recovery/reconciliation path when a request times out or webhook delivery is delayed. Do not query in a tight loop: use increasing delays, stop once terminal, and retain the webhook as the primary asynchronous notification. [Query payment status](https://docs.clickpesa.com/api-reference/collection/querying-for-payments/querying-for-payments)

### C. Preview a mobile-money withdrawal

**API type:** Disbursement / validation and fee quote.  
**Endpoint:** `POST /payouts/preview-mobile-money-payout`

Request data:

```json
{
  "amount": 10000,
  "phoneNumber": "255712345678",
  "currency": "TZS",
  "orderReference": "ARWDR01ABC123",
  "checksum": "<only-when-enabled>"
}
```

Example return value:

```json
{
  "amount": 10471,
  "balance": 50000,
  "channelProvider": "MPESA TANZANIA",
  "fee": 471,
  "order": { "amount": 10000, "currency": "TZS", "id": "ARWDR01ABC123" },
  "payoutFeeBearer": "merchant",
  "receiver": {
    "accountName": "John Doe",
    "accountNumber": "255712345678",
    "accountCurrency": "TZS",
    "amount": 10000
  }
}
```

**How to handle it:** Validate the phone, provider/channel, balance, and final fee before reserving funds or asking the user for final confirmation. `amount` is the total ClickPesa deduction and includes the provider fee. This project also applies its own 6% platform withdrawal fee. Keep the platform fee and the ClickPesa preview fee distinct in accounting and show the user the total that will be charged. [Preview mobile-money payout](https://docs.clickpesa.com/api-reference/disbursement/mno-payout/preview-mno-payout)

### D. Create a mobile-money withdrawal

**API type:** Disbursement / payout initiation.  
**Endpoint:** `POST /payouts/create-mobile-money-payout`

The request body is the same shape as the preview request. Example provider response:

```json
{
  "id": "PAYOUT17C9LPL",
  "orderReference": "ARWDR01ABC123",
  "amount": "10471.00",
  "currency": "TZS",
  "fee": "471.00",
  "status": "AUTHORIZED",
  "channel": "MOBILE MONEY",
  "channelProvider": "MPESA TANZANIA",
  "order": { "amount": "10000.00", "currency": "TZS" },
  "beneficiary": {
    "accountNumber": "255712345678",
    "accountName": "John Doe",
    "amount": "10000.00"
  },
  "createdAt": "2026-08-20T08:35:00.000Z"
}
```

**How to handle it:**

1. Run the preview first, then lock the local wallet record, recheck the balance, reserve/debit the requested amount, and create a local `PROCESSING` withdrawal transaction.
2. Call the create endpoint once with that reference. Treat `AUTHORIZED`/`PENDING`/`PROCESSING` as non-final.
3. Finalize only after a webhook or status query: `SUCCESS`/`SETTLED` is completed; `FAILED`, `REFUNDED`, or `REVERSED` must restore the reserved amount exactly once.
4. Record ClickPesa `id`, `paymentReference`, fee, channel/provider, status, message, and raw response for reconciliation; do not expose the raw provider payload to unrelated users.

The local endpoint is `POST /user/wallet/withdraw` with `{ "amount": 10000, "phoneNumber": "0712345678" }`. It requires an AdReach user JWT and returns a `pending` flag and local transaction. [Create mobile-money payout](https://docs.clickpesa.com/api-reference/disbursement/mno-payout/create-mno-payout)

### E. Query a payout

**API type:** Disbursement / payout-status lookup.  
**Endpoint:** `GET /payouts/{orderReference}`  
**Required data:** Authorization header and unique payout `orderReference`.

Use it after an uncertain network/API result and in a scheduled reconciliation job for transactions that remain in a non-terminal state. Persist the actual returned status; never infer success solely because the create API returned HTTP 200.

## 5. Webhooks — required for reliable completion

Configure the following event types in ClickPesa Dashboard → **Settings → Developers**. For this project, every event can use the same endpoint:

```text
https://<your-public-api-domain>/webhooks/clickpesa
```

| Event | Meaning | Project action |
| --- | --- | --- |
| `PAYMENT RECEIVED` | A collection succeeded | Credit matching deposit once. |
| `PAYMENT FAILED` | A collection failed | Mark deposit failed; do not credit. |
| `PAYOUT INITIATED` | A payout entered provider processing | Keep withdrawal processing. |
| `PAYOUT REFUNDED` | A payout was refunded | Restore reserved withdrawal funds once. |
| `PAYOUT REVERSED` | A payout was reversed | Restore reserved withdrawal funds once. |
| `DEPOSIT RECEIVED` | Merchant account deposit received | Optional merchant-level event; not normally required for an app-user wallet deposit. |

Example `PAYMENT RECEIVED` payload:

```json
{
  "event": "PAYMENT RECEIVED",
  "data": {
    "id": "PAY17C9LPL",
    "status": "SUCCESS",
    "paymentReference": "MNO-REFERENCE-123",
    "orderReference": "ARDEP01ABC123",
    "collectedAmount": "10000",
    "collectedCurrency": "TZS",
    "message": "success",
    "channel": "MOBILE MONEY",
    "customer": { "customerPhoneNumber": "255712345678" }
  },
  "checksum": "<when-checksum-is-enabled>"
}
```

Example `PAYOUT REFUNDED` payload:

```json
{
  "event": "PAYOUT REFUNDED",
  "data": {
    "id": "PAYOUT17C9LPL",
    "orderReference": "ARWDR01ABC123",
    "amount": "10471.00",
    "currency": "TZS",
    "fee": "471.00",
    "status": "REFUNDED",
    "channel": "MOBILE MONEY",
    "channelProvider": "MPESA TANZANIA",
    "refund": { "message": "The payout was refunded." }
  },
  "checksum": "<when-checksum-is-enabled>"
}
```

Webhook handler requirements:

1. Receive JSON over HTTPS and verify the checksum before trusting the payload.
2. Find the local ClickPesa transaction by both `orderReference`, `provider: clickpesa`, and transaction type.
3. Make processing idempotent: lock the transaction/wallet row and record `processed_at`, so duplicates and out-of-order delivery cannot change a balance twice.
4. Return a 2xx response only after safely accepting the event. A 2xx means receipt, not that the business outcome succeeded.
5. Persist enough provider metadata to investigate disputes, but redact sensitive fields from application logs.

The current handler accepts ClickPesa payloads at `/webhooks/clickpesa` and aliases such as `/webhooks/clickpesa/payment-received`. Application-level webhooks cover payments and payouts made through the API; `DEPOSIT RECEIVED` is merchant-level only. [Webhook setup and payloads](https://docs.clickpesa.com/home/webhooks)

## 6. Statuses, errors, retries, and reconciliation

| Condition | Safe backend behavior | User-facing behavior |
| --- | --- | --- |
| `SUCCESS` or `SETTLED` | Apply the balance change once and mark complete. | Show completed. |
| `PROCESSING`, `PENDING`, `AUTHORIZED`, or `ON-HOLD` | Keep the transaction pending; wait for webhook/query. | Show processing; do not promise completion. |
| `FAILED` | Do not credit a deposit; restore a reserved payout once. | Show failure and reason when safe. |
| `REFUNDED` or `REVERSED` | Reverse the earlier local balance effect once. | Show refunded/reversed. |
| HTTP 400 | Do not retry unchanged input; show/record the validation message. | Ask for a valid amount, phone, or new reference. |
| HTTP 401 | Refresh token once, then retry once. | Normally hidden from user. |
| HTTP 404 | Check application configuration/features or the reference; do not assume success. | Show support/contact message if needed. |
| HTTP 409 | Existing order reference; query its status rather than creating another charge/payout. | Continue existing transaction state. |
| HTTP 429/5xx/timeout | Keep local record pending; query by reference with exponential backoff and rely on webhook. Do not issue a second create request with a new reference until the original outcome is known. | Say confirmation is pending. |

Perform a periodic reconciliation job for pending transactions: query ClickPesa by order reference, apply the same idempotent state-transition code used by webhooks, and flag unusually old transactions for manual review. Reconcile ClickPesa fees separately from any AdReach-defined fee.

## 7. Project file map and launch checklist

| File | Responsibility |
| --- | --- |
| `backend/utils/clickPesa.js` | Token acquisition/cache, ClickPesa requests, checksum creation/validation, phone/reference normalization. |
| `backend/controllers/userController.js` | Authenticated wallet deposit endpoint. |
| `backend/controllers/walletController.js` | Authenticated wallet withdrawal endpoint and payout preview. |
| `backend/utils/clickPesaTransactions.js` | Database locking, idempotent transaction updates, wallet credit/debit/reversal logic. |
| `backend/controllers/clickPesaWebhookController.js` | Validates and processes ClickPesa callbacks. |
| `backend/routes/webhooks.js` | Registers `/webhooks/clickpesa` routes. |
| `backend/.env.example` | Names of the required environment variables (use placeholders only). |

Before production:

- Complete ClickPesa KYC and enable the required Payment and Payout features.
- Store credentials in deployment secrets and rotate any secret that was ever exposed.
- Set the real public HTTPS webhook URL(s) and test successful, failed, refunded, and duplicate callbacks.
- Enable checksum in ClickPesa and this backend together, then obtain a fresh token.
- Configure allowed outbound IP addresses if ClickPesa IP whitelisting is used.
- Verify local wallet limits, transaction fees, and provider-preview fee accounting with business/finance owners.
- Monitor pending transactions and reconcile them with ClickPesa dashboard records.

## Official references

- [ClickPesa API application setup](https://docs.clickpesa.com/application/api-application-setup)
- [Generate authorization token](https://docs.clickpesa.com/api-reference/authorization/generate-token)
- [Initiate USSD Push request](https://docs.clickpesa.com/api-reference/collection/ussd-push-requests/initiate-ussd-push-request)
- [Payment status query](https://docs.clickpesa.com/api-reference/collection/querying-for-payments/querying-for-payments)
- [Preview mobile-money payout](https://docs.clickpesa.com/api-reference/disbursement/mno-payout/preview-mno-payout)
- [Create mobile-money payout](https://docs.clickpesa.com/api-reference/disbursement/mno-payout/create-mno-payout)
- [Webhooks](https://docs.clickpesa.com/home/webhooks)
- [Checksum](https://docs.clickpesa.com/home/checksum)
