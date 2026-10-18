# ShiftPatch Design System

Status: implementation reference for the approved authentication and agency dashboard mockups.

## 1. Product and visual direction

ShiftPatch helps healthcare agencies post open nursing shifts and keep track of coverage. The interface should feel calm, trustworthy, and polished while making staffing information easy to scan.

The visual identity combines deep forest green, warm ivory, soft sage, and restrained gold. Editorial serif headings give the brand character; clear sans-serif text supports forms, navigation, and dense operational content.

This document defines visual and interaction decisions. Product requirements, API contracts, authorization rules, and required test IDs remain authoritative in their own specifications. Illustrative names, hospitals, numbers, and dates in the mockups are presentation examples; implementation must use the supplied sample data and actual application state.

### Approved screens

- Authentication: split screen with a forest green brand panel and an ivory sign-in area.
- Agency overview: forest green sidebar, four summary cards, and a full-width upcoming shifts table.
- The dashboard has no “Needs attention” or “Recent activity” sections. Do not reintroduce these cards or reserve an empty right column for them.

### Design principles

1. Make the next action clear. Each screen has one dominant primary action.
2. Keep operational data readable. Use consistent alignment, meaningful labels, and enough row spacing.
3. Use green for brand and primary actions; use semantic status colors where needed.
4. Prefer quiet surfaces, fine borders, and restrained shadows.
5. Show real application state. Do not display fabricated coverage, live indicators, or success messages.

## 2. Brand identity

### Name and logo

- Display the product name as **ShiftPatch** with this capitalization.
- Use an abstract woven patch mark alongside a serif wordmark.
- On forest backgrounds, use an ivory wordmark and muted gold mark.
- On light backgrounds, use a forest wordmark and forest or gold mark.
- Use one consistent logo asset throughout the product; generated mockups are visual references, not final logo source files.
- Provide an accessible product name when the logo is a navigation link. Decorative marks next to visible text should be hidden from assistive technology.
- Do not use Designli branding or assets.

### Voice

Use short, friendly, direct English. Focus on shifts, coverage, and care. Avoid technical terms in product copy.

| Context | Approved copy |
| --- | --- |
| Authentication headline | Better coverage. Better care. |
| Authentication supporting text | Connect the right nurses with the shifts that need them. |
| Sign-in heading | Welcome back |
| Sign-in supporting text | Sign in to manage your next shift. |
| Dashboard heading | Staffing, at a glance. |
| Dashboard supporting text | Keep your shifts covered and your team ready. |
| Shift table heading | Upcoming shifts |
| Shift table supporting text | Your agency’s schedule for the week |
| Primary agency action | Post a shift |

## 3. Color system

These are implementation tokens chosen to reproduce the approved direction. Apply tokens by purpose rather than scattering hex values through components.

| Token | Value | Purpose |
| --- | --- | --- |
| `--color-brand-900` | `#10352B` | Primary button hover and deep brand details |
| `--color-brand-800` | `#143E32` | Sidebar, authentication panel, primary buttons |
| `--color-canvas` | `#F7F8F3` | Application and authentication background |
| `--color-surface` | `#FFFFFF` | Cards, inputs, tables, dialogs |
| `--color-surface-subtle` | `#F0F3EE` | Table headers and quiet hover surfaces |
| `--color-sage` | `#DFE9DC` | Selected navigation and informational backgrounds |
| `--color-gold` | `#B8A16B` | Logo and decorative accents |
| `--color-text` | `#20372E` | Headings, labels, body text |
| `--color-text-muted` | `#52635B` | Supporting text, metadata, secondary labels |
| `--color-on-brand` | `#F7F8F3` | Text and icons on forest backgrounds |
| `--color-border` | `#DCE3DC` | Card borders and separators |
| `--color-input-border` | `#829086` | Input boundaries on light surfaces |
| `--color-focus` | `#356C55` | Focus outlines on light surfaces |
| `--color-success-bg` | `#E4EFE2` | Filled and verified badges |
| `--color-success-text` | `#245B39` | Filled and verified text |
| `--color-warning-bg` | `#FFF3DA` | Open shift badges and warning surfaces |
| `--color-warning-text` | `#85510D` | Open shift and warning text |
| `--color-danger-bg` | `#FBEAE7` | Error and destructive confirmation surfaces |
| `--color-danger-text` | `#A13227` | Errors and destructive actions |
| `--color-neutral-bg` | `#EDF0ED` | Cancelled and neutral badges |
| `--color-neutral-text` | `#536058` | Neutral badge text |
| `--color-info-bg` | `#E1E9F2` | Nurse avatars in the audit log |
| `--color-info-text` | `#34506B` | Initials on `--color-info-bg` |

Gold is decorative and should not be used for small text on white. Status badges always include words; color alone never communicates status. Visible input boundaries, focus indicators, and interactive icons must have sufficient contrast for their context. Verify final rendered foreground/background combinations before release.

### Starter CSS tokens

```css
:root {
  color-scheme: light;
  --color-brand-900: #10352b;
  --color-brand-800: #143e32;
  --color-canvas: #f7f8f3;
  --color-surface: #ffffff;
  --color-surface-subtle: #f0f3ee;
  --color-sage: #dfe9dc;
  --color-gold: #b8a16b;
  --color-text: #20372e;
  --color-text-muted: #52635b;
  --color-on-brand: #f7f8f3;
  --color-border: #dce3dc;
  --color-input-border: #829086;
  --color-focus: #356c55;
  --color-success-bg: #e4efe2;
  --color-success-text: #245b39;
  --color-warning-bg: #fff3da;
  --color-warning-text: #85510d;
  --color-danger-bg: #fbeae7;
  --color-danger-text: #a13227;
  --color-neutral-bg: #edf0ed;
  --color-neutral-text: #536058;
  --color-info-bg: #e1e9f2;
  --color-info-text: #34506b;

  --font-ui: "Inter", system-ui, sans-serif;
  --font-display: "DM Serif Display", Georgia, serif;
  --radius-control: 8px;
  --radius-card: 12px;
  --radius-pill: 999px;
  --shadow-card: 0 2px 8px rgb(20 62 50 / 4%);
  --shadow-overlay: 0 16px 48px rgb(20 62 50 / 14%);
  --sidebar-width: 240px;
}
```

The typefaces are implementation selections that match the mockup’s character, not font metadata extracted from the generated images. Load the actual font assets once and provide the listed fallbacks.

## 4. Typography

Use **DM Serif Display** for the wordmark, authentication hero, dashboard page title, major section titles, and KPI numerals. Use **Inter** for navigation, controls, table content, labels, and supporting text.

| Element | Desktop size / line height | Style |
| --- | --- | --- |
| Authentication hero | 64–72px / 1.05 | Display serif, regular |
| Sign-in title | 44–52px / 1.1 | Display serif, regular |
| Dashboard title | 40–48px / 1.12 | Display serif, regular |
| Section title | 24px / 1.25 | Display serif, regular |
| KPI value | 36px / 1.1 | Display serif, regular |
| Body and navigation | 16px / 1.5 | UI sans, regular or medium |
| Table text and labels | 14px / 1.45 | UI sans, regular or medium |
| Supporting metadata | 13–14px / 1.45 | UI sans, regular |
| Eyebrow | 11–12px / 1.5 | UI sans, medium, 0.14em tracking |

Use sentence case for headings, labels, and buttons. Reserve uppercase for small eyebrow labels. Use tabular numerals for rates, hours, dates, and aligned numeric content. Avoid light font weights for operational data.

## 5. Spacing, surfaces, and icons

- Base spacing scale: `4, 8, 12, 16, 24, 32, 40, 48, 64px`.
- Application content padding: 32px on desktop, 24px on tablet, 16px on mobile.
- Card gaps: 16px; major section gaps: 24px.
- Card padding: 20–24px; compact control gaps: 8–12px.
- Borders: 1px, with quiet separators rather than heavy outlines.
- Control radius: 8px; card radius: 12px; badge radius: pill.
- Buttons and inputs: at least 44px high; authentication inputs: 52px.
- Icons: consistent outline style, generally 20px with a 1.75–2px stroke.
- Use simple icons such as calendar, users, clock, document, shield, filter, bell, search, and chevron.
- Decorative KPI icon circles may use pale sage or pale amber.
- Shadows are subtle. Large shadows are reserved for floating menus and dialogs.
- Avoid glossy effects, strong gradients, glass panels, neon accents, and decorative charts.

## 6. Authentication screen

### Desktop layout

Use a two-column composition occupying at least the viewport height, while allowing vertical scrolling on shorter screens.

- Brand panel: approximately 46% of the width, forest green background, 64px internal padding.
- Form area: approximately 54%, warm ivory background, centered form with a maximum width of 440px.
- Keep the logo near the top of the brand panel, followed by an eyebrow, the hero headline, and supporting copy.
- Below the copy, show a restrained illustration made from an evening shift card and a nurse credential card connected by a fine gold line.
- This illustration is static brand decoration. It must not appear to be live staffing data or expose actual nurse details.
- Use sparse gold arcs near the lower edge and the footer phrase “A little less scrambling. A lot more care.”

### Sign-in form

Display the following in order:

1. Small sage eyebrow: “Welcome to ShiftPatch”.
2. “Welcome back” heading and supporting copy.
3. Visible “Email address” label and input.
4. Visible “Password” label, masked input, and accessible visibility toggle.
5. Session persistence checkbox and password recovery link only when supported by the configured authentication flow.
6. Full-width forest “Sign in” button.
7. Quiet note: “Your workspace is based on your account role.”
8. Pale sage trust panel with shield icon and “Built around trusted care”.
9. Access help: “Need access? Contact your administrator” with a functioning destination if presented as a link.

**Implemented (2026-10-17).** The screen is built in the app, in `src/app/login/page.tsx` and `src/features/auth/components/login-form.tsx`. Do not expose links the sign-in flow cannot honor, to imitate the mockup:

- There is no password recovery link and no "remember me" checkbox, because the flow supports neither. Registration and recovery are out of scope.
- "Need access? Contact your administrator" is plain text: there is no destination to link to.
- The brand-panel illustration is made of abstract shapes with no text, so it cannot read as live staffing data.
- Below the `lg` breakpoint the brand panel collapses to the logo, headline and supporting text above the form, and the illustration and footer phrase are hidden.
- Tokens live in `@theme` in `src/app/globals.css`. Inter and DM Serif Display load through `next/font`, which removed the old Arial override (TD-3).

Do not add public registration, social sign-in buttons, or a role selector unless product requirements explicitly support them. The account determines the role.

### Form states

- Default: white surface, visible label, clear input boundary.
- Focus: visible outline with a 2px offset; keep layout stable.
- Invalid: danger border, error icon where useful, associated inline message.
- Submitting: loading indicator and “Signing in…”; prevent duplicate submissions.
- Authentication failure: show a clear form-level error without discarding entered email.
- Password visibility: keyboard accessible button with a changing accessible label.
- Do not claim certifications or compliance guarantees in the trust panel.

## 7. Agency dashboard

### Application shell

At desktop sizes, use a 240px full-height forest sidebar and a flexible ivory content region. Keep the sidebar fixed or sticky only when its contents remain reachable through scrolling.

Sidebar structure:

- ShiftPatch logo.
- Small “Workspace” label and agency workspace identity.
- Navigation: Overview, Shifts, Nurse roster, Timesheets, Audit log.
- Help and support near the bottom.
- Account area with initials avatar, name, role, and account menu.

The active navigation item has a sage background and dark text. Inactive items use ivory text and outline icons. Add `aria-current="page"` to the current navigation link. A workspace dropdown is interactive only when the account actually has multiple workspaces.

### Header

- Small breadcrumb: “Workspace / Overview”.
- Main heading and supporting text on the left.
- Secondary “View all shifts” and primary “Post a shift” on the right.
- Date-range filter below the heading.
- Search and notifications may appear only when functional; omit decorative controls from the implementation.
- Show “Updated just now” only after a successful data fetch, and update the wording as time passes. Do not imply real-time updates unless implemented.

### Summary cards

Display four equal-width cards on desktop, with a small icon, label, large numeral, and supporting line:

| Card | Display | Meaning |
| --- | --- | --- |
| Open shifts | Count | Open shifts within the selected agency and date range |
| Filled shifts | Count | Filled shifts in the same scope |
| Coverage | Percentage and thin progress bar | Filled / (open + filled) × 100 in the same scope |
| Hours scheduled | Hours | Sum of filled shift durations in the same scope |

Example only: 8 open and 24 filled shifts produce 75% coverage. Twenty-four filled 12-hour shifts produce 288 scheduled hours. Exclude cancelled shifts from the coverage denominator. If there are no open or filled shifts, show “—” with “No shifts in this period” instead of an invented percentage.

Use actual shift start and end timestamps to calculate duration, including overnight shifts. Apply one agency scope and date range consistently across cards and the table. A supporting line such as “3 starting in the next 24 hours” must also come from actual data.

### Full-width upcoming shifts panel

The table spans the entire available content width beneath the KPI cards. There is no right-side auxiliary column.

Panel structure:

1. Heading and supporting text on the left; Filter control on the right.
2. Status tabs with counts: All shifts, Open, Filled; expose Cancelled when supported by the product’s shift model.
3. Data table.
4. Result count and pagination or “View all shifts” link.
5. Full-width pale sage credential information banner.

| Column | Content |
| --- | --- |
| Shift | Department and nursing role; facility or campus as secondary text |
| Date & time | Local date and start/end time; include the end date when needed for clarity |
| Rate | Currency and hourly amount, such as `$48/hr` |
| Assigned nurse | Initials avatar and name, or “Unassigned” |
| Status | Text badge such as Open, Filled, or Cancelled |
| Details | Accessible row detail link or chevron control |

Use 72–80px rows where practical, fine horizontal dividers, and left-aligned text. Allow important content to wrap instead of silently truncating it. Keep a clear row hover treatment. A row detail control must be a real link or button with a descriptive accessible name; do not make a mouse-only clickable row.

The credential banner reads:

> Credential checks happen before a shift is claimed.
> Nurses with expired required credentials cannot claim shifts.

This is supporting information, not the enforcement mechanism. Claim eligibility is determined by actual application rules and server responses.

Display the timezone explicitly near the table. Use the configured facility or schedule timezone; the mockup’s Eastern Time label is illustrative. Do not silently reinterpret shift times using the viewer’s device timezone.

**Implemented (2026-10-17).** The agency overview is built in `src/app/(workspace)/agency/` and `src/features/shifts/`, with the post-a-shift side panel. It is data-backed: the page is a Server Component that reads the agency's shifts from the database, and posting calls `POST /api/shifts`, so a posted shift survives a reload. The status tabs are All, Open and Filled; there is no Cancelled tab or badge, because status is `open | filled`. The panel is headed "Your shifts" with "Every shift your agency has posted", since it has no date scope. The empty state and the Coverage note read "No shifts posted yet."

Posting states:

- **Validation.** The dialog validates with the same schema as the API before sending anything. A failing field shows its message beside it and no request is sent.
- **Pending.** The submit button is disabled and reads "Posting…" until the request has returned and the refreshed list has rendered. The dialog cannot be dismissed meanwhile.
- **Success.** The dialog closes, focus returns to "Post a shift", and "Shift posted" appears in the page's `notification-banner`.
- **Failure.** The dialog stays open with every input as typed, and the error appears in a `role="alert"` `notification-banner` inside the dialog, because the modal makes the page behind it inert. Opening the dialog clears the page banner, so only one banner exists at a time.

Omitted because they have no working destination yet: the Shifts, Nurse roster, Timesheets and Audit log nav items, Help, the date-range and filter controls, "View all shifts", and the Rate and Details columns (shifts have no rate in the data model). Coverage and hours are computed from the visible shifts; there is no date-range scope.

**Implemented (2026-10-17): nurse marketplace UI.** `src/app/(workspace)/nurse/` reuses the agency shell: sidebar with "Shift marketplace" and "My shifts" (an anchor to the section below), a credential status banner, an "Available shifts" panel and a "My shifts" panel. Open shifts come from the database; the Agency and Role filters work client-side. The banner has three states from the nurse's expiry date: valid (sage, "Expires <date>"), expired (danger) and missing (warning). A credential remains valid through its expiry date. "Claim shift" is never disabled for an expired nurse, so the server's rejection stays reachable; the banner explains the restriction. The claim button posts to `POST /api/shifts/:id/claim` and shows the server's message in `notification-banner`; the route is built (2026-10-17), and the banner starts "Shift claimed" on success or shows the server's exact message on failure. Every claim button stays disabled while the claim is in flight and while the refresh after it is pending, so a claimed row never flashes back as claimable. Shifts render as one table that stacks into cards below `md`, so each `shift-list-item` exists once in the DOM. Omitted: a credential renewal link (no destination yet), and the mockup's third example shift, which is not in the seed data.

**Implemented (2026-10-17): cancellation and no-show UI.** One `ReopenShiftDialog` (`src/features/shifts/components/reopen-shift-dialog.tsx`) serves both roles as a centered modal. The shift card shows role, agency, date, time and "Facility-local time". Confirming posts to `POST /api/shifts/:id/cancel`.

- **One button per row.** A nurse's "Cancel shift" in My shifts and an agency's "Cancel shift" on every filled row each carry `shift-cancel-button` and an `aria-label` naming the role and date (and the nurse, for an agency). Open rows have no button, and the agency board has no "View details", since there is no destination. Each row renders the button once, so `row.getByTestId("shift-cancel-button")` matches once.
- **Nurse.** "Cancel this assignment?" with a read-only "In advance" reason, because a nurse may only cancel in advance.
- **Agency.** "Cancel {nurse}’s assignment?" names the assigned nurse and asks for a "Cancellation reason" in a `fieldset` of two radios, "In advance" (preselected) and "No-show". The description, the consequence ("{nurse} will be unassigned and the shift will reopen."), the confirm label ("Cancel assignment" or "Report no-show") and the pending label ("Cancelling…" or "Reporting…") follow the choice. The choice resets whenever the dialog closes. The admin has no cancel UI by design: the overview has no action column, though the API still allows an admin cancel.
- **Pending.** Both buttons, the close control and the radios are disabled until the request returned and the refreshed list rendered; Escape and backdrop clicks are ignored meanwhile.
- **Success.** The dialog closes and the page's `notification-banner` reads "Assignment cancelled: …" or "No-show reported: …", ending "The shift is open again." The row leaves My shifts, or becomes Open and Unassigned on the agency board. Focus returns to the page, not the removed trigger.
- **Failure.** The dialog stays open and the server's message appears in a `role="alert"` `notification-banner` inside it. The list behind it refreshes first, so a shift that was already cancelled elsewhere shows as open.
- Cancellation history is stored but not shown in the UI yet; the audit log plan displays it.

**Implemented (2026-10-18): admin shift overview.** `src/app/(workspace)/admin/` reuses the sidebar shell: workspace "Administration", one nav item "Shift overview" (grid icon, `aria-current="page"`), account "Alex Kim / Administrator". The header reads "Every shift, in view." with "Track coverage and assignments across both agencies." and a secondary "Refresh" button with a refresh icon. Four summary cards (Open, Filled, Coverage with a meter or "—", Hours scheduled), then a "Shift overview" panel ("All agencies, one clear view.") with an "All agencies" select whose options come from the `Agency` table, tabs "All shifts (n)", "Open (n)" and "Filled (n)", and one table: Shift (role over the wrapping shift ID), Agency, Date & time ("(+1 day)" when overnight), Assigned nurse, Status. The footer reads "Showing N shifts" and "Facility-local time". A sage banner closes the page: "Clear status. Accurate coverage." The cards, tab counts and footer all come from the same agency-filtered list, and the tab filters only the rows. There is deliberately no "All statuses" dropdown, because status is only open or filled and the tabs already cover it. The table is one `<table data-testid="admin-dashboard-shift-table">` that stacks into cards below `md`; each row has one `admin-shift-status-badge`. Refresh disables itself and reads "Refreshing…" while pending, then a visually hidden polite status says "Shift overview refreshed."; the page also refreshes silently when the tab becomes visible. Empty states: "No shifts posted yet." (Coverage "—"), and "No shifts match these filters." with "Clear filters". A failed load shows `error.tsx`: "We couldn't load the shift overview." with "Try again". Omitted: cancel or no-show actions, cancellation history, date-range filters, search, pagination, and Rate and Details columns.

**Implemented (2026-10-18): nurse credentials UI.** `src/app/(workspace)/nurse/credentials/` follows the approved credentials mockup. The nurse sidebar gains "Credentials" (document icon), and `SidebarNav` (`src/shared/ui/sidebar-nav.tsx`) sets `aria-current="page"` from the pathname, so the active item follows the route. The page reads "Workspace / Credentials", "Keep your credentials current." and "Upload your document and expiry date to keep picking up shifts.", then reuses the credential status banner, then two cards, which stack below `lg`:

- **Upload a credential** ("Add a new document or replace your current one."). A dashed drop zone takes a dragged file or "Choose file". The real `<input type="file" data-testid="credential-upload-input">` is visually hidden but focusable and labelled "Credential document", and the "Choose file" label shows its focus ring. Once a file is chosen, the zone shows its name and size, and the button reads "Choose a different file". "Expiry date" is a native date input with `credential-expiry-date-input`, `min` set to today and the hint "Use the expiry date printed on your document." A lock note says "Your document is stored privately." and that expiry checks use the nurse's date without verifying the document. "Save credential" is full width.
- **Current credential.** A status pill ("Valid", "Expired" or "Not on file"), the expiry date, "Document", which shows "No document uploaded", or the file name, its size, "Uploaded <date>" and a "View document" link that downloads the nurse's own file; a line that depends on the state (with a document: "Uploading a new document replaces this one."), and the sage "Before you claim a shift" panel.

States: a file is checked as soon as it is chosen ("Choose a PDF, JPG or PNG file.", "Choose a file of 4 MB or less.", or "This file is empty."). Saving with a field missing shows each field's message, focuses the first invalid field, and sends nothing. While a save is pending, every control is disabled and the button reads "Saving…". A failure shows the server's message in a `role="alert"` `notification-banner` above the button and keeps the file and date. A success refreshes the page, clears the form, and reads "Credential saved. Your expiry date is now <date>." in a `role="status"` banner. A date before today is rejected before sending with "Expiry date must be today or later."; "today" comes from the server, not the device clock. Leaving the page clears the success banner, so a returning nurse never sees an old "Credential saved" (Activity keeps the page mounted; the form resets its notice in a `useLayoutEffect` cleanup).

Deviations from the mockup: the size limit reads 4 MB, not 5 MB (ARCHITECTURE §9). The banner has no right-hand "Valid" pill, because the shared banner's title already names the state and the card repeats it. The footer "Only you and authorized users can access your document." is omitted, because nothing defines who besides the nurse may read the document. After a client navigation, Next.js keeps the previous page mounted but hidden (`<Activity>`), so the marketplace's `credential-status` banner is still in the DOM on this page. Scope e2e locators to visible elements.

**Implemented (2026-10-18): admin audit log UI, on sample events.** `src/app/(workspace)/admin/audit/` follows the approved audit log mockup. The admin sidebar now uses `SidebarNav` with "Shift overview" and "Audit log" (document icon), so `aria-current` follows the route. The page reads "Workspace / Audit log", "A clear record of every change." and "Review actions across both agencies and nurse accounts.", with the overview's secondary Refresh ("Audit log refreshed." in a polite status) and the same silent refresh when the tab becomes visible. An "Audit log" panel ("Successful actions, recorded as they happen." and an event count) holds one `<table data-testid="audit-log-table">`: When (UTC date over 24-hour time), Actor (initials avatar, name and role label; nurses use the `info` avatar, agencies sage, the admin neutral), Action (icon and label), Record (the resource ID in a code pill that wraps) and Details. The footer reads "Showing N events" and "Times in UTC": event times are real instants, unlike facility-local shift times. A sage "Read-only history" banner closes the page. The five columns need about 900px, so below `xl` each row stacks into a card: action and record, then details, then actor and time. Labels and details come from `describeAuditEvent` (`src/features/audit/describe-event.ts`):

| Event | Label | Details |
| --- | --- | --- |
| `shift_posted` | Shift posted | Role · date · Open |
| `shift_claimed` | Shift claimed | Open → Filled |
| `shift_cancelled`, in advance | Assignment cancelled | In advance · {nurse} unassigned · Filled → Open |
| `shift_cancelled`, no-show | No-show reported | {nurse} unassigned · Filled → Open |
| `credential_updated` | Credential replaced, or Credential added when there was no previous expiry | Expiry: {previous} → {new} |

"{nurse} unassigned" is left out when nurses cancel their own claim. Empty state: "No events recorded yet." A failed load shows `admin/audit/error.tsx`: "We couldn't load the audit log." with "Try again".

The page renders the mockup's five events from `src/features/audit/sample-events.ts`, not `AuditEvent` rows (TD-17). There is no `shift_posted` action yet (TD-15), and a credential event's `resourceId` is the `Credential` UUID while the Record column shows the nurse ID, as the mockup does; the audit plan settles that mapping. Deviation from the mockup: the footer reads "Times in UTC" rather than "UTC".

## 8. Shared component behavior

| Component | Treatment and interaction |
| --- | --- |
| Primary button | Forest fill, ivory text, darker forest hover, visible focus ring |
| Secondary button | White or transparent fill, forest text, forest border |
| Text link | Forest text; underline on hover and focus; recognizable in body copy |
| Destructive action | Clearly named, danger styling, confirmation when consequences warrant it |
| Filter control | Outline button opening a labeled popover or dialog; show applied filter count |
| Tabs | Text labels and counts; forest underline or border for selected state |
| Status badge | Compact colored surface and explicit readable status label |
| Avatar | Sage circle with dark initials; photo optional |
| Card | White surface, fine neutral border, 12px radius |
| Dialog | White panel, clear heading, readable body, explicit primary and secondary actions |
| Toast | Short confirmation or recovery message; never the only location for a blocking error |

Prefer one primary action per screen region. Keep disabled controls readable and explain eligibility restrictions in nearby text. Do not rely on a tooltip attached to an unfocusable disabled control.

Use actual model status values through a display mapping; visual labels do not redefine API enums. “All shifts” counts every status included in that view, including cancelled shifts when present.

## 9. Role-aware presentation

The approved dashboard is the agency view. Reuse the visual system for other roles while adapting content to their authorized tasks.

| Role | Main focus | Primary action |
| --- | --- | --- |
| Agency | Own shifts and assigned nurses | Post a shift |
| Nurse | Available shifts, own claimed shifts, credential readiness | View available shifts; Claim shift on eligible shift details |
| Admin | Authorized operational oversight and reporting | View shifts or the relevant permitted management action |

Navigation and actions must reflect actual permissions. Hiding a control is a presentation decision; backend authorization remains required. Avoid showing credential documents, medical details, or unrelated agency data merely to fill space.

## 10. Responsive behavior

| Width | Authentication | Dashboard |
| --- | --- | --- |
| 1280px and above | Full split layout | Full sidebar, four KPI columns, full table |
| 1024–1279px | Split layout with smaller brand heading and padding | Full sidebar, two KPI columns, table with local horizontal scrolling if needed |
| 768–1023px | Single form column with compact brand header | Top bar and navigation drawer, two KPI columns |
| Below 768px | Single column, 16–24px padding, no decorative shift illustration | Navigation drawer, two KPI columns when readable, one column on narrow screens; shifts as stacked cards |

On small screens, reduce page titles to 30–36px and section titles to 22–24px. Move secondary actions below the heading when needed. Keep the primary action easy to reach without covering content.

Mobile shift cards retain department, facility, date, time, rate, nurse, status, and a details action. Render only the appropriate table or card presentation for the viewport so assistive technology does not encounter duplicate content. Prevent page-wide horizontal scrolling.

## 11. Loading, empty, and error states

- Initial loading: skeletons matching the final KPI and table geometry; do not briefly display zero counts.
- Refreshing: preserve existing content, show a subtle loading indication, and mark stale data if the refresh fails.
- No shifts: “No shifts in this period.” Show “Post a shift” for authorized agency users.
- Filtered empty state: “No shifts match these filters.” Provide “Clear filters”.
- Data fetch failure: clear inline error with Retry; do not render failed data as an empty successful result.
- Claim conflict: explain that the shift is no longer available and refresh its status.
- Credential restriction: explain the required credential issue and provide the permitted next step.
- Cancellation: clearly identify the shift, show any applicable consequence, confirm success, and refresh affected counts.

Do not add empty charts or placeholder side panels to occupy unused space.

## 12. Accessibility and motion

- Target WCAG 2.2 AA in implementation; the generated images do not establish conformance.
- Verify at least 4.5:1 contrast for normal text, 3:1 for large text, and applicable non-text contrast for interactive boundaries and indicators.
- Use visible focus styles on both forest and light backgrounds; use an ivory focus ring on forest surfaces when appropriate.
- Provide a skip link, semantic landmarks, logical headings, labeled form controls, and semantic table headers.
- Support keyboard access to menus, tabs, filters, dialogs, and row actions.
- Trap focus inside modal dialogs and return focus to the trigger on close.
- Announce submission and result updates appropriately without repeated noisy announcements.
- Keep essential touch targets at least 44px high where practical.
- Support zoom, text resizing, and reflow without clipped actions.
- Use 120–180ms transitions for color and subtle surface changes. Respect reduced-motion preferences.

## 13. Implementation guidance

- Define tokens centrally and consume them through shared component styles or the project’s existing styling system.
- Reuse components such as AppShell, Sidebar, PageHeader, StatCard, ShiftTable, ShiftCard, StatusBadge, FormField, EmptyState, and ConfirmDialog.
- Keep feature-specific content within its feature; keep visual primitives reusable.
- The sign-in screen is self-built and follows §6; there is no third-party authentication UI to restyle.
- Preserve every required UI test ID exactly as specified by the challenge. This document introduces no replacement test IDs.
- Preserve core workflows and role permissions even where the mockup contains purely illustrative controls.
- Keep this document and the final implementation synchronized when a design decision changes.

## 14. Visual acceptance checklist

- [ ] Forest green, warm ivory, sage, and restrained gold match the approved direction.
- [ ] Serif display headings and clear sans-serif operational text form a consistent hierarchy.
- [ ] Authentication retains the branded split layout on desktop and a usable single-column form on mobile.
- [ ] The dashboard has four data-backed summary cards.
- [ ] Upcoming shifts occupies the full content width below the cards.
- [ ] “Needs attention” and “Recent activity” cards are absent.
- [ ] Navigation, actions, status labels, and account context match the signed-in role.
- [ ] Counts, coverage, hours, dates, and timezone labels reflect real state.
- [ ] Inputs, menus, dialogs, focus states, and errors are usable with a keyboard.
- [ ] Loading, empty, error, and narrow-screen layouts are intentionally designed.
- [ ] Decorative controls and unsupported authentication options are omitted.
- [ ] Required challenge test IDs and functional behavior are preserved.
