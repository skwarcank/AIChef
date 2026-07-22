import test from 'node:test';
import assert from 'node:assert/strict';

import {
  WireAdapterError,
  detectIngredientsFromPhoto,
  fetchRecipeImage,
  generateRecipe,
} from '../public/wire-adapter.mjs';

const originalFetch = globalThis.fetch;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('detectIngredientsFromPhoto sends raw base64 and returns app-shaped ingredients', async () => {
  const calls = mockFetch(async (url, options) => {
    assert.equal(url, '/api/detect');
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), { image: 'abc123' });
    return jsonResponse({ ingredients: ['Tomato', 'Onion'] });
  });

  const ingredients = await detectIngredientsFromPhoto('data:image/jpeg;base64,abc123');

  assert.deepEqual(ingredients, ['Tomato', 'Onion']);
  assert.equal(calls.length, 1);
});

test('detectIngredientsFromPhoto translates endpoint failures to app-level errors', async () => {
  mockFetch(async () => jsonResponse({ error: true, message: 'Failed to analyze image.' }, { ok: false, status: 500 }));

  await assert.rejects(
    () => detectIngredientsFromPhoto('abc123'),
    error => error instanceof WireAdapterError
      && error.operation === 'detect'
      && error.code === 'detect_failed'
  );
});

test('detectIngredientsFromPhoto translates malformed success payloads to app-level errors', async () => {
  mockFetch(async () => jsonResponse({ ingredients: 'tomato' }));

  await assert.rejects(
    () => detectIngredientsFromPhoto('abc123'),
    error => error instanceof WireAdapterError
      && error.operation === 'detect'
      && error.code === 'detect_failed'
  );
});

test('generateRecipe sends app-shaped recipe requests and returns recipe results', async () => {
  mockFetch(async (url, options) => {
    assert.equal(url, '/api/recipe');
    assert.deepEqual(JSON.parse(options.body), {
      ingredients: ['tomato'],
      pantryStaples: ['Salt'],
      preferences: { cuisine: 'Polish' },
      previousTitles: ['Soup'],
      locale: 'pl',
    });

    return jsonResponse({
      title: 'Sałatka',
      ingredients: ['1 tomato'],
      omittedIngredients: [{ name: 'onion', reason: 'too sharp' }],
      shoppingList: ['feta'],
      instructions: ['Slice tomato.'],
      searchQuery: 'tomato salad',
    });
  });

  const recipe = await generateRecipe({
    ingredients: ['tomato'],
    pantryStaples: ['Salt'],
    preferences: { cuisine: 'Polish' },
    previousTitles: ['Soup'],
    locale: 'pl',
  });

  assert.deepEqual(recipe, {
    title: 'Sałatka',
    ingredients: ['1 tomato'],
    omittedIngredients: [{ name: 'onion', reason: 'too sharp' }],
    shoppingList: ['feta'],
    instructions: ['Slice tomato.'],
    searchQuery: 'tomato salad',
  });
});

test('generateRecipe handles legacy Shopping Needs aliases', async () => {
  for (const alias of ['missingIngredients', 'neededIngredients', 'toBuy']) {
    mockFetch(async () => jsonResponse({
      title: 'Soup',
      ingredients: [],
      instructions: [],
      [alias]: ['cream'],
    }));

    const recipe = await generateRecipe({ ingredients: [], pantryStaples: [], preferences: {} });

    assert.deepEqual(recipe.shoppingList, ['cream']);
  }
});

test('generateRecipe defaults missing or malformed optional fields', async () => {
  mockFetch(async () => jsonResponse({
    title: 'Soup',
    ingredients: ['tomato'],
    omittedIngredients: null,
    shoppingList: 'cream',
    instructions: ['Serve warm.'],
    searchQuery: 42,
  }));

  const recipe = await generateRecipe({ ingredients: [], pantryStaples: [], preferences: {} });

  assert.deepEqual(recipe, {
    title: 'Soup',
    ingredients: ['tomato'],
    omittedIngredients: [],
    shoppingList: [],
    instructions: ['Serve warm.'],
    searchQuery: null,
  });
});

test('generateRecipe translates malformed required Recipe Result fields to app-level errors', async () => {
  mockFetch(async () => jsonResponse({
    title: '',
    ingredients: ['tomato'],
    instructions: ['Serve warm.'],
  }));

  await assert.rejects(
    () => generateRecipe({ ingredients: [], pantryStaples: [], preferences: {} }),
    error => error instanceof WireAdapterError
      && error.operation === 'recipe'
      && error.code === 'recipe_failed'
  );
});

test('generateRecipe translates endpoint failures to app-level errors', async () => {
  mockFetch(async () => jsonResponse({ error: true, message: 'Failed to generate recipe.' }, { ok: false, status: 500 }));

  await assert.rejects(
    () => generateRecipe({ ingredients: [], pantryStaples: [], preferences: {} }),
    error => error instanceof WireAdapterError
      && error.operation === 'recipe'
      && error.code === 'recipe_failed'
  );
});

test('fetchRecipeImage returns app-shaped image metadata with defaults', async () => {
  mockFetch(async (url, options) => {
    assert.equal(url, '/api/image');
    assert.deepEqual(JSON.parse(options.body), { query: 'tomato soup' });
    return jsonResponse({ url: 'https://example.com/photo.jpg', photographer: 'Ana' });
  });

  assert.deepEqual(await fetchRecipeImage('tomato soup'), {
    url: 'https://example.com/photo.jpg',
    photographer: 'Ana',
    photographerUrl: null,
  });
});

test('fetchRecipeImage translates endpoint failures to app-level errors', async () => {
  mockFetch(async () => jsonResponse({ error: true }, { ok: false, status: 500 }));

  await assert.rejects(
    () => fetchRecipeImage('tomato soup'),
    error => error instanceof WireAdapterError
      && error.operation === 'image'
      && error.code === 'image_failed'
  );
});

test('fetchRecipeImage treats malformed optional image metadata as empty fields', async () => {
  mockFetch(async () => jsonResponse({ url: 123, photographer: [], photographerUrl: {} }));
  assert.deepEqual(await fetchRecipeImage('tomato soup'), { url: null, photographer: null, photographerUrl: null });
});

function mockFetch(handler) {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    return handler(url, options);
  };
  return calls;
}

function jsonResponse(data, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    async json() {
      return data;
    },
  };
}
