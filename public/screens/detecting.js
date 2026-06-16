export function render(state, ui) {
  return `
    <div class="screen detecting-screen">
      <div class="spinner"></div>
      <p style="color: var(--text-secondary);">${ui.detecting.message}</p>
      <div class="skeleton-list">
        <div class="skeleton-item"></div>
        <div class="skeleton-item"></div>
        <div class="skeleton-item"></div>
      </div>
    </div>
  `;
}

export function mount() {}
