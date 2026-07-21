# Reservation System — UI Redesign Spec

A full visual + component redesign of the existing **React + Tailwind CSS** reservation app for Gawargious & Ava Antonious (rooms/halls booking for servants, scoutsmen & guides, with an admin approval flow).

**Scope of this document**
- Redesign of the *entire existing UI* — not a from-scratch rebuild. Routes, data, and logic stay; the visual layer, layout, navigation, and components are replaced.
- Direction: **bright**, airy, light-mode only. Primary identity color is **baby blue**, on **white + soft beige** surfaces.
- Focus is on **UI components and layout**. Final microcopy/text is deferred — labels here are placeholders (`[Label]`) or working defaults, to be finalized later.
- Target stack: React function components + Tailwind. A `tailwind.config` token block is included in §1.

---

## 0. Redesign goals

1. **Make every page reachable.** Introduce a persistent app shell (sidebar on desktop, bottom tab bar on mobile) so no screen is orphaned.
2. **Make the schedule the hero.** A Google-Calendar-style *resource day view*: hours run down the vertical axis, rooms are columns, swipe/scroll between days.
3. **Bright, calm, legible.** White + beige surfaces, baby-blue accent, soft shadows, generous rounding. Nothing heavy or dark.
4. **One consistent component kit** so 16 use cases feel like one product.

---

## 1. Design tokens

### 1.1 Color

Bright and airy. Baby blue is the *identity* color; a deeper "action blue" (derived from it) is used for interactive controls so buttons/text meet WCAG AA contrast. Beige adds warmth so the UI never reads cold or clinical.

**Brand — Sky (primary / identity)**

| Token | Hex | Use |
|---|---|---|
| `sky-50` | `#F0F6FF` | tint backgrounds, hover wash |
| `sky-100` | `#DCEBFF` | baby-blue fills, selected day, chips |
| `sky-200` | `#BAD6FF` | borders on tinted surfaces |
| `sky-300` | `#8FBEFC` | **baby-blue signature** (now-line, active accents) |
| `sky-400` | `#5E9BF7` | secondary interactive |
| `sky-500` | `#3B82F6` | default interactive |
| `sky-600` | `#2465D8` | **primary buttons / links** (AA on white) |
| `sky-700` | `#1B4FB0` | hover / pressed |

**Warm neutral — Sand (beige surfaces)**

| Token | Hex | Use |
|---|---|---|
| `sand-50` | `#FBF8F3` | warm section background |
| `sand-100` | `#F4EEE3` | secondary surface, off-hours band |
| `sand-200` | `#E9DFCE` | warm dividers |

**Ink & structure (neutral)**

| Token | Hex | Use |
|---|---|---|
| `canvas` | `#F6F9FE` | app page background |
| `surface` | `#FFFFFF` | cards, panels, sheets |
| `line` | `#E6EBF1` | borders, dividers, grid lines |
| `ink-900` | `#1B2430` | headings |
| `ink-700` | `#38434F` | body text |
| `ink-500` | `#64707D` | muted / secondary text |
| `ink-300` | `#AEB7C1` | placeholder / disabled |

**Semantic — booking status** (each is `fg` on a soft `bg`)

| Status | fg | bg | Where |
|---|---|---|---|
| Approved | `#0F9D6B` | `#E4F7EF` | confirmed bookings, success toasts |
| Pending | `#C77A06` | `#FBEFD6` | awaiting admin approval |
| Rejected | `#D93A2B` | `#FCE7E4` | rejected requests |
| Cancelled | `#64707D` | `#EEF1F5` | cancelled bookings |
| Info | `#2465D8` | `#DCEBFF` | reminders, neutral notices |

**Calendar category palette** — bright, harmonious hues for coloring events by *service type* (or room type). Each event uses `tint` as its fill and `accent` as a 3px left border, so 50+ overlapping blocks stay readable on white.

| Name | accent | tint |
|---|---|---|
| Coral | `#F4796B` | `#FDEBE8` |
| Amber | `#F2A93B` | `#FDF1DD` |
| Teal | `#23B0A6` | `#DEF5F3` |
| Violet | `#8B7BE8` | `#ECE8FB` |
| Rose | `#E86BA0` | `#FCE6F0` |
| Lime | `#7FBF4D` | `#EDF6E1` |
| Sky | `#4C93F0` | `#E1EDFD` |
| Slate | `#6D7A8C` | `#EDEFF3` |

**`tailwind.config.js` (theme.extend)** — v3 style; for v4 move into an `@theme` block.

```js
theme: {
  extend: {
    colors: {
      canvas: '#F6F9FE',
      surface: '#FFFFFF',
      line: '#E6EBF1',
      ink: { 900:'#1B2430', 700:'#38434F', 500:'#64707D', 300:'#AEB7C1' },
      sky: { 50:'#F0F6FF',100:'#DCEBFF',200:'#BAD6FF',300:'#8FBEFC',
             400:'#5E9BF7',500:'#3B82F6',600:'#2465D8',700:'#1B4FB0' },
      sand: { 50:'#FBF8F3',100:'#F4EEE3',200:'#E9DFCE' },
      status: {
        approvedFg:'#0F9D6B', approvedBg:'#E4F7EF',
        pendingFg:'#C77A06',  pendingBg:'#FBEFD6',
        rejectedFg:'#D93A2B', rejectedBg:'#FCE7E4',
        cancelledFg:'#64707D',cancelledBg:'#EEF1F5',
      },
    },
    fontFamily: {
      display: ['"Bricolage Grotesque"','system-ui','sans-serif'],
      sans: ['Geist','system-ui','sans-serif'],
      mono: ['"Geist Mono"','ui-monospace','monospace'],
    },
    borderRadius: { sm:'8px', md:'12px', lg:'16px', xl:'20px' },
    boxShadow: {
      sm:'0 1px 2px rgba(16,32,64,.06)',
      md:'0 4px 16px rgba(23,54,109,.08)',
      lg:'0 12px 32px rgba(23,54,109,.10)',
    },
  },
}
```

### 1.2 Typography

A deliberate, non-default pairing — warm but modern.

| Role | Family | Weights | Used for |
|---|---|---|---|
| Display | **Bricolage Grotesque** | 600 / 700 | page titles, big date header, empty-state headlines |
| UI / body | **Geist** | 400 / 500 / 600 | all interface text, buttons, labels, inputs |
| Data / mono | **Geist Mono** | 400 / 500 | **time-axis labels**, room codes, report figures — use `tabular-nums` so numbers align |

**Type scale** (rem @ 16px base): display-xl 32 / display 24 / h2 20 / h3 17 / body 15 / small 13 / caption 12. Line-height 1.25 for display, 1.5 for body. Headings tighten tracking `-0.01em`.

### 1.3 Radius, spacing, shadow, motion

- **Radius:** cards/sheets `16px` (`rounded-lg`), buttons/inputs `12px` (`rounded-md`), chips/avatars full. Bright = soft, friendly rounding.
- **Spacing:** 4px base grid. Card padding 20px; page gutters 24px desktop / 16px mobile; section gap 24px.
- **Shadow:** soft and low only (`shadow-sm` default, `shadow-md` for popovers/sheets, `shadow-lg` for modals). No hard/dark shadows — they'd break the bright feel.
- **Borders:** 1px `line` everywhere structural; the design leans on borders + tint over heavy shadow.
- **Motion:** 150ms ease for hover/press, 220ms ease-out for sheets/modals, 300ms for the day transition in the calendar. Respect `prefers-reduced-motion` (disable slide, keep fades).

---

## 2. App shell & navigation

The single biggest fix: a **persistent shell** that wraps every route so nothing is orphaned.

### 2.1 Structure

- **Desktop (≥1024px):** fixed **left sidebar** (collapsible: icon-only ↔ icon+label) + slim **top bar**.
- **Tablet (768–1023px):** sidebar collapses to icons by default; top bar full.
- **Mobile (<768px):** **bottom tab bar** (4 items) + compact top app bar. Secondary destinations live behind a **"More"** sheet.

```
DESKTOP
┌────────────┬─────────────────────────────────────────────┐
│  LOGO      │  [◀ Sep 12, 2026 ▶]  🔎 find a room   🔔  ⬛ │  ← top bar
│            ├─────────────────────────────────────────────┤
│ ▸ Schedule │                                             │
│ ▸ Book     │              PAGE CONTENT                   │
│ ▸ My Books │                                             │
│ ▸ Rooms    │                                             │
│ ───────    │                                             │
│ ADMIN      │                                             │
│ ▸ Dashboard│                                             │
│ ▸ Requests │                                             │
│ ▸ Manage   │                                             │
│ ▸ Reports  │                                             │
│            │                                             │
│ ⬛ Profile  │                                             │
└────────────┴─────────────────────────────────────────────┘

MOBILE
┌─────────────────────────────┐
│ ☰  Schedule           🔔 ⬛  │  ← top app bar
├─────────────────────────────┤
│        PAGE CONTENT         │
├─────────────────────────────┤
│ 📅        ➕        📋      ⋯ │  ← bottom tab bar
│ Schedule  Book   Bookings  More│
└─────────────────────────────┘
```

### 2.2 Navigation map

| Section | Route (existing) | Member | Admin | Nav location |
|---|---|---|---|---|
| Schedule (calendar) | `/schedule` | ✓ | ✓ | primary |
| Book a room | `/book` | ✓ | ✓ | primary (`➕`) |
| My bookings | `/bookings` | ✓ | ✓ | primary |
| Rooms directory | `/rooms` | ✓ | ✓ | primary (mobile: More) |
| Admin dashboard | `/admin` | — | ✓ | admin group |
| Requests / approvals | `/admin/requests` | — | ✓ | admin group |
| Manage rooms | `/admin/rooms` | — | ✓ | admin group |
| Reports | `/admin/reports` | — | ✓ | admin group |

- **Role gating:** the `ADMIN` group renders only when `user.role === 'admin'`. Non-admins never see the divider or the group.
- **Top bar always holds:** date context (calendar pages), a global **room-availability search**, a **notifications bell** with unread dot, and the **profile menu** (avatar + role badge + QR quick-access entry).
- **Active state:** left sidebar item gets `sky-100` fill + `sky-600` text + 3px `sky-600` left indicator. Mobile tab: `sky-600` icon + label, others `ink-500`.

---

## 3. Component library

This is the core of the redesign. Build these as reusable primitives first; every page composes from them.

### 3.1 Inventory

| Component | States to build |
|---|---|
| Button | primary / secondary / ghost / danger · default·hover·pressed·disabled·loading · sm·md·lg |
| Icon button | default·hover·active · with tooltip |
| Status badge (chip) | approved / pending / rejected / cancelled |
| Filter chip | idle / selected / with count · removable |
| Segmented control | 2–4 segments (used for Day/Week toggle, tab groups) |
| Input / Select / Textarea | default·focus·error·disabled · with label + helper + error text |
| Date picker & time-range picker | inline + popover |
| Room card | grid + list density |
| Booking card | upcoming / past / pending variants |
| Event block (calendar) | see §4.3 |
| Avatar + role badge | member / servant / scout / guide / admin |
| Modal (desktop) / Sheet (mobile) | confirm · form · detail |
| Toast | success / info / warning / error |
| Table (admin) | sortable header, row hover, sticky header, pagination |
| Empty / Loading / Error state | per §6 |
| Pagination / Skeleton / Tooltip / Dropdown menu | — |

### 3.2 Key components (anatomy & behavior)

**Button**
- Primary: `bg-sky-600 text-white rounded-md`, hover `sky-700`, pressed scale-[.98], focus ring `ring-2 ring-sky-300`. Loading = spinner replaces label, width locked.
- Secondary: `bg-white border border-line text-ink-700`, hover `bg-sky-50`.
- Ghost: transparent, hover `bg-sky-50`. Danger: `bg-status-rejectedBg text-status-rejectedFg` (soft) or solid red for destructive confirm.
- Heights: sm 32 / md 40 / lg 48. Icon+label gap 8px.

**Status badge** — pill, `rounded-full px-2.5 py-0.5 text-caption font-medium`, `bg`/`fg` from the semantic table, optional 6px leading dot. This is the primary way booking state is communicated everywhere (cards, calendar, tables, notifications).

**Room card** — `surface` card, `rounded-lg shadow-sm border border-line`. Contents: thumbnail/color header, room name + code (`font-mono`), capacity (👥 n), amenity icons (max 4 + "+n"), location line, and a live availability dot (green free / amber busy now). Whole card is the tap target → Room Details.

**Booking card** — left color stripe = status. Shows room, date, time range (`font-mono`), service type chip, and a status badge. Trailing overflow menu: Modify · Cancel (guarded by confirm). Pending variant adds an "Awaiting approval" line.

**Date & time-range picker** — bright calendar popover (selected day `sky-600` circle, today ringed `sky-300`, disabled dates muted). Time range = two `font-mono` steppers snapping to the configured granularity, with an inline "duration: 1h 30m" readout and a soft warning if the range hits an already-booked slot.

**Modal / Sheet** — same content, responsive container: centered modal `shadow-lg rounded-lg max-w-lg` on desktop; bottom sheet with drag handle on mobile. Backdrop `rgba(16,32,64,.32)`. Used for booking form, room detail, and confirm dialogs.

**Toast** — top-right (desktop) / top (mobile), `shadow-md rounded-md`, semantic left accent + icon, auto-dismiss 4s, action link optional ("View booking").

**Table (admin)** — sticky header, zebra off (bright), row hover `bg-sky-50`, sortable columns, status via badge, row actions in trailing kebab. Empty + loading skeleton states required.

---

## 4. The Schedule — resource day calendar (signature)

The one place we spend boldness. A **resource day view**: **hours are the vertical axis**, **rooms are the columns**, and users **move between days** via a scroller. Because there are **50+ rooms**, the column strip scrolls horizontally under a **sticky time gutter** and **sticky room header**.

### 4.1 Anatomy

```
┌──────────────────────────────────────────────────────────────┐
│  ◀   Sat, Sep 12 2026   ▶      [Today]   [Day ▏Week]   filters │  ← header + day nav
├──────────────────────────────────────────────────────────────┤
│ Sun 6 · Mon 7 · Tue 8 · … · Sat 12 · Sun 13 · …               │  ← day strip (scrolls / swipe)
├──────┬───────────┬───────────┬───────────┬───────────┬────────┤
│      │ Room A101 │ Room A102 │ Hall B1   │ Room B203 │  →→→   │  ← sticky room header row
│ TIME ├───────────┼───────────┼───────────┼───────────┼────────┤
│ 08 ──┼───────────┼───────────┼──[event]──┼───────────┼──      │
│ 09 ──┼──[event]──┼───────────┼──[event]──┼───────────┼──      │
│ 10 ──┼──[event]──┼──[event]──┼───────────┼──[event]──┼──      │
│ 11 ──┼───────────┼──[event]──┼───────────┼──[event]──┼──      │
│ ⋮    │           │           │           │           │        │
│ 23 ──┼───────────┼───────────┼───────────┼───────────┼──      │
└──────┴───────────┴───────────┴───────────┴───────────┴────────┘
   ▲ sticky gutter   ▲───────── horizontally scrollable columns ─────────▶
```

- **Time gutter** (left, sticky): `font-mono` hour labels, `ink-500`, hairline `line` rows. Default range **08:00–23:00** *(assumption — see §9)*, hour rows ~56px tall, 30-min minor gridline.
- **Room columns:** min-width ~132px each so name + code stay legible; the header row is sticky on vertical scroll and scrolls in sync horizontally with the body. A subtle scrollbar/edge-fade signals "more rooms →".
- **Off-hours band:** area before opening / after closing gets a `sand-100` wash so the working day stands out.
- **Now-line:** a `sky-300` horizontal line with a small dot at the current time (today only). This is the baby-blue signature accent.

### 4.2 Moving between days

- **Day strip** under the header: horizontally scrollable pills; tap a day to jump. Selected day = `sky-600` fill.
- **Arrows** `◀ ▶` step one day; **swipe** left/right on touch; the whole grid slides 300ms (fade under reduced-motion).
- **Today** button snaps back.
- Optional **Week** segment reuses the same grid with 7 day-columns *per selected room* (see §9 — off by default; day is primary).

### 4.3 Event block

```
┌─────────────────────┐
│▎09:00–10:30         │  ← time range, font-mono
│▎[Service type]      │  ← category color = left accent + tint fill
│▎by [Requester]  ●   │  ← status dot
└─────────────────────┘
```

- **Position:** `top` = start-time offset, `height` = duration; overlapping bookings for the same room split the column width.
- **Color:** category `tint` fill + 3px category `accent` left border. A **status dot** (approved/pending/…) sits top-right so state is never ambiguous.
- **Pending** events render at 70% opacity with a dashed border; **cancelled** are struck/greyed.
- **States:** hover lifts `shadow-sm` + shows a popover (room, time, requester, service, status, quick actions); click opens the detail sheet.
- **Density guard:** blocks under ~40px height collapse to a single line (time only); full detail in popover.

### 4.4 Handling 50+ rooms

Showing 50+ columns at once is only usable with filtering and grouping:

- **Room filter bar** (in header): multi-select chips to narrow by **building / floor / room type / capacity / amenities**. Selection count shown on the chip.
- **Grouping:** optional sticky group headers spanning columns (e.g. "Building A", "Building B") so scrolling stays oriented.
- **Pinned/favorite rooms** float to the left of the strip for quick daily use.
- **"Rooms" quick-jump**: a searchable dropdown scrolls the strip to a specific room.
- **Empty columns** (no bookings that day) can be dimmed or hidden via a "hide free rooms" toggle to shrink the strip.

### 4.5 Create-by-interaction

- **Drag** across empty grid cells (or tap-and-drag on touch) pre-fills room + date + time-range and opens the booking sheet (§5, Booking flow).
- Dropping onto an occupied slot shows a conflict warning instead of allowing overlap.

### 4.6 Mobile adaptation

50 columns can't fit a phone. On mobile the resource view **defaults to one room at a time**: a room selector at top, the hour axis down the side, that room's events as full-width blocks; swipe left/right changes the **day**, a top dropdown changes the **room**. A "compare" mode can show 2–3 pinned rooms side by side.

---

## 5. Page-by-page redesign (mapped to the 16 use cases)

Copy is placeholder; these are layout/component directions.

1. **View Rooms Schedule (UC1)** → the §4 resource calendar. Default landing for members and admins.
2. **View Room Details (UC2)** → detail sheet/page: gallery/color header, capacity, amenity grid (icon + label), location, rules list, and a mini availability strip for the next 7 days. Primary CTA: **Book this room**.
3. **Check Availability (UC3)** → top-bar search opens a filter panel (date + time range + capacity + amenities); results as a **Room card** grid with free/busy badges, each linking into the calendar pre-filtered.
4. **Request Room/Hall (UC4)** → booking **Sheet/Modal**: room (prefilled if entered from calendar), date picker, time-range picker with live conflict check, service-type select, notes. Submit → optimistic "Pending" card + toast.
5. **Request Approval (UC5)** → admin **Requests** page: table/queue of pending items with inline **Approve / Reject** (reject opens a reason field). Bulk actions on selected rows. Each row deep-links to the calendar slot.
6. **Cancel Booking (UC6)** → from a Booking card or detail; confirm dialog; cancelled state greys the event and fires a cancellation notice.
7. **Modify / Reschedule (UC7)** → reuse the booking Sheet pre-populated; if date/time changes, show an "will need re-approval" note and reset status to Pending on save.
8. **View My Bookings (UC8)** → segmented tabs **Upcoming · Pending · Past**; list of Booking cards; empty states per tab. Optional personal week view here.
9. **Booking Confirmation (UC9)** → toast + notification entry + status badge flip (Pending → Approved/Rejected) with color transition.
10. **Reminder (UC10)** → notification item with clock icon; bell shows unread dot; item links to the booking.
11. **Cancellation Notice (UC11)** → warning-styled notification + toast when admin cancels or a room goes unavailable.
12. **Manage Rooms (UC12)** → admin CRUD: room table + add/edit Sheet (name, code, capacity, amenities multi-select, location, rules, category color). Remove = guarded confirm.
13. **Approve / Reject (UC13)** → see UC5; comment/reason optional on approve, required on reject.
14. **Cancel Bookings (admin) (UC14)** → from dashboard/table; confirm + auto-notice to requester.
15. **View All Bookings (UC15)** → admin **Dashboard**: KPI stat row (today's bookings, pending count, utilization %), plus the all-rooms calendar and a recent-activity list.
16. **Usage Reports (UC16)** → **Reports** page: date-range picker + charts (room utilization bar, most-active members, peak hours heatmap) with `font-mono` tabular figures and CSV export button.

---

## 6. States & feedback

Every list/table/calendar must ship three states:
- **Loading:** skeleton rows / shimmer blocks in the real layout (not a spinner-only screen).
- **Empty:** centered illustration slot + display-font headline + one primary action (e.g. "No bookings yet → Book a room"). An empty screen is an invitation to act, never a dead end.
- **Error:** inline card explaining what failed and a **Retry**; never a blank page.

Conflicts (double-booking) always surface *before* submit, inline at the time picker and on drag-create.

---

## 7. Accessibility & responsive floor

- Fully responsive **1440 → 320px**; calendar degrades to single-room mobile view (§4.6).
- Visible keyboard focus (`ring-2 ring-sky-300`) on every interactive element; calendar navigable by arrow keys; event blocks are real buttons with `aria-label` (room, time, status).
- Contrast: body/action colors meet **WCAG AA**; status is never color-only (always dot + label/badge).
- `prefers-reduced-motion` respected (kill slides, keep fades).
- Structure is LTR/English for now but token- and layout-neutral, so an Arabic **RTL** pass can be added later without reworking components.

---

## 8. Suggested component / file structure

```
src/
  components/
    ui/            Button, IconButton, Badge, Chip, Segmented,
                   Input, Select, Textarea, DatePicker, TimeRange,
                   Modal, Sheet, Toast, Table, Skeleton, EmptyState,
                   Avatar, RoleBadge, Tooltip, DropdownMenu
    shell/         AppShell, Sidebar, TopBar, BottomTabBar, MoreSheet
    calendar/      ResourceCalendar, TimeGutter, RoomHeader,
                   RoomColumn, EventBlock, DayStrip, NowLine, RoomFilterBar
    booking/       BookingCard, BookingSheet, ConflictNotice
    rooms/         RoomCard, RoomDetail, AmenityGrid
    admin/         RequestQueue, RoomManager, ReportCharts, StatRow
  pages/           Schedule, Book, MyBookings, Rooms, RoomDetail,
                   AdminDashboard, Requests, ManageRooms, Reports
  theme/           tokens.ts (mirrors tailwind.config), icons
```

Build order: **tokens → ui primitives → app shell → resource calendar → booking flow → admin**.

---

## 9. Assumptions & open questions

Defaults I applied where the brief was silent — flag any to change:

1. **Operating hours:** calendar renders **08:00–23:00**. Real open/close hours?
2. **Time granularity:** **30-minute** snapping (15-min possible). Which?
3. **Views:** **Day** is the primary resource view; a personal **Week** view lives in *My Bookings*; a full-month all-rooms grid is intentionally omitted (unusable at 50+ rooms). OK?
4. **Language:** English **LTR** now, structured to add Arabic **RTL** later. Confirm Arabic isn't needed in v1.
5. **Platform priority:** calendar is **desktop-first** (needs width) with the single-room mobile fallback; everything else is mobile-first. Agree?
6. **Auth/roles:** assumes an existing login and a `role` field driving admin nav visibility. How is a servant/scout/guide vs admin determined?
7. **Fonts:** Bricolage Grotesque + Geist + Geist Mono — swap if you have brand fonts or want system-only for performance.
8. **QR/NFC quick access:** assumed to deep-link into a room's calendar/booking. Confirm the intended target.
