export function render(state, ui) {
  return `
    <div class="screen error-screen">
      <div class="error-icon">😕</div>
      <p class="error-message">${escapeHtml(state.errorMessage || ui.error.fallback)}</p>
      <div class="error-actions">
        <button class="action-btn-bottom" id="back-to-confirm">${ui.error.back}</button>
        <button class="action-btn-top" id="try-another-photo" style="align-self: center;">${ui.error.tryAnotherPhoto}</button>
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
