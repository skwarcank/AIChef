import { render as uploadRender, mount as uploadMount } from './screens/upload.js';
import { render as detectingRender, mount as detectingMount } from './screens/detecting.js';
import { render as confirmRender, mount as confirmMount } from './screens/confirm.js';
import { render as customizeRender, mount as customizeMount } from './screens/customize.js';
import { render as generatingRender, mount as generatingMount } from './screens/generating.js';
import { render as recipeRender, mount as recipeMount } from './screens/recipe.js';
import { render as errorRender, mount as errorMount } from './screens/error.js';

const PANTRY_STAPLES = ['Salt', 'Pepper', 'Olive Oil', 'Water'];
const MAX_RECIPES = 10;

const state = {
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
  app.innerHTML = screen.render(state);
  screen.mount(app, actions);
}

const actions = {
  onPhoto(base64) {
    state.photo = base64;
    navigate('detecting');
    detectIngredients(base64);
  },

  retakePhoto() {
    state.photo = null;
    state.detected = [];
    navigate('upload');
  },

  toggleDetected(index) {
    state.detected.splice(index, 1);
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
    }
    navigate('confirm');
  },

  openCustomize() {
    state.confirmed = [...state.detected];
    state.lastConfirmed = [...state.confirmed];
    state.lastPantry = state.pantry.filter(p => p.checked).map(p => p.name);
    navigate('customize');
  },

  backToConfirm() {
    navigate('confirm');
  },

  generateRecipe(preferences) {
    state.preferences = {
      ...state.preferences,
      ...preferences,
      mustUseIngredients: preferences.mustUseIngredients || [],
    };
    state.lastPreferences = { ...state.preferences, mustUseIngredients: [...state.preferences.mustUseIngredients] };
    state.recipeCount++;
    navigate('generating');
    getRecipe(state.lastConfirmed, state.lastPantry, state.lastPreferences);
  },

  tryAnotherPhoto() {
    state.photo = null;
    state.detected = [];
    state.confirmed = [];
    state.currentRecipe = null;
    state.imageUrl = null;
    state.imagePhotographer = null;
    state.imagePhotographerUrl = null;
    state.recipeCount = 0;
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
    navigate('upload');
  },

  tryAnotherRecipe() {
    if (state.recipeCount >= MAX_RECIPES) return;
    state.recipeCount++;
    navigate('generating');
    getRecipe(state.lastConfirmed, state.lastPantry, state.lastPreferences);
  },

  editIngredients() {
    navigate('confirm');
  },
};

async function detectIngredients(base64) {
  try {
    const res = await fetch('/api/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64.split(',')[1] || base64 }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      state.errorMessage = data.message || 'Failed to detect ingredients. Try a clearer photo.';
      return navigate('error');
    }
    state.detected = data.ingredients || [];
  } catch (err) {
    console.error(err);
    state.errorMessage = 'Network error. Check your connection and try again.';
    return navigate('error');
  }
  navigate('confirm');
}

async function getRecipe(ingredients, pantryStaples, preferences) {
  try {
    const res = await fetch('/api/recipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredients, pantryStaples, preferences }),
    });
    const data = await res.json();
    if (data.error) {
      state.errorMessage = data.message;
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
      navigate('recipe');
      if (data.searchQuery) {
        fetchImage(data.searchQuery);
      }
    }
  } catch (err) {
    console.error(err);
    state.errorMessage = 'Something went wrong. Try again.';
    navigate('error');
  }
}

async function fetchImage(query) {
  try {
    const res = await fetch('/api/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    if (data.url) {
      state.imageUrl = data.url;
      state.imagePhotographer = data.photographer;
      state.imagePhotographerUrl = data.photographerUrl;
      navigate('recipe');
    }
  } catch (err) {
    console.error(err);
  }
}

navigate('upload');
