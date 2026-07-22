const test = require('node:test');
const assert = require('node:assert/strict');

const app = require('../server');

test('recipe route rejects malformed Recipe Generation requests before generation', async () => {
  const server = app.listen(0);

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/recipe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredients: 'tomato', pantryStaples: [] }),
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: true,
      message: 'Invalid recipe request.',
    });
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('recipe route rejects malformed Recipe Generation preference shapes', async () => {
  const server = app.listen(0);

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/recipe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ingredients: ['tomato'],
        pantryStaples: [],
        preferences: { mustUseIngredients: 'tomato' },
      }),
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: true,
      message: 'Invalid recipe request.',
    });
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('recipe route rejects null Recipe Generation request bodies', async () => {
  const server = app.listen(0);

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/recipe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'null',
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: true,
      message: 'Invalid JSON request body.',
    });
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
