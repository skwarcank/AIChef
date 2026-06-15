const MAX_RECIPES = 10;

export function render(state) {
  const r = state.currentRecipe;
  if (!r) return '';

  const ingredients = r.ingredients.map(i => `<li>${escapeHtml(getIngredientDisplay(i))}</li>`).join('');
  const shoppingList = (r.shoppingList || []).map(i => `<li>${escapeHtml(getIngredientDisplay(i))}</li>`).join('');
  const omittedIngredients = (r.omittedIngredients || [])
    .map(i => `<li>${escapeHtml(getIngredientDisplay(i))}${i.reason ? ` <span class="recipe-note">(${escapeHtml(i.reason)})</span>` : ''}</li>`)
    .join('');
  const instructions = r.instructions.map(s => `<li>${escapeHtml(s)}</li>`).join('');
  const atLimit = state.recipeCount >= MAX_RECIPES;

  const imageHtml = state.imageUrl
    ? `<div class="recipe-image-wrapper"><img class="recipe-image" src="${escapeHtml(state.imageUrl)}" alt="${escapeHtml(r.title)}" loading="lazy"></div>`
    : `<div class="recipe-image-wrapper"><div class="recipe-image-skeleton"></div></div>`;

  const attrHtml = state.imagePhotographer
    ? `<p class="recipe-attribution">Photo by <a href="${escapeHtml(state.imagePhotographerUrl)}" target="_blank" rel="noopener">${escapeHtml(state.imagePhotographer)}</a></p>`
    : '';

  return `
    <div class="screen recipe-screen">
      <div class="recipe-actions-top">
        <button class="action-btn-top" id="edit-ingredients">← Ingredients</button>
        <button class="action-btn-top" id="try-another-photo">📸 New Photo</button>
      </div>

      ${imageHtml}
      ${attrHtml}

      <h1 class="recipe-title">${escapeHtml(r.title)}</h1>

      <div class="recipe-section">
        <h3>Ingredients</h3>
        <ul>${ingredients}</ul>
      </div>

      ${shoppingList ? `
        <div class="recipe-section shopping-list-section">
          <h3>Need to Buy</h3>
          <p class="recipe-note">These ingredients are not in your confirmed ingredients or pantry staples.</p>
          <ul>${shoppingList}</ul>
        </div>
      ` : ''}

      ${omittedIngredients ? `
        <div class="recipe-section">
          <h3>Not Used</h3>
          <p class="recipe-note">These confirmed ingredients were left out to keep the recipe coherent.</p>
          <ul>${omittedIngredients}</ul>
        </div>
      ` : ''}

      <div class="recipe-section">
        <h3>Instructions</h3>
        <ol>${instructions}</ol>
      </div>

      <button class="action-btn-bottom" id="try-another-recipe" ${atLimit ? 'disabled' : ''}>
        🔄 Try Another Recipe
      </button>

      <p class="recipe-counter">Recipe ${state.recipeCount} of ${MAX_RECIPES}</p>
    </div>
  `;
}

export function mount(container, actions) {
  container.querySelector('#try-another-photo').addEventListener('click', () => actions.tryAnotherPhoto());
  container.querySelector('#edit-ingredients').addEventListener('click', () => actions.editIngredients());

  const retryBtn = container.querySelector('#try-another-recipe');
  retryBtn.addEventListener('click', () => {
    if (!retryBtn.disabled) actions.tryAnotherRecipe();
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getIngredientDisplay(ingredient) {
  if (ingredient && typeof ingredient === 'object') {
    return stringifyIngredientValue(ingredient.display || ingredient.name || ingredient);
  }
  return stringifyIngredientValue(ingredient);
}

function stringifyIngredientValue(value) {
  if (!value) return '';
  if (typeof value !== 'object') return String(value);

  const preferredValue = value.name || value.display || value.item || value.ingredient || value.text;
  if (preferredValue && preferredValue !== value) return stringifyIngredientValue(preferredValue);

  return Object.values(value)
    .map(part => stringifyIngredientValue(part))
    .filter(Boolean)
    .join(' ');
}
