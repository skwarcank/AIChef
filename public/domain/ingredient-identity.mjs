const VALUE_KEYS = ['name', 'display', 'item', 'ingredient', 'text'];

const PREPARATION_WORDS = new Set([
  'chopped', 'diced', 'sliced', 'minced', 'crushed', 'grated', 'shredded',
  'peeled', 'fresh', 'cooked', 'raw', 'ripe', 'large', 'small', 'medium',
  'finely', 'roughly', 'thinly', 'ground', 'optional', 'about', 'packed',
]);

const AMOUNT_WORDS = new Set([
  'cup', 'cups', 'tbsp', 'tablespoon', 'tablespoons', 'tsp', 'teaspoon',
  'teaspoons', 'g', 'gram', 'grams', 'kg', 'ml', 'l', 'lb', 'lbs', 'oz',
  'ounce', 'ounces', 'pinch', 'pinches', 'handful', 'handfuls', 'clove',
  'cloves', 'can', 'cans', 'piece', 'pieces', 'slice', 'slices', 'bunch',
  'bunches', 'sprig', 'sprigs', 'dash', 'dashes',
]);

export function toIngredientIdentity(value) {
  const display = getPreferredIngredientDisplay(value).trim();
  const nameSource = getPreferredIngredientName(value) || display;
  const name = canonicalIngredientName(nameSource || display);

  return name ? { name, display: display || name } : null;
}

export function splitIngredientInput(value) {
  return String(value || '')
    .split(/\s*(?:,|;|\/|\+|\band\b|\n)\s*/i)
    .map(toIngredientIdentity)
    .filter(Boolean);
}

export function dedupeIngredients(values) {
  const seen = new Set();
  return (Array.isArray(values) ? values : [])
    .map(toIngredientIdentity)
    .filter(item => {
      if (!item || seen.has(item.name)) return false;
      seen.add(item.name);
      return true;
    });
}

export function displayIngredient(value) {
  return toIngredientIdentity(value)?.display || '';
}

export function ingredientIsAvailable(recipeIngredient, availableIngredients) {
  const recipe = toIngredientIdentity(recipeIngredient);
  if (!recipe) return false;

  return dedupeIngredients(availableIngredients).some(available => available.name === recipe.name);
}

export function stringifyIngredientValue(value) {
  if (!value) return '';
  if (typeof value !== 'object') return String(value);

  const preferredValue = VALUE_KEYS.map(key => value[key]).find(Boolean);
  if (preferredValue && preferredValue !== value) return stringifyIngredientValue(preferredValue);

  return Object.values(value)
    .map(part => stringifyIngredientValue(part))
    .filter(Boolean)
    .join(' ');
}

function getPreferredIngredientName(value) {
  if (!value || typeof value !== 'object') return value;
  return value.name || value.ingredient || value.item || value.text || value.display || '';
}

function getPreferredIngredientDisplay(value) {
  if (!value || typeof value !== 'object') return stringifyIngredientValue(value);
  return stringifyIngredientValue(value.display || value.name || value.ingredient || value.item || value.text || value);
}

function canonicalIngredientName(value) {
  const words = String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[0-9]+(?:[./][0-9]+)?/g, ' ')
    .replace(/[^\p{L}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(word => word && !PREPARATION_WORDS.has(word) && !AMOUNT_WORDS.has(word))
    .map(singularize);

  return words.join(' ').trim();
}

function singularize(word) {
  if (word.endsWith('ies') && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith('oes') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3) return word.slice(0, -1);
  return word;
}
