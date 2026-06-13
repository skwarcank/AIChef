export function render(state) {
  return `
    <div class="screen error-screen">
      <div class="error-icon">😕</div>
      <p class="error-message">${escapeHtml(state.errorMessage || 'Could not generate a recipe with those ingredients.')}</p>
      <div class="error-actions">
        <button class="action-btn-bottom" id="back-to-confirm">← Back to Ingredients</button>
        <button class="action-btn-top" id="try-another-photo" style="align-self: center;">📸 Try Another Photo</button>
      </div>
    </div>
  `;
}

export function mount(container, actions) {
  container.querySelector('#back-to-confirm').addEventListener('click', () => actions.backToConfirm());
  container.querySelector('#try-another-photo').addEventListener('click', () => actions.tryAnotherPhoto());
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
