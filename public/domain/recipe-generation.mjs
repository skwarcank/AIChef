import { stringifyIngredientValue } from './ingredient-identity.mjs';
import { deriveRecipeAvailability } from './recipe-availability.mjs';

const RECIPE_SYSTEM_PROMPT = 'You are a creative home cook. Given a set of ingredients, create a tasty, coherent recipe. Be creative with cuisines and preparations - do not always default to the most obvious dish. Treat the provided main ingredients and pantry staples as ingredients the user already has, not as a mandatory checklist. Use as many main ingredients as naturally fit the dish. Omit outlier ingredients that would create an unusual, forced, sweet/savory, dessert/savory, or low-quality pairing unless the pairing is common and recognizable. Must-use ingredients from preferences are mandatory; otherwise, ingredient quality is more important than using every item. You may add at most 2 non-pantry supporting ingredients only when important for recipe quality; do not add unavailable proteins, starches, or major components. Never include avoided ingredients. Return valid JSON: {"title": "Recipe Name", "availableIngredients": [{"name": "normalized ingredient", "display": "original/corrected ingredient"}], "ingredients": [{"name": "normalized ingredient", "display": "amount + ingredient name"}], "omittedIngredients": [{"name": "normalized ingredient", "display": "original ingredient", "reason": "brief culinary reason"}], "instructions": ["Step 1", ...], "searchQuery": "short descriptive name of the dish for image search"}. Normalize ingredient names to singular, generic grocery names with no quantities, preparation words, brands, or adjectives unless they identify a different ingredient, for example "2 chopped tomatoes" -> "tomato", "eggs" -> "egg", "tomatto" -> "tomato", but "rice vinegar" stays "rice vinegar". availableIngredients must contain every provided main ingredient and pantry staple, normalized using the same naming convention. ingredients must contain the full recipe ingredient list, including ingredients the user must buy. Every ingredients[].display value must include a practical quantity or amount phrase plus the ingredient name, for example "2 chicken breasts", "1 cup rice", "2 cloves garlic", "salt, to taste", or "1 tablespoon olive oil". omittedIngredients must list every provided main ingredient that is not used, with honest reasons. The title and searchQuery must not mention omitted ingredients. Do not return shoppingList; the app will derive it. Only return an error if no safe food recipe can be made at all.';

const POLISH_RESPONSE_POLICY = 'Return user-facing recipe content in natural Polish: title, ingredients[].display, omittedIngredients[].display, omittedIngredients[].reason, instructions, and any explanatory text. Keep JSON keys exactly as requested. Keep technical fields ingredients[].name, availableIngredients[].name, omittedIngredients[].name, and searchQuery in concise English for matching and image search quality. You may reason about recipe quality in English internally, but the visible recipe text must read like idiomatic Polish.';

export class RecipeGenerationError extends Error {
  constructor(message, { status = 500, userMessage } = {}) {
    super(message);
    this.name = 'RecipeGenerationError';
    this.status = status;
    this.userMessage = userMessage;
  }
}

export function createRecipeGenerator({ modelAdapter } = {}) {
  if (typeof modelAdapter !== 'function') {
    throw new RecipeGenerationError('Recipe Generation requires a model adapter.');
  }

  return recipeRequest => generateRecipe(recipeRequest, { modelAdapter });
}

async function generateRecipe({
  confirmedIngredients = [],
  pantryStaples = [],
  preferences = {},
  priorRecipeTitles = [],
  locale = 'en',
} = {}, { modelAdapter }) {
  const wantsPolish = locale === 'pl';
  const response = await modelAdapter({
    messages: buildRecipeMessages({
      confirmedIngredients,
      pantryStaples,
      preferences,
      priorRecipeTitles,
      wantsPolish,
    }),
    max_tokens: 1000,
    temperature: 0.8,
    response_format: { type: 'json_object' },
  });

  const text = response?.choices?.[0]?.message?.content;
  let recipe;
  try {
    recipe = parseModelJSON(text);
  } catch {
    throw new RecipeGenerationError('Could not parse recipe model response.', {
      status: 502,
      userMessage: recipeGenerationFailureMessage(wantsPolish),
    });
  }

  if (recipe.error) {
    throw new RecipeGenerationError('Model reported Recipe Generation failure.', {
      status: 502,
      userMessage: stringifyIngredientValue(recipe.message).trim() || recipeGenerationFailureMessage(wantsPolish),
    });
  }
  assertRecipeResultShape(recipe, wantsPolish);

  return normalizeRecipeResult({
    recipe,
    confirmedIngredients,
    pantryStaples,
    wantsPolish,
  });
}

function buildRecipeMessages({ confirmedIngredients, pantryStaples, preferences, priorRecipeTitles, wantsPolish }) {
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

  return [
    { role: 'system', content: RECIPE_SYSTEM_PROMPT },
    wantsPolish && { role: 'system', content: POLISH_RESPONSE_POLICY },
    {
      role: 'user',
      content: `Main ingredients: ${confirmedIngredients.join(', ')}. Pantry staples: ${pantryStaples.join(', ')}.${preferenceLines ? `\nPreferences:\n${preferenceLines}` : ''}${priorRecipeTitles?.length ? `\n\nPreviously suggested recipes: ${priorRecipeTitles.join(', ')}. Those are already made. Suggest something completely different - do not repeat or make a variation of those dishes.` : ''}`,
    },
  ].filter(Boolean);
}

function assertRecipeResultShape(recipe, wantsPolish) {
  if (!recipe || typeof recipe !== 'object' || Array.isArray(recipe)) {
    throw malformedRecipeResultError(wantsPolish);
  }

  if (!Array.isArray(recipe.ingredients) || !Array.isArray(recipe.instructions)) {
    throw malformedRecipeResultError(wantsPolish);
  }

  if (recipe.omittedIngredients !== undefined && !Array.isArray(recipe.omittedIngredients)) {
    throw malformedRecipeResultError(wantsPolish);
  }
}

function malformedRecipeResultError(wantsPolish) {
  return new RecipeGenerationError('Model response was not a valid Recipe Result.', {
    status: 502,
    userMessage: recipeGenerationFailureMessage(wantsPolish),
  });
}

function recipeGenerationFailureMessage(wantsPolish) {
  return wantsPolish
    ? 'Nie udało się wygenerować przepisu. Spróbuj innych składników.'
    : 'Could not generate a recipe. Try different ingredients.';
}

function normalizeRecipeResult({ recipe, confirmedIngredients, pantryStaples, wantsPolish }) {
  const titleFallback = wantsPolish ? 'Wygenerowany przepis' : 'Generated Recipe';
  const derivedOmissionReason = wantsPolish
    ? 'Pominięto, aby przepis był spójny.'
    : 'Left out to keep the recipe coherent.';
  const title = stringifyIngredientValue(recipe.title).trim() || titleFallback;
  const availability = deriveRecipeAvailability({
    confirmedIngredients,
    pantryStaples,
    recipeIngredients: recipe.ingredients,
    omittedIngredients: recipe.omittedIngredients,
    derivedOmissionReason,
  });

  return {
    ...recipe,
    title,
    availableIngredients: availability.availableIngredients,
    ingredients: availability.ingredients,
    omittedIngredients: availability.omittedIngredients,
    shoppingList: availability.shoppingList,
    searchQuery: stringifyIngredientValue(recipe.searchQuery).trim() || title,
  };
}

function parseModelJSON(text) {
  const extracted = extractJSON(text);

  try {
    return JSON.parse(extracted);
  } catch (firstError) {
    const repaired = removeTrailingJSONCommas(extracted);
    if (repaired === extracted) throw firstError;
    return JSON.parse(repaired);
  }
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

function removeTrailingJSONCommas(text) {
  return String(text || '')
    .replace(/,\s*([}\]])/g, '$1')
    .trim();
}
