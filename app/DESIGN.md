# MiniLedger Design System Specification

## 1. Personality & Design Vision
MiniLedger is a personal, calm, and trustworthy financial companion for keeping track of money lent to friends and family. It rejects the cold, sterile look of corporate enterprise tools as well as the loud, neon gimmicks of crypto apps. 

- **Friendly & Personal:** Microcopy speaks like a considerate friend ("Who owes you?", "All settled up").
- **Clarity First:** Money figures are prominent, distinct, and mathematically legible using monospace/tabular numerals.
- **Quiet Restraint:** Rely on white space, clean typography, and 1px hairline borders rather than heavy colored cards or muddy drop shadows.

---

## 2. Color Palette

### Light Mode (Warm Editorial)
- **Background:** `#F8F6F0` (warm off-white/linen)
- **Surface / Card:** `#FFFFFF` (pure white for crisp separation)
- **Surface Muted / Secondary:** `#EFECE4` (warm stone for chips, inputs, skeleton)
- **Text Primary (Ink):** `#161716` (deep near-black, softer than `#000000`)
- **Text Secondary (Slate Ink):** `#636662` (legible mid-tone neutral, WCAG AAA compliant)
- **Text Tertiary:** `#8E918C` (placeholders, timestamps)
- **Border / Hairline:** `#E5E2D9` (1px delicate boundary)
- **Primary Accent (Deep Pine):** `#164E2E` (calm, authoritative green with high contrast)
- **Accent Light / Tint:** `#EAF4EE` (soft pine wash for badges and active states)
- **Overdue Accent:** `#C53B27` (muted terracotta red, never fluorescent)
- **Overdue Tint:** `#FBEAE8` (soft wash for overdue alert strips)
- **Repaid / Settled:** `#4B6354` (subtle botanical neutral)
- **Repaid Tint:** `#EDF3EE` (clean settled badge wash)

### Dark Mode (Deep Charcoal Counterpart)
- **Background:** `#121312` (deep warm carbon, not hollow `#000000`)
- **Surface / Card:** `#1B1D1C` (elevated warm graphite)
- **Surface Muted / Secondary:** `#262927` (subtle container background)
- **Text Primary (Parchment):** `#F3F4F1` (crisp readable off-white)
- **Text Secondary:** `#A3A7A1` (soft muted text)
- **Text Tertiary:** `#6A6E68`
- **Border / Hairline:** `#2E3230` (subtle 1px boundary)
- **Primary Accent (Bright Pine):** `#34D399` (vibrant emerald green)
- **Accent Light / Tint:** `#132E21` (tinted container)
- **Overdue Accent:** `#F87171` (soft crimson)
- **Overdue Tint:** `#361918`
- **Repaid / Settled:** `#9CA3AF`
- **Repaid Tint:** `#1F2421`

---

## 3. Typography & Hierarchy

Powered by **Inter** via `@expo-google-fonts/inter`:

| Token | Size | Weight | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | 36px | Bold (700) | 44px | Large hero numbers (Total Outstanding, Add Amount) |
| **Title 1** | 24px | SemiBold (600) | 32px | Screen headers, Login headline |
| **Title 2** | 18px | SemiBold (600) | 24px | Section headers, card titles |
| **Body** | 15px | Regular (400) | 22px | Standard content, form labels, friend names |
| **Body Medium** | 15px | Medium (500) | 22px | Interactive items, active filter chips |
| **Caption** | 13px | Regular (400) | 18px | Supporting copy, relative due dates, metadata |
| **Label** | 11px | SemiBold (600) | 14px | Micro tags, status badges (uppercase, +0.5 letter-spacing) |

### Tabular Numerals
All amounts and countdown counters specify:
`fontVariant: ['tabular-nums']`
Ensuring digits 0–9 take equal horizontal width so sums align flawlessly across list rows and hero banners.

---

## 4. Spacing, Radius & Elevation

- **4pt Grid:**
  - `xs`: 4px
  - `sm`: 8px
  - `md`: 12px
  - `lg`: 16px
  - `xl`: 24px
  - `xxl`: 32px
- **Radius System (2 Values + Pill):**
  - `sm`: 12px (Cards, input containers, buttons, avatar boxes)
  - `lg`: 20px (Modal sheets, hero banner container)
  - `pill`: 9999px (Filter chips, status badges)
- **Elevation:**
  - 1px hairline borders (`hairlineWidth`) used consistently.
  - Drop shadows are minimal, soft, and warm (no harsh muddy black shadows).

---

## 5. Iconography
- Exclusively **`lucide-react-native`**.
- Stroke width: 2px uniform.
- Sizes: 16px (badges/chips), 20px (inline inputs, list rows), 24px (navigation/header actions).
- No emojis anywhere in the UI.

---

## 6. Motion & Micro-Interactions
- Ease-out timing (150ms–220ms).
- Button press scale effect: 0.97 via `react-native-reanimated`.
- Haptics on significant actions: `Haptics.notificationAsync` on repay and form submit, `Haptics.impactAsync(Light)` on swipe trigger.
- Swipe right on loan card to mark repaid with an undo toast bar.
