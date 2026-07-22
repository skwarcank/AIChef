import {
  dedupeIngredients,
  displayIngredient,
  ingredientIsAvailable,
  stringifyIngredientValue,
  toIngredientIdentity,
} from './ingredient-identity.mjs';

export function normalizeRecipeIngredient(ingredient) {
  const normalized = toIngredientIdentity(ingredient);
  if (!normalized) return null;

  const displaySource = ingredient && typeof ingredient === 'object'
    ? ingredient.display || ingredient.ingredient || ingredient.item || ingredient.text
    : ingredient;
  const display = stringifyIngredientValue(displaySource).trim();

  return { name: normalized.name, display: display || readableFallbackDisplay(normalized.display) };
}

export function mergeUniqueIngredients(items) {
  const seen = new Set();
  return (Array.isArray(items) ? items : [])
    .map(item => {
      const normalized = toIngredientIdentity(item);
      if (!normalized) return null;
      return item && typeof item === 'object'
        ? { ...item, name: normalized.name, display: normalized.display }
        : normalized;
    })
    .filter(item => {
      if (!item || seen.has(item.name)) return false;
      seen.add(item.name);
      return true;
    });
}

export function deriveRecipeAvailability({
  confirmedIngredients = [],
  pantryStaples = [],
  recipeIngredients = [],
  omittedIngredients = [],
  derivedOmissionReason = 'Left out to keep the recipe coherent.',
} = {}) {
  const ingredients = Array.isArray(recipeIngredients)
    ? recipeIngredients.map(normalizeRecipeIngredient).filter(Boolean)
    : [];
  const pantryNames = ingredientNameSet(pantryStaples);
  const usedIngredientNames = ingredientNameSet(ingredients);
  const suppliedMainIngredients = dedupeIngredients(confirmedIngredients);

  const modelOmissions = Array.isArray(omittedIngredients)
    ? omittedIngredients
      .map(item => {
        const normalized = normalizeRecipeIngredient(item);
        if (!normalized) return null;
        return {
          ...normalized,
          reason: stringifyIngredientValue(item?.reason).trim(),
        };
      })
      .filter(item => item.name && item.name !== 'none' && !pantryNames.has(item.name))
    : [];
  const omittedNames = ingredientNameSet(modelOmissions);
  const derivedOmissions = suppliedMainIngredients
    .filter(item => item.name && !usedIngredientNames.has(item.name) && !omittedNames.has(item.name))
    .map(item => ({ ...item, reason: derivedOmissionReason }));
  const availableIngredients = mergeUniqueIngredients([...confirmedIngredients, ...pantryStaples]);
  const shoppingList = mergeUniqueIngredients(
    ingredients.filter(item => !ingredientIsAvailable(item, availableIngredients))
  ).map(displayIngredient);

  return {
    availableIngredients,
    ingredients,
    omittedIngredients: mergeUniqueIngredients([...modelOmissions, ...derivedOmissions]),
    shoppingList,
  };
}

function ingredientNameSet(items) {
  return new Set(dedupeIngredients(items).map(item => item.name));
}

function readableFallbackDisplay(value) {
  const display = stringifyIngredientValue(value).trim();
  return display ? `${display[0].toUpperCase()}${display.slice(1)}` : '';
}
