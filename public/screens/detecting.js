export function render() {
  return `
    <div class="screen detecting-screen">
      <div class="spinner"></div>
      <p style="color: var(--text-secondary);">Identifying ingredients...</p>
      <div class="skeleton-list">
        <div class="skeleton-item"></div>
        <div class="skeleton-item"></div>
        <div class="skeleton-item"></div>
      </div>
    </div>
  `;
}

export function mount() {}
