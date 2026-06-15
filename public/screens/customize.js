const FIELDS = [
  {
    key: 'dishType',
    label: 'Dish type',
    placeholder: 'Any, pasta, soup, stir-fry...',
    options: ['Any', 'Pasta', 'Soup', 'Stir-fry', 'Curry', 'Salad', 'Bowl', 'Sandwich', 'Breakfast', 'Snack'],
  },
  {
    key: 'cuisine',
    label: 'Cuisine',
    placeholder: 'Any, Italian, Mexican...',
    options: ['Any', 'Italian', 'Mexican', 'Indian', 'Thai', 'Japanese', 'Mediterranean', 'Korean', 'American'],
  },
  {
    key: 'dietaryPreference',
    label: 'Diet',
    placeholder: 'None, vegan, gluten-free...',
    options: ['None', 'Vegan', 'Vegetarian', 'Gluten-free', 'Dairy-free', 'High-protein', 'Low-carb'],
  },
  {
    key: 'timeLimit',
    label: 'Time available',
    placeholder: '20 minutes, under 30 minutes...',
    options: ['10 minutes', '20 minutes', '30 minutes', '45 minutes', 'No rush'],
  },
  {
    key: 'servings',
    label: 'Servings',
    placeholder: '1, 2, 4...',
    options: ['1', '2', '4', '6'],
  },
  {
    key: 'skillLevel',
    label: 'Skill level',
    placeholder: 'Beginner, intermediate...',
    options: ['Beginner', 'Intermediate', 'Advanced'],
  },
];

export function render(state) {
  const prefs = state.preferences || {};
  const fields = FIELDS.map(field => renderField(field, prefs[field.key])).join('');
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
        <button class="back-btn" id="back-btn">← Ingredients</button>
        <span class="screen-title">Customize Recipe</span>
      </div>

      <p class="customize-intro">Tell AIChef what kind of meal you want. Choose a suggestion or type your own.</p>

      <div class="preference-form">
        ${fields}

        <div class="preference-field">
          <label class="preference-label">Must-use ingredients</label>
          <div class="preference-chip-list" id="must-use-list">
            ${mustUse || '<span class="preference-help">No ingredients selected.</span>'}
          </div>
        </div>

        <div class="preference-field">
          <label class="preference-label" for="avoidIngredients">Avoid anything?</label>
          <input class="preference-input" id="avoidIngredients" value="${escapeHtml(prefs.avoidIngredients || '')}" placeholder="Spicy food, mushrooms, peanuts..." autocomplete="off" />
        </div>
      </div>

      <button class="generate-btn" id="generate-btn">🍳 Generate Recipe</button>
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

function renderField(field, value = '') {
  const options = field.options.map(option => `
    <button type="button" data-value="${escapeHtml(option)}">${escapeHtml(option)}</button>
  `).join('');

  return `
    <div class="preference-field">
      <label class="preference-label" for="${field.key}">${field.label}</label>
      <input class="preference-input" id="${field.key}" data-field="${field.key}" value="${escapeHtml(value || '')}" placeholder="${escapeHtml(field.placeholder)}" autocomplete="off" />
      <div class="preference-options">${options}</div>
    </div>
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
