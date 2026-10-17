# ShiftPatch Product Definition

> Status: MVP requirements and acceptance criteria. Implementation and validation are pending.
>
> Updated: October 16, 2026.
>
> Scope: application behavior and user experience for the Product Engineer assessment.

## 1. Product purpose

ShiftPatch helps staffing agencies publish nursing shifts, lets nurses pick up eligible work, and gives an administrator visibility into which shifts are covered and by whom.

The immediate product goal is to demonstrate a complete staffing workflow with reliable status changes and clear role permissions. The broader business question is whether hospital operations managers and staffing directors experience this problem strongly enough to adopt a paid solution. A working prototype demonstrates the workflow; it does not establish customer demand.

Use a fictional, neutral brand. Do not use Designli's name or assets in the application.

## 2. Source of truth

| Source | Responsibility |
| --- | --- |
| Supplied founder brief | Problem, intended users, complete wish list, assessment constraints |
| Supplied technical spec | Exact sample data, required API contracts, errors, and UI test IDs |
| Scope email sent to the recruiter | Minimum product outcomes committed for this submission |
| PRODUCT.md | User journeys, MVP requirements, assumptions, and product acceptance |
| ARCHITECTURE.md | Feature boundaries, persistence, security, API implementation, and deployment |

Keep the supplied technical spec unchanged, preferably at `docs/ShiftPatch-Technical-Spec.md`. If this document conflicts with a fixed technical requirement, follow the technical spec and correct this document. Document unresolved product assumptions in `docs/decisions.md`.

## 3. Users and needs

| User | Main need | MVP outcome |
| --- | --- | --- |
| Agency operator | Publish open work and see coverage for their agency | Post a shift, see its assigned nurse, and reopen it after cancellation or no-show |
| Nurse | Find available work and understand eligibility | Browse shifts, claim one, maintain a credential expiry date, and see their assignments |
| Administrator | Understand coverage and investigate changes | View shifts across agencies, inspect status and assigned nurses, and read the audit history |

Agency data is scoped to the signed-in agency. Nurses act as themselves. Administrators have cross-agency visibility as described in the permission assumptions below.

The buyer and daily operator may be different people. The prototype supports the required agency/nurse/admin model; it does not add a separate hospital-buyer account type.

## 4. MVP scope and priorities

The committed scope is a deployed TypeScript web MVP with the specified sample data, login and shift APIs, posting/claiming/cancelling flows, role permissions, credential expiry checks, all required UI test IDs, focused tests, passing CI, and lightweight credential upload, audit log, and timesheet views.

| Priority | Capability | Minimum useful delivery |
| --- | --- | --- |
| First | Login and role access | All five supplied accounts can sign in and reach the appropriate workspace |
| First | Shift visibility | Nurses see the marketplace; agencies see their own shifts; admin sees both agencies |
| First | Posting | An agency creates a persisted open shift under its own agency |
| First | Claiming | An eligible nurse claims an open shift; expired credentials are rejected |
| First | Cancellation and no-show | An authorized actor reopens a filled shift and preserves the reason and previous nurse |
| Committed support | Credential upload | Nurse uploads a private document and expiry date; receives truthful success/error feedback |
| Committed support | Admin reporting | A cross-agency table displays current status and assigned nurses |
| Committed support | Audit log | An administrator can inspect actual staffing changes |
| Committed support | Timesheets | A lightweight assignment view distinguishes planned work from submitted actual hours |
| Release requirement | Quality and reachability | Public URL works; required contracts/test IDs are intact; defined CI checks pass |

Priorities determine build order, not permission to silently drop a committed feature. If a feature remains partial at submission, state the exact limitation.

## 5. Core journeys

### Journey A: agency publishes a shift

1. An agency operator signs in.
2. The workspace identifies the agency and lists only its posted shifts.
3. The operator opens the new-shift form.
4. They enter the role, date, start time, and end time.
5. On successful submission, the new shift appears as open in the agency view and marketplace.
6. The operator receives a confirmation. On failure, the form retains its input and offers a clear retry path.

The agency identity comes from the signed-in account. The operator cannot select another agency to impersonate.

### Journey B: nurse claims available work

1. A nurse signs in and sees available shifts from both agencies.
2. Each shift shows agency, role, date, start/end time, and current availability.
3. The nurse selects a shift and attempts to claim it.
4. The product checks the current credential expiry and shift availability.
5. A successful claim shows the shift as filled by that nurse and adds it to their assignments.
6. A rejected claim explains the reason and does not change the assignment.

James must be able to attempt a claim and receive the prescribed expired-credential error. Show his credential status clearly; do not make the required rejection flow unreachable by hiding every claim action.

If someone else claims the shift first, explain that it is no longer available and refresh the list. A displayed success must reflect a persisted claim.

### Journey C: cancellation or no-show reopens work

1. An authorized user opens a filled shift.
2. They choose advance cancellation or no-show where their role permits.
3. Before confirming, they see that the assignment will be removed and the shift will reopen.
4. After success, the shift is open, has no assigned nurse, and becomes available to claim again.
5. History retains the reason, previous nurse, actor, and event time.

The current shift state is open after cancellation. The cancellation remains a historical event, not a third current shift state.

### Journey D: nurse maintains a credential

1. A nurse opens their credential view.
2. They see the current expiry date and whether it is valid or expired.
3. They select a supported document and enter an expiry date.
4. A successful upload persists the private file reference and expiry metadata.
5. An error leaves the prior credential unchanged and explains the corrective action.

This demo treats expiry as self-reported eligibility. It does not independently verify licenses or approve clinical competency. Preserve the original sample eligibility before any file is uploaded.

### Journey E: administrator monitors coverage

1. The administrator signs in.
2. The dashboard lists shifts across both agencies, their status, and their assigned nurse where applicable.
3. Recent changes become visible after a refresh or periodic update.
4. The administrator can inspect actual audit entries and the lightweight timesheet/assignment view.
5. Any counts displayed agree with the current table contents or clearly stated filters.

Describe the dashboard as periodically refreshed if that is how it works. Do not promise instantaneous push delivery.

## 6. Screen inventory

| Screen or view | Essential content and actions |
| --- | --- |
| Login | Labeled email/password fields, submit action, invalid-login feedback |
| Nurse marketplace | Open shifts across both agencies, eligibility context, claim feedback |
| Nurse assignments | Current claimed shifts, permitted cancellation, planned-work summary |
| Nurse credentials | Current expiry, file picker, expiry input, upload feedback |
| Agency workspace | Own shifts, coverage/status, posting form, cancellation/no-show actions |
| Admin dashboard | Both agencies, assigned nurses, current shift status |
| Audit view | Real staffing events, actor, resource, and timestamp |
| Timesheet view | Assignment, planned duration, submission state, actual hours when supplied |

Views may share a page or use tabs. The assessment does not require a complex navigation system or a dedicated page for every table.

## 7. Business rules

### Identity and agency boundaries

- Users sign in using the supplied accounts. Registration, invitations, and account provisioning are deferred.
- A nurse cannot choose a different nurse ID for a claim.
- An agency posts under its own identity and cannot access another agency's scoped workspace.
- Roles and ownership govern operations even when the UI is bypassed.

### Shift lifecycle

| Starting state | Action | Result |
| --- | --- | --- |
| Open, unassigned | Valid nurse claims | Filled, assigned to that nurse |
| Open, unassigned | Expired nurse attempts claim | No change; specified rejection shown |
| Filled | Another claim attempt | No change; unavailable/conflict feedback |
| Filled | Authorized cancellation/no-show | Open, unassigned; previous assignment retained in history |
| Open | Cancellation attempt | No change; explain that no active assignment exists |

One shift has at most one active nurse assignment. Simultaneous claim attempts must not create two winners. A failed operation must not create a success audit entry or a false confirmation.

### Credentials and time

- Maria's seeded credential expires on 2027-01-01; James's expired on 2026-06-01.
- Eligibility uses the nurse's effective expiry when the claim is attempted.
- Proposed boundary: a credential remains valid through its expiry date. Document this assumption and test the boundary.
- No extra requirement for an uploaded file is imposed on the seeded nurses.
- Dates and times are facility-local and use the technical spec's 24-hour format; no timezone conversion is required.
- A shift may run overnight. Its planned duration includes the following day when its end time precedes its start.
- Keep the historical seeded shifts usable for the specified assessment flows; do not introduce a blanket past-date rejection.
- Additional matching by specialty, geographic distance, overlapping work, or verified license type is deferred.

### Cancellation permissions: proposed assumptions

The packet does not fully define cancellation permissions. Use this policy consistently with `ARCHITECTURE.md` unless the recruiter clarifies otherwise:

| Actor | Advance cancellation | Record no-show |
| --- | --- | --- |
| Nurse | Own active claim | No |
| Agency | Active claim on its own shift | Its own filled shift |
| Admin | Any active claim | Any filled shift |

Nurses may upload their own credentials. The administrator reads the cross-agency audit log. Timesheet visibility follows the user's own assignments, own agency, or administrator-wide view.

### Timesheets

- Claiming a shift does not establish that the nurse worked it.
- Show planned duration separately from actual hours.
- Actual hours remain unset until work is recorded; a seeded claimed shift may appear as “Not submitted.”
- Retain historical assignment context after cancellation or reassignment.
- Hours entry, approval, payroll, and billing are outside the committed lightweight view.

## 8. Product acceptance criteria

| ID | Acceptance |
| --- | --- |
| PR-01 Login | Each supplied account signs in with the correct role and identity; invalid credentials show “Invalid email or password” |
| PR-02 Marketplace | The API lists all seeded shifts across both agencies; the nurse UI makes open shifts and current assignments understandable |
| PR-03 Agency isolation | Agency A sees its own scoped shifts and cannot read or modify Agency B's scoped resources |
| PR-04 Posting | An agency submits a valid shift; it persists as open under that agency and survives reload |
| PR-05 Eligible claim | Maria claims an open shift; it becomes filled by nurse-1 and is reflected in agency/admin views |
| PR-06 Expired claim | James is rejected with “Credential expired, cannot claim shift”; shift state is unchanged |
| PR-07 Claim race | Two concurrent valid attempts cannot both fill the same open shift |
| PR-08 Cancellation | Authorized advance cancellation or no-show reopens a filled shift and preserves its previous nurse and reason |
| PR-09 Credential upload | Supported file and expiry are saved privately for the signed-in nurse; invalid uploads show an actionable error |
| PR-10 Admin visibility | Admin sees both agencies, current statuses, and assigned nurses; displayed totals are consistent |
| PR-11 Audit | Successful post/claim/cancel changes appear as truthful audit events; failures do not appear as successful operations |
| PR-12 Timesheets | A real assignment view shows planned work and submission state without fabricated actual hours |
| PR-13 Feedback | Success/error notifications describe the actual result; loading and empty states are clear |
| PR-14 Automation surface | All 15 specified test IDs are attached to their real UI elements |
| PR-15 Release | Public deployment is reachable, seeded login works, persistence is demonstrated, and required CI gates pass |

The API's exact request/response shapes, status codes, and error messages remain defined in the supplied technical spec. Product-facing improvements must preserve those contracts.

## 9. Required test IDs

| Test ID | Product interaction |
| --- | --- |
| login-email-input | Enter the login email |
| login-password-input | Enter the password |
| login-submit-button | Submit login |
| shift-list-item | Inspect a shift in the open-shifts list |
| shift-claim-button | Claim that shift |
| shift-cancel-button | Cancel a claimed shift |
| credential-upload-input | Select a credential document |
| credential-expiry-date-input | Set its expiry date |
| agency-post-shift-button | Open the posting form |
| agency-post-shift-submit-button | Submit the new shift |
| admin-dashboard-shift-table | Inspect cross-agency coverage |
| admin-shift-status-badge | Read each row's current status |
| audit-log-table | Inspect event history |
| timesheet-table | Inspect assignments and recorded-work state |
| notification-banner | Read success or error feedback; distinguish by content |

Test IDs supplement accessible labels and semantics. Do not place them on hidden placeholders.

## 10. Sample data and demonstration

Load the supplied fixtures exactly; do not substitute names, IDs, dates, agencies, or credential expiry values.

| ID | User | Role | Initial eligibility |
| --- | --- | --- | --- |
| agency-a | Sunrise Health Staffing | Agency | Not applicable |
| agency-b | Metro Care Partners | Agency | Not applicable |
| nurse-1 | Maria Lopez | Nurse | Valid through 2027-01-01 |
| nurse-2 | James Cook | Nurse | Expired on 2026-06-01 |
| admin-1 | Alex Kim | Admin | Not applicable |

| Shift | Agency | Role | Date | Start | End | Initial state |
| --- | --- | --- | --- | --- | --- | --- |
| shift-1 | agency-a | RN | 2026-10-02 | 19:00 | 07:00 | Open, unassigned |
| shift-2 | agency-a | LPN | 2026-10-03 | 07:00 | 19:00 | Filled by nurse-1 |
| shift-3 | agency-b | RN | 2026-10-04 | 19:00 | 07:00 | Open, unassigned |

Login emails and sample passwords are defined in the technical spec. Use separate isolated data for destructive or repeatable tests; preserve a predictable initial deployment for evaluator access.

Demonstrate: agency posts a shift; Maria claims it; admin sees coverage; an authorized cancellation reopens it; James's claim is rejected for expired credentials. Also show the credential controls, an actual audit entry, and the lightweight timesheet view.

## 11. Experience and quality requirements

- Clearly identify the signed-in role and agency where relevant.
- Use plain language: open, filled, assigned nurse, expired credential, and cancellation reason.
- Provide usable layouts on desktop and mobile browser widths.
- Support keyboard interaction, visible focus, labeled inputs, semantic tables, and readable status text.
- Preserve form input after recoverable errors.
- Prevent repeated submission while a request is pending.
- Refresh relevant views after successful changes and when returning to an active workspace.
- Keep documents private and show only information the user's role permits.
- Present an honest empty state rather than fabricated example activity.

## 12. Success measures and validation

### Assessment release checks

Measure the demonstrated product against PR-01 through PR-15. Record observed results, not an invented adoption or business impact claim.

The release should support the complete posting-to-coverage-to-reopening journey and preserve exact assessment contracts.

### Proposed measures for a later pilot

| Measure | What it would help answer |
| --- | --- |
| Time from posting to first valid claim | Does the product improve staffing response time? |
| Percentage of posted shifts filled before start | Does it improve coverage? |
| Cancellation/no-show frequency | How reliable are assignments? |
| Repeat use by agency operators | Does the workflow provide ongoing value? |
| Buyer interviews and willingness to pilot/pay | Is there evidence of demand? |

These are proposed measures, not implemented analytics or observed outcomes. Set pilot targets only after learning the current manual-process baseline.

A later demand-validation effort could interview hospital operations managers and staffing directors, check organization identities against public hospital directories, and test a pilot offer. Do not equate a public listing with buyer interest or a self-reported credential with independent verification.

## 13. Deferred scope

The initial submission does not commit to:

- Email delivery or production notification infrastructure.
- PostHog or a complete analytics program.
- Inspector-ready bulk document exports.
- Advanced reporting or scheduling optimization.
- Instant push updates.
- Independent license verification or credential approval workflows.
- Worked-hour entry/approval, payroll, billing, or payments.
- Public registration, invitations, or account administration.
- A native mobile app or a separate hospital-buyer portal.

Additions are considered only after the committed core is usable and verified. Record any actual partial functionality with its user impact in the project handoff.

## 14. Product decisions to keep explicit

1. Cancellation permissions follow the proposed role policy above.
2. Credential expiry is inclusive of its date.
3. Uploaded expiry is self-reported in this demo.
4. Historical seeded shifts remain available for the prescribed flows.
5. Timesheets show assignment/submission state; claimed work is not automatically completed work.
6. Admin visibility is periodically refreshed, with no promise of instantaneous push updates.
7. The technical spec controls exact fixtures and contracts when examples are abbreviated or incomplete.

Keep these decisions aligned with `ARCHITECTURE.md`. Update this document when user-facing scope or behavior changes; use implementation notes and version control for short-lived progress.
