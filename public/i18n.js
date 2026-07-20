const COPY = {
  pl: {
    pantryLabels: {
      Salt: 'Sól',
      Pepper: 'Pieprz',
      'Olive Oil': 'Oliwa z oliwek',
      Water: 'Woda',
    },
    upload: {
      takePhoto: 'Zrób zdjęcie',
      orLabel: '— albo —',
      uploadPhoto: 'Prześlij zdjęcie',
      maxPhoto: 'Maks. 1 zdjęcie',
    },
    detecting: {
      message: 'Rozpoznawanie składników...',
      cancel: 'Anuluj i wróć',
    },
    confirm: {
      retake: '← Ponów zdjęcie',
      title: 'Potwierdź składniki',
      detected: 'Wykryte składniki',
      pantry: 'Składniki w spiżarni',
      noneDetected: 'Nie wykryto składników. Dodaj je poniżej.',
      removeIngredient: ingredient => `Usuń składnik: ${ingredient}`,
      removedNotice: ingredient => `Usunięto: ${ingredient}`,
      undoRemove: 'Cofnij',
      addPlaceholder: 'Dodaj składnik...',
      addButton: 'Dodaj',
      nextButton: 'Dalej: dopasuj przepis',
    },
    customize: {
      back: '← Składniki',
      title: 'Dopasuj przepis',
      intro: 'Możesz od razu wygenerować przepis. Doprecyzuj tylko wtedy, gdy masz konkretny plan.',
      readyTitle: 'Baza przepisu',
      readySummary: (count, preview, extraCount) => {
        if (!count) return 'Brak potwierdzonych składników.';
        return `${count} ${count === 1 ? 'składnik' : 'składników'}: ${preview}${extraCount ? ` + ${extraCount} więcej` : ''}`;
      },
      advancedSummary: 'Chcę doprecyzować przepis',
      advancedHint: 'Typ dania, kuchnia, czas, dieta i składniki obowiązkowe.',
      mustUse: 'Składniki obowiązkowe',
      noneSelected: 'Nie wybrano składników.',
      avoidLabel: 'Czego unikać?',
      avoidPlaceholder: 'Ostre jedzenie, pieczarki, orzeszki ziemne...',
      generate: 'Generuj przepis',
      fields: {
        dishType: {
          label: 'Rodzaj dania',
          placeholder: 'Dowolne, makaron, zupa, stir-fry...',
          options: [
            { value: 'Any', label: 'Dowolne' },
            { value: 'Pasta', label: 'Makaron' },
            { value: 'Soup', label: 'Zupa' },
            { value: 'Stir-fry', label: 'Stir-fry' },
            { value: 'Curry', label: 'Curry' },
            { value: 'Salad', label: 'Sałatka' },
            { value: 'Bowl', label: 'Bowl' },
            { value: 'Sandwich', label: 'Kanapka' },
            { value: 'Breakfast', label: 'Śniadanie' },
            { value: 'Snack', label: 'Przekąska' },
          ],
        },
        cuisine: {
          label: 'Kuchnia',
          placeholder: 'Dowolna, włoska, meksykańska...',
          options: [
            { value: 'Any', label: 'Dowolna' },
            { value: 'Italian', label: 'Włoska' },
            { value: 'Mexican', label: 'Meksykańska' },
            { value: 'Indian', label: 'Indyjska' },
            { value: 'Thai', label: 'Tajska' },
            { value: 'Japanese', label: 'Japońska' },
            { value: 'Mediterranean', label: 'Śródziemnomorska' },
            { value: 'Korean', label: 'Koreańska' },
            { value: 'American', label: 'Amerykańska' },
          ],
        },
        dietaryPreference: {
          label: 'Dieta',
          placeholder: 'Brak, wegańska, bez glutenu...',
          options: [
            { value: 'None', label: 'Brak' },
            { value: 'Vegan', label: 'Wegańska' },
            { value: 'Vegetarian', label: 'Wegetariańska' },
            { value: 'Gluten-free', label: 'Bez glutenu' },
            { value: 'Dairy-free', label: 'Bez nabiału' },
            { value: 'High-protein', label: 'Wysokobiałkowa' },
            { value: 'Low-carb', label: 'Niskowęglowodanowa' },
          ],
        },
        timeLimit: {
          label: 'Czas',
          placeholder: '20 minut, poniżej 30 minut...',
          options: [
            { value: '10 minutes', label: '10 minut' },
            { value: '20 minutes', label: '20 minut' },
            { value: '30 minutes', label: '30 minut' },
            { value: '45 minutes', label: '45 minut' },
            { value: 'No rush', label: 'Bez pośpiechu' },
          ],
        },
        servings: {
          label: 'Porcje',
          placeholder: '1, 2, 4...',
          options: [
            { value: '1', label: '1' },
            { value: '2', label: '2' },
            { value: '4', label: '4' },
            { value: '6', label: '6' },
          ],
        },
        skillLevel: {
          label: 'Poziom',
          placeholder: 'Początkujący, średni...',
          options: [
            { value: 'Beginner', label: 'Początkujący' },
            { value: 'Intermediate', label: 'Średniozaawansowany' },
            { value: 'Advanced', label: 'Zaawansowany' },
          ],
        },
      },
    },
    generating: {
      message: 'Generowanie przepisu...',
      cancel: 'Anuluj i popraw wybór',
    },
    recipe: {
      back: '← Składniki',
      newPhoto: 'Nowe zdjęcie',
      contextLabel: 'Dodatkowe informacje o przepisie',
      ingredients: 'Składniki',
      needToBuy: 'Do dokupienia',
      needToBuyNote: 'Te składniki nie są w potwierdzonych składnikach ani w spiżarni.',
      notUsed: 'Niewykorzystane',
      notUsedNote: 'Te potwierdzone składniki zostały pominięte, aby przepis był spójny.',
      instructions: 'Instrukcje',
      tryAnotherRecipe: 'Spróbuj innego przepisu',
      counter: (current, max) => `Przepis ${current} z ${max}`,
      photoBy: 'Zdjęcie: ',
    },
    error: {
      fallback: 'Nie udało się wygenerować przepisu z tymi składnikami.',
      back: '← Do składników',
      retryPhoto: 'Spróbuj ponownie z tym zdjęciem',
      retryRecipe: 'Ponów generowanie przepisu',
      editPreferences: 'Popraw wybór przepisu',
      tryAnotherPhoto: 'Zrób inne zdjęcie',
    },
    errors: {
      detectFailed: 'Nie udało się rozpoznać składników. Spróbuj wyraźniejszego zdjęcia.',
      network: 'Błąd sieci. Sprawdź połączenie i spróbuj ponownie.',
      generic: 'Coś poszło nie tak. Spróbuj ponownie.',
      recipeFailed: 'Nie udało się wygenerować przepisu. Spróbuj innych składników.',
      imageFailed: 'Nie udało się przeanalizować obrazu.',
      fallbackRecipe: 'Nie udało się wygenerować przepisu z tymi składnikami.',
    },
  },
};

export function getUI(locale = 'pl') {
  return COPY[locale] || COPY.pl;
}
