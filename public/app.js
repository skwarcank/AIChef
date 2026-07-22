import { render as uploadRender, mount as uploadMount } from './screens/upload.js';
import { render as detectingRender, mount as detectingMount } from './screens/detecting.js';
import { render as confirmRender, mount as confirmMount } from './screens/confirm.js';
import { render as customizeRender, mount as customizeMount } from './screens/customize.js';
import { render as generatingRender, mount as generatingMount } from './screens/generating.js';
import { render as recipeRender, mount as recipeMount } from './screens/recipe.js';
import { render as errorRender, mount as errorMount } from './screens/error.js';
import { getUI } from './i18n.js';
import { dedupeIngredients, displayIngredient } from './domain/ingredient-identity.mjs';
import { detectIngredientsFromPhoto, fetchRecipeImage, generateRecipe } from './wire-adapter.mjs';

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
    const ingredients = dedupeIngredients([...state.detected, name]).map(displayIngredient);
    if (ingredients.length > state.detected.length) {
      state.detected = ingredients;
      state.lastRemovedIngredient = null;
    }
    navigate('confirm');
  },

  openCustomize() {
    state.confirmed = dedupeIngredients(state.detected).map(displayIngredient);
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
    const ingredients = await detectIngredientsFromPhoto(base64, { signal: request.controller.signal });
    if (!isCurrentRequest(request)) return;
    state.detected = ingredients;
    state.lastRemovedIngredient = null;
    navigate('confirm');
  } catch (err) {
    if (err.name === 'AbortError') return;
    console.error(err);
    state.errorMessage = errorMessageForCode(err.code, ui, ui.errors.detectFailed);
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
    const recipe = await generateRecipe({
      ingredients,
      pantryStaples,
      preferences,
      previousTitles: state.previousTitles,
      locale: state.locale,
      signal: request.controller.signal,
    });
    if (!isCurrentRequest(request)) return;
    state.currentRecipe = recipe;
    state.imageUrl = null;
    state.imagePhotographer = null;
    state.imagePhotographerUrl = null;
    state.recipeCount++;
    state.errorMessage = null;
    state.errorType = null;
    navigate('recipe');
    if (recipe.searchQuery) {
      fetchImage(recipe.searchQuery, state.currentRecipe.title);
    }
  } catch (err) {
    if (err.name === 'AbortError') return;
    console.error(err);
    state.errorMessage = errorMessageForCode(err.code, ui, ui.errors.recipeFailed);
    state.errorType = 'recipe';
    navigate('error');
  } finally {
    finishRequest(request);
  }
}

async function fetchImage(query, recipeTitle) {
  const imageRequestId = ++imageRequestSequence;
  try {
    const image = await fetchRecipeImage(query);
    if (imageRequestId === imageRequestSequence && state.currentRecipe?.title === recipeTitle && image.url) {
      state.imageUrl = image.url;
      state.imagePhotographer = image.photographer;
      state.imagePhotographerUrl = image.photographerUrl;
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

function errorMessageForCode(code, ui, fallback) {
  const map = {
    detect_failed: ui.errors.detectFailed,
    network: ui.errors.network,
    recipe_failed: ui.errors.recipeFailed,
    image_failed: ui.errors.imageFailed,
  };
  return map[code] || fallback;
}

navigate('upload');
