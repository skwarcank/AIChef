import test from 'node:test';
import assert from 'node:assert/strict';

import {
  deriveRecipeAvailability,
  normalizeRecipeIngredient,
} from '../public/domain/recipe-availability.mjs';

test('normalizes recipe ingredients without leaking canonical names into display labels', () => {
  assert.deepEqual(normalizeRecipeIngredient({ name: 'tomato', display: '2 pokrojone pomidory' }), {
    name: 'tomato',
    display: '2 pokrojone pomidory',
  });

  assert.deepEqual(normalizeRecipeIngredient({ name: 'tomato' }), {
    name: 'tomato',
    display: 'Tomato',
  });
});

test('counts pantry staples and confirmed ingredients as available for shopping needs', () => {
  const result = deriveRecipeAvailability({
    confirmedIngredients: ['Tomatoes'],
    pantryStaples: ['Salt', 'Olive Oil'],
    recipeIngredients: [
      { name: 'tomato', display: '2 tomatoes' },
      { name: 'salt', display: '1 tsp salt' },
      { name: 'olive oil', display: '1 tbsp olive oil' },
      { name: 'basil', display: 'a handful of basil' },
    ],
  });

  assert.deepEqual(result.shoppingList, ['a handful of basil']);
  assert.deepEqual(result.availableIngredients, [
    { name: 'tomato', display: 'Tomatoes' },
    { name: 'salt', display: 'Salt' },
    { name: 'olive oil', display: 'Olive Oil' },
  ]);
});

test('derives omitted ingredients from confirmed main ingredients but not pantry staples', () => {
  const result = deriveRecipeAvailability({
    confirmedIngredients: ['Tomatoes', 'Zucchini'],
    pantryStaples: ['Salt'],
    recipeIngredients: [{ name: 'tomato', display: '2 tomatoes' }],
    omittedIngredients: [{ name: 'salt', display: 'salt', reason: 'Not needed' }],
    derivedOmissionReason: 'Pominięto dla spójności.',
  });

  assert.deepEqual(result.omittedIngredients, [
    { name: 'zucchini', display: 'Zucchini', reason: 'Pominięto dla spójności.' },
  ]);
});
