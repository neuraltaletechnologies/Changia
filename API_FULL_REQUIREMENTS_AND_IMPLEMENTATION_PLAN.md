# Changia API Requirements And Simple Implementation Plan

This document defines the full API surface required by
`PROJECT_FLOW_FULL_DOCUMENTATION.md`.

It includes:

- APIs already implemented in the current backend
- APIs partially present but not fully connected
- APIs still needed to complete the required project flow
- The module partition plan for implementing the remaining work in a simple way

Base path for backend APIs:

```text
/api/v1
```

Default response format:

```json
{
  "success": true,
  "data": {}
}
```

Default error format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": []
  }
}
```

Status labels used in this document:

- `Implemented`: route exists and is mounted in `backend/app.js`
- `Partial`: code exists or behavior partly exists, but it is not complete for
  the full flow
- `Needed`: new API required by the full flow

## 1. Authentication APIs

These APIs manage login, registration, current user, and password change.

| API | Type | Status | Required | Returns |
| --- | --- | --- | --- | --- |
| `/auth/register` | `POST` | Implemented | `firstName`, `email`, `phone`, `password`, `confirmPassword`, `organizationName`, `termsAccepted` | `accessToken`, created `user`, created `organization` |
| `/auth/login` | `POST` | Implemented | `email`, `password` | `accessToken`, authenticated `user`, organization summary |
| `/auth/me` | `GET` | Implemented | Bearer token | Current authenticated user profile |
| `/auth/change-password` | `POST` | Implemented | Bearer token, `currentPassword`, `newPassword`, `confirmPassword` | Success message |
| `/auth/logout` | `POST` | Needed | Bearer token | Success message; optional token/session invalidation |
| `/auth/refresh-token` | `POST` | Needed if refresh tokens are added | `refreshToken` | New `accessToken` |

Implementation note:

- The current system uses JWT authentication.
- All protected endpoints require `Authorization: Bearer <token>`.

## 2. Organization APIs

These APIs manage organization-level information and organization statistics.

| API | Type | Status | Required | Returns |
| --- | --- | --- | --- | --- |
| `/organizations` | `GET` | Implemented | Bearer token | Current user's organization |
| `/organizations/all` | `GET` | Implemented | `SUPER_ADMIN` token | List of all organizations |
| `/organizations/stats` | `GET` | Implemented | Bearer token | Organization dashboard statistics |
| `/organizations` | `PUT` | Implemented | `SUPER_ADMIN` or `ORG_ADMIN`, optional `name`, `email`, `phone`, `address`, `description`, `logoUrl` | Updated organization |
| `/organizations/:id` | `GET` | Needed | `SUPER_ADMIN` token | Full organization details |
| `/organizations/:id/settings` | `GET` | Needed | `SUPER_ADMIN` or matching `ORG_ADMIN` | Organization settings |
| `/organizations/:id/settings` | `PUT` | Needed | Matching admin token, settings payload | Updated organization settings |

## 3. User APIs

These APIs manage users inside the platform.

| API | Type | Status | Required | Returns |
| --- | --- | --- | --- | --- |
| `/users` | `GET` | Implemented | Bearer token, optional `search`, `role`, `status`, `organizationId`, `sortBy`, `sortDir`, `page`, `limit` | Paginated users |
| `/users` | `POST` | Implemented | `SUPER_ADMIN` or `ORG_ADMIN`, `firstName`, `email`, `role`; optional `lastName`, `phone`, `organizationId` | Created user |
| `/users/:id` | `PUT` | Implemented | `SUPER_ADMIN` or `ORG_ADMIN`, optional user fields | Updated user |
| `/users/:id` | `DELETE` | Implemented | `SUPER_ADMIN` or `ORG_ADMIN` | Success message |
| `/users/:id` | `GET` | Needed | Admin token or own profile permission | Full user details |
| `/users/:id/status` | `PATCH` | Needed | Admin token, `status` | Updated user status |
| `/users/:id/settings` | `GET` | Needed | Own user or admin permission | User settings |
| `/users/:id/settings` | `PUT` | Needed | Own user or admin permission, settings payload | Updated user settings |

## 4. Public Campaign APIs

These APIs are used by public visitors without logging in.

| API | Type | Status | Required | Returns |
| --- | --- | --- | --- | --- |
| `/public/campaigns` | `GET` | Needed | Optional `search`, `category`, `status`, `page`, `limit` | Approved public campaigns |
| `/public/campaigns/featured` | `GET` | Needed | None | Top three featured campaigns |
| `/public/campaigns/:slugOrId` | `GET` | Needed | Campaign slug or id | Full public campaign details |
| `/public/campaigns/:slugOrId/updates` | `GET` | Needed | Campaign slug or id | Public campaign updates |
| `/public/blog` | `GET` | Needed | Optional `search`, `category`, `page`, `limit` | Completed campaign blog stories |
| `/public/blog/:slugOrId` | `GET` | Needed | Completed campaign slug or id | Full completed campaign story with proof |

Current code note:

- A `backend/modules/public-campaign/routes.js` file exists in the working tree,
  but it is not mounted in `backend/app.js`.
- To count as implemented, public routes should be mounted under a path such as
  `/api/v1/public/campaigns` or `/api/v1/public`.

## 5. Campaign APIs

These APIs manage campaign creation, review, status, donor targets, and pool
imports.

| API | Type | Status | Required | Returns |
| --- | --- | --- | --- | --- |
| `/campaigns` | `GET` | Implemented | Bearer token, optional `status`, `search`, `page`, `limit` | Paginated campaigns visible to user |
| `/campaigns/:id` | `GET` | Implemented | Bearer token, campaign id | Full campaign details |
| `/campaigns` | `POST` | Implemented | `SUPER_ADMIN`, `ORG_ADMIN`, or `CAMPAIGN_MANAGER`; `name`, `goalAmount`; optional `story`, `imageUrl`, `category`, `serviceFeePercent`, `minimumAmount`, `startDate`, `endDate`, `contactPhone`, `managerIds`, `poolIds`, `expectedAmounts` | Created campaign |
| `/campaigns/:id` | `PUT` | Implemented | Allowed role, campaign id, editable campaign fields | Updated campaign |
| `/campaigns/:id/submit` | `POST` | Implemented | `SUPER_ADMIN` or `ORG_ADMIN` | Submitted campaign |
| `/campaigns/:id/approve` | `POST` | Implemented | `SUPER_ADMIN` or `ORG_ADMIN` | Approved campaign |
| `/campaigns/:id/status` | `POST` | Implemented | `SUPER_ADMIN` or `ORG_ADMIN`, `status` as `PAUSED`, `COMPLETED`, or `CANCELLED` | Updated campaign status |
| `/campaigns/:id/managers` | `PUT` | Implemented | `SUPER_ADMIN` or `ORG_ADMIN`, `userIds` | Updated campaign managers |
| `/campaigns/:id/donor-targets` | `GET` | Implemented | Bearer token | Campaign donor targets and statuses |
| `/campaigns/:id/donor-targets/:donorId` | `PUT` | Implemented | Allowed role, optional `expectedAmount` | Updated donor expected amount |
| `/campaigns/:id/donor-targets/:donorId` | `DELETE` | Implemented | Allowed role | Removed donor from campaign target board |
| `/campaigns/:id/pools/preview` | `POST` | Implemented | Allowed role, `poolIds`; optional `duplicateChoices`, `expectedAmounts` | Preview of pool import, duplicates, totals |
| `/campaigns/:id/pools/import` | `POST` | Implemented | Allowed role, `poolIds`; optional `duplicateChoices`, `expectedAmounts` | Imported pool donors into campaign |
| `/campaigns/:id/feature` | `POST` | Needed | `SUPER_ADMIN` or `ORG_ADMIN`, `position` 1-3 | Campaign selected as featured |
| `/campaigns/featured` | `PUT` | Needed | `SUPER_ADMIN` or `ORG_ADMIN`, exactly up to three campaign ids | Updated featured campaign list |
| `/campaigns/:id/completion` | `GET` | Needed | Bearer token | Completion proof and blog status |
| `/campaigns/:id/completion` | `POST` | Needed | Campaign manager/admin, `proofImages`, `blogTitle`, `blogBody`; optional `usedAmount`, `itemsUsed`, `beneficiaries`, `outcome` | Created completion proof/blog update |
| `/campaigns/:id/completion` | `PUT` | Needed | Campaign manager/admin, completion update fields | Updated completion proof/blog update |
| `/campaigns/:id/complete` | `POST` | Needed | Campaign manager/admin, proof already complete or included | Completed campaign |
| `/campaigns/:id/feedback-state` | `GET` | Needed | Campaign id | Public payment/contribution feedback state |
| `/campaigns/creation-eligibility` | `GET` | Needed | Campaign manager token | Whether manager can create a new campaign; includes blocking completed campaigns missing proof/blog |

Important required campaign rule:

- Campaign managers must not be allowed to create a new campaign if they have a
  completed campaign missing proof images or a blog update.

## 6. Featured Campaign APIs

Featured campaigns are the top three campaigns shown on the landing page and
campaigns page.

| API | Type | Status | Required | Returns |
| --- | --- | --- | --- | --- |
| `/featured-campaigns` | `GET` | Needed | Admin token, optional organization filter for `SUPER_ADMIN` | Current featured campaigns |
| `/featured-campaigns` | `PUT` | Needed | `SUPER_ADMIN` or `ORG_ADMIN`, `campaignIds` array with max 3 | Updated featured campaign order |
| `/featured-campaigns/:campaignId` | `DELETE` | Needed | `SUPER_ADMIN` or `ORG_ADMIN` | Removed campaign from featured list |

Implementation note:

- This can also be implemented inside the campaign module as
  `/campaigns/featured`.
- Choose one API style and keep it consistent.

## 7. Donor APIs

These APIs manage donors and donor payment method details.

| API | Type | Status | Required | Returns |
| --- | --- | --- | --- | --- |
| `/donors` | `GET` | Implemented | Bearer token, optional `search`, `status`, `consent`, `gender`, `poolId`, `anomalous`, `sortBy`, `sortDir`, `page`, `limit` | Paginated donors |
| `/donors/:id` | `GET` | Implemented | Bearer token, donor id | Donor details |
| `/donors` | `POST` | Implemented | Allowed role, `phone`; optional `firstName`, `lastName`, `email`, `location`, `gender`, `position`, `status`, `consentStatus`, `preferredChannel`, `tags`, `notes`, `poolId`, `paymentMethods` | Created donor |
| `/donors/:id` | `PUT` | Implemented | `SUPER_ADMIN` or `ORG_ADMIN`, donor update fields | Updated donor |
| `/donors/:id` | `DELETE` | Implemented | `SUPER_ADMIN` or `ORG_ADMIN` | Success message |
| `/donors/:id/payment-methods` | `POST` | Implemented | Allowed role, `method`; optional `accountRef`, `details` | Created payment method |
| `/donors/:id/payment-methods/:methodId` | `DELETE` | Implemented | Allowed role | Removed payment method |
| `/donors/:id/campaigns` | `GET` | Needed | Bearer token, donor id | Donor campaign contribution history |
| `/donors/:id/totals` | `GET` | Needed | Bearer token, donor id | Donor total paid by manager/org/system scope |
| `/donors/:id/pools` | `GET` | Needed | Bearer token, donor id | Donor pool memberships |
| `/donors/import` | `POST` | Needed | Allowed role, donor file or donor array; optional `poolId` | Import result, created/updated donors, duplicates |
| `/donors/duplicates` | `GET` | Needed or covered by donor-pools | Bearer token | Possible duplicate donors |
| `/donors/duplicates/resolve` | `POST` | Needed or covered by donor-pools | Allowed role, duplicate choices | Merge/resolve result |

Current permission gap:

- Campaign managers can create donors but cannot update donor profile details
  through `/donors/:id` because that route currently allows only admins.
- The full flow may require managers to update donors inside their own scope.

## 8. Donor Pool APIs

These APIs manage donor pools, donor pool members, duplicate resolution,
anomalous donors, and reminder sending.

| API | Type | Status | Required | Returns |
| --- | --- | --- | --- | --- |
| `/donor-pools` | `GET` | Implemented | Bearer token, optional `category`, `search`, `status`, `createdBy`, `sortBy`, `sortDir`, `page`, `limit` | Paginated donor pools |
| `/donor-pools` | `POST` | Implemented | Allowed role, `name`; optional `description`, `category`, `createdBy` | Created donor pool |
| `/donor-pools/:id` | `GET` | Implemented | Bearer token, pool id | Donor pool details |
| `/donor-pools/:id` | `PUT` | Implemented | Allowed role, update fields | Updated donor pool |
| `/donor-pools/:id` | `DELETE` | Implemented | Allowed role | Success message |
| `/donor-pools/:id/members` | `POST` | Implemented | Allowed role, `donorIds` or `donors`; optional `expectedAmounts` | Added members |
| `/donor-pools/:id/members/:donorId` | `PUT` | Implemented | Allowed role, optional `expectedAmount` | Updated pool member expected amount |
| `/donor-pools/:id/members/:donorId` | `DELETE` | Implemented | Allowed role | Removed member |
| `/donor-pools/duplicates` | `GET` | Implemented | Bearer token | Duplicate donors across pools |
| `/donor-pools/duplicates/resolve` | `POST` | Implemented | Allowed role, `choices` with `donorId` and `keepPoolId` | Duplicate resolution result |
| `/donor-pools/anomalous` | `GET` | Implemented | Bearer token | Anomalous pool records |
| `/donor-pools/anomalous/:anomalousDonorId/merge` | `POST` | Implemented | Allowed role, `targetDonorId`; optional `paymentMethod` | Merged anomalous donor/payment into known donor |
| `/donor-pools/reminders/send` | `POST` | Implemented | Allowed role, `campaignId`, `donorIds`, `channel`, `message`; optional `subject` | Reminder send result |
| `/donor-pools/:id/status-summary` | `GET` | Needed | Bearer token, pool id, optional campaign id | Pool paid/unpaid/partial totals |
| `/donor-pools/:id/campaigns` | `GET` | Needed | Bearer token, pool id | Campaigns where pool was imported |
| `/donor-pools/:id/import-preview` | `POST` | Needed if not using campaign preview | Allowed role, donor list/file | Duplicate and validation preview |
| `/donor-pools/:id/import` | `POST` | Needed if not using member add | Allowed role, donor list/file | Import result |

Category gap:

- Current categories are `FAMILY`, `SCHOOL`, `STUDENT`, `OFFICE`.
- Full flow also asks for categories such as friends, community, and other.

## 9. Campaign Donor Board APIs

The donor board shows each imported donor and their campaign payment status.

| API | Type | Status | Required | Returns |
| --- | --- | --- | --- | --- |
| `/campaigns/:id/donor-targets` | `GET` | Implemented | Bearer token | Donor board/targets |
| `/campaigns/:id/donor-board` | `GET` | Needed if donor-targets is not enough | Bearer token, optional `status`, `poolId`, `search`, `sortBy`, `sortDir`, `page`, `limit` | Donor board with expected amount, paid amount, status, preferred channel |
| `/campaigns/:id/donor-board/summary` | `GET` | Needed | Bearer token | Totals for unpaid, partial, paid, expected, received |
| `/campaigns/:id/donor-board/selectable-reminders` | `GET` | Needed | Bearer token, optional `status`, `poolId` | Donors eligible for reminders |

Status rules:

- `NOT_PAID`: confirmed paid amount is zero.
- `PARTIALLY_PAID`: confirmed paid amount is greater than zero but less than
  expected.
- `PAID_IN_FULL`: confirmed paid amount is equal to or greater than expected.

## 10. Donation And Payment APIs

These APIs manage donations, payment attempts, callbacks, manual contributions,
and contribution feedback.

| API | Type | Status | Required | Returns |
| --- | --- | --- | --- | --- |
| `/donations` | `GET` | Implemented | Bearer token, optional `campaignId`, `page`, `limit` | Paginated donations |
| `/donations/campaigns/:campaignId/attempts` | `GET` | Implemented | Bearer token, campaign id | Campaign payment attempts |
| `/donations/campaigns/:campaignId/attempts` | `POST` | Implemented | Allowed role, `amount`; optional `donorId`, `donorPhone`, `donorName` | Created payment attempt |
| `/donations/simulate-callback` | `POST` | Implemented for development | `SUPER_ADMIN` or `ORG_ADMIN`, `attemptId`, `result.status`; optional `gatewayRef` | Simulated callback result |
| `/donations/manual` | `POST` | Needed | Allowed role, `campaignId`, `amount`, contribution type; optional donor/payment proof details | Recorded manual contribution |
| `/donations/items` | `POST` | Needed | Allowed role, `campaignId`, item details, quantity/value; optional donor details | Recorded item or in-kind contribution |
| `/donations/:id` | `GET` | Needed | Bearer token, donation id | Donation details |
| `/donations/:id/verify` | `POST` | Needed | Admin/manager, verification decision and proof | Verified or rejected donation |
| `/donations/:id/receipt` | `GET` | Needed | Bearer token or secure public token | Receipt details |
| `/donations/webhooks/mobile-money` | `POST` | Needed | Gateway signature, payment result payload | Webhook processing result |
| `/donations/feedback/:attemptId` | `GET` | Needed | Attempt id or secure token | Payment/contribution feedback state |

Feedback states:

- `RECEIVED`
- `PENDING_CONFIRMATION`
- `CAMPAIGN_TARGET_REACHED`
- `CAMPAIGN_ENDED`
- `SUPPORT_COMPLETE`
- `COMPLETED_SUCCESSFULLY`
- `FAILED`
- `CANCELLED`

Trust rule:

- No API should collect or store a donor mobile-money PIN.

## 11. Anomalous Payment APIs

These APIs manage unknown payments that cannot be matched to a known donor.

| API | Type | Status | Required | Returns |
| --- | --- | --- | --- | --- |
| `/donor-pools/anomalous` | `GET` | Implemented | Bearer token | Anomalous pool records |
| `/donor-pools/anomalous/:anomalousDonorId/merge` | `POST` | Implemented | Allowed role, `targetDonorId`; optional `paymentMethod` | Merged anomalous record |
| `/anomalous-payments` | `GET` | Needed if separated from donor-pools | Bearer token, optional filters | Paginated unmatched payments |
| `/anomalous-payments/:id` | `GET` | Needed | Bearer token, anomalous payment id | Full unmatched payment details |
| `/anomalous-payments/:id/attach` | `POST` | Needed | Allowed role, `targetDonorId`; optional payment method update | Attached payment to known donor |
| `/anomalous-payments/:id/create-donor` | `POST` | Needed | Allowed role, donor details | Created donor and attached payment |
| `/anomalous-payments/:id/ignore` | `POST` | Needed | Admin role, reason | Marked anomalous payment ignored |

Implementation note:

- This can remain inside `donor-pool` if the anomalous pool model is retained.
- If anomalous records become more payment-focused, create a separate
  `anomalous-payment` module.

## 12. Reminder Template APIs

These APIs manage reusable reminder message templates.

| API | Type | Status | Required | Returns |
| --- | --- | --- | --- | --- |
| `/reminder-templates` | `GET` | Implemented | Bearer token, optional `channel`, `search`, `page`, `limit` | Paginated templates |
| `/reminder-templates` | `POST` | Implemented | Allowed role, `name`, `channel`, `body`; optional `subject` | Created template |
| `/reminder-templates/:id` | `PUT` | Implemented | Allowed role, template fields | Updated template |
| `/reminder-templates/:id` | `DELETE` | Implemented | Allowed role | Success message |
| `/reminder-templates/:id` | `GET` | Needed | Bearer token, template id | Template details |
| `/reminder-templates/defaults` | `GET` | Needed | Bearer token, optional channel | System default templates |

## 13. Reminder Sending APIs

These APIs send reminders to selected unpaid or partially paid donors.

| API | Type | Status | Required | Returns |
| --- | --- | --- | --- | --- |
| `/donor-pools/reminders/send` | `POST` | Implemented | Allowed role, `campaignId`, `donorIds`, `channel`, `message`; optional `subject` | Send result |
| `/reminders/send` | `POST` | Needed if separated module is preferred | Allowed role, `campaignId`, `donorIds`, channel or `usePreferredChannel`, template/message | Created reminder batch and send result |
| `/reminders/preview` | `POST` | Needed | Allowed role, campaign id, selected donors, channel/template | Preview recipients, channels, message content |
| `/reminders/history` | `GET` | Needed | Bearer token, optional campaign/pool/channel/date filters | Reminder send history |
| `/reminders/:batchId` | `GET` | Needed | Bearer token | Reminder batch details |

Important rules:

- Reminders should be sent only after manager confirmation.
- Paid-in-full donors should not receive payment reminders.
- Donor preferred channel should be used where possible.

## 14. Automatic Resend Schedule APIs

These APIs manage automatic resend settings and pending confirmation batches.

| API | Type | Status | Required | Returns |
| --- | --- | --- | --- | --- |
| `/reminder-schedules` | `GET` | Implemented | Bearer token, optional `scope`, `page`, `limit` | Paginated schedules |
| `/reminder-schedules` | `POST` | Implemented | Allowed role, `name`, `scope`, `channels`; `poolId` if scope is `POOL` or `campaignId` if scope is `CAMPAIGN`; optional `intervalDays`, template ids, `isActive` | Created schedule |
| `/reminder-schedules/:id` | `PUT` | Implemented | Allowed role, editable schedule fields | Updated schedule |
| `/reminder-schedules/:id` | `DELETE` | Implemented | Allowed role | Success message |
| `/reminder-schedules/pending` | `GET` | Implemented | Bearer token | Pending resend batches requiring confirmation |
| `/reminder-schedules/pending/:id/confirm` | `POST` | Implemented | Allowed role | Confirmed and sent pending batch |
| `/reminder-schedules/pending/:id/skip` | `POST` | Implemented | Allowed role | Skipped pending batch |
| `/reminder-schedules/:id` | `GET` | Needed | Bearer token, schedule id | Schedule details |
| `/reminder-schedules/:id/generate-preview` | `POST` | Needed | Allowed role | Preview next batch before pending creation |
| `/reminder-schedules/:id/pause` | `POST` | Needed | Allowed role | Paused schedule |
| `/reminder-schedules/:id/resume` | `POST` | Needed | Allowed role | Resumed schedule |

Required restrictions:

- Anomalous/unmatched pools must never allow automatic resend.
- Every automatic resend batch must be confirmed before sending.
- Resend should target only donors who remain not paid or partially paid.

## 15. Campaign Completion And Blog APIs

These APIs enforce completion proof and publish completed campaign stories.

| API | Type | Status | Required | Returns |
| --- | --- | --- | --- | --- |
| `/campaigns/:id/completion` | `GET` | Needed | Bearer token | Completion proof, blog update, validation status |
| `/campaigns/:id/completion` | `POST` | Needed | Allowed manager/admin, `proofImages`, `blogTitle`, `blogBody` | Created completion record |
| `/campaigns/:id/completion` | `PUT` | Needed | Allowed manager/admin, completion update fields | Updated completion record |
| `/campaigns/:id/completion/submit` | `POST` | Needed | Allowed manager/admin | Submitted completion for review or publishing |
| `/campaigns/:id/completion/approve` | `POST` | Needed | `SUPER_ADMIN` or `ORG_ADMIN` | Approved completion story |
| `/campaigns/:id/completion/proof-images` | `POST` | Needed | Allowed manager/admin, image URL/file metadata | Added proof image |
| `/campaigns/:id/completion/proof-images/:imageId` | `DELETE` | Needed | Allowed manager/admin | Removed proof image |
| `/blog/completed-campaigns` | `GET` | Needed | Optional public filters | Public completed campaign stories |
| `/blog/completed-campaigns/:slugOrId` | `GET` | Needed | Slug or id | Full completed campaign story |

Required completion fields:

- `proofImages`: array of image URLs or uploaded image records
- `blogTitle`
- `blogBody`
- `summary`
- `supportReceived`
- `supportUsed`
- `outcome`

Optional completion fields:

- `usedAmount`
- `itemsUsed`
- `beneficiaryCount`
- `completionDate`
- `gallery`

## 16. Settings APIs

Settings must be visible to all logged-in user types, but returned settings must
match role permissions.

| API | Type | Status | Required | Returns |
| --- | --- | --- | --- | --- |
| `/settings/me` | `GET` | Needed | Bearer token | Settings available to current user |
| `/settings/me` | `PUT` | Needed | Bearer token, user-level settings | Updated user settings |
| `/settings/organization` | `GET` | Needed | `ORG_ADMIN` or `SUPER_ADMIN` | Organization settings |
| `/settings/organization` | `PUT` | Needed | `ORG_ADMIN` or `SUPER_ADMIN`, settings payload | Updated organization settings |
| `/settings/platform` | `GET` | Needed | `SUPER_ADMIN` | Platform settings |
| `/settings/platform` | `PUT` | Needed | `SUPER_ADMIN`, platform settings payload | Updated platform settings |
| `/settings/reminders` | `GET` | Needed | Bearer token | Reminder-related settings for user scope |
| `/settings/reminders` | `PUT` | Needed | Allowed role, reminder settings | Updated reminder settings |

## 17. Audit Log APIs

These APIs expose system activity and important changes.

| API | Type | Status | Required | Returns |
| --- | --- | --- | --- | --- |
| `/audit-logs` | `GET` | Implemented | Bearer token, optional `action`, `severity`, `search`, `page`, `limit` | Paginated audit logs |
| `/audit-logs/recent` | `GET` | Implemented | Bearer token | Recent activity |
| `/audit-logs/:id` | `GET` | Needed | Bearer token, audit id | Full audit event details |

Events that should be audited:

- Campaign creation, approval, status change, completion
- Featured campaign changes
- Donor creation, update, delete
- Donor pool creation, update, delete
- Donor pool import into campaign
- Duplicate donor resolution
- Anomalous payment matching
- Reminder send and resend confirmation
- Settings changes

## 18. File And Image APIs

These APIs are needed if the system uploads proof images instead of storing only
external image URLs.

| API | Type | Status | Required | Returns |
| --- | --- | --- | --- | --- |
| `/uploads/proof-images` | `POST` | Needed | Authenticated multipart file upload | Uploaded image metadata and URL |
| `/uploads/campaign-images` | `POST` | Needed | Authenticated multipart file upload | Campaign image metadata and URL |
| `/uploads/:id` | `DELETE` | Needed | Owner/admin permission | Deleted upload result |

Alternative:

- If the project stores image URLs only, these upload APIs are not required.
- If local/cloud upload is required, create an `upload` module.

## 19. Admin Review APIs

These APIs make admin and system admin review easier.

| API | Type | Status | Required | Returns |
| --- | --- | --- | --- | --- |
| `/admin/campaigns` | `GET` | Needed | `ORG_ADMIN` or `SUPER_ADMIN`, filters | All campaigns in admin scope |
| `/admin/campaigns/:id` | `GET` | Needed | `ORG_ADMIN` or `SUPER_ADMIN` | Full campaign review details |
| `/admin/managers/:managerId/donor-pools` | `GET` | Needed | `ORG_ADMIN` or `SUPER_ADMIN` | Manager donor pools |
| `/admin/managers/:managerId/donor-pools` | `POST` | Needed | `ORG_ADMIN` or `SUPER_ADMIN`, pool payload | Created donor pool for manager |
| `/admin/managers/:managerId/donors` | `GET` | Needed | `ORG_ADMIN` or `SUPER_ADMIN` | Manager donors |
| `/admin/managers/:managerId/donors` | `POST` | Needed | `ORG_ADMIN` or `SUPER_ADMIN`, donor payload | Created donor for manager |
| `/admin/reports/campaigns` | `GET` | Needed | `ORG_ADMIN` or `SUPER_ADMIN`, filters | Campaign totals and report data |
| `/admin/reports/donors` | `GET` | Needed | `ORG_ADMIN` or `SUPER_ADMIN`, filters | Donor/pool totals and report data |

Implementation note:

- These can be separate admin convenience routes, or the same behavior can be
  handled through existing `/campaigns`, `/donors`, and `/donor-pools` filters.
- The important requirement is that admins can enter a manager's context and act
  for that manager.

## 20. Contribution Type APIs

Changia must support more than money.

| API | Type | Status | Required | Returns |
| --- | --- | --- | --- | --- |
| `/contributions` | `GET` | Needed | Bearer token, optional campaign/type/status filters | Paginated money, item, and in-kind contributions |
| `/contributions/money` | `POST` | Needed or covered by donations | Campaign id, amount, donor/payment details | Money contribution record |
| `/contributions/items` | `POST` | Needed | Campaign id, item name, quantity, estimated value; optional donor details | Item contribution record |
| `/contributions/in-kind` | `POST` | Needed | Campaign id, service/support description; optional estimated value and donor details | In-kind contribution record |
| `/contributions/:id` | `GET` | Needed | Bearer token | Full contribution details |
| `/contributions/:id/verify` | `POST` | Needed | Allowed role, decision/proof | Verified contribution |

Implementation note:

- This can be a separate `contribution` module.
- Or it can extend the existing `donation` module with a `contributionType`
  field.

## 21. Simple Module Partition Plan

Implement the system in small modules. Each module should own its routes,
validation, controller, service, and database queries.

Recommended backend module structure:

```text
backend/modules/
  auth/
  organization/
  user/
  settings/
  campaign/
  public-campaign/
  featured-campaign/
  campaign-completion/
  blog/
  donor/
  donor-pool/
  campaign-donor/
  donation/
  contribution/
  anomalous-payment/
  reminder-template/
  reminder/
  reminder-schedule/
  upload/
  audit/
  admin/
```

Keep the modules simple:

- `routes.js`: HTTP paths only
- `validation.js`: request body and query validation only
- `controller.js`: request/response handling only
- `service.js`: business rules and database calls
- `repository.js` or query helpers: optional, only if services become too large

## 22. Implementation Order

### Phase 1: Lock the rules and database

1. Add missing database tables/columns for featured campaigns, completion proof,
   blog stories, contribution types, anomalous payments, settings, and reminder
   history.
2. Add ownership constraints for donor pools and donors.
3. Add campaign creation blocking rule for managers with incomplete completed
   campaign stories.

### Phase 2: Public campaign and blog APIs

1. Mount public campaign routes.
2. Add public featured campaign endpoint.
3. Add public campaign detail endpoint.
4. Add completed campaign blog list and detail endpoints.

### Phase 3: Campaign completion

1. Add completion proof APIs.
2. Require proof images and blog update before completed blog publication.
3. Enforce campaign manager blocking rule.
4. Add admin review/approval if required.

### Phase 4: Donor and donor pool completion

1. Expand donor categories and donor profile fields if missing.
2. Ensure managers can manage donors in their own scope.
3. Add pool summary/status endpoints.
4. Add donor campaign history and totals endpoints.
5. Improve duplicate donor resolution where needed.

### Phase 5: Campaign donor board

1. Make donor board API return expected amount, paid amount, status, pool, and
   preferred contact method.
2. Add donor board summary endpoint.
3. Add reminder-eligible donor endpoint.

### Phase 6: Payments and contributions

1. Add manual money contribution API.
2. Add item and in-kind contribution APIs.
3. Add real payment gateway webhook API.
4. Add feedback-state API.
5. Add anomalous payment attach/create-donor APIs if separated from donor pools.

### Phase 7: Reminders and automatic resend

1. Add reminder preview endpoint.
2. Add reminder send history endpoint.
3. Ensure resend schedules cannot use anomalous pools.
4. Ensure every resend batch requires confirmation.
5. Ensure paid-in-full donors are excluded before sending.

### Phase 8: Settings and admin review

1. Add settings APIs for all roles.
2. Add admin manager-context APIs or extend existing filters.
3. Add report APIs for campaign and donor totals.
4. Add audit events for all important actions.

### Phase 9: API documentation update

1. Update `backend/API_REFERENCE.md`.
2. Update `backend/README.md`.
3. Include role permissions, required fields, response examples, and error
   examples for every endpoint.

## 23. Main Database Areas Needed

The final database should support these areas:

- `users`
- `organizations`
- `campaigns`
- `campaign_managers`
- `featured_campaigns`
- `campaign_completion`
- `campaign_completion_images`
- `blog_posts` or `completed_campaign_stories`
- `donors`
- `donor_payment_methods`
- `donor_pools`
- `donor_pool_members`
- `campaign_donor_targets`
- `donations`
- `contributions`
- `payment_attempts`
- `anomalous_payments`
- `reminder_templates`
- `reminder_batches`
- `reminder_batch_recipients`
- `reminder_schedules`
- `settings`
- `audit_logs`
- `uploads`

## 24. Core Backend Rules To Enforce

- A campaign manager can see only their own donor pools.
- Organization administrators can see all donor pools in their organization.
- System administrators can see platform-level records.
- Admins can choose only up to three featured campaigns.
- Public campaign APIs return only approved public campaigns.
- A completed campaign must have proof images and a blog update.
- A manager with completed campaigns missing proof/blog cannot create a new
  campaign.
- Duplicate donors under the same manager must be resolved before final import
  where possible.
- Unknown payments must be stored as anomalous and later attachable to a known
  donor.
- Automatic resend must not be enabled for anomalous pools.
- Every resend batch must be confirmed before sending.
- Paid-in-full donors must not receive payment reminders.
- Changia must never collect or store donor mobile-money PINs.

## 25. Short API Naming Recommendation

Use the existing module APIs where they already make sense.

Recommended final public paths:

```text
/api/v1/public/campaigns
/api/v1/public/campaigns/featured
/api/v1/public/campaigns/:slugOrId
/api/v1/public/blog
/api/v1/public/blog/:slugOrId
```

Recommended final dashboard paths:

```text
/api/v1/campaigns
/api/v1/campaigns/:id/completion
/api/v1/campaigns/:id/donor-board
/api/v1/donors
/api/v1/donor-pools
/api/v1/donations
/api/v1/contributions
/api/v1/reminders
/api/v1/reminder-templates
/api/v1/reminder-schedules
/api/v1/settings
/api/v1/audit-logs
```

Recommended final admin paths:

```text
/api/v1/admin/campaigns
/api/v1/admin/managers/:managerId/donor-pools
/api/v1/admin/managers/:managerId/donors
/api/v1/admin/reports/campaigns
/api/v1/admin/reports/donors
```

The implementation should avoid duplicating business logic. Admin routes can
call the same services used by campaign, donor, and donor-pool modules, but with
admin scope.
