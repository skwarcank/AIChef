require('dotenv').config();
const express = require('express');
const OpenAI = require('openai');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
    'X-Title': 'AIChef',
  },
  maxRetries: 2,
});

const MODEL = process.env.MODEL_NAME || 'openai/gpt-4o-mini';
let ingredientIdentityModulePromise;

function getIngredientIdentityModule() {
  ingredientIdentityModulePromise ||= import('./public/domain/ingredient-identity.mjs');
  return ingredientIdentityModulePromise;
}

function extractJSON(text) {
  if (!text) return '';
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) return jsonMatch[1].trim();
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) return braceMatch[0];
  const bracketMatch = text.match(/\[[\s\S]*\]/);
  if (bracketMatch) return bracketMatch[0];
  return text.trim();
}

function normalizeRecipeIngredient(ingredient, identity) {
  const normalized = identity.toIngredientIdentity(ingredient);
  if (!normalized) return null;

  const display = identity.stringifyIngredientValue(
    ingredient && typeof ingredient === 'object' ? ingredient.display || ingredient.name || ingredient : ingredient
  ).trim();
  const displayIdentity = identity.toIngredientIdentity(display);
  const readableDisplay = display && normalized.name && displayIdentity && !displayIdentity.name.includes(normalized.name)
    ? `${display} ${normalized.name}`
    : display;

  return { name: normalized.name, display: readableDisplay || normalized.display };
}

function mergeUniqueIngredients(items, identity) {
  const seen = new Set();
  return items.map(item => {
    const normalized = identity.toIngredientIdentity(item);
    if (!normalized) return null;
    return item && typeof item === 'object'
      ? { ...item, name: normalized.name, display: normalized.display }
      : normalized;
  }).filter(item => {
    if (!item) return false;
    const key = item.name;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function ingredientNameSet(items, identity) {
  return new Set(identity.dedupeIngredients(items).map(item => item.name));
}

app.post('/api/image', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.json({ url: null });

    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query + ' food dish')}&per_page=1`,
      { headers: { Authorization: process.env.PEXELS_API_KEY } }
    );
    const data = await response.json();
    if (data.photos?.length) {
      res.json({
        url: data.photos[0].src.medium,
        photographer: data.photos[0].photographer,
        photographerUrl: data.photos[0].photographer_url,
      });
    } else {
      res.json({ url: null });
    }
  } catch (err) {
    console.error('Image search error:', err);
    res.json({ url: null });
  }
});

app.post('/api/detect', async (req, res) => {
  try {
    const { image } = req.body;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a food ingredient detector. Return ONLY a valid JSON array of strings. Example: ["eggs", "tomato", "onion"]. If nothing identifiable, return []. Do NOT include: salt, pepper, olive oil, water (these are handled separately). Be conservative and only list items you\'re confident about.'
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'List all visible food ingredients in this photo.' },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image}`, detail: 'auto' } }
          ]
        }
      ],
      max_tokens: 300,
      temperature: 0.1,
    });

    const text = response.choices[0].message.content;
    if (!text) {
      console.warn('Detection returned null content — model may not support vision');
      return res.json({ ingredients: [] });
    }
    let ingredients;
    try {
      ingredients = JSON.parse(extractJSON(text));
    } catch (e) {
      console.error('Parse error:', e.message, 'Raw response:', text);
      ingredients = [];
    }

    res.json({ ingredients: Array.isArray(ingredients) ? ingredients : [] });
  } catch (err) {
    console.error('Detection error:', err);
    res.status(500).json({ error: true, message: 'Failed to analyze image.' });
  }
});

app.post('/api/recipe', async (req, res) => {
  try {
    const { ingredients, pantryStaples, previousTitles, locale = 'en' } = req.body;
    const ingredientIdentity = await getIngredientIdentityModule();
    const preferences = req.body.preferences || {};
    const wantsPolish = locale === 'pl';
    const responseLanguageInstruction = wantsPolish
      ? 'Return user-facing recipe content in natural Polish: title, ingredients[].display, omittedIngredients[].display, omittedIngredients[].reason, instructions, and any explanatory text. Keep JSON keys exactly as requested. Keep technical fields ingredients[].name, availableIngredients[].name, omittedIngredients[].name, and searchQuery in concise English for matching and image search quality. You may reason about recipe quality in English internally, but the visible recipe text must read like idiomatic Polish.'
      : null;
    const generatedRecipeTitleFallback = wantsPolish ? 'Wygenerowany przepis' : 'Generated Recipe';
    const derivedOmissionReason = wantsPolish
      ? 'Pominięto, aby przepis był spójny.'
      : 'Left out to keep the recipe coherent.';
    const preferenceLines = [
      preferences.dishType && `Dish type: ${preferences.dishType}`,
      preferences.cuisine && `Cuisine: ${preferences.cuisine}`,
      preferences.dietaryPreference && `Dietary preference: ${preferences.dietaryPreference}`,
      preferences.timeLimit && `Time available: ${preferences.timeLimit}`,
      preferences.servings && `Servings: ${preferences.servings}`,
      preferences.skillLevel && `Skill level: ${preferences.skillLevel}`,
      preferences.mustUseIngredients?.length && `Must-use ingredients: ${preferences.mustUseIngredients.join(', ')}`,
      preferences.avoidIngredients && `Avoid: ${preferences.avoidIngredients}`,
    ].filter(Boolean).join('\n');

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a creative home cook. Given a set of ingredients, create a tasty, coherent recipe. Be creative with cuisines and preparations — don\'t always default to the most obvious dish. Treat the provided main ingredients and pantry staples as ingredients the user already has, not as a mandatory checklist. Use as many main ingredients as naturally fit the dish. Omit outlier ingredients that would create an unusual, forced, sweet/savory, dessert/savory, or low-quality pairing unless the pairing is common and recognizable. Must-use ingredients from preferences are mandatory; otherwise, ingredient quality is more important than using every item. You may add at most 2 non-pantry supporting ingredients only when important for recipe quality; do not add unavailable proteins, starches, or major components. Never include avoided ingredients. Return valid JSON: {"title": "Recipe Name", "availableIngredients": [{"name": "normalized ingredient", "display": "original/corrected ingredient"}], "ingredients": [{"name": "normalized ingredient", "display": "amount + ingredient name"}], "omittedIngredients": [{"name": "normalized ingredient", "display": "original ingredient", "reason": "brief culinary reason"}], "instructions": ["Step 1", ...], "searchQuery": "short descriptive name of the dish for image search"}. Normalize ingredient names to singular, generic grocery names with no quantities, preparation words, brands, or adjectives unless they identify a different ingredient, for example "2 chopped tomatoes" -> "tomato", "eggs" -> "egg", "tomatto" -> "tomato", but "rice vinegar" stays "rice vinegar". availableIngredients must contain every provided main ingredient and pantry staple, normalized using the same naming convention. ingredients must contain the full recipe ingredient list, including ingredients the user must buy. Every ingredients[].display value must include a practical quantity or amount phrase plus the ingredient name, for example "2 chicken breasts", "1 cup rice", "2 cloves garlic", "salt, to taste", or "1 tablespoon olive oil". omittedIngredients must list every provided main ingredient that is not used, with honest reasons. The title and searchQuery must not mention omitted ingredients. Do not return shoppingList; the app will derive it. Only return an error if no safe food recipe can be made at all.'
        },
        responseLanguageInstruction && {
          role: 'system',
          content: responseLanguageInstruction,
        },
        {
          role: 'user',
          content: `Main ingredients: ${ingredients.join(', ')}. Pantry staples: ${pantryStaples.join(', ')}.${preferenceLines ? `\nPreferences:\n${preferenceLines}` : ''}${previousTitles?.length ? `\n\nPreviously suggested recipes: ${previousTitles.join(', ')}. Those are already made. Suggest something completely different — do not repeat or make a variation of those dishes.` : ''}`
        }
      ].filter(Boolean),
      max_tokens: 1000,
      temperature: 0.8,
      response_format: { type: 'json_object' },
    });

    const text = response.choices[0].message.content;
    let recipe;
    try {
      recipe = JSON.parse(extractJSON(text));
    } catch {
      recipe = { error: true, message: wantsPolish ? 'Nie udało się wygenerować przepisu. Spróbuj innych składników.' : 'Could not generate a recipe. Try different ingredients.' };
    }

    if (!recipe.error) {
      recipe.title = ingredientIdentity.stringifyIngredientValue(recipe.title).trim() || generatedRecipeTitleFallback;
      recipe.ingredients = Array.isArray(recipe.ingredients)
        ? recipe.ingredients.map(item => normalizeRecipeIngredient(item, ingredientIdentity)).filter(Boolean)
        : [];
      const pantryNames = ingredientNameSet(pantryStaples || [], ingredientIdentity);
      const usedIngredientNames = ingredientNameSet(recipe.ingredients, ingredientIdentity);
      const suppliedMainIngredients = ingredientIdentity.dedupeIngredients(ingredients || []);
      const modelOmissions = Array.isArray(recipe.omittedIngredients)
        ? recipe.omittedIngredients
          .map(item => ({
            ...normalizeRecipeIngredient(item, ingredientIdentity),
            reason: ingredientIdentity.stringifyIngredientValue(item.reason).trim(),
          }))
          .filter(item => item.name && item.name !== 'none' && !pantryNames.has(item.name))
        : [];
      const omittedNames = ingredientNameSet(modelOmissions, ingredientIdentity);
      const derivedOmissions = suppliedMainIngredients
        .filter(item => {
          const name = item.name;
          return name && !usedIngredientNames.has(name) && !omittedNames.has(name);
        })
        .map(item => ({
          ...item,
          reason: derivedOmissionReason,
        }));
      recipe.omittedIngredients = mergeUniqueIngredients([...modelOmissions, ...derivedOmissions], ingredientIdentity);

      const availableIngredients = mergeUniqueIngredients([
        ...(ingredients || []),
        ...(pantryStaples || []),
      ], ingredientIdentity);
      const derivedShoppingList = Array.isArray(recipe.ingredients)
        ? recipe.ingredients.filter(item => !ingredientIdentity.ingredientIsAvailable(item, availableIngredients))
        : [];
      recipe.shoppingList = mergeUniqueIngredients(derivedShoppingList, ingredientIdentity).map(ingredientIdentity.displayIngredient);
      recipe.searchQuery = ingredientIdentity.stringifyIngredientValue(recipe.searchQuery).trim() || recipe.title;
    }

    res.json(recipe);
  } catch (err) {
    console.error('Recipe error:', err);
    const wantsPolish = req.body?.locale === 'pl';
    res.status(500).json({ error: true, message: wantsPolish ? 'Nie udało się wygenerować przepisu.' : 'Failed to generate recipe.' });
  }
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => console.log(`AIChef running on http://localhost:${PORT}`));
}

module.exports = app;
