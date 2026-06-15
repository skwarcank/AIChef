export function render(state) {
  const hasNonPantry = state.detected.length > 0;

  const detectedItems = state.detected.map((item, i) => `
      <div class="ingredient-item">
        <span class="ingredient-name">${escapeHtml(item)}</span>
        <button class="toggle-btn active" data-index="${i}">
          ✕
        </button>
      </div>
    `).join('');

  const pantryItems = state.pantry.map((item, i) => `
    <button class="pantry-chip ${item.checked ? 'checked' : 'unchecked'}" data-index="${i}">
      ${item.checked ? '✓ ' : ''}${item.name}
    </button>
  `).join('');

  return `
    <div class="screen confirm-screen">
      <div class="screen-header">
        <button class="back-btn" id="retake-btn">← Retake Photo</button>
        <span class="screen-title">Confirm Ingredients</span>
      </div>

      <span class="section-label">Detected Ingredients</span>
      <div class="ingredient-list" id="detected-list">
        ${detectedItems || '<p style="color: var(--text-secondary); padding: 8px 0;">No ingredients detected. Add them below.</p>'}
      </div>

      <span class="section-label">Pantry Staples</span>
      <div class="pantry-list" id="pantry-list">
        ${pantryItems}
      </div>

      <div class="add-ingredient-area">
        <input class="add-input" id="add-input" placeholder="Add ingredient..." autocomplete="off" />
        <button class="add-btn" id="add-btn">Add</button>
      </div>

      <button class="generate-btn" id="customize-btn" ${!hasNonPantry ? 'disabled' : ''}>
        Next: Customize Recipe
      </button>
    </div>
  `;
}

export function mount(container, actions) {
  container.querySelector('#retake-btn').addEventListener('click', () => actions.retakePhoto());

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

function splitIngredients(value) {
  return value
    .split(/\s*(?:,|;|\/|\+|\band\b|\n)\s*/i)
    .map(item => item.trim())
    .filter(Boolean);
}
