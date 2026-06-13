const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function extractJSON(text) {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) return jsonMatch[1].trim();
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) return braceMatch[0];
  const bracketMatch = text.match(/\[[\s\S]*\]/);
  if (bracketMatch) return bracketMatch[0];
  return text.trim();
}

app.post('/api/detect', async (req, res) => {
  try {
    const { image } = req.body;
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `List all visible food ingredients in this photo. Return ONLY a valid JSON array of strings. Example: ["eggs", "tomato", "onion"]. If nothing identifiable, return []. Do NOT include: salt, pepper, olive oil, water (these are handled separately). Be conservative and only list items you're confident about.`;

    const result = await model.generateContent([
      { text: prompt },
      { inlineData: { mimeType: 'image/jpeg', data: image } }
    ]);

    const text = result.response.text();
    let ingredients;
    try {
      ingredients = JSON.parse(extractJSON(text));
    } catch {
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
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Given these main ingredients: ${ingredients.join(', ')}. Pantry staples always available: ${pantryStaples.join(', ')}. Create a recipe using ONLY the main ingredients and pantry staples. Do not use any other ingredients. Return valid JSON: {"title": "Recipe Name", "ingredients": ["qty item", ...], "instructions": ["Step 1", ...]}. If the ingredients are truly insufficient for any recipe, return: {"error": true, "message": "Friendly suggestion of what additional ingredients would help"}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

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
