# AIChef

Vanilla JS SPA + Express backend that uses OpenAI models via OpenRouter to detect ingredients from photos and generate recipes.

## Commands

- `npm run dev` — start dev server with nodemon (auto-restart on changes)
- `npm start` — production start (`node server.js`)
- Requires `Node.js >= 18`

## Setup

1. Create `.env` with `OPENROUTER_API_KEY=your_key` (get one at https://openrouter.ai/keys)
2. `npm install`
3. `npm run dev`

## Architecture

- **`server.js`** — Express entry point; serves `public/` statically; three POST endpoints (`/api/detect`, `/api/recipe`, `/api/image`)
- **`public/`** — vanilla JS SPA, ES modules, no build step
- **`public/app.js`** — SPA shell with state object, `navigate()`, `detectIngredients()`, `getRecipe()`
- **`public/screens/`** — 6 screen modules (upload, detecting, confirm, generating, recipe, error) each exporting `render()` and `mount()`
- **`public/utils.js`** — `readFileAsDataURL`, `resizeImage(maxSize=1024)` (canvas → JPEG 0.8 quality)
- **`public/styles.css`** — dark theme, mobile-first, max-width 480px
- Uses **`openai`** v4.x SDK with OpenRouter base URL; API shape: `openai.chat.completions.create()`, `response.choices[0].message.content`
- AI model: `openai/gpt-4o-mini` (overridable via `MODEL_NAME` env var)
- No tests, no linter, no typechecker, no CI, no pre-commit hooks

## Gotchas

- `detectIngredients(base64)` sends raw base64; server re-adds `data:image/jpeg;base64,` prefix for OpenAI `image_url` format
- `extractJSON(text)` tries three fallback regexes (markdown code block → `{...}` → `[...]`)
- `/api/image` searches Pexels for a dish photo using `searchQuery` from the recipe response; requires `PEXELS_API_KEY` in `.env`
- Max 10 recipe regenerations (`recipeCount`); `lastConfirmed`/`lastPantry` snapshot state for retries
- Image resize uses `FileReader` + `<canvas>` on the client; max dimension 1024px
