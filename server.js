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

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a creative chef. Create a recipe using ONLY the given main ingredients and pantry staples. Do not use any other ingredients. Return valid JSON: {"title": "Recipe Name", "ingredients": ["qty item", ...], "instructions": ["Step 1", ...], "searchQuery": "short descriptive name of the dish for image search"}. Include a searchQuery field that describes the finished dish in 3-6 words for searching stock photos. If the ingredients are truly insufficient for any recipe, return: {"error": true, "message": "Friendly suggestion of what additional ingredients would help"}'
        },
        {
          role: 'user',
          content: `Main ingredients: ${ingredients.join(', ')}. Pantry staples: ${pantryStaples.join(', ')}.`
        }
      ],
      max_tokens: 1000,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const text = response.choices[0].message.content;
    let recipe;
    try {
      recipe = JSON.parse(extractJSON(text));
    } catch {
      recipe = { error: true, message: 'Could not generate a recipe. Try different ingredients.' };
    }

    res.json(recipe);
  } catch (err) {
    console.error('Recipe error:', err);
    res.status(500).json({ error: true, message: 'Failed to generate recipe.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`AIChef running on http://localhost:${PORT}`));
