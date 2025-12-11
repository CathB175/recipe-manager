// Recipe Manager Application
class RecipeManager {
    constructor() {
        this.recipes = this.loadData('recipes') || [];
        this.mealPlan = this.loadData('mealPlan') || {};
        this.shoppingList = [];
        this.currentView = 'recipes';
        this.editingRecipeId = null;
        this.mealPlanDays = 7;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderRecipes();
        this.updateCollectionFilter();
        this.cleanOldMealPlan();
        this.renderMealPlan();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.switchView(view);
            });
        });

        // Recipe Modal
        document.getElementById('add-recipe-btn').addEventListener('click', () => {
            this.openRecipeModal();
        });

        document.querySelector('#recipe-modal .close').addEventListener('click', () => {
            this.closeRecipeModal();
        });

        document.getElementById('cancel-recipe').addEventListener('click', () => {
            this.closeRecipeModal();
        });

        document.getElementById('recipe-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveRecipe();
        });

        // Recipe Detail Modal
        document.querySelector('#recipe-detail-modal .close').addEventListener('click', () => {
            this.closeRecipeDetailModal();
        });

        // Search and Filter
        document.getElementById('search-input').addEventListener('input', () => {
            this.renderRecipes();
        });

        document.getElementById('collection-filter').addEventListener('change', () => {
            this.renderRecipes();
        });

        // Meal Plan
        document.querySelectorAll('input[name="plan-days"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.mealPlanDays = parseInt(e.target.value);
                this.renderMealPlan();
            });
        });

        document.getElementById('generate-shopping-list').addEventListener('click', () => {
            this.generateShoppingList();
        });

        // Shopping List
        document.getElementById('print-shopping-list').addEventListener('click', () => {
            window.print();
        });

        document.getElementById('clear-shopping-list').addEventListener('click', () => {
            if (confirm('Clear shopping list?')) {
                this.shoppingList = [];
                this.renderShoppingList();
            }
        });

        // Import/Export
        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('copy-export-btn').addEventListener('click', () => {
            this.copyExportToClipboard();
        });

        document.getElementById('import-btn').addEventListener('click', () => {
            this.importData();
        });

        // Close modals on outside click
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('active');
            }
        });
    }

    switchView(view) {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.view').forEach(v => {
            v.classList.remove('active');
        });

        document.querySelector(`[data-view="${view}"]`).classList.add('active');
        document.getElementById(`${view}-view`).classList.add('active');
        this.currentView = view;

        if (view === 'shopping-list') {
            this.renderShoppingList();
        }
    }

    loadData(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Error loading data:', e);
            return null;
        }
    }

    saveData(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error('Error saving data:', e);
        }
    }

    openRecipeModal(recipe = null) {
        this.editingRecipeId = recipe ? recipe.id : null;
        const modal = document.getElementById('recipe-modal');
        const form = document.getElementById('recipe-form');
        
        document.getElementById('modal-title').textContent = recipe ? 'Edit Recipe' : 'Add Recipe';
        
        if (recipe) {
            document.getElementById('recipe-name').value = recipe.name;
            document.getElementById('recipe-servings').value = recipe.servings;
            document.getElementById('recipe-prep-time').value = recipe.prepTime || '';
            document.getElementById('recipe-cook-time').value = recipe.cookTime || '';
            document.getElementById('recipe-source').value = recipe.source || '';
            document.getElementById('recipe-image').value = recipe.image || '';
            document.getElementById('recipe-collections').value = recipe.collections.join(', ');
            document.getElementById('recipe-keywords').value = recipe.keywords.join(', ');
            document.getElementById('recipe-ingredients').value = recipe.ingredients.join('\n');
            document.getElementById('recipe-steps').value = recipe.steps.join('\n');
            document.getElementById('recipe-nutrition').value = recipe.nutrition || '';
            document.getElementById('recipe-notes').value = recipe.notes || '';
        } else {
            form.reset();
        }
        
        modal.classList.add('active');
    }

    closeRecipeModal() {
        document.getElementById('recipe-modal').classList.remove('active');
        this.editingRecipeId = null;
    }

    saveRecipe() {
        const recipe = {
            id: this.editingRecipeId || Date.now().toString(),
            name: document.getElementById('recipe-name').value,
            servings: parseInt(document.getElementById('recipe-servings').value),
            prepTime: parseInt(document.getElementById('recipe-prep-time').value) || 0,
            cookTime: parseInt(document.getElementById('recipe-cook-time').value) || 0,
            source: document.getElementById('recipe-source').value,
            image: document.getElementById('recipe-image').value,
            collections: document.getElementById('recipe-collections').value
                .split(',').map(c => c.trim()).filter(c => c),
            keywords: document.getElementById('recipe-keywords').value
                .split(',').map(k => k.trim()).filter(k => k),
            ingredients: document.getElementById('recipe-ingredients').value
                .split('\n').map(i => i.trim()).filter(i => i),
            steps: document.getElementById('recipe-steps').value
                .split('\n').map(s => s.trim()).filter(s => s),
            nutrition: document.getElementById('recipe-nutrition').value,
            notes: document.getElementById('recipe-notes').value
        };

        if (this.editingRecipeId) {
            const index = this.recipes.findIndex(r => r.id === this.editingRecipeId);
            this.recipes[index] = recipe;
        } else {
            this.recipes.push(recipe);
        }

        this.saveData('recipes', this.recipes);
        this.renderRecipes();
        this.updateCollectionFilter();
        this.closeRecipeModal();
    }

    deleteRecipe(id) {
        if (confirm('Delete this recipe?')) {
            this.recipes = this.recipes.filter(r => r.id !== id);
            this.saveData('recipes', this.recipes);
            this.renderRecipes();
            this.updateCollectionFilter();
            this.closeRecipeDetailModal();
        }
    }

    renderRecipes() {
        const searchTerm = document.getElementById('search-input').value.toLowerCase();
        const collectionFilter = document.getElementById('collection-filter').value;
        
        let filtered = this.recipes.filter(recipe => {
            const matchesSearch = recipe.name.toLowerCase().includes(searchTerm) ||
                recipe.ingredients.some(i => i.toLowerCase().includes(searchTerm)) ||
                recipe.keywords.some(k => k.toLowerCase().includes(searchTerm));
            
            const matchesCollection = !collectionFilter || 
                recipe.collections.includes(collectionFilter);
            
            return matchesSearch && matchesCollection;
        });

        const grid = document.getElementById('recipes-grid');
        
        if (filtered.length === 0) {
            grid.innerHTML = '<p class="empty-message">No recipes found. Add your first recipe!</p>';
            return;
        }

        grid.innerHTML = filtered.map(recipe => `
            <div class="recipe-card" onclick="recipeManager.viewRecipe('${recipe.id}')">
                ${recipe.image ? 
                    `<img src="${recipe.image}" alt="${recipe.name}" class="recipe-card-image">` :
                    `<div class="recipe-card-image"></div>`
                }
                <div class="recipe-card-content">
                    <div class="recipe-card-title">${recipe.name}</div>
                    <div class="recipe-card-meta">
                        ${recipe.servings} servings • 
                        ${recipe.prepTime + recipe.cookTime} min total
                    </div>
                    <div class="recipe-card-collections">
                        ${recipe.collections.map(c => 
                            `<span class="collection-tag">${c}</span>`
                        ).join('')}
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateCollectionFilter() {
        const select = document.getElementById('collection-filter');
        const collections = new Set();
        
        this.recipes.forEach(recipe => {
            recipe.collections.forEach(c => collections.add(c));
        });

        const currentValue = select.value;
        select.innerHTML = '<option value="">All Collections</option>' +
            Array.from(collections).sort().map(c => 
                `<option value="${c}">${c}</option>`
            ).join('');
        
        if (currentValue && collections.has(currentValue)) {
            select.value = currentValue;
        }
    }

    viewRecipe(id) {
        const recipe = this.recipes.find(r => r.id === id);
        if (!recipe) return;

        const content = document.getElementById('recipe-detail-content');
        content.innerHTML = `
            <div class="recipe-detail-header">
                ${recipe.image ? 
                    `<img src="${recipe.image}" alt="${recipe.name}" class="recipe-detail-image">` : 
                    ''
                }
                <h2 class="recipe-detail-title">${recipe.name}</h2>
                <div class="recipe-detail-meta">
                    <span>🍽️ ${recipe.servings} servings</span>
                    <span>⏱️ Prep: ${recipe.prepTime} min</span>
                    <span>🔥 Cook: ${recipe.cookTime} min</span>
                    ${recipe.source ? `<span>📖 ${recipe.source}</span>` : ''}
                </div>
                <div class="recipe-card-collections">
                    ${recipe.collections.map(c => 19:04<span class="collection-tag">${c}</span>`
).join('')}
</div>
</div>
    <div class="recipe-detail-actions">
            <button class="btn btn-primary" onclick="recipeManager.openRecipeModal(recipeManager.recipes.find(r => r.id === '${id}'))">
                Edit Recipe
            </button>
            <button class="btn btn-danger" onclick="recipeManager.deleteRecipe('${id}')">
                Delete Recipe
            </button>
        </div>

        <div class="recipe-detail-section">
            <h3>Ingredients</h3>
            <ul>
                ${recipe.ingredients.map(i => `<li>${i}</li>`).join('')}
            </ul>
        </div>

        <div class="recipe-detail-section">
            <h3>Instructions</h3>
            <ol>
                ${recipe.steps.map(s => `<li>${s}</li>`).join('')}
            </ol>
        </div>

        ${recipe.nutrition ? `
            <div class="recipe-detail-section">
                <h3>Nutrition Information</h3>
                <p>${recipe.nutrition.replace(/\n/g, '<br>')}</p>
            </div>
        ` : ''}

        ${recipe.notes ? `
            <div class="recipe-detail-section">
                <h3>Notes</h3>
                <p>${recipe.notes.replace(/\n/g, '<br>')}</p>
            </div>
        ` : ''}
    `;

    document.getElementById('recipe-detail-modal').classList.add('active');
}

closeRecipeDetailModal() {
    document.getElementById('recipe-detail-modal').classList.remove('active');
}

cleanOldMealPlan() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    Object.keys(this.mealPlan).forEach(dateStr => {
        const planDate = new Date(dateStr);
        if (planDate < today) {
            delete this.mealPlan[dateStr];
        }
    });
    
    this.saveData('mealPlan', this.mealPlan);
}

renderMealPlan() {
    const grid = document.getElementById('meal-plan-grid');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const days = [];
    for (let i = 0; i < this.mealPlanDays; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        days.push(date);
    }

    grid.innerHTML = days.map(date => {
        const dateStr = date.toISOString().split('T')[0];
        const isPast = date < today;
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        
        return `
            <div class="meal-day ${isPast ? 'past' : ''}" data-date="${dateStr}">
                <div class="meal-day-header">${dayName}</div>
                <div class="meal-slots">
                    ${this.renderMealSlot(dateStr, 'breakfast', 'Breakfast')}
                    ${this.renderMealSlot(dateStr, 'lunch', 'Lunch')}
                    ${this.renderMealSlot(dateStr, 'dinner', 'Dinner')}
                </div>
            </div>
        `;
    }).join('');

    // Add event listeners for meal selections
    grid.querySelectorAll('select').forEach(select => {
        select.addEventListener('change', (e) => {
            const [date, mealType] = e.target.dataset.meal.split('|');
            if (!this.mealPlan[date]) this.mealPlan[date] = {};
            this.mealPlan[date][mealType] = e.target.value;
            this.saveData('mealPlan', this.mealPlan);
        });
    });
}

renderMealSlot(date, mealType, label) {
    const selectedRecipe = this.mealPlan[date]?.[mealType] || '';
    
    return `
        <div class="meal-slot">
            <div class="meal-slot-label">${label}</div>
            <select data-meal="${date}|${mealType}">
                <option value="">No meal</option>
                ${this.recipes.map(r => 
                    `<option value="${r.id}" ${r.id === selectedRecipe ? 'selected' : ''}>
                        ${r.name}
                    </option>`
                ).join('')}
            </select>
        </div>
    `;
}

generateShoppingList() {
    const ingredients = {};
    
    Object.entries(this.mealPlan).forEach(([date, meals]) => {
        Object.values(meals).forEach(recipeId => {
            if (!recipeId) return;
            
            const recipe = this.recipes.find(r => r.id === recipeId);
            if (!recipe) return;
            
            recipe.ingredients.forEach(ingredient => {
                if (!ingredients[ingredient]) {
                    ingredients[ingredient] = 0;
                }
                ingredients[ingredient]++;
            });
        });
    });

    this.shoppingList = Object.entries(ingredients).map(([ingredient, count]) => ({
        ingredient,
        count
    }));

    this.switchView('shopping-list');
}

renderShoppingList() {
    const content = document.getElementById('shopping-list-content');
    
    if (this.shoppingList.length === 0) {
        content.innerHTML = '<p class="empty-message">No shopping list generated yet. Go to Meal Plan and click "Generate Shopping List".</p>';
        return;
    }

    // Group by category (simple categorization)
    const categorized = {
        'Produce': [],
        'Proteins': [],
        'Dairy': [],
        'Pantry': [],
        'Other': []
    };

    this.shoppingList.forEach(item => {
        const lower = item.ingredient.toLowerCase();
        if (lower.match(/vegetable|fruit|lettuce|tomato|onion|garlic|herb|spice/)) {
            categorized['Produce'].push(item);
        } else if (lower.match(/chicken|beef|pork|fish|meat|egg/)) {
            categorized['Proteins'].push(item);
        } else if (lower.match(/milk|cheese|butter|cream|yogurt/)) {
            categorized['Dairy'].push(item);
        } else if (lower.match(/flour|sugar|salt|oil|rice|pasta|bread/)) {
            categorized['Pantry'].push(item);
        } else {
            categorized['Other'].push(item);
        }
    });

    content.innerHTML = Object.entries(categorized)
        .filter(([_, items]) => items.length > 0)
        .map(([category, items]) => `
            <div class="shopping-category">
                <h3>${category}</h3>
                <ul>
                    ${items.map(item => 
                        `<li>${item.ingredient} ${item.count > 1 ? `(×${item.count})` : ''}</li>`
                    ).join('')}
                </ul>
            </div>
        `).join('');
}

exportData() {
    const data = {
        recipes: this.recipes,
        mealPlan: this.mealPlan,
        exportDate: new Date().toISOString()
    };
    
    document.getElementById('export-textarea').value = JSON.stringify(data, null, 2);
}

copyExportToClipboard() {
    const textarea = document.getElementById('export-textarea');
    if (!textarea.value) {
        alert('Please generate export first');
        return;
    }
    
    textarea.select();
    document.execCommand('copy');
    alert('Copied to clipboard!');
}

importData() {
    const textarea = document.getElementById('import-textarea');
    try {
        const data = JSON.parse(textarea.value);
        
        if (!data.recipes || !Array.isArray(data.recipes)) {
            throw new Error('Invalid data format');
        }
        
        if (confirm('This will replace all current data. Continue?')) {
            this.recipes = data.recipes;
            this.mealPlan = data.mealPlan || {};
            this.saveData('recipes', this.recipes);
            this.saveData('mealPlan', this.mealPlan);
            this.renderRecipes();
            this.updateCollectionFilter();
            this.renderMealPlan();
            textarea.value = '';
            alert('Data imported successfully!');
        }
    } catch (e) {
        alert('Error importing data: ' + e.message);
    }
}
  }
// Initialize the app
const recipeManager = new RecipeManager();                      `
