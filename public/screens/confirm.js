export function render(state, ui) {
  const hasNonPantry = state.detected.length > 0;
  const undoHtml = state.lastRemovedIngredient ? `
    <div class="undo-banner" role="status">
      <span>${escapeHtml(ui.confirm.removedNotice(state.lastRemovedIngredient.name))}</span>
      <button class="undo-btn" id="undo-remove" type="button">${ui.confirm.undoRemove}</button>
    </div>
  ` : '';

  const detectedItems = state.detected.map((item, i) => `
      <div class="ingredient-item">
        <span class="ingredient-name">${escapeHtml(item)}</span>
        <button class="toggle-btn active" data-index="${i}" aria-label="${escapeAttribute(ui.confirm.removeIngredient(item))}">
          ✕
        </button>
      </div>
  `).join('');

  const pantryItems = state.pantry.map((item, i) => `
    <button class="pantry-chip ${item.checked ? 'checked' : 'unchecked'}" data-index="${i}">
      ${item.checked ? '✓ ' : ''}${escapeHtml(ui.pantryLabels[item.name] || item.name)}
    </button>
  `).join('');

  return `
    <div class="screen confirm-screen">
      <div class="screen-header">
        <button class="back-btn" id="retake-btn">${ui.confirm.retake}</button>
        <span class="screen-title">${ui.confirm.title}</span>
      </div>

      ${undoHtml}

      <span class="section-label">${ui.confirm.detected}</span>
      <div class="ingredient-list" id="detected-list">
        ${detectedItems || `<p class="empty-note">${ui.confirm.noneDetected}</p>`}
      </div>

      <span class="section-label">${ui.confirm.pantry}</span>
      <div class="pantry-list" id="pantry-list">
        ${pantryItems}
      </div>

      <div class="add-ingredient-area">
        <input class="add-input" id="add-input" placeholder="${ui.confirm.addPlaceholder}" autocomplete="off" />
        <button class="add-btn" id="add-btn">${ui.confirm.addButton}</button>
      </div>

      <button class="generate-btn" id="customize-btn" ${!hasNonPantry ? 'disabled' : ''}>
        ${ui.confirm.nextButton}
      </button>
    </div>
  `;
}

export function mount(container, actions) {
  container.querySelector('#retake-btn').addEventListener('click', () => actions.retakePhoto());

  container.querySelector('#undo-remove')?.addEventListener('click', () => actions.restoreDetected());

  container.querySelectorAll('#detected-list .toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => actions.toggleDetected(parseInt(btn.dataset.index)));
  });

  container.querySelectorAll('#pantry-list .pantry-chip').forEach(btn => {
    btn.addEventListener('click', () => actions.togglePantry(parseInt(btn.dataset.index)));
  });

  const addInput = container.querySelector('#add-input');
  const addBtn = container.querySelector('#add-btn');

  function addIngredient() {
    splitIngredients(addInput.value).forEach(name => actions.addCustomIngredient(name));
  }

  addBtn.addEventListener('click', addIngredient);
  addInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addIngredient();
  });

  const customizeBtn = container.querySelector('#customize-btn');
  customizeBtn.addEventListener('click', () => {
    if (!customizeBtn.disabled) actions.openCustomize();
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

function splitIngredients(value) {
  return value
    .split(/\s*(?:,|;|\/|\+|\band\b|\n)\s*/i)
    .map(item => item.trim())
    .filter(Boolean);
}
