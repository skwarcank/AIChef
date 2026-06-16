const FIELD_ORDER = ['dishType', 'cuisine', 'dietaryPreference', 'timeLimit', 'servings', 'skillLevel'];

export function render(state, ui) {
  const prefs = state.preferences || {};
  const fields = FIELD_ORDER.map(key => renderField(key, ui.customize.fields[key], prefs[key])).join('');
  const mustUse = (state.confirmed || []).map(item => {
    const selected = (prefs.mustUseIngredients || []).includes(item);
    return `
      <button class="preference-chip ${selected ? 'checked' : ''}" data-ingredient="${escapeHtml(item)}" type="button">
        ${escapeHtml(item)}
      </button>
    `;
  }).join('');

  return `
    <div class="screen customize-screen">
      <div class="screen-header">
        <button class="back-btn" id="back-btn">${ui.customize.back}</button>
        <span class="screen-title">${ui.customize.title}</span>
      </div>

      <p class="customize-intro">${ui.customize.intro}</p>

      <div class="preference-form">
        ${fields}

        <div class="preference-field">
          <label class="preference-label">${ui.customize.mustUse}</label>
          <div class="preference-chip-list" id="must-use-list">
            ${mustUse || `<span class="preference-help">${ui.customize.noneSelected}</span>`}
          </div>
        </div>

        <div class="preference-field">
          <label class="preference-label" for="avoidIngredients">${ui.customize.avoidLabel}</label>
          <input class="preference-input" id="avoidIngredients" value="${escapeHtml(prefs.avoidIngredients || '')}" placeholder="${ui.customize.avoidPlaceholder}" autocomplete="off" />
        </div>
      </div>

      <button class="generate-btn" id="generate-btn">${ui.customize.generate}</button>
    </div>
  `;
}

export function mount(container, actions) {
  container.querySelector('#back-btn').addEventListener('click', () => actions.backToConfirm());

  container.querySelectorAll('.preference-input[data-field]').forEach(input => {
    const field = input.closest('.preference-field');
    const options = field.querySelector('.preference-options');

    input.addEventListener('focus', () => field.classList.add('active'));
    input.addEventListener('click', () => field.classList.add('active'));

    options.querySelectorAll('button').forEach(option => {
      option.addEventListener('click', () => {
        input.value = option.dataset.value === 'Any' || option.dataset.value === 'None' ? '' : option.dataset.value;
        field.classList.remove('active');
      });
    });
  });

  container.addEventListener('click', (event) => {
    container.querySelectorAll('.preference-field.active').forEach(field => {
      if (!field.contains(event.target)) field.classList.remove('active');
    });
  });

  container.querySelectorAll('#must-use-list .preference-chip').forEach(chip => {
    chip.addEventListener('click', () => chip.classList.toggle('checked'));
  });

  container.querySelector('#generate-btn').addEventListener('click', () => {
    const preferences = {};
    container.querySelectorAll('.preference-input[data-field]').forEach(input => {
      preferences[input.dataset.field] = input.value.trim();
    });
    preferences.avoidIngredients = container.querySelector('#avoidIngredients').value.trim();
    preferences.mustUseIngredients = Array.from(container.querySelectorAll('#must-use-list .preference-chip.checked'))
      .map(chip => chip.dataset.ingredient);

    actions.generateRecipe(preferences);
  });
}

function renderField(key, field, value = '') {
  const options = field.options.map(option => `
    <button type="button" data-value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</button>
  `).join('');

  return `
    <div class="preference-field">
      <label class="preference-label" for="${key}">${field.label}</label>
      <input class="preference-input" id="${key}" data-field="${key}" value="${escapeHtml(value || '')}" placeholder="${escapeHtml(field.placeholder)}" autocomplete="off" />
      <div class="preference-options">${options}</div>
    </div>
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
