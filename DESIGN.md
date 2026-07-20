---
name: AIChef
description: A playful mobile-first cooking tool that turns ingredient photos into usable recipes.
colors:
  night-bg: "#0f0f1a"
  panel: "#1a1a2e"
  panel-raised: "#252540"
  ink: "#ffffff"
  ink-muted: "#a0a0b8"
  spark: "#f59e0b"
  spark-pressed: "#d97706"
  action-ink: "#000000"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.5px"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.3
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 600
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 600
    letterSpacing: "0.5px"
rounded:
  sm: "10px"
  md: "16px"
  pill: "999px"
  circle: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  xxl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.spark}"
    textColor: "{colors.action-ink}"
    rounded: "{rounded.md}"
    padding: "16px"
  button-secondary:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
  input-default:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "13px 16px"
  chip-default:
    backgroundColor: "{colors.panel-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "8px 12px"
---

# Design System: AIChef

## 1. Overview

**Creative North Star: "The Recipe Spark"**

AIChef is a compact, dark, mobile-first cooking workspace where the interface stays out of the way until the user needs a clear next action. The system reads as a practical kitchen companion rather than a generic AI surface: rounded panels, large tap targets, Polish-first copy, and an amber spark color that marks meaningful progress from photo to recipe.

The visual identity should stay playful and inventive without becoming childish. Personality comes from momentum, directness, and food-specific moments, not from decorative AI gloss. The product rejects generic AI SaaS shine, recipe blog clutter, toy-like cooking visuals, and clinical utility patterns.

**Key Characteristics:**
- Mobile-first app shell capped at 480px with one-column task flow.
- Dark tonal foundation with two surface layers and one amber action color.
- System sans typography tuned for clarity, labels, and compact recipe reading.
- Tactile and confident controls: rounded, easy to tap, and visually consistent.
- Motion is short state feedback, not page choreography.

## 2. Colors

The palette is a restrained night-kitchen system: deep violet-black surfaces, cool lavender-muted secondary text, and a single amber spark for primary action and confirmed selection.

### Primary
- **Recipe Spark** (#f59e0b): Primary action color for generating recipes, adding ingredients, selected chips, active borders, section emphasis, and loading indicators. It should be rare enough that it always means "this moves the recipe forward."
- **Pressed Spark** (#d97706): Pressed or dimmed variant of the primary amber when a darker action state is needed.

### Neutral
- **Night Counter** (#0f0f1a): App background and full-screen canvas.
- **Prep Panel** (#1a1a2e): Default containers, buttons, list rows, inputs, image placeholders, and secondary controls.
- **Raised Panel** (#252540): Pressed states, skeletons, chips, option pills, and higher tonal layer.
- **Steam White** (#ffffff): Primary text and icon color on dark surfaces.
- **Lavender Steam** (#a0a0b8): Secondary text, notes, labels, hints, attribution, and recipe body text.
- **Action Ink** (#000000): Text on amber primary buttons.

### Named Rules

**The Spark Means Action Rule.** Amber is for primary actions, current selections, active borders, section cues, and loading state. Do not use it as ambient decoration.

**The Two-Pan Rule.** Most depth should come from #1a1a2e and #252540. Add new neutral layers only when the workflow truly needs another state.

## 3. Typography

**Display Font:** System sans stack: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
**Body Font:** System sans stack: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif

**Character:** The typography is product-native and readable, not editorial. It uses a single familiar sans stack so Polish labels, cooking instructions, and compact controls stay sharp on mobile screens.

### Hierarchy
- **Display** (700, 2rem, 1.2): Logo-level use only; currently `AI<span>Chef</span>` on the upload screen.
- **Headline** (700, 1.5rem, 1.3): Recipe titles and generated dish names.
- **Title** (600, 1.2rem): Screen titles in the compact header row.
- **Body** (400, 0.95rem-1rem, 1.45-1.5): Instructions, descriptions, ingredient rows, and form copy.
- **Label** (600, 0.8rem, 0.5px, uppercase): Form section labels and compact category labels.

### Named Rules

**The Utility Sans Rule.** Do not introduce display fonts into labels, buttons, ingredient rows, or recipe instructions. Personality should come from interaction and copy, not typographic novelty.

## 4. Elevation

AIChef uses tonal layering rather than shadows. Surfaces sit on the Night Counter background by shifting between Prep Panel and Raised Panel, with borders used sparingly on inputs, shopping-list panels, and selected states. This keeps the app readable in a small mobile viewport and avoids glassy AI-tool polish.

### Named Rules

**The No Floating Cards Rule.** Default surfaces are flat at rest. Use tonal contrast, borders, and state changes before adding shadows.

## 5. Components

### Buttons
- **Shape:** Rounded and tactile, using 10px for compact buttons and 16px for full-width primary actions.
- **Primary:** Recipe Spark background with black text, 16px padding, bold 1.1rem label. Used for next-step actions like generating a recipe or trying another recipe.
- **Hover / Focus:** Existing CSS has active and opacity states but needs consistent `:focus-visible` treatment before broader polish.
- **Secondary:** Prep Panel background with Steam White text, 10px-16px padding, compact rounded shape. Used for back, edit, and photo actions.

### Chips
- **Style:** Raised Panel pills with Steam White text, transparent border, 8px 12px padding, and pill radius.
- **State:** Selected chips use amber border and amber text. Pantry chips use Prep Panel backgrounds and a 2px selected border.

### Cards / Containers
- **Corner Style:** 16px for image containers and major action blocks; 10px for list rows and form fields.
- **Background:** Prep Panel by default, Raised Panel for skeletons, pills, and pressed states.
- **Shadow Strategy:** No shadows in the current system; depth is tonal.
- **Border:** Inputs and shopping-list containers use 1px #252540. Selected chips and focused inputs shift border color to Recipe Spark.
- **Internal Padding:** 12px-16px for rows and fields; 14px 16px for inset recipe panels.

### Inputs / Fields
- **Style:** Prep Panel background, Raised Panel 1px border, Steam White text, 10px radius, 12px-16px or 13px-16px padding.
- **Focus:** Border changes to Recipe Spark. Future work should add a visible focus ring that passes WCAG AA without relying only on color.
- **Placeholder:** Lavender Steam is used for placeholder text and should remain high enough contrast on dark fields.

### Navigation
- **Style, typography, default/hover/active states, mobile treatment.** There is no persistent navigation. Each screen uses local top actions: back, edit ingredients, and new photo. Preserve this task-local navigation unless the product grows beyond the current one-flow app.

### Camera Capture

The upload screen centers a 200px circular camera button with a dashed amber border. This is the signature entry affordance: large, obvious, and optimized for mobile use. Keep it visually distinct from normal buttons.

### Loading States

The system uses an amber spinner for detection/generation and skeleton bars for list or image placeholders. These should respect reduced motion in future polish.

## 6. Do's and Don'ts

### Do:
- **Do** keep the app mobile-first with a single-column 480px shell unless a specific larger-screen layout is designed.
- **Do** use #f59e0b for meaningful action, selection, active focus, and progress only.
- **Do** keep controls tactile and confident: large tap targets, rounded corners, and consistent padding.
- **Do** explain AI decisions through product content: detected ingredients, missing shopping items, omitted ingredients, and retry limits.
- **Do** add `:focus-visible` and reduced-motion coverage when polishing the current implementation.

### Don't:
- **Don't** make the product look like generic AI SaaS: no shiny prompt-demo layout, gradient text, decorative glassmorphism, or abstract AI glow as default decoration.
- **Don't** import recipe blog clutter: no long intros, ad-like blocks, buried actions, or content before the user can act.
- **Don't** make the cooking interface childlike with toy colors, oversized novelty icons, or unserious affordances.
- **Don't** turn it into a clinical utility with cold spreadsheet-like density or sterile form-only screens.
- **Don't** add floating card shadows or extra neutral layers when the existing two-panel tonal system is enough.
