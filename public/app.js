import { render as uploadRender, mount as uploadMount } from './screens/upload.js';
import { render as detectingRender, mount as detectingMount } from './screens/detecting.js';
import { render as confirmRender, mount as confirmMount } from './screens/confirm.js';
import { render as customizeRender, mount as customizeMount } from './screens/customize.js';
import { render as generatingRender, mount as generatingMount } from './screens/generating.js';
import { render as recipeRender, mount as recipeMount } from './screens/recipe.js';
import { render as errorRender, mount as errorMount } from './screens/error.js';
import { getUI } from './i18n.js';

const PANTRY_STAPLES = ['Salt', 'Pepper', 'Olive Oil', 'Water'];
const MAX_RECIPES = 10;
let activeRequest = null;
let requestSequence = 0;
let imageRequestSequence = 0;

const state = {
  locale: 'pl',
  photo: null,
  detected: [],
  pantry: PANTRY_STAPLES.map(s => ({ name: s, checked: true })),
  recipeCount: 0,
  currentRecipe: null,
  imageUrl: null,
  imagePhotographer: null,
  imagePhotographerUrl: null,
  lastConfirmed: null,
  lastPantry: null,
  lastPreferences: null,
  confirmed: [],
  lastRemovedIngredient: null,
  errorType: null,
  pendingReturnScreen: null,
  previousTitles: [],
  preferences: {
    dishType: '',
    cuisine: '',
    dietaryPreference: '',
    timeLimit: '',
    servings: '',
    skillLevel: '',
    mustUseIngredients: [],
    avoidIngredients: '',
  },
  errorMessage: null,
};

const screens = {
  upload: { render: uploadRender, mount: uploadMount },
  detecting: { render: detectingRender, mount: detectingMount },
  confirm: { render: confirmRender, mount: confirmMount },
  customize: { render: customizeRender, mount: customizeMount },
  generating: { render: generatingRender, mount: generatingMount },
  recipe: { render: recipeRender, mount: recipeMount },
  error: { render: errorRender, mount: errorMount },
};

function navigate(screenName) {
  const screen = screens[screenName];
  const app = document.getElementById('app');
  const ui = getUI(state.locale);
  document.documentElement.lang = state.locale;
  app.innerHTML = screen.render(state, ui);
  screen.mount(app, actions);
}

const actions = {
  onPhoto(base64) {
    abortActiveRequest();
    state.photo = base64;
    state.errorMessage = null;
    state.errorType = null;
    navigate('detecting');
    detectIngredients(base64);
  },

  retakePhoto() {
    abortActiveRequest();
    state.photo = null;
    state.detected = [];
    state.confirmed = [];
    state.lastRemovedIngredient = null;
    state.errorMessage = null;
    state.errorType = null;
    navigate('upload');
  },

  toggleDetected(index) {
    const [removed] = state.detected.splice(index, 1);
    if (removed) state.lastRemovedIngredient = { name: removed, index };
    navigate('confirm');
  },

  restoreDetected() {
    if (!state.lastRemovedIngredient) return;
    const { name, index } = state.lastRemovedIngredient;
    const insertAt = Math.min(index, state.detected.length);
    state.detected.splice(insertAt, 0, name);
    state.lastRemovedIngredient = null;
    navigate('confirm');
  },

  togglePantry(index) {
    state.pantry[index].checked = !state.pantry[index].checked;
    navigate('confirm');
  },

  addCustomIngredient(name) {
    const normalizedName = name.trim();
    const alreadyAdded = state.detected.some(item => item.toLowerCase() === normalizedName.toLowerCase());
    if (normalizedName && !alreadyAdded) {
      state.detected.push(normalizedName);
      state.lastRemovedIngredient = null;
    }
    navigate('confirm');
  },

  openCustomize() {
    state.confirmed = [...state.detected];
    state.lastConfirmed = [...state.confirmed];
    state.lastPantry = state.pantry.filter(p => p.checked).map(p => p.name);
    state.lastRemovedIngredient = null;
    navigate('customize');
  },

  backToConfirm() {
    navigate('confirm');
  },

  generateRecipe(preferences) {
    abortActiveRequest();
    state.preferences = {
      ...state.preferences,
      ...preferences,
      mustUseIngredients: preferences.mustUseIngredients || [],
    };
    state.lastPreferences = { ...state.preferences, mustUseIngredients: [...state.preferences.mustUseIngredients] };
    addPreviousTitle(state.currentRecipe?.title);
    state.errorMessage = null;
    state.errorType = null;
    state.pendingReturnScreen = 'customize';
    navigate('generating');
    getRecipe(state.lastConfirmed, state.lastPantry, state.lastPreferences);
  },

  tryAnotherPhoto() {
    abortActiveRequest();
    state.photo = null;
    state.detected = [];
    state.confirmed = [];
    state.lastRemovedIngredient = null;
    state.currentRecipe = null;
    state.imageUrl = null;
    state.imagePhotographer = null;
    state.imagePhotographerUrl = null;
    state.recipeCount = 0;
    state.previousTitles = [];
    state.lastPreferences = null;
    state.preferences = {
      dishType: '',
      cuisine: '',
      dietaryPreference: '',
      timeLimit: '',
      servings: '',
      skillLevel: '',
      mustUseIngredients: [],
      avoidIngredients: '',
    };
    state.errorMessage = null;
    state.errorType = null;
    state.pendingReturnScreen = null;
    navigate('upload');
  },

  tryAnotherRecipe() {
    if (state.recipeCount >= MAX_RECIPES) return;
    abortActiveRequest();
    addPreviousTitle(state.currentRecipe?.title);
    state.errorMessage = null;
    state.errorType = null;
    state.pendingReturnScreen = 'recipe';
    navigate('generating');
    getRecipe(state.lastConfirmed, state.lastPantry, state.lastPreferences);
  },

  editIngredients() {
    navigate('confirm');
  },

  cancelDetection() {
    abortActiveRequest();
    state.errorMessage = null;
    state.errorType = null;
    navigate('upload');
  },

  cancelGeneration() {
    abortActiveRequest();
    state.errorMessage = null;
    state.errorType = null;
    navigate(state.pendingReturnScreen === 'recipe' && state.currentRecipe ? 'recipe' : 'customize');
  },

  retryLastAction() {
    if (state.errorType === 'detect' && state.photo) {
      state.errorMessage = null;
      state.errorType = null;
      navigate('detecting');
      return detectIngredients(state.photo);
    }

    if (state.errorType === 'recipe' && state.lastConfirmed && state.lastPantry && state.lastPreferences) {
      state.errorMessage = null;
      state.errorType = null;
      state.pendingReturnScreen = state.currentRecipe ? 'recipe' : 'customize';
      navigate('generating');
      return getRecipe(state.lastConfirmed, state.lastPantry, state.lastPreferences);
    }

    navigate(state.detected.length ? 'confirm' : 'upload');
  },

  recoverFromError() {
    if (state.errorType === 'recipe' && state.lastConfirmed) {
      state.errorMessage = null;
      state.errorType = null;
      return navigate('customize');
    }

    this.tryAnotherPhoto();
  },
};

async function detectIngredients(base64) {
  const ui = getUI(state.locale);
  const request = startRequest('detect');
  try {
    const res = await fetch('/api/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64.split(',')[1] || base64 }),
      signal: request.controller.signal,
    });
    if (!isCurrentRequest(request)) return;
    const data = await res.json();
    if (!res.ok || data.error) {
      state.errorMessage = localizeErrorMessage(data.message, ui) ?? ui.errors.detectFailed;
      state.errorType = 'detect';
      return navigate('error');
    }
    state.detected = data.ingredients || [];
    state.lastRemovedIngredient = null;
    navigate('confirm');
  } catch (err) {
    if (err.name === 'AbortError') return;
    console.error(err);
    state.errorMessage = ui.errors.network;
    state.errorType = 'detect';
    return navigate('error');
  } finally {
    finishRequest(request);
  }
}

async function getRecipe(ingredients, pantryStaples, preferences) {
  const ui = getUI(state.locale);
  const request = startRequest('recipe');
  try {
    const res = await fetch('/api/recipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredients, pantryStaples, preferences, previousTitles: state.previousTitles, locale: state.locale }),
      signal: request.controller.signal,
    });
    if (!isCurrentRequest(request)) return;
    const data = await res.json();
    if (!res.ok || data.error) {
      state.errorMessage = localizeErrorMessage(data.message, ui) ?? ui.errors.recipeFailed;
      state.errorType = 'recipe';
      navigate('error');
    } else {
      state.currentRecipe = {
        title: data.title,
        ingredients: data.ingredients || [],
        omittedIngredients: data.omittedIngredients || [],
        shoppingList: data.shoppingList || data.missingIngredients || data.neededIngredients || data.toBuy || [],
        instructions: data.instructions || [],
        searchQuery: data.searchQuery,
      };
      state.imageUrl = null;
      state.imagePhotographer = null;
      state.imagePhotographerUrl = null;
      state.recipeCount++;
      state.errorMessage = null;
      state.errorType = null;
      navigate('recipe');
      if (data.searchQuery) {
        fetchImage(data.searchQuery, state.currentRecipe.title);
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') return;
    console.error(err);
    state.errorMessage = ui.errors.generic;
    state.errorType = 'recipe';
    navigate('error');
  } finally {
    finishRequest(request);
  }
}

async function fetchImage(query, recipeTitle) {
  const imageRequestId = ++imageRequestSequence;
  try {
    const res = await fetch('/api/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    if (imageRequestId === imageRequestSequence && state.currentRecipe?.title === recipeTitle && data.url) {
      state.imageUrl = data.url;
      state.imagePhotographer = data.photographer;
      state.imagePhotographerUrl = data.photographerUrl;
      navigate('recipe');
    }
  } catch (err) {
    console.error(err);
  }
}

function startRequest(type) {
  abortActiveRequest();
  const request = { type, id: ++requestSequence, controller: new AbortController() };
  activeRequest = request;
  return request;
}

function abortActiveRequest() {
  if (activeRequest) {
    activeRequest.controller.abort();
    activeRequest = null;
  }
}

function isCurrentRequest(request) {
  return activeRequest?.id === request.id;
}

function finishRequest(request) {
  if (isCurrentRequest(request)) activeRequest = null;
}

function addPreviousTitle(title) {
  if (title && !state.previousTitles.includes(title)) {
    state.previousTitles.push(title);
  }
}

function localizeErrorMessage(message, ui) {
  const normalized = String(message || '').trim();
  const map = {
    'Failed to detect ingredients. Try a clearer photo.': ui.errors.detectFailed,
    'Network error. Check your connection and try again.': ui.errors.network,
    'Something went wrong. Try again.': ui.errors.generic,
    'Could not generate a recipe. Try different ingredients.': ui.errors.recipeFailed,
    'Failed to generate recipe.': ui.errors.recipeFailed,
    'Failed to analyze image.': ui.errors.imageFailed,
    'Could not generate a recipe with those ingredients.': ui.error.fallback,
  };
  return map[normalized] || null;
}

navigate('upload');
