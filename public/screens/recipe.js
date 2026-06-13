const MAX_RECIPES = 10;

export function render(state) {
  const r = state.currentRecipe;
  if (!r) return '';

  const ingredients = r.ingredients.map(i => `<li>${escapeHtml(i)}</li>`).join('');
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
      <button class="action-btn-top" id="try-another-photo">📸 Try Another Photo</button>

      ${imageHtml}
      ${attrHtml}

      <h1 class="recipe-title">${escapeHtml(r.title)}</h1>

      <div class="recipe-section">
        <h3>Ingredients</h3>
        <ul>${ingredients}</ul>
      </div>

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
