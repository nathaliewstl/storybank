# StoryBank — DESIGN.md

Design specification for the StoryBank landing page (`/`), auth pages (`/signup`, `/login`) and the app (`/app`).
Theme: **Light only** (`color-scheme: light`; dark tokens kept below as "not used") · Interaction level: **L1 (refined static)** · Language: English UI.

> Hard constraint: the **grading contract in `CLAUDE.md` always wins** over anything in this file.
> Never rename or remove `data-testid`s, never hide the saved story text behind a click, never add a second "Sign up" button on `/`.

---

## 1. Visual Theme & Atmosphere

**One line:** A calm, focused notebook for your career stories — bright and clean by default, quiet in the evening, with one clear colour telling you what to do next.

- **Theme:** the app **always uses the light theme** (`:root`, `color-scheme: light`), whatever the operating-system setting. There is no automatic dark mode and no toggle. The dark token set below is **not used** — it is kept for a possible later dark theme and uses the same token names, so it could be re-enabled without component changes.

- **Keywords:** focused, calm, compact, confident, guided.
- **Philosophy:** StoryBank is a tool you open every day for 5 minutes. The interface should feel like a well-organised notebook, not a dashboard. Every screen answers *"what do I do next?"* with exactly one primary action.
- **Density:** compact. Content is collapsed by default and expands on demand (stories, STAR details, CV ideas, tag groups). No large empty areas: columns must never leave a gap next to a long list.
- **Colour logic — colourful but calm, every colour has one job:**
  - **Indigo** (`--primary`) = actions, focus, selection.
  - **Amber** (`--ai`) = **AI only** (AI badge, suggested tags, CV story ideas, Story Sparks questions, "Structuring…").
  - **Green** (`--success`) = Ready / success only. Orange (`--warn`) = a real problem only ("Too short for AI").
  - **Tag colours — two only:** all **standard (predefined) tags are teal**, all **tags the user created are violet** (never amber). Used on chips, group headers, the left border of story rows and the tag panel, so users see at a glance which tags are their own.
  - **Section accents** reuse the palette: Add a story = indigo, Your stories = teal, Practise today = rose, Your tags = violet, Story Sparks / AI = amber.
  - Surfaces, stats and steps stay neutral (no coloured card backgrounds).
- **Atmosphere:** a soft, **static** multi-colour wash (indigo → teal → rose radial gradients at 7–10% opacity in light, 10–16% in dark; token `--wash`) behind the landing hero and the `/app` page title, plus the faint indigo `--glow` on the Add a story card. No animation.

---

## 2. Color Palette & Roles

All colours are CSS variables on `:root` (light theme only). Every colour has an `-rgb` helper for `rgba()`. All text pairs below meet **WCAG 2.1 AA** (4.5:1 body text, 3:1 large text); `--subtle` is for icons and dividers only. Verified automatically on `/`, `/signup`, `/login` and `/app` (incl. the CV tab and the story window) at 375px and 1280px.

**Light (used)**

```css
:root {
  color-scheme: light;

  --bg: #F7F7FA;            --bg-rgb: 247, 247, 250;
  --surface: #FFFFFF;       --surface-rgb: 255, 255, 255;
  --surface-2: #F2F3F7;     --surface-2-rgb: 242, 243, 247;
  --surface-3: #E8EAF0;     --surface-3-rgb: 232, 234, 240;
  --border: #E3E5EC;        --border-rgb: 227, 229, 236;
  --border-strong: #CDD1DB; --border-strong-rgb: 205, 209, 219;

  --text: #1A1D29;          --text-rgb: 26, 29, 41;
  --muted: #5B6275;         --muted-rgb: 91, 98, 117;
  --subtle: #9AA0AE;        --subtle-rgb: 154, 160, 174;   /* icons / dividers only */

  --primary: #4F46E5;       --primary-rgb: 79, 70, 229;
  --primary-hover: #4338CA; --primary-hover-rgb: 67, 56, 202;
  --primary-press: #3730A3;
  --on-primary: #FFFFFF;
  --primary-soft: #EEF0FF;  --primary-soft-rgb: 238, 240, 255;
  --primary-soft-text: #3730A3;

  --ai: #8A5A00;            --ai-rgb: 138, 90, 0;
  --ai-soft: #FFF7E0;       --ai-soft-rgb: 255, 247, 224;
  --ai-border: #F0D58A;

  --success: #15803D;       --success-rgb: 21, 128, 61;
  --success-soft: #E8F7EE;  --success-border: #B7E2C6;
  --danger: #B91C1C;        --danger-rgb: 185, 28, 28;
  --danger-soft: #FDECEC;
  --warn: #9A3412;          --warn-rgb: 154, 52, 18;
  --warn-soft: #FFF1E6;

  --glow: radial-gradient(600px 300px at 50% 0%, rgba(var(--primary-rgb), 0.06), transparent 70%);  /* very soft indigo tint */
  --shadow-card: 0 1px 2px rgba(26, 29, 41, 0.05);
  --shadow-pop: 0 8px 24px rgba(26, 29, 41, 0.12);
  --scrim: rgba(26, 29, 41, 0.45);   /* backdrop behind the story window */

  --radius-sm: 8px; --radius: 12px; --radius-lg: 16px; --radius-pill: 999px;
}
```

**Dark — NOT USED** (kept for later; not in `globals.css`. To re-enable, add this block back and set `color-scheme: light dark`.)

```css
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0B0D12;            --bg-rgb: 11, 13, 18;
    --surface: #141821;       --surface-rgb: 20, 24, 33;
    --surface-2: #1A1F2A;     --surface-2-rgb: 26, 31, 42;
    --surface-3: #222836;     --surface-3-rgb: 34, 40, 54;
    --border: #262C38;        --border-rgb: 38, 44, 56;
    --border-strong: #353C4B; --border-strong-rgb: 53, 60, 75;

    --text: #E8EAF0;          --text-rgb: 232, 234, 240;
    --muted: #9AA3B5;         --muted-rgb: 154, 163, 181;
    --subtle: #6B7385;        --subtle-rgb: 107, 115, 133;

    --primary: #8B90FF;       --primary-rgb: 139, 144, 255;
    --primary-hover: #A5A9FF; --primary-hover-rgb: 165, 169, 255;
    --primary-press: #7479F0;
    --on-primary: #0B0D12;
    --primary-soft: #1E2140;  --primary-soft-rgb: 30, 33, 64;
    --primary-soft-text: #C7CAFF;

    --ai: #F5C451;            --ai-rgb: 245, 196, 81;
    --ai-soft: #2A2414;       --ai-soft-rgb: 42, 36, 20;
    --ai-border: #5C4A1C;

    --success: #3DD68C;       --success-rgb: 61, 214, 140;
    --success-soft: #102A1F;  --success-border: #1D5A3E;
    --danger: #FF7A7A;        --danger-rgb: 255, 122, 122;
    --danger-soft: #2E1517;
    --warn: #F5A35C;          --warn-rgb: 245, 163, 92;
    --warn-soft: #2B1D10;

    --glow: radial-gradient(600px 300px at 50% 0%, rgba(var(--primary-rgb), 0.16), transparent 70%);
    --shadow-card: none;
    --shadow-pop: 0 8px 24px rgba(0, 0, 0, 0.45);
    --scrim: rgba(11, 13, 18, 0.75);
  }
}
```

**Tag palette** (`--tag-<hue>-bg` / `--tag-<hue>-fg`; applied through `.tc-<hue>` classes that set `--tag-bg` / `--tag-fg`). All light pairs ≥ 4.5:1 (verified); the dark values were also checked when they were in use.

| Hue | Light bg / text (used) | Dark bg / text (not used) | Used for |
|---|---|---|---|
| indigo | `#EEF0FF` / `#3730A3` | `rgba(99,102,241,.16)` / `#A5B4FC` | Section accent: Add a story |
| teal | `#E6F6F4` / `#0F766E` | `rgba(20,184,166,.16)` / `#5EEAD4` | **All standard tags** · section accent: Your stories |
| rose | `#FDEBF1` / `#BE123C` | `rgba(244,63,94,.16)` / `#FDA4AF` | Section accent: Practise today · streak pill |
| violet | `#F3ECFF` / `#6D28D9` | `rgba(139,92,246,.16)` / `#C4B5FD` | **All custom tags** · section accent: Your tags |
| sky | `#E8F4FD` / `#0369A1` | `rgba(14,165,233,.16)` / `#7DD3FC` | not used (reserve) |
| emerald | `#E7F7EF` / `#047857` | `rgba(16,185,129,.16)` / `#6EE7B7` | not used (reserve) |
| fuchsia | `#FCEBFA` / `#A21CAF` | `rgba(217,70,239,.16)` / `#F0ABFC` | not used (reserve) |
| cyan | `#E5F7FA` / `#0E7490` | `rgba(6,182,212,.16)` / `#67E8F9` | not used (reserve) |

Tags use exactly two hues: teal for standard tags, violet for custom tags. **Wash:** `--wash` = three radial gradients (indigo 99,102,241 · teal 20,184,166 · rose 244,63,94) at 0.10 / 0.08 / 0.07 (dark values 0.16 / 0.11 / 0.10, not used).

Disabled buttons use `--muted` text (never `--subtle`) so their label stays readable.

**Roles**

| Role | Token |
|---|---|
| Page background | `--bg` |
| Cards, header, sidebar panels | `--surface` + 1px `--border` |
| Inputs, collapsed story rows on hover, nested lists | `--surface-2` |
| Primary button / focus ring / links / active tab | `--primary` |
| Selected option card, selected tag chip, icon tiles, step icons | `--primary` / `--primary-soft` |
| AI badge, suggested tags, CV story ideas, "Structuring…", "Use my CV" icon | `--ai` / `--ai-soft` / `--ai-border` |
| "Ready" pill, "Story saved", "Done for today" | `--success` / `--success-soft` |
| "Too short for AI" | `--warn` on `--warn-soft` |
| Stats, steps, tag chips, tag-coverage counts, practise card | neutral (`--surface`, `--surface-2`, `--border`, `--muted`) |
| Errors, delete | `--danger` |
| "Not structured yet" | `--warn` on `--warn-soft` |

---

## 3. Typography Rules

- **Font:** Inter (UI) via `next/font/google` (no external CSS request), weights 400 / 500 / 600 / 700.
- **Fallback stack:** `var(--font-inter), system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`.
- **Numbers / counts / STAR badge:** `font-variant-numeric: tabular-nums`.
- **Google Fonts URL (only if `next/font` is not used):** `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap`.
- **Forbidden:** serif fonts, script fonts, more than one font family, font sizes below 13px, all-caps body text.

| Token | Size / line-height | Weight | Letter-spacing | Use |
|---|---|---|---|---|
| `--fs-display` | clamp(2.25rem, 5vw, 3.5rem) / 1.08 | 700 | -0.025em | Landing H1 only |
| `--fs-h1` | 1.5rem / 1.25 | 600 | -0.015em | Page title on `/app`, auth titles |
| `--fs-h2` | 1.0625rem / 1.35 | 600 | -0.005em | Card / section titles |
| `--fs-body` | 0.9375rem (15px) / 1.55 | 400 | 0 | Default text |
| `--fs-small` | 0.8125rem (13px) / 1.45 | 500 | 0.005em | Helper text, meta, chips |
| `--fs-label` | 0.75rem (12px) / 1.3 | 600 | 0.06em, uppercase | STAR labels (S/T/A/R), eyebrows — max 3 words |

Text decoration: **no gradient text, no highlight boxes and no text shadows anywhere**; the landing H1 uses plain `--primary` colour for its key words.

Inputs use 16px font size on mobile so iOS does not zoom.

---

## 4. Component Stylings

Every interactive element has **default / hover / active / focus-visible / disabled**. Focus ring everywhere:

```css
:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; border-radius: inherit; }
```

### 4.1 Buttons

```css
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  min-height: 40px; padding: 0 16px; border-radius: var(--radius-sm);
  font: 600 var(--fs-body)/1 inherit; border: 1px solid transparent; cursor: pointer;
  transition: background-color .15s ease, border-color .15s ease, color .15s ease, transform .1s ease;
}
.btn-primary { background: var(--primary); color: var(--on-primary); }
.btn-primary:hover { background: var(--primary-hover); }
.btn-primary:active { background: var(--primary-press); transform: translateY(1px); }
.btn-primary:disabled { background: var(--surface-3); color: var(--subtle); cursor: not-allowed; }

.btn-secondary { background: var(--surface-2); color: var(--text); border-color: var(--border); }
.btn-secondary:hover { background: var(--surface-3); border-color: var(--border-strong); }
.btn-secondary:active { transform: translateY(1px); }
.btn-secondary:disabled { color: var(--subtle); background: var(--surface); cursor: not-allowed; }

.btn-ghost { background: transparent; color: var(--muted); }
.btn-ghost:hover { background: var(--surface-2); color: var(--text); }
.btn-ghost:active { background: var(--surface-3); }
.btn-ghost:disabled { color: var(--subtle); cursor: not-allowed; }

.btn-danger-ghost { background: transparent; color: var(--danger); }
.btn-danger-ghost:hover { background: var(--danger-soft); }

.btn-sm { min-height: 32px; padding: 0 10px; font-size: var(--fs-small); }
.btn-lg { min-height: 48px; padding: 0 22px; font-size: 1rem; }
.btn-icon { width: 36px; min-height: 36px; padding: 0; }   /* always with aria-label */
```

On touch devices (`@media (pointer: coarse)`) every button is at least 44×44px.

### 4.2 Cards & panels

```css
.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 20px; }
.card-compact { padding: 14px 16px; }
.card:has(:focus-visible) { border-color: var(--border-strong); }
```

### 4.3 Collapsible panel (used for every expandable section)

Use native `<details>/<summary>` or a button with `aria-expanded` + `aria-controls`.

```css
.panel-summary {
  display: flex; align-items: center; gap: 10px; min-height: 48px; padding: 0 16px;
  cursor: pointer; list-style: none; border-radius: var(--radius); color: var(--text); font-weight: 600;
}
.panel-summary:hover { background: var(--surface-2); }
.panel-summary:active { background: var(--surface-3); }
.panel-summary .chevron { margin-left: auto; color: var(--subtle); transition: transform .2s ease; }
[open] > .panel-summary .chevron, [aria-expanded="true"] .chevron { transform: rotate(180deg); }
.panel-body { padding: 4px 16px 16px; }
```

The summary row always shows a **count or status** on the right (e.g. "3 stories", "2 ideas", "Done today ✓" as an icon + text).

### 4.4 Story row (collapsed) → story card (expanded)

Collapsed row (default): one line, height ≈ 56px.
`[STAR progress ring 0–4] · story description (1 line, ellipsis on desktop, 2 lines on mobile) · tag chips (max 2 + "+N") · chevron`

- The **story description text is always visible** in the collapsed row (grading bot needs to see it). The element with `data-testid="core-item"` must contain this text.
- Hover: `--surface-2` background. Active: `--surface-3`. Focus-visible: ring.
- Expanded: STAR fields as a 2×2 grid on desktop (1 column on mobile), each with an uppercase S/T/A/R label in `--muted`, empty fields show "Not written yet" in `--muted` italic plus an "Add" text button. Below: suggested tags (amber), then actions row: `Edit` (secondary), `Practice now` (ghost), `Delete` (danger-ghost, right-aligned, asks to confirm).
- AI status inside the row: small amber spinner icon + "Structuring…" (no emoji). "Not structured yet" = `--warn` badge + `Retry` ghost button.

### 4.5 Chips / tags

```css
.chip { display: inline-flex; align-items: center; gap: 6px; min-height: 28px; padding: 0 10px;
  border-radius: var(--radius-pill); font-size: var(--fs-small); font-weight: 500;
  background: var(--surface-2); color: var(--muted); border: 1px solid var(--border);
  transition: background-color .15s ease, color .15s ease, border-color .15s ease; }
.chip:hover { color: var(--text); border-color: var(--border-strong); }
.chip[aria-pressed="true"], .chip.is-selected { background: var(--primary-soft); color: var(--primary-soft-text); border-color: rgba(var(--primary-rgb), .45); }
.chip:disabled { opacity: .5; cursor: not-allowed; }
.chip-ai { background: var(--ai-soft); color: var(--ai); border: 1px dashed var(--ai-border); }
.chip-ai:hover { border-style: solid; }
.chip .count { font-variant-numeric: tabular-nums; color: var(--subtle); }
.chip.is-empty .count { color: var(--warn); }   /* tag without a story */
```

**Tag chips are coloured** — teal for standard tags, violet for custom tags: `--tag-bg` background, `--tag-fg` text (600 weight), no border. In pickers, the selected chip adds a 1px `--tag-fg` border ring plus a Check icon; hover shows the border. Tags without a story (tag panel) are transparent with a dashed `--tag-fg` border. Custom tags are marked **only** by a small delete × button; there is no legend. AI-suggested tags stay amber until accepted. Unknown tags (no longer in the list) fall back to neutral.

No `#` prefix in chips. Tag chips use a small `Tag` icon only in the tag manager, not on every chip.

### 4.5b Option cards (Add a story)

Three option cards side by side (ARIA `tablist`, left/right arrow keys switch): **Type it myself** (default, indigo icon) · **Use my CV** (amber icon) · **Story Sparks** (amber icon). Each = icon tile + title + one-line description + round check badge when selected. Below 720px the cards stack icon above title and hide the description. Unselected: `--surface-2` + `--border`; hover `--surface-3`; focus ring. Selected "Type it myself": `--primary-soft` + `--primary` border. Selected "Use my CV" / "Story Sparks": `--ai-soft` + `--ai` border (AI content).

### 4.5e Story Sparks card

Reflective questions that help the user remember a story. Optional: it lives in the third option card, loads only when opened, and never blocks `core-input`.

- **One question at a time.** Header: one muted intro line + a neutral progress badge "3 of 8".
- **Question box (amber AI style):** `--ai-soft` background, `1px solid var(--ai-border)`, radius `--radius`, 16px padding; kicker with `Sparkles` icon in `--ai` — "AI question" (from the CV) or "Question" (built-in); the question in 18px/600 `--text`; source line in `--muted` small text: "From your CV: Marketing Intern, Acme Retail · Leadership" or "General question · Leadership".
- **Answer:** label "What happened?" + 3-row textarea ("Write 1–2 sentences about that moment."). The question's target tag is shown as a **pre-selected chip** the user can untick.
- **Actions (in this order):** `Save as story` (primary, disabled until text is typed) · `Next question` (secondary) · `Not relevant` (ghost). On phones each button is full width.
- **Save as story** creates a normal story (answer = description, target tag pre-selected), runs the usual STAR structuring with the question as context, marks the question *answered*, and shows green "Saved as a story — AI is structuring it." **Not relevant** marks it *skipped*. Both remove it from the list.
- **New questions** (ghost, `RefreshCw`) regenerates the set — at most once per minute (server-enforced; "You can get new questions once a minute.").
- **Loading:** amber spinner + "Loading questions…" (or, only for "New questions" with a CV, "Finding questions about your experience… usually 15–45 seconds.").
- **One note only** under the card: either the fallback note "Showing general questions — personalised CV questions will be ready later." or the privacy note that matches the question (never both).
- **Never empty:** if the Gemini call fails (429, 503, timeout, invalid answer), the server immediately stores built-in questions for the user's tag gaps instead. The card then shows a small muted note **"Showing general questions — personalised CV questions will be ready later."** and keeps the **New questions** button. No "AI is busy" error is shown in Story Sparks.
- **Empty:** "You have gone through all questions. Get new ones below."
- **Privacy note under the card** (Lock icon, muted) always matches the question on screen: a CV-based question (it has a source experience) → "Questions are generated by Google Gemini from your CV (contact details removed)."; a built-in question → "These are general questions — no AI is used." (without a CV it adds a pointer to "Use my CV"). The kicker likewise reads "AI question" only for CV-based questions.
- **Sources:** with a CV, Gemini writes 6–10 second-person questions (2–3 per experience, about one concrete moment, focused on tags without a story, never inventing facts) from the **redacted** CV text, generated **only on CV upload** (one call, made right after the CV story ideas) **or when the user clicks "New questions"** (max once per minute), and stored in `story_prompts`. **Opening the card or reloading the page never calls the AI** — it shows the stored questions (built-in ones if none exist yet). Without a CV, built-in questions per tag gap (no AI call). Deleting the CV deletes its questions.

### 4.5c Story status pills (plain words)

| Status | When | Style |
|---|---|---|
| **Structuring…** | AI request running. Dialog adds "Usually 15–45 seconds on the free AI plan. You can keep adding stories." (measured: 24–33 s, one attempt hit the 45 s limit) After 45 s the browser stops waiting and shows "This is taking longer than usual. Please try again in a minute." | amber + spinner |
| **Ready** | all 4 STAR parts written | green + check |
| **Too short for AI** | text < 40 characters or < 6 words (same rule as the server) | orange; tooltip + dialog helper "Add 1–2 sentences about what happened" + `Edit` button |
| **Not structured yet** | AI failed or never ran | neutral; dialog offers "Let AI try again" |

### 4.5d Story details window

Native `<dialog>` opened with `showModal()`, `aria-modal="true"`, labelled by the story name. Header = the **name** (title, or the typed text if there is none) and, under it, "What you wrote" + the full original text. Edit mode has an optional **Name** field above "What happened". The rest of the page is inert, so focus stays inside; **Escape**, the × button or a backdrop click closes it; **focus returns to the story row**. Contains: status, the 4 STAR boxes (Situation / Task / Action / Result, 2×2, 1 column < 480px), tags, AI tag suggestions, `Edit` · `Practise this one` · `Delete`.

### 4.6 Inputs

```css
.input, .textarea {
  width: 100%; min-height: 44px; padding: 10px 12px; border-radius: var(--radius-sm);
  background: var(--surface-2); color: var(--text); border: 1px solid var(--border); font: inherit;
  transition: border-color .15s ease, box-shadow .15s ease;
}
.input::placeholder { color: var(--muted); opacity: .8; }
.input:hover { border-color: var(--border-strong); }
.input:focus-visible { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(var(--primary-rgb), .25); }
.input[aria-invalid="true"] { border-color: var(--danger); }
.input:disabled { opacity: .6; cursor: not-allowed; }
.field-hint  { font-size: var(--fs-small); color: var(--muted); }
.field-error { font-size: var(--fs-small); color: var(--danger); }
```

### 4.7 Header

Sticky, 56px, `--bg` at 85% opacity with `backdrop-filter: blur(10px)` and a bottom `--border`. Left: logo mark + "StoryBank". Right (logged in): email (hidden < 600px) + `Log out` (`btn-ghost btn-sm`, `data-testid="logout"`). Logged out on `/`: only a `Log in` ghost link — **no** "Sign up" button in the header.

### 4.8 Links

`color: var(--primary); text-underline-offset: 3px;` hover `--primary-hover` + underline; active `--primary-press`; focus ring.

### 4.9 Badges & notices

- `.badge` 22px pill, `--fs-small`. Variants: success (`--success` on `--success-soft`), warn, ai, neutral.
- `.notice` inline message box (radius `--radius`, 12px padding, left icon). Error notices sit **directly under the control that caused them**.
- Empty states: icon (24px, `--subtle`) + one sentence + one action button. Never a blank card.

### 4.10 Icons

`lucide-react` only, 16px in chips/buttons, 18px in panel headers, `stroke-width: 1.75`. Replace all emoji: ✨ → `Sparkles`, 🔒 → `Lock`, 📄 → `FileText`, ✓ → `Check`, ★ → custom mark or `Star`. Icon-only buttons need `aria-label`.

---

## 5. Layout Principles

**Spacing scale (4px base):** 4 · 8 · 12 · 16 · 20 · 24 · 32 · 48 · 64. Gap between cards: 16px. Section gap: 24px.

**Containers:** landing max-width 1120px; `/app` max-width 1120px; auth card 400px. Side gutter 16px (mobile) / 24px (≥ 900px).

### 5.1 `/app` information architecture (top → bottom, single column)

1. **Page head:** "Your story bank". New users (0 stories) see "Start by adding your first story below." instead of stats.
2. **Stats** — hidden at 0 stories. Phones: **one compact line** ("2 stories · 1/2 ready to use · …"). ≥ 600px: 4 **neutral** tiles. Never shown in warning colour.
3. **One 3-step guide** (neutral strip: 1. Add a story · 2. AI structures it · 3. Practise), **only while the user has fewer than 3 stories**. There are no numbered circles anywhere else.
4. **Section headers** (accent-coloured icon tile + 22px bold title in `--text` + a 32×3px underline in the accent colour + subtitle + top divider): Add a story (indigo) · Your stories (n) (teal) · Practise today (rose) · Your tags (violet). Story Sparks / AI elements use amber.
5. **Add a story** — three option cards (4.5b: Type it myself · Use my CV · Story Sparks 4.5e; default **Type it myself**) and the composer, **always fully visible, no layout jump on focus**, in this order: label "What happened?" → bordered textarea (2 rows min, `core-input`) → helper text → small text link "+ Add a name (optional)" (reveals an optional Name input) → tag chips (optional, "+ New tag") → "Write STAR myself" toggle → **Save story** (`core-submit`, last). After saving: green "Story saved — AI is structuring it." next to the button (if the story is too short for the AI: "Story saved. Add 1–2 sentences so AI can structure it.") (aria-live), the new story is scrolled into view (`block: nearest`) and highlighted, and focus stays in the textarea for the next story.
6. **Your stories** — `By tag | All`. **Story names:** the display rule everywhere (rows, window, Practise today, CV / Sparks confirmations) is *title if it exists, otherwise the typed text* — the same rule for every user. AI adds a 3–6 word title while structuring, only if the user hasn't named the story. Too-short or failed stories keep the typed text. **Row layout:** name in bold (1 line, ellipsis) → if a name exists, the typed text as one muted line (so `core-item` always shows what was typed) → tag chips + status badge; a **3px left border** in the colour of the story's first tag. **Group header:** coloured dot + group name in `--tag-fg` (700) + `--tag-bg` tint; every group (incl. "Untagged") has a chevron, all start open, and a group reopens when a new story is saved into it. **By tag = one full-width column of collapsible groups** ("Untagged" first; no multi-column grid). The full typed text always stays in the DOM inside `core-item`. A story with several tags appears in each group; only its first row carries `data-testid="core-item"`. Clicking a row opens the details window (4.5d).
7. **Bottom row** (2 columns ≥ 900px): **Practise today** — neutral card; picks only **Ready** stories, least practised first; shows the **interview question first** ("Tell me about a time you showed initiative." from the story's first tag, generic "Tell me about a time you…" without a tag), then the story **name**, then `Show my notes` / `I practised it` and "Practised N times". After "I practised it": a green check that pops in (scale 0.4 → 1.15 → 1, 0.5 s; off with reduced motion) + "Practised “…” — well done!", and a rose **streak** pill with the lucide `Flame` icon ("3-day streak"), computed from the `practice_log` table (consecutive local days ending today or yesterday; no browser storage). With no Ready story: "Your first structured story will appear here." — **Your tags** — add field, 3-per-row neutral chip grid with counts, × on custom tags only.
8. **Privacy note** once at the bottom: "Your stories are private. AI features use Google Gemini." (plus the CV note under the CV upload button).

### 5.2 Landing `/` structure

`/` is for visitors who are **not** logged in. A logged-in user who opens `/` (or `/login`, `/signup`) is redirected to `/app` (in `proxy.ts`), so they always land on their stories. The header logo also links to `/app` when logged in.

**Test reader: a 10-year-old.** Simple words, boxes next to each other instead of lists, bold key words, no paragraph longer than one line. **The hero renders instantly — no entrance animation on eyebrow, H1, steps or CTA.**

Header: the "Log in" link is hidden on `/login` itself.

1. **Hero** (on the static `--wash`): eyebrow "For students with a job interview soon"; H1 "Get **ready for job interviews** with your own stories." (the middle words in plain `--primary` colour — no highlight box); **3 plain step blocks** side by side with arrows (below 480px: stacked rows — icon left, title + one line right — so no label wraps) — icon tile + bold title + one line, **no border, no fill, no hover** (clearly not clickable): 1. Write · 2. AI structures it (into a clear STAR answer) · 3. Practise (say it out loud); then **one** `Sign up — it's free` + text link `I already have an account`.
2. **Example:** "You write" box (indigo) → AI arrow (amber) → "You get a clear answer in 4 parts" (neutral) with 4 boxes: **The situation** — Our university had no charity event. · **Your task** — I wanted to start one. · **What you did** — Found 6 helpers and promoted it on Instagram. · **The result** — 200 students ran and we raised €3,000.
3. **Questions you might be asked during the interview:** 4 neutral cards (teal standard-tag chip + plain question), then the amber CV strip.
4. **Footer:** "**Free.** Your stories are private to your account. AI features use Google Gemini." + text link **Back to top** (never a second Sign up button).

### 5.3 Auth pages

Centered card 400px, logo above, title, fields, full-width primary button, switch link below. Errors under the field / above the button.

---

## 6. Depth & Elevation

Depth comes from **surface tone and borders first**; shadows are light and only used where they help in the light theme.

| Level | Use | Style |
|---|---|---|
| 0 | Page | `--bg` |
| 1 | Cards, panels, stat tiles | `--surface` + `1px solid var(--border)` + `--shadow-card` (light: `0 1px 2px rgba(26,29,41,.05)`; dark: none) |
| 2 | Hovered rows, inputs | `--surface-2` |
| 3 | Story window, sticky header | `--surface` + `--border-strong` + `--shadow-pop` (light: `0 8px 24px rgba(26,29,41,.12)`; dark: `0 8px 24px rgba(0,0,0,.45)`); window backdrop `--scrim` |
| Accent | Landing hero, Add a story card | `--glow` (light: 6% indigo tint; dark: 16%), decorative only |

---

## 7. Animation & Interaction (L1)

Dependencies: **none** (CSS only). Durations 150–250ms, easing `cubic-bezier(.2,.8,.2,1)`.

```css
:root { --ease: cubic-bezier(.2,.8,.2,1); }

/* No entrance animations on / or /app: content is fully visible on first paint
   (no opacity 0, so screenshots never capture half-transparent content).
   .enter is only used on the auth card. Motion is limited to hover / press / expand. */
@keyframes fade-up { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.enter { animation: fade-up .3s var(--ease) both; }
.enter-2 { animation-delay: .05s; } .enter-3 { animation-delay: .1s; }

/* Things the user opens (STAR fields, story window) may fade in when clicked */
.star-inputs, .story-dialog[open] { animation: fade-up .2s var(--ease) both; }

/* Newly saved story: brief highlight */
@keyframes saved { from { background: rgba(var(--primary-rgb), .14); } to { background: transparent; } }
.story-row.is-new { animation: saved 1.2s var(--ease); }

/* AI working spinner (lucide Loader2) */
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 1s linear infinite; }

/* Accepting an AI tag: chip morphs from amber to selected */
.chip { transition: background-color .2s var(--ease), color .2s var(--ease), border-color .2s var(--ease); }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
}
```

Interaction rules:
- Hover = colour/background change only (no scaling cards).
- Buttons press down 1px on `:active`.
- After `Save story`: clear the input, prepend the story to the open "Untagged" group (or "All"), highlight it, keep focus in the composer for the next story.
- Expanding a story row moves focus into nothing (keep focus on the row button); `Esc` closes an open edit form.

---

## 8. Do's and Don'ts

**Do**
1. Show exactly **one primary button per area** (Write it yourself: Save story; practice: I practiced it; From your CV: amber Upload).
2. Keep every list **collapsed by default** with a count in the header; expand on click.
3. Give **each colour one job** (indigo = actions/selection, amber = AI/CV only, green = Ready/success only) and keep everything else neutral.
4. Put helper text **under the field it explains**, written as an instruction ("Describe one experience in 1–2 sentences").
5. Show errors next to the control that caused them, in plain language.
6. Always give an empty state an action ("No stories with this tag yet — Add one").
7. Keep the saved story text visible in the collapsed row and inside `data-testid="core-item"`.
8. Use lucide icons consistently at 16/18px.
9. Send logged-in users to `/app`; never show them the sign-up page.
10. Use British spelling everywhere: "practise" (verb), "practice" (noun), "I practised it", "Practised 0 times".

**Don't**
1. Don't leave empty columns or half-empty grid rows next to long lists.
2. Don't use emoji as UI icons, gradient text or glowing text.
3. Don't use pure black `#000` or pure white `#FFF`.
4. Don't use `--subtle` for any text smaller than 18px or for anything the user must read.
5. Don't add a second "Sign up" button on `/`, mandatory onboarding before `/app`, or anything that blocks typing in `core-input`.
6. Don't repeat the privacy note in every card (once at the bottom of the page, plus the CV note under the upload button).
7. Don't store user data or UI state that must persist in `localStorage`.
8. Don't animate layout properties (height/width/top) with JS; use opacity/transform.
9. Don't use more than one font family or more than 4 font weights.
10. Don't use amber for anything that isn't AI, green for anything but Ready/success, tag-palette colours for anything but tags and section accents, or coloured backgrounds on stats, steps or panels.
11. Don't hide `core-input` behind a tab, click or collapsed panel on first load, and don't change the composer's layout on focus.
12. Don't show the same guidance twice (one 3-step guide only) or put story groups in a multi-column grid.

---

## 9. Responsive Behavior

| Breakpoint | Layout |
|---|---|
| ≥ 900px | Container 1120px, gallery 3 per row, bottom row 2 columns |
| 600–899px | Single column: stats → steps → ① Add a story → ② Your stories (gallery 2 per row) → ③ Practise → Your tags |
| < 600px | Single column, gutter 16px, header hides email, story rows show 2 lines of text, tag chips max 1 + "+N", STAR grid 1 column, segmented control full width, option tabs show title only (< 480px) |

- Touch targets ≥ 44×44px (`@media (pointer: coarse)`).
- No horizontal scroll at 320px width; chip rows wrap, long words break (`overflow-wrap: anywhere`).
- Sticky sidebar only ≥ 900px.
- Inputs 16px font on mobile.
- Test widths: 375px, 768px, 1280px.
