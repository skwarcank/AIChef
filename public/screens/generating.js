export function render(state, ui) {
  return `
    <div class="screen generating-screen">
      <div class="spinner" aria-hidden="true"></div>
      <p class="loading-message" role="status" aria-live="polite">${ui.generating.message}</p>
      <button class="loading-cancel-btn" id="cancel-generation" type="button">${ui.generating.cancel}</button>
    </div>
  `;
}

export function mount(container, actions) {
  container.querySelector('#cancel-generation').addEventListener('click', () => actions.cancelGeneration());
}
