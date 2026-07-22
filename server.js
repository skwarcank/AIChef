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
let recipeGeneratorPromise;

async function getRecipeGenerator() {
  if (!recipeGeneratorPromise) {
    recipeGeneratorPromise = import('./public/domain/recipe-generation.mjs')
      .then(({ createRecipeGenerator }) => createRecipeGenerator({
        modelAdapter: modelRequest => openai.chat.completions.create({ ...modelRequest, model: MODEL }),
      }));
  }

  return recipeGeneratorPromise;
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
    const request = parseRecipeRequest(req.body);
    const generateRecipe = await getRecipeGenerator();
    const recipe = await generateRecipe(request);

    res.json(recipe);
  } catch (err) {
    const wantsPolish = req.body?.locale === 'pl';
    const status = err.status || 500;
    if (status >= 500) console.error('Recipe error:', err);
    res.status(status).json({ error: true, message: err.userMessage || recipeErrorMessage(status, wantsPolish) });
  }
});

function parseRecipeRequest(body = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw badRecipeRequest('Recipe request body must be an object.');
  }

  const {
    ingredients,
    pantryStaples = [],
    preferences = {},
    previousTitles = [],
    locale = 'en',
  } = body;

  if (!Array.isArray(ingredients) || !Array.isArray(pantryStaples) || !Array.isArray(previousTitles)) {
    throw badRecipeRequest('Recipe request ingredients, pantryStaples, and previousTitles must be arrays.');
  }

  if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) {
    throw badRecipeRequest('Recipe request preferences must be an object.');
  }

  if (preferences.mustUseIngredients !== undefined && !Array.isArray(preferences.mustUseIngredients)) {
    throw badRecipeRequest('Recipe request preferences.mustUseIngredients must be an array.');
  }

  return {
    confirmedIngredients: ingredients,
    pantryStaples,
    preferences,
    priorRecipeTitles: previousTitles,
    locale,
  };
}

function badRecipeRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function recipeErrorMessage(status, wantsPolish) {
  if (status === 400) {
    return wantsPolish ? 'Nieprawidłowe dane przepisu.' : 'Invalid recipe request.';
  }

  return wantsPolish ? 'Nie udało się wygenerować przepisu.' : 'Failed to generate recipe.';
}

app.use((err, req, res, next) => {
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: true, message: 'Invalid JSON request body.' });
    return;
  }

  next(err);
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => console.log(`AIChef running on http://localhost:${PORT}`));
}

module.exports = app;
