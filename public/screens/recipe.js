import { displayIngredient } from '../domain/ingredient-identity.mjs';

const MAX_RECIPES = 10;

export function render(state, ui) {
  const r = state.currentRecipe;
  if (!r) return '';

  const ingredients = r.ingredients.map(i => `<li>${escapeHtml(displayIngredient(i))}</li>`).join('');
  const shoppingList = (r.shoppingList || []).map(i => `<li>${escapeHtml(displayIngredient(i))}</li>`).join('');
  const omittedIngredients = (r.omittedIngredients || [])
    .map(i => `<li>${escapeHtml(displayIngredient(i))}${i.reason ? ` <span class="recipe-note">(${escapeHtml(i.reason)})</span>` : ''}</li>`)
    .join('');
  const instructions = r.instructions.map(s => `<li>${escapeHtml(s)}</li>`).join('');
  const atLimit = state.recipeCount >= MAX_RECIPES;

  const imageHtml = state.imageUrl
    ? `<div class="recipe-image-wrapper"><img class="recipe-image" src="${escapeAttribute(state.imageUrl)}" alt="${escapeAttribute(r.title)}" loading="lazy"></div>`
    : `<div class="recipe-image-wrapper"><div class="recipe-image-skeleton"></div></div>`;

  const attrHtml = state.imagePhotographer
    ? `<p class="recipe-attribution">${ui.recipe.photoBy}<a href="${escapeAttribute(state.imagePhotographerUrl)}" target="_blank" rel="noopener">${escapeHtml(state.imagePhotographer)}</a></p>`
    : '';

  return `
    <div class="screen recipe-screen">
      <div class="recipe-actions-top">
        <button class="action-btn-top" id="edit-ingredients">${ui.recipe.back}</button>
        <button class="action-btn-top" id="try-another-photo">${ui.recipe.newPhoto}</button>
      </div>

      <section class="recipe-answer" aria-labelledby="recipe-title">
        <h1 class="recipe-title" id="recipe-title">${escapeHtml(r.title)}</h1>

        <div class="recipe-section">
          <h3>${ui.recipe.ingredients}</h3>
          <ul>${ingredients}</ul>
        </div>

        <div class="recipe-section">
          <h3>${ui.recipe.instructions}</h3>
          <ol>${instructions}</ol>
        </div>
      </section>

      ${(shoppingList || omittedIngredients) ? `
        <section class="recipe-context" aria-label="${escapeAttribute(ui.recipe.contextLabel)}">
          ${shoppingList ? `
            <div class="recipe-section shopping-list-section">
              <h3>${ui.recipe.needToBuy}</h3>
              <p class="recipe-note">${ui.recipe.needToBuyNote}</p>
              <ul>${shoppingList}</ul>
            </div>
          ` : ''}

          ${omittedIngredients ? `
            <div class="recipe-section">
              <h3>${ui.recipe.notUsed}</h3>
              <p class="recipe-note">${ui.recipe.notUsedNote}</p>
              <ul>${omittedIngredients}</ul>
            </div>
          ` : ''}
        </section>
      ` : ''}

      <div class="recipe-media">
        ${imageHtml}
        ${attrHtml}
      </div>

      <div class="recipe-bottom-actions">
        <button class="action-btn-bottom" id="try-another-recipe" ${atLimit ? 'disabled' : ''}>
          ${ui.recipe.tryAnotherRecipe}
        </button>

        <p class="recipe-counter">${ui.recipe.counter(state.recipeCount, MAX_RECIPES)}</p>
      </div>
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

function escapeAttribute(str) {
  return escapeHtml(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
