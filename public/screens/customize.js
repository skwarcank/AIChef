import { toIngredientIdentity } from '../domain/ingredient-identity.mjs';

const FIELD_ORDER = ['dishType', 'cuisine', 'dietaryPreference', 'timeLimit', 'servings', 'skillLevel'];

export function render(state, ui) {
  const prefs = state.preferences || {};
  const fields = FIELD_ORDER.map(key => renderField(key, ui.customize.fields[key], prefs[key])).join('');
  const confirmedIngredients = (state.confirmed || []).map(toIngredientIdentity).filter(Boolean);
  const confirmed = confirmedIngredients.map(item => item.display);
  const ingredientPreview = confirmed.slice(0, 3).map(escapeHtml).join(', ');
  const extraIngredientCount = Math.max(confirmed.length - 3, 0);
  const advancedOpen = hasPreferences(prefs) ? 'open' : '';
  const mustUse = confirmedIngredients.map(item => {
    const selected = (prefs.mustUseIngredients || []).includes(item.display);
    return `
      <button class="preference-chip ${selected ? 'checked' : ''}" data-ingredient="${escapeAttribute(item.display)}" type="button">
        ${escapeHtml(item.display)}
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

      <div class="customize-ready">
        <span class="customize-ready-title">${ui.customize.readyTitle}</span>
        <p>${ui.customize.readySummary(confirmed.length, ingredientPreview, extraIngredientCount)}</p>
      </div>

      <details class="preference-advanced" id="preference-advanced" ${advancedOpen}>
        <summary>
          <span>${ui.customize.advancedSummary}</span>
          <small>${ui.customize.advancedHint}</small>
        </summary>

        <div class="preference-form">
          ${fields}

          <div class="preference-field" role="group" aria-labelledby="must-use-label">
            <span class="preference-label" id="must-use-label">${ui.customize.mustUse}</span>
            <div class="preference-chip-list" id="must-use-list">
              ${mustUse || `<span class="preference-help">${ui.customize.noneSelected}</span>`}
            </div>
          </div>

          <div class="preference-field">
            <label class="preference-label" for="avoidIngredients">${ui.customize.avoidLabel}</label>
            <input class="preference-input" id="avoidIngredients" value="${escapeAttribute(prefs.avoidIngredients || '')}" placeholder="${escapeAttribute(ui.customize.avoidPlaceholder)}" autocomplete="off" />
          </div>
        </div>
      </details>

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
    input.addEventListener('input', () => {
      input.dataset.value = '';
    });

    options.querySelectorAll('button').forEach(option => {
      option.addEventListener('click', () => {
        input.value = option.dataset.clear === 'true' ? '' : option.dataset.label;
        input.dataset.value = option.dataset.clear === 'true' ? '' : option.dataset.value;
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
      preferences[input.dataset.field] = input.dataset.value || input.value.trim();
    });
    preferences.avoidIngredients = container.querySelector('#avoidIngredients').value.trim();
    preferences.mustUseIngredients = Array.from(container.querySelectorAll('#must-use-list .preference-chip.checked'))
      .map(chip => chip.dataset.ingredient);

    actions.generateRecipe(preferences);
  });
}

function renderField(key, field, value = '') {
  const optionValue = getOptionValue(field, value);
  const options = field.options.map(option => `
    <button type="button" data-label="${escapeAttribute(option.label)}" data-value="${escapeAttribute(option.value)}" data-clear="${option.value === 'Any' || option.value === 'None'}">${escapeHtml(option.label)}</button>
  `).join('');

  return `
    <div class="preference-field">
      <label class="preference-label" for="${key}">${field.label}</label>
      <input class="preference-input" id="${key}" data-field="${key}" data-value="${escapeAttribute(optionValue)}" value="${escapeAttribute(getDisplayValue(field, value))}" placeholder="${escapeAttribute(field.placeholder)}" autocomplete="off" />
      <div class="preference-options">${options}</div>
    </div>
  `;
}

function hasPreferences(prefs) {
  return FIELD_ORDER.some(key => prefs[key])
    || Boolean(prefs.avoidIngredients)
    || Boolean(prefs.mustUseIngredients?.length);
}

function getDisplayValue(field, value = '') {
  if (!value) return '';
  const option = field.options.find(item => item.value === value || item.label === value);
  return option?.label || value;
}

function getOptionValue(field, value = '') {
  if (!value) return '';
  const option = field.options.find(item => item.value === value || item.label === value);
  return option && option.value !== 'Any' && option.value !== 'None' ? option.value : '';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttribute(str) {
  return escapeHtml(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
