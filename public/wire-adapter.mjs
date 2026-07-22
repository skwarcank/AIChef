export class WireAdapterError extends Error {
  constructor(operation, code, message) {
    super(message || code);
    this.name = 'WireAdapterError';
    this.operation = operation;
    this.code = code;
  }
}

export async function detectIngredientsFromPhoto(photo, { signal } = {}) {
  const data = await postJSON('/api/detect', { image: stripDataUrl(photo) }, { signal, operation: 'detect' });

  if (!Array.isArray(data.ingredients)) {
    throw endpointError('detect', 'detect_failed', 'Malformed detection response.');
  }

  return data.ingredients;
}

export async function generateRecipe({
  ingredients,
  pantryStaples,
  preferences,
  previousTitles = [],
  locale = 'en',
  signal,
}) {
  const data = await postJSON('/api/recipe', {
    ingredients,
    pantryStaples,
    preferences,
    previousTitles,
    locale,
  }, { signal, operation: 'recipe' });

  return normalizeRecipe(data);
}

export async function fetchRecipeImage(query) {
  const data = await postJSON('/api/image', { query }, { operation: 'image' });
  return normalizeImage(data);
}

async function postJSON(url, body, { signal, operation }) {
  let response;
  let data;

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw endpointError(operation, 'network', err.message);
  }

  try {
    data = await response.json();
  } catch (err) {
    throw endpointError(operation, defaultErrorCode(operation), err.message);
  }

  if (!response.ok || data?.error) {
    throw endpointError(operation, defaultErrorCode(operation), data?.message);
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw endpointError(operation, defaultErrorCode(operation), 'Malformed response.');
  }

  return data;
}

function normalizeRecipe(data) {
  if (!data.title || typeof data.title !== 'string' || !Array.isArray(data.ingredients) || !Array.isArray(data.instructions)) {
    throw endpointError('recipe', 'recipe_failed', 'Malformed recipe response.');
  }

  return {
    title: data.title,
    ingredients: data.ingredients,
    omittedIngredients: arrayOrEmpty(data.omittedIngredients),
    shoppingList: arrayOrEmpty(
      data.shoppingList
      ?? data.missingIngredients
      ?? data.neededIngredients
      ?? data.toBuy
    ),
    instructions: data.instructions,
    searchQuery: stringOrDefault(data.searchQuery, null),
  };
}

function normalizeImage(data) {
  return {
    url: stringOrDefault(data?.url, null),
    photographer: stringOrDefault(data?.photographer, null),
    photographerUrl: stringOrDefault(data?.photographerUrl, null),
  };
}

function endpointError(operation, code, message) {
  return new WireAdapterError(operation, code, message);
}

function defaultErrorCode(operation) {
  return operation === 'detect' ? 'detect_failed' : `${operation}_failed`;
}

function stripDataUrl(photo) {
  return String(photo || '').split(',')[1] || String(photo || '');
}

function arrayOrEmpty(value) {
  return Array.isArray(value) ? value : [];
}

function stringOrDefault(value, fallback) {
  return typeof value === 'string' ? value : fallback;
}
