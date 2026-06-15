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

function normalizeIngredientName(value) {
  return stringifyIngredientValue(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalIngredientName(value) {
  return normalizeIngredientName(value)
    .replace(/ies$/, 'y')
    .replace(/s$/, '');
}

function stringifyIngredientValue(value) {
  if (!value) return '';
  if (typeof value !== 'object') return String(value);

  const preferredValue = value.name || value.display || value.item || value.ingredient || value.text;
  if (preferredValue && preferredValue !== value) return stringifyIngredientValue(preferredValue);

  return Object.values(value)
    .map(part => stringifyIngredientValue(part))
    .filter(Boolean)
    .join(' ');
}

function ingredientLooksAvailable(recipeIngredient, availableIngredients) {
  const normalized = canonicalIngredientName(getIngredientName(recipeIngredient));
  return availableIngredients.some(item => {
    const available = canonicalIngredientName(getIngredientName(item));
    return available && normalized === available;
  });
}

function getIngredientName(ingredient) {
  if (ingredient && typeof ingredient === 'object') {
    return ingredient.name || ingredient.display || '';
  }
  return ingredient;
}

function getIngredientDisplay(ingredient) {
  if (ingredient && typeof ingredient === 'object') {
    return stringifyIngredientValue(ingredient.display || ingredient.name || ingredient);
  }
  return stringifyIngredientValue(ingredient);
}

function normalizeRecipeIngredient(ingredient) {
  const display = getIngredientDisplay(ingredient).trim();
  const name = normalizeIngredientName(getIngredientName(ingredient) || display);
  const normalizedDisplay = normalizeIngredientName(display);
  const readableDisplay = display && name && !normalizedDisplay.includes(name)
    ? `${display} ${name}`
    : display;
  return { name, display: readableDisplay || name };
}

function mergeUniqueIngredients(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = normalizeIngredientName(getIngredientName(item));
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeAvailableIngredients(items) {
  return (Array.isArray(items) ? items : [])
    .map(item => ({
      name: normalizeIngredientName(getIngredientName(item)),
      display: String(getIngredientDisplay(item) || '').trim(),
    }))
    .filter(item => item.name);
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
    const { ingredients, pantryStaples } = req.body;
    const preferences = req.body.preferences || {};
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
          content: 'You are a practical home-cooking chef, not a novelty/fusion chef. Optimize for a familiar, coherent, good-tasting recipe that an average home cook would recognize. Treat the provided main ingredients and pantry staples as ingredients the user already has, not as a mandatory checklist. First choose a conventional dish idea from the compatible ingredients. Use as many main ingredients as naturally fit that dish. Omit outlier ingredients that would create an unusual, forced, sweet/savory, dessert/savory, or low-quality pairing unless the pairing is common and recognizable. Must-use ingredients from preferences are mandatory; otherwise, ingredient quality is more important than using every item. You may add at most 2 non-pantry supporting ingredients only when important for recipe quality; do not add unavailable proteins, starches, or major components. Never include avoided ingredients. Return valid JSON: {"title": "Recipe Name", "availableIngredients": [{"name": "normalized ingredient", "display": "original/corrected ingredient"}], "ingredients": [{"name": "normalized ingredient", "display": "amount + ingredient name"}], "omittedIngredients": [{"name": "normalized ingredient", "display": "original ingredient", "reason": "brief culinary reason"}], "instructions": ["Step 1", ...], "searchQuery": "short descriptive name of the dish for image search"}. Normalize ingredient names to singular, generic grocery names with no quantities, preparation words, brands, or adjectives unless they identify a different ingredient, for example "2 chopped tomatoes" -> "tomato", "eggs" -> "egg", "tomatto" -> "tomato", but "rice vinegar" stays "rice vinegar". availableIngredients must contain every provided main ingredient and pantry staple, normalized using the same naming convention. ingredients must contain the full recipe ingredient list, including ingredients the user must buy. Every ingredients[].display value must include a practical quantity or amount phrase plus the ingredient name, for example "2 chicken breasts", "1 cup rice", "2 cloves garlic", "salt, to taste", or "1 tablespoon olive oil". omittedIngredients must list every provided main ingredient that is not used, with honest reasons. The title and searchQuery must not mention omitted ingredients. Do not return shoppingList; the app will derive it. Only return an error if no safe food recipe can be made at all.'
        },
        {
          role: 'user',
          content: `Main ingredients: ${ingredients.join(', ')}. Pantry staples: ${pantryStaples.join(', ')}.${preferenceLines ? `\nPreferences:\n${preferenceLines}` : ''}`
        }
      ],
      max_tokens: 1000,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const text = response.choices[0].message.content;
    let recipe;
    try {
      recipe = JSON.parse(extractJSON(text));
    } catch {
      recipe = { error: true, message: 'Could not generate a recipe. Try different ingredients.' };
    }

    if (!recipe.error) {
      recipe.title = stringifyIngredientValue(recipe.title).trim() || 'Generated Recipe';
      recipe.ingredients = Array.isArray(recipe.ingredients)
        ? recipe.ingredients.map(normalizeRecipeIngredient).filter(item => item.name)
        : [];
      const pantryNames = new Set((pantryStaples || []).map(canonicalIngredientName));
      const usedIngredientNames = new Set(recipe.ingredients.map(item => canonicalIngredientName(item.name)));
      const suppliedMainIngredients = normalizeAvailableIngredients(ingredients || []);
      const modelOmissions = Array.isArray(recipe.omittedIngredients)
        ? recipe.omittedIngredients
          .map(item => ({
            ...normalizeRecipeIngredient(item),
            reason: stringifyIngredientValue(item.reason).trim(),
          }))
          .filter(item => item.name && item.name !== 'none' && !pantryNames.has(canonicalIngredientName(item.name)))
        : [];
      const omittedNames = new Set(modelOmissions.map(item => canonicalIngredientName(item.name)));
      const derivedOmissions = suppliedMainIngredients
        .filter(item => {
          const name = canonicalIngredientName(item.name);
          return name && !usedIngredientNames.has(name) && !omittedNames.has(name);
        })
        .map(item => ({
          ...item,
          reason: 'Left out to keep the recipe coherent.',
        }));
      recipe.omittedIngredients = mergeUniqueIngredients([...modelOmissions, ...derivedOmissions]);

      const availableIngredients = mergeUniqueIngredients(normalizeAvailableIngredients([
        ...(recipe.availableIngredients || []),
        ...(ingredients || []),
        ...(pantryStaples || []),
      ]));
      const derivedShoppingList = Array.isArray(recipe.ingredients)
        ? recipe.ingredients.filter(item => !ingredientLooksAvailable(item, availableIngredients))
        : [];
      recipe.shoppingList = mergeUniqueIngredients(derivedShoppingList).map(item => getIngredientDisplay(item));
      recipe.searchQuery = recipe.title;
    }

    res.json(recipe);
  } catch (err) {
    console.error('Recipe error:', err);
    res.status(500).json({ error: true, message: 'Failed to generate recipe.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`AIChef running on http://localhost:${PORT}`));
