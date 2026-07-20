export function render(state, ui) {
  const canRetryDetect = state.errorType === 'detect' && state.photo;
  const canRetryRecipe = state.errorType === 'recipe' && state.lastConfirmed && state.lastPantry && state.lastPreferences;
  const primaryLabel = canRetryDetect
    ? ui.error.retryPhoto
    : canRetryRecipe
      ? ui.error.retryRecipe
      : ui.error.back;
  const secondaryLabel = canRetryRecipe ? ui.error.editPreferences : ui.error.tryAnotherPhoto;

  return `
    <div class="screen error-screen">
      <div class="error-icon">😕</div>
      <p class="error-message">${escapeHtml(state.errorMessage || ui.error.fallback)}</p>
      <div class="error-actions">
        <button class="action-btn-bottom" id="retry-action">${primaryLabel}</button>
        <button class="action-btn-top error-secondary-action" id="secondary-action">${secondaryLabel}</button>
      </div>
    </div>
  `;
}

export function mount(container, actions) {
  container.querySelector('#retry-action').addEventListener('click', () => actions.retryLastAction());
  container.querySelector('#secondary-action').addEventListener('click', () => actions.recoverFromError());
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
