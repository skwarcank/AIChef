import test from 'node:test';
import assert from 'node:assert/strict';

import { detectIngredientsFromPhoto, fetchRecipeImage, generateRecipe } from '../public/wire-adapter.mjs';
import { getUI } from '../public/i18n.js';
import { render as renderUpload } from '../public/screens/upload.js';
import { mount as mountDetecting, render as renderDetecting } from '../public/screens/detecting.js';
import { mount as mountConfirm, render as renderConfirm } from '../public/screens/confirm.js';
import { mount as mountCustomize, render as renderCustomize } from '../public/screens/customize.js';
import { mount as mountGenerating, render as renderGenerating } from '../public/screens/generating.js';
import { mount as mountRecipe, render as renderRecipe } from '../public/screens/recipe.js';
import { mount as mountError, render as renderError } from '../public/screens/error.js';

const originalDocument = globalThis.document;
const originalFetch = globalThis.fetch;
const originalConsoleError = console.error;
const pantryNames = ['Salt', 'Pepper', 'Olive Oil', 'Water'];
const preferences = {
  dishType: 'Pasta',
  cuisine: 'Italian',
  dietaryPreference: '',
  timeLimit: '20 minutes',
  servings: '2',
  skillLevel: 'Beginner',
  mustUseIngredients: ['Cukinia'],
  avoidIngredients: 'pieczarki',
};

test.beforeEach(() => {
  globalThis.document = {
    createElement() {
      return createEscapingElement();
    },
  };
});

test.afterEach(() => {
  globalThis.document = originalDocument;
  globalThis.fetch = originalFetch;
  console.error = originalConsoleError;
});

test('Polish cooking flow screens preserve upload, confirmation, customization, recipe, and recovery affordances', () => {
  const ui = getUI('pl');
  const state = {
    locale: 'pl',
    detected: ['Pomidory', 'Cukinia'],
    pantry: pantryNames.map(name => ({ name, checked: true })),
    confirmed: ['Pomidory', 'Cukinia'],
    lastRemovedIngredient: { name: 'Cebula', index: 1 },
    preferences,
    currentRecipe: {
      title: 'Makaron z cukinią',
      ingredients: ['200 g makaronu', { name: 'zucchini', display: '1 cukinia' }],
      shoppingList: ['parmezan'],
      omittedIngredients: [{ name: 'tomato', display: 'Pomidory', reason: 'Lżejszy sos bez pomidorów.' }],
      instructions: ['Ugotuj makaron.', 'Podsmaż cukinię.'],
      searchQuery: 'zucchini pasta',
    },
    imageUrl: 'https://example.com/recipe.jpg',
    imagePhotographer: 'Anna',
    imagePhotographerUrl: 'https://example.com/anna',
    recipeCount: 1,
    errorType: 'recipe',
    photo: 'base64-photo',
    lastConfirmed: ['Pomidory', 'Cukinia'],
    lastPantry: pantryNames,
    lastPreferences: { mustUseIngredients: ['Cukinia'] },
    errorMessage: 'Nie udało się wygenerować przepisu. Spróbuj innych składników.',
  };

  assert.match(renderUpload(state, ui), /Zrób zdjęcie/);
  assert.match(renderUpload(state, ui), /Prześlij zdjęcie/);
  assert.match(renderDetecting(state, ui), /Rozpoznawanie składników/);
  assert.match(renderDetecting(state, ui), /Anuluj i wróć/);

  const confirmHtml = renderConfirm(state, ui);
  assert.match(confirmHtml, /Potwierdź składniki/);
  assert.match(confirmHtml, /Pomidory/);
  assert.match(confirmHtml, /Cofnij/);
  assert.match(confirmHtml, /Dodaj składnik/);
  assert.match(confirmHtml, /✓ Sól/);
  assert.match(confirmHtml, /✓ Pieprz/);
  assert.match(confirmHtml, /✓ Oliwa z oliwek/);
  assert.match(confirmHtml, /✓ Woda/);
  assert.match(confirmHtml, /Dalej: dopasuj przepis/);

  const customizeHtml = renderCustomize(state, ui);
  assert.match(customizeHtml, /Dopasuj przepis/);
  assert.match(customizeHtml, /Makaron/);
  assert.match(customizeHtml, /Włoska/);
  assert.match(customizeHtml, /20 minut/);
  assert.match(customizeHtml, /Początkujący/);
  assert.match(customizeHtml, /data-ingredient="Cukinia"/);
  assert.match(customizeHtml, /pieczarki/);
  assert.match(customizeHtml, /Generuj przepis/);

  assert.match(renderGenerating(state, ui), /Generowanie przepisu/);
  assert.match(renderGenerating(state, ui), /Anuluj i popraw wybór/);

  const recipeHtml = renderRecipe(state, ui);
  assert.match(recipeHtml, /Makaron z cukinią/);
  assert.match(recipeHtml, /Do dokupienia/);
  assert.match(recipeHtml, /parmezan/);
  assert.match(recipeHtml, /Niewykorzystane/);
  assert.match(recipeHtml, /Pomidory/);
  assert.match(recipeHtml, /Spróbuj innego przepisu/);
  assert.match(recipeHtml, /Przepis 1 z 10/);
  assert.match(recipeHtml, /Zdjęcie: /);

  const errorHtml = renderError(state, ui);
  assert.match(errorHtml, /Ponów generowanie przepisu/);
  assert.match(errorHtml, /Popraw wybór przepisu/);
});

test('screen mounts preserve cooking flow actions for ingredient edits, preferences, cancel, retry, and regeneration', () => {
  const calls = [];
  const actions = new Proxy({}, {
    get(target, name) {
      if (!target[name]) {
        target[name] = (...args) => calls.push([name, ...args]);
      }
      return target[name];
    },
  });

  const confirmElements = {
    '#retake-btn': fakeElement(),
    '#undo-remove': fakeElement(),
    '#add-input': fakeElement({ value: 'Marchew, pietruszka' }),
    '#add-btn': fakeElement(),
    '#customize-btn': fakeElement({ disabled: false }),
    '#detected-list .toggle-btn': [fakeElement({ dataset: { index: '1' } })],
    '#pantry-list .pantry-chip': [fakeElement({ dataset: { index: '2' } })],
  };
  mountConfirm(fakeContainer(confirmElements), actions);
  confirmElements['#retake-btn'].click();
  confirmElements['#undo-remove'].click();
  confirmElements['#detected-list .toggle-btn'][0].click();
  confirmElements['#pantry-list .pantry-chip'][0].click();
  confirmElements['#add-btn'].click();
  confirmElements['#customize-btn'].click();

  const mustUseChip = fakeElement({ dataset: { ingredient: 'Cukinia' }, checkedClass: true });
  const customizeElements = {
    '#back-btn': fakeElement(),
    '.preference-input[data-field]': [
      fakeElement({ dataset: { field: 'dishType', value: 'Pasta' }, value: 'Makaron' }),
      fakeElement({ dataset: { field: 'cuisine', value: 'Italian' }, value: 'Włoska' }),
      fakeElement({ dataset: { field: 'dietaryPreference', value: 'Vegetarian' }, value: 'Wegetariańska' }),
      fakeElement({ dataset: { field: 'timeLimit', value: '20 minutes' }, value: '20 minut' }),
      fakeElement({ dataset: { field: 'servings', value: '2' }, value: '2' }),
      fakeElement({ dataset: { field: 'skillLevel', value: 'Beginner' }, value: 'Początkujący' }),
    ],
    '#must-use-list .preference-chip': [mustUseChip],
    '#avoidIngredients': fakeElement({ value: 'pieczarki' }),
    '#generate-btn': fakeElement(),
  };
  mountCustomize(fakeContainer(customizeElements), actions);
  customizeElements['#back-btn'].click();
  customizeElements['#generate-btn'].click();

  const detectingElements = { '#cancel-detect': fakeElement() };
  mountDetecting(fakeContainer(detectingElements), actions);
  detectingElements['#cancel-detect'].click();

  const generatingElements = { '#cancel-generation': fakeElement() };
  mountGenerating(fakeContainer(generatingElements), actions);
  generatingElements['#cancel-generation'].click();

  const recipeElements = {
    '#try-another-photo': fakeElement(),
    '#edit-ingredients': fakeElement(),
    '#try-another-recipe': fakeElement({ disabled: false }),
  };
  mountRecipe(fakeContainer(recipeElements), actions);
  recipeElements['#try-another-photo'].click();
  recipeElements['#edit-ingredients'].click();
  recipeElements['#try-another-recipe'].click();

  const errorElements = {
    '#retry-action': fakeElement(),
    '#secondary-action': fakeElement(),
  };
  mountError(fakeContainer(errorElements), actions);
  errorElements['#retry-action'].click();
  errorElements['#secondary-action'].click();

  assert.deepEqual(calls, [
    ['retakePhoto'],
    ['restoreDetected'],
    ['toggleDetected', 1],
    ['togglePantry', 2],
    ['addCustomIngredient', { name: 'marchew', display: 'Marchew' }],
    ['addCustomIngredient', { name: 'pietruszka', display: 'pietruszka' }],
    ['openCustomize'],
    ['backToConfirm'],
    ['generateRecipe', {
      dishType: 'Pasta',
      cuisine: 'Italian',
      dietaryPreference: 'Vegetarian',
      timeLimit: '20 minutes',
      servings: '2',
      skillLevel: 'Beginner',
      avoidIngredients: 'pieczarki',
      mustUseIngredients: ['Cukinia'],
    }],
    ['cancelDetection'],
    ['cancelGeneration'],
    ['tryAnotherPhoto'],
    ['editIngredients'],
    ['tryAnotherRecipe'],
    ['retryLastAction'],
    ['recoverFromError'],
  ]);
});

test('app actions preserve state through detection, confirmation edits, customization, recipe retry, and image lookup', async () => {
  const appRoot = fakeAppRoot();
  globalThis.document = {
    documentElement: {},
    createElement() {
      return createEscapingElement();
    },
    getElementById(id) {
      assert.equal(id, 'app');
      return appRoot;
    },
  };

  let recipeCalls = 0;
  let failNextRecipe = false;
  const calls = [];
  console.error = () => {};
  globalThis.fetch = async (url, options = {}) => {
    const body = JSON.parse(options.body);
    calls.push({ url, body });

    if (url === '/api/detect') {
      return jsonResponse({ ingredients: ['Pomidory', 'Cukinia'] });
    }

    if (url === '/api/recipe') {
      if (failNextRecipe) {
        failNextRecipe = false;
        return {
          ok: false,
          status: 500,
          async json() {
            return { error: true, message: 'Nie udało się wygenerować przepisu.' };
          },
        };
      }

      recipeCalls += 1;
      return jsonResponse({
        title: `Makaron z cukinią ${recipeCalls}`,
        ingredients: ['200 g makaronu', '1 cukinia'],
        omittedIngredients: [{ name: 'tomato', display: 'Pomidory', reason: 'Lżejszy sos bez pomidorów.' }],
        shoppingList: ['parmezan'],
        instructions: ['Ugotuj makaron.', 'Podsmaż cukinię.'],
        searchQuery: 'zucchini pasta',
      });
    }

    if (url === '/api/image') {
      return jsonResponse({
        url: `https://example.com/recipe-${recipeCalls}.jpg`,
        photographer: 'Anna',
        photographerUrl: 'https://example.com/anna',
      });
    }

    throw new Error(`Unexpected URL: ${url}`);
  };

  const app = await import(`../public/app.js?preserved-flow=${Date.now()}`);
  assert.deepEqual(app.state.pantry, pantryNames.map(name => ({ name, checked: true })));

  app.actions.onPhoto('data:image/jpeg;base64,photo123');
  await waitFor(() => app.state.detected.length === 2);
  assert.deepEqual(app.state.detected, ['Pomidory', 'Cukinia']);

  app.actions.toggleDetected(1);
  assert.deepEqual(app.state.detected, ['Pomidory']);
  assert.deepEqual(app.state.lastRemovedIngredient, { name: 'Cukinia', index: 1 });

  app.actions.restoreDetected();
  assert.deepEqual(app.state.detected, ['Pomidory', 'Cukinia']);

  app.actions.addCustomIngredient('Marchew');
  app.actions.addCustomIngredient('marchew');
  assert.deepEqual(app.state.detected, ['Pomidory', 'Cukinia', 'Marchew']);

  app.actions.togglePantry(2);
  assert.equal(app.state.pantry[2].checked, false);
  app.actions.togglePantry(2);
  assert.equal(app.state.pantry[2].checked, true);

  app.actions.openCustomize();
  assert.deepEqual(app.state.confirmed, ['Pomidory', 'Cukinia', 'Marchew']);
  assert.deepEqual(app.state.lastPantry, pantryNames);

  app.actions.generateRecipe(preferences);
  await waitFor(() => app.state.currentRecipe?.title === 'Makaron z cukinią 1');
  await waitFor(() => app.state.imageUrl === 'https://example.com/recipe-1.jpg');
  assert.equal(app.state.recipeCount, 1);
  assert.equal(app.state.errorType, null);
  assert.deepEqual(calls.find(call => call.url === '/api/recipe').body, {
    ingredients: ['Pomidory', 'Cukinia', 'Marchew'],
    pantryStaples: pantryNames,
    preferences,
    previousTitles: [],
    locale: 'pl',
  });

  failNextRecipe = true;
  app.actions.tryAnotherRecipe();
  await waitFor(() => app.state.errorType === 'recipe');
  assert.equal(app.state.recipeCount, 1);
  assert.deepEqual(app.state.previousTitles, ['Makaron z cukinią 1']);

  app.actions.retryLastAction();
  await waitFor(() => app.state.currentRecipe?.title === 'Makaron z cukinią 2');
  await waitFor(() => app.state.imageUrl === 'https://example.com/recipe-2.jpg');
  assert.equal(app.state.recipeCount, 2);
  assert.equal(app.state.errorType, null);

  app.actions.tryAnotherPhoto();
  assert.deepEqual(app.state.detected, []);
  assert.deepEqual(app.state.confirmed, []);
  assert.equal(app.state.currentRecipe, null);
  assert.equal(app.state.recipeCount, 0);
});

test('wire adapter preserves the photo to recipe to image protocol sequence used by the cooking flow', async () => {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, body: JSON.parse(options.body) });

    if (url === '/api/detect') {
      return jsonResponse({ ingredients: ['Pomidory', 'Cukinia'] });
    }

    if (url === '/api/recipe') {
      return jsonResponse({
        title: 'Makaron z cukinią',
        ingredients: ['200 g makaronu', '1 cukinia'],
        omittedIngredients: [{ name: 'tomato', display: 'Pomidory', reason: 'Lżejszy sos bez pomidorów.' }],
        shoppingList: ['parmezan'],
        instructions: ['Ugotuj makaron.', 'Podsmaż cukinię.'],
        searchQuery: 'zucchini pasta',
      });
    }

    if (url === '/api/image') {
      return jsonResponse({
        url: 'https://example.com/recipe.jpg',
        photographer: 'Anna',
        photographerUrl: 'https://example.com/anna',
      });
    }

    throw new Error(`Unexpected URL: ${url}`);
  };

  const detected = await detectIngredientsFromPhoto('data:image/jpeg;base64,photo123');
  const recipe = await generateRecipe({
    ingredients: detected,
    pantryStaples: pantryNames,
    preferences,
    previousTitles: ['Zupa pomidorowa'],
    locale: 'pl',
  });
  const image = await fetchRecipeImage(recipe.searchQuery);

  assert.deepEqual(detected, ['Pomidory', 'Cukinia']);
  assert.deepEqual(recipe, {
    title: 'Makaron z cukinią',
    ingredients: ['200 g makaronu', '1 cukinia'],
    omittedIngredients: [{ name: 'tomato', display: 'Pomidory', reason: 'Lżejszy sos bez pomidorów.' }],
    shoppingList: ['parmezan'],
    instructions: ['Ugotuj makaron.', 'Podsmaż cukinię.'],
    searchQuery: 'zucchini pasta',
  });
  assert.deepEqual(image, {
    url: 'https://example.com/recipe.jpg',
    photographer: 'Anna',
    photographerUrl: 'https://example.com/anna',
  });
  assert.deepEqual(calls, [
    { url: '/api/detect', body: { image: 'photo123' } },
    {
      url: '/api/recipe',
      body: {
        ingredients: ['Pomidory', 'Cukinia'],
        pantryStaples: pantryNames,
        preferences,
        previousTitles: ['Zupa pomidorowa'],
        locale: 'pl',
      },
    },
    { url: '/api/image', body: { query: 'zucchini pasta' } },
  ]);
});

function createEscapingElement() {
  return {
    _textContent: '',
    set textContent(value) {
      this._textContent = String(value ?? '');
    },
    get textContent() {
      return this._textContent;
    },
    get innerHTML() {
      return this._textContent
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    },
  };
}

function fakeContainer(elements) {
  return {
    querySelector(selector) {
      const result = elements[selector];
      return Array.isArray(result) ? result[0] : result;
    },
    querySelectorAll(selector) {
      if (selector === '#must-use-list .preference-chip.checked') {
        return (elements['#must-use-list .preference-chip'] || [])
          .filter(element => element.classList.contains('checked'));
      }
      const result = elements[selector];
      if (!result) return [];
      return Array.isArray(result) ? result : [result];
    },
    addEventListener() {},
  };
}

function fakeAppRoot() {
  return {
    innerHTML: '',
    querySelector() {
      return fakeElement();
    },
    querySelectorAll() {
      return [];
    },
    addEventListener() {},
  };
}

function fakeElement({ value = '', dataset = {}, disabled = false, checkedClass = false } = {}) {
  const listeners = {};
  return {
    value,
    dataset,
    disabled,
    classList: {
      contains(className) {
        return className === 'checked' && checkedClass;
      },
      toggle(className) {
        if (className === 'checked') checkedClass = !checkedClass;
      },
      add() {},
      remove() {},
    },
    addEventListener(event, listener) {
      listeners[event] = listener;
    },
    click() {
      listeners.click?.({ target: this });
    },
    keydown(event) {
      listeners.keydown?.(event);
    },
    closest() {
      return fakeField();
    },
    querySelectorAll() {
      return [];
    },
  };
}

function fakeField() {
  return {
    classList: { add() {}, remove() {} },
    contains() { return true; },
    querySelector() { return { querySelectorAll: () => [] }; },
  };
}

function jsonResponse(data) {
  return {
    ok: true,
    status: 200,
    async json() {
      return data;
    },
  };
}

async function waitFor(predicate) {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > 1000) throw new Error('Timed out waiting for condition.');
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}
