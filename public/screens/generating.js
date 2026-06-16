export function render(state, ui) {
  return `
    <div class="screen generating-screen">
      <div class="spinner"></div>
      <p style="color: var(--text-secondary);">${ui.generating.message}</p>
    </div>
  `;
}

export function mount() {}
