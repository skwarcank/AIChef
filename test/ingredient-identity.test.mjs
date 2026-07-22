import test from 'node:test';
import assert from 'node:assert/strict';

import {
  dedupeIngredients,
  displayIngredient,
  ingredientIsAvailable,
  splitIngredientInput,
  toIngredientIdentity,
} from '../public/domain/ingredient-identity.mjs';

test('converts boundary values into canonical names and display labels', () => {
  assert.deepEqual(toIngredientIdentity('Tomatoes'), { name: 'tomato', display: 'Tomatoes' });
  assert.deepEqual(toIngredientIdentity({ name: 'eggs', display: 'Free-range eggs' }), {
    name: 'egg',
    display: 'Free-range eggs',
  });
});

test('splits comma and newline user input into ingredient identities', () => {
  assert.deepEqual(splitIngredientInput('Tomatoes, onion\ngarlic'), [
    { name: 'tomato', display: 'Tomatoes' },
    { name: 'onion', display: 'onion' },
    { name: 'garlic', display: 'garlic' },
  ]);
  assert.deepEqual(splitIngredientInput('half-and-half'), [
    { name: 'half and half', display: 'half-and-half' },
  ]);
});

test('deduplicates by canonical identity while preserving first display label', () => {
  assert.deepEqual(dedupeIngredients(['Tomatoes', 'tomato', { name: 'onions', display: 'Red onions' }]), [
    { name: 'tomato', display: 'Tomatoes' },
    { name: 'onion', display: 'Red onions' },
  ]);
});

test('keeps cook-facing display text readable and preserves diacritics', () => {
  assert.equal(displayIngredient('Śmietana 18%'), 'Śmietana 18%');
});

test('matches availability by presence, not quantity sufficiency', () => {
  assert.equal(ingredientIsAvailable('6 chopped tomatoes', ['tomato']), true);
  assert.equal(ingredientIsAvailable('1 cup diced tomatoes', ['2 tomatoes']), true);
});

test('matches preparation and amount phrases without collapsing distinct ingredients', () => {
  assert.equal(ingredientIsAvailable('2 tbsp rice vinegar', ['rice vinegar']), true);
  assert.equal(ingredientIsAvailable('2 tbsp rice vinegar', ['rice']), false);
  assert.equal(ingredientIsAvailable('1 cup cooked rice', ['rice vinegar']), false);
  assert.equal(ingredientIsAvailable('asparagus', ['asparagus']), true);
  assert.equal(ingredientIsAvailable('hummus', ['hummus']), true);
});
