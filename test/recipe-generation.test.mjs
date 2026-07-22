import test from 'node:test';
import assert from 'node:assert/strict';

import { createRecipeGenerator } from '../public/domain/recipe-generation.mjs';

test('generates a normalized Recipe Result through the production module interface', async () => {
  let modelRequest;
  const generateRecipe = createRecipeGenerator({
    modelAdapter: async request => {
      modelRequest = request;
      return {
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Tomato Skillet',
              ingredients: [
                { name: 'tomato', display: '2 tomatoes' },
                { name: 'salt', display: '1 tsp salt' },
                { name: 'basil', display: 'a handful of basil' },
              ],
              instructions: ['Cook everything together.'],
              searchQuery: 'tomato skillet',
            }),
          },
        }],
      };
    },
  });
  const result = await generateRecipe({
    confirmedIngredients: ['Tomatoes', 'Zucchini'],
    pantryStaples: ['Salt'],
    preferences: { mustUseIngredients: ['Tomatoes'] },
    priorRecipeTitles: ['Tomato Pasta'],
    locale: 'en',
  });

  assert.equal('model' in modelRequest, false);
  assert.match(modelRequest.messages.at(-1).content, /Main ingredients: Tomatoes, Zucchini\./);
  assert.match(modelRequest.messages.at(-1).content, /Pantry staples: Salt\./);
  assert.match(modelRequest.messages.at(-1).content, /Must-use ingredients: Tomatoes/);
  assert.match(modelRequest.messages.at(-1).content, /Previously suggested recipes: Tomato Pasta\./);

  assert.deepEqual(result, {
    title: 'Tomato Skillet',
    ingredients: [
      { name: 'tomato', display: '2 tomatoes' },
      { name: 'salt', display: '1 tsp salt' },
      { name: 'basil', display: 'a handful of basil' },
    ],
    instructions: ['Cook everything together.'],
    searchQuery: 'tomato skillet',
    availableIngredients: [
      { name: 'tomato', display: 'Tomatoes' },
      { name: 'zucchini', display: 'Zucchini' },
      { name: 'salt', display: 'Salt' },
    ],
    omittedIngredients: [
      { name: 'zucchini', display: 'Zucchini', reason: 'Left out to keep the recipe coherent.' },
    ],
    shoppingList: ['a handful of basil'],
  });
});

test('keeps Polish output policy and fallback behavior inside Recipe Generation', async () => {
  const generateRecipe = createRecipeGenerator({
    modelAdapter: async request => {
      assert.match(request.messages[1].content, /natural Polish/);
      return { choices: [{ message: { content: 'not json' } }] };
    },
  });

  await assert.rejects(
    generateRecipe({
      confirmedIngredients: ['Pomidory'],
      pantryStaples: [],
      locale: 'pl',
    }),
    error => {
      assert.equal(error.name, 'RecipeGenerationError');
      assert.equal(error.status, 502);
      assert.equal(error.userMessage, 'Nie udało się wygenerować przepisu. Spróbuj innych składników.');
      return true;
    },
  );
});

test('repairs common model JSON issues before normalizing the Recipe Result', async () => {
  const generateRecipe = createRecipeGenerator({
    modelAdapter: async () => ({
      choices: [{
        message: {
          content: '```json\n{"title":"Soup","ingredients":[{"name":"tomato","display":"2 tomatoes",}],"instructions":["Simmer."],}\n```',
        },
      }],
    }),
  });
  const result = await generateRecipe({
    confirmedIngredients: ['Tomatoes'],
    pantryStaples: [],
  });

  assert.equal(result.title, 'Soup');
  assert.deepEqual(result.ingredients, [{ name: 'tomato', display: '2 tomatoes' }]);
});

test('rejects valid JSON that is not a Recipe Result', async () => {
  const generateRecipe = createRecipeGenerator({
    modelAdapter: async () => ({ choices: [{ message: { content: '[]' } }] }),
  });

  await assert.rejects(
    generateRecipe({ confirmedIngredients: ['Tomatoes'], pantryStaples: [] }),
    error => {
      assert.equal(error.name, 'RecipeGenerationError');
      assert.equal(error.status, 502);
      assert.equal(error.userMessage, 'Could not generate a recipe. Try different ingredients.');
      return true;
    },
  );
});

test('translates model-declared Recipe Generation failures into module errors', async () => {
  const generateRecipe = createRecipeGenerator({
    modelAdapter: async () => ({
      choices: [{ message: { content: '{"error":true,"message":"No safe recipe."}' } }],
    }),
  });

  await assert.rejects(
    generateRecipe({ confirmedIngredients: ['Tomatoes'], pantryStaples: [] }),
    error => {
      assert.equal(error.name, 'RecipeGenerationError');
      assert.equal(error.status, 502);
      assert.equal(error.userMessage, 'No safe recipe.');
      return true;
    },
  );
});
