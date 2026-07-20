export function render(state, ui) {
  return `
    <div class="screen detecting-screen">
      <div class="spinner" aria-hidden="true"></div>
      <p class="loading-message" role="status" aria-live="polite">${ui.detecting.message}</p>
      <div class="skeleton-list" aria-hidden="true">
        <div class="skeleton-item"></div>
        <div class="skeleton-item"></div>
        <div class="skeleton-item"></div>
      </div>
      <button class="loading-cancel-btn" id="cancel-detect" type="button">${ui.detecting.cancel}</button>
    </div>
  `;
}

export function mount(container, actions) {
  container.querySelector('#cancel-detect').addEventListener('click', () => actions.cancelDetection());
}
