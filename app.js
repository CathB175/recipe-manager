// Recipe Manager Application
class RecipeManager {
    constructor() {
        this.recipes = this.loadData('recipes') || [];
        this.mealPlan = this.loadData('mealPlan') || {};
        this.shoppingList = [];
        this.currentView = 'recipes';
        this.editingRecipeId = null;
        this.mealPlanDays = 7;
        
        this.migrateData();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderRecipes();
        this.updateCollectionFilter();
        this.cleanOldMealPlan();
        this.renderMealPlan();
    }

    migrateData() {
        // Fix any existing recipes that might have undefined arrays or bad data
        let validRecipes = [];
        
        this.recipes.forEach(recipe => {
            try {
                // Ensure recipe has an id
                if (!recipe.id) {
                    recipe.id = Date.now().toString() + Math.random();
                }
                
                // Ensure recipe has a name
                if (!recipe.name || typeof recipe.name !== 'string') {
                    recipe.name = 'Untitled Recipe';
                }
                
                // Fix all arrays
                recipe.collections = Array.isArray(recipe.collections) ? recipe.collections : [];
                recipe.keywords = Array.isArray(recipe.keywords) ? recipe.keywords : [];
                recipe.ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
                recipe.steps = Array.isArray(recipe.steps) ? recipe.steps : [];
                
                // Fix numbers
                recipe.servings = parseInt(recipe.servings) || 4;
                recipe.prepTime = parseInt(recipe.prepTime) || 0;
                recipe.cookTime = parseInt(recipe.cookTime) || 0;
                
                // Fix strings
                recipe.source = recipe.source || '';
                recipe.image = recipe.image || '';
                recipe.nutrition = recipe.nutrition || '';
                recipe.notes = recipe.notes || '';
                
                validRecipes.push(recipe);
            } catch (e) {
                console.error('Skipping invalid recipe:', e);
            }
        });
        
        this.recipes = validRecipes;
        this.saveData('recipes', this.recipes);
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
        } else if (view === 'import-export') {
            this.addClearAllButton();
        } else if (view === 'meal-plan') {
            this.renderMealPlan();
        }
    }

    addClearAllButton() {
        // Add a clear all data button to the import/export page
        const importExportView = document.getElementById('import-export-view');
        if (!document.getElementById('clear-all-data-btn')) {
            const section = document.createElement('div');
            section.className = 'import-export-section';
            section.style.borderTop = '2px solid #ef4444';
            section.style.paddingTop = '24px';
            section.innerHTML = `
                <h2 style="color: #ef4444;">Danger Zone</h2>
                <p>Permanently delete all recipes and meal plans. This cannot be undone!</p>
                <button id="clear-all-data-btn" class="btn btn-danger">Clear All Data</button>
            `;
            importExportView.appendChild(section);
            
            document.getElementById('clear-all-data-btn').addEventListener('click', () => {
                if (confirm('⚠️ WARNING: This will delete ALL recipes and meal plans permanently. This cannot be undone!\n\nAre you absolutely sure?')) {
                    if (confirm('Last chance! Click OK to delete everything.')) {
                        this.recipes = [];
                        this.mealPlan = {};
                        this.shoppingList = [];
                        localStorage.removeItem('recipes');
                        localStorage.removeItem('mealPlan');
                        this.renderRecipes();
                        this.updateCollectionFilter();
                        this.renderMealPlan();
                        alert('All data has been cleared.');
                        this.switchView('recipes');
                    }
                }
            });
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
            alert('Error saving data. Please try again.');
        }
    }

    openRecipeModal(recipe = null) {
        // IMPORTANT: Close the detail modal first if it's open
        this.closeRecipeDetailModal();
        
        this.editingRecipeId = recipe ? recipe.id : null;
        const modal = document.getElementById('recipe-modal');
        const form = document.getElementById('recipe-form');
        
        document.getElementById('modal-title').textContent = recipe ? 'Edit Recipe' : 'Add Recipe';
        
        if (recipe) {
            document.getElementById('recipe-name').value = recipe.name || '';
            document.getElementById('recipe-servings').value = recipe.servings || 4;
            document.getElementById('recipe-prep-time').value = recipe.prepTime || '';
            document.getElementById('recipe-cook-time').value = recipe.cookTime || '';
            document.getElementById('recipe-source').value = recipe.source || '';
            document.getElementById('recipe-image').value = recipe.image || '';
            document.getElementById('recipe-collections').value = (recipe.collections || []).join(', ');
            document.getElementById('recipe-keywords').value = (recipe.keywords || []).join(', ');
            document.getElementById('recipe-ingredients').value = (recipe.ingredients || []).join('\n');
            document.getElementById('recipe-steps').value = (recipe.steps || []).join('\n');
            document.getElementById('recipe-nutrition').value = recipe.nutrition || '';
            document.getElementById('recipe-notes').value = recipe.notes || '';
        } else {
            form.reset();
            document.getElementById('recipe-servings').value = 4;
        }
        
        modal.classList.add('active');
    }

    closeRecipeModal() {
        document.getElementById('recipe-modal').classList.remove('active');
        this.editingRecipeId = null;
    }

    saveRecipe() {
        const nameValue = document.getElementById('recipe-name').value.trim();
        const ingredientsValue = document.getElementById('recipe-ingredients').value.trim();
        const stepsValue = document.getElementById('recipe-steps').value.trim();
        
        if (!nameValue) {
            alert('Please enter a recipe name');
            return;
        }
        
        if (!ingredientsValue) {
            alert('Please enter at least one ingredient');
            return;
        }
        
        if (!stepsValue) {
            alert('Please enter at least one step');
            return;
        }
        
        const recipe = {
            id: this.editingRecipeId || Date.now().toString(),
            name: nameValue,
            servings: parseInt(document.getElementById('recipe-servings').value) || 4,
            prepTime: parseInt(document.getElementById('recipe-prep-time').value) || 0,
            cookTime: parseInt(document.getElementById('recipe-cook-time').value) || 0,
            source: document.getElementById('recipe-source').value.trim(),
            image: document.getElementById('recipe-image').value.trim(),
            collections: document.getElementById('recipe-collections').value
                .split(',').map(c => c.trim()).filter(c => c),
            keywords: document.getElementById('recipe-keywords').value
                .split(',').map(k => k.trim()).filter(k => k),
            ingredients: ingredientsValue
                .split('\n').map(i => i.trim()).filter(i => i),
            steps: stepsValue
                .split('\n').map(s => s.trim()).filter(s => s),
            nutrition: document.getElementById('recipe-nutrition').value.trim(),
            notes: document.getElementById('recipe-notes').value.trim()
        };

        if (this.editingRecipeId) {
            const index = this.recipes.findIndex(r => r.id === this.editingRecipeId);
            if (index !== -1) {
                this.recipes[index] = recipe;
            }
        } else {
            this.recipes.push(recipe);
        }

        this.saveData('recipes', this.recipes);
        this.renderRecipes();
        this.updateCollectionFilter();
        this.renderMealPlan(); // Update meal plan dropdowns
        this.closeRecipeModal();
        
        alert('Recipe saved successfully!');
    }

    deleteRecipe(id) {
        if (confirm('Delete this recipe?')) {
            this.recipes = this.recipes.filter(r => r.id !== id);
            this.saveData('recipes', this.recipes);
            this.renderRecipes();
            this.updateCollectionFilter();
            this.renderMealPlan(); // Update meal plan dropdowns
            this.closeRecipeDetailModal();
            alert('Recipe deleted successfully!');
        }
    }

    renderRecipes() {
        const searchTerm = document.getElementById('search-input').value.toLowerCase();
        const collectionFilter = document.getElementById('collection-filter').value;
        
        let filtered = this.recipes.filter(recipe => {
            const collections = recipe.collections || [];
            const ingredients = recipe.ingredients || [];
            const keywords = recipe.keywords || [];
            
            const matchesSearch = recipe.name.toLowerCase().includes(searchTerm) ||
                ingredients.some(i => i.toLowerCase().includes(searchTerm)) ||
                keywords.some(k => k.toLowerCase().includes(searchTerm));
            
            const matchesCollection = !collectionFilter || 
                collections.includes(collectionFilter);
            
            return matchesSearch && matchesCollection;
        });

        const grid = document.getElementById('recipes-grid');
        
        if (filtered.length === 0) {
            grid.innerHTML = '<p class="empty-message">No recipes found. Add your first recipe!</p>';
            return;
        }

        grid.innerHTML = filtered.map(recipe => {
            const collections = recipe.collections || [];
            const prepTime = recipe.prepTime || 0;
            const cookTime = recipe.cookTime || 0;
            
            return `
                <div class="recipe-card">
                    <div onclick="recipeManager.viewRecipe('${recipe.id}')" style="cursor: pointer;">
                        ${recipe.image ? 
                            `<img src="${recipe.image}" alt="${recipe.name}" class="recipe-card-image" onerror="this.style.display='none'">` :
                            `<div class="recipe-card-image"></div>`
                        }
                        <div class="recipe-card-content">
                            <div class="recipe-card-title">${this.escapeHtml(recipe.name)}</div>
                            <div class="recipe-card-meta">
                                ${recipe.servings || 0} servings • 
                                ${prepTime + cookTime} min total
                            </div>
                            <div class="recipe-card-collections">
                                ${collections.map(c => 
                                    `<span class="collection-tag">${this.escapeHtml(c)}</span>`
                                ).join('')}
                            </div>
                        </div>
                    </div>
                    <div style="padding: 0 16px 16px;">
                        <button class="btn btn-danger" style="width: 100%; padding: 8px;" onclick="event.stopPropagation(); recipeManager.deleteRecipe('${recipe.id}')">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateCollectionFilter() {
        const select = document.getElementById('collection-filter');
        const collections = new Set();
        
        this.recipes.forEach(recipe => {
            const recipeCollections = recipe.collections || [];
            recipeCollections.forEach(c => collections.add(c));
        });

        const currentValue = select.value;
        select.innerHTML = '<option value="">All Collections</option>' +
            Array.from(collections).sort().map(c => 
                `<option value="${this.escapeHtml(c)}">${this.escapeHtml(c)}</option>`
            ).join('');
        
        if (currentValue && collections.has(currentValue)) {
            select.value = currentValue;
        }
    }

    viewRecipe(id) {
        try {
            const recipe = this.recipes.find(r => r.id === id);
            if (!recipe) {
                alert('Recipe not found');
                return;
            }

            const collections = recipe.collections || [];
            const ingredients = recipe.ingredients || [];
            const steps = recipe.steps || [];

            const content = document.getElementById('recipe-detail-content');
            content.innerHTML = `
                <div class="recipe-detail-header">
                    ${recipe.image ? 
                        `<img src="${recipe.image}" alt="${this.escapeHtml(recipe.name)}" class="recipe-detail-image" onerror="this.style.display='none'">` : 
                        ''
                    }
                    <h2 class="recipe-detail-title">${this.escapeHtml(recipe.name)}</h2>
                    <div class="recipe-detail-meta">
                        <span>🍽️ ${recipe.servings || 0} servings</span>
                        <span>⏱️ Prep: ${recipe.prepTime || 0} min</span>
                        <span>🔥 Cook: ${recipe.cookTime || 0} min</span>
                        ${recipe.source ? `<span>📖 ${this.escapeHtml(recipe.source)}</span>` : ''}
                    </div>
                    <div class="recipe-card-collections">
                        ${collections.map(c => 
                            `<span class="collection-tag">${this.escapeHtml(c)}</span>`
                        ).join('')}
                    </div>
                </div>

                <div class="recipe-detail-actions">
                    <button class="btn btn-primary" onclick="recipeManager.openRecipeModal(recipeManager.recipes.find(r => r.id === '${recipe.id}'))">
                        Edit Recipe
                    </button>
                    <button class="btn btn-danger" onclick="recipeManager.deleteRecipe('${recipe.id}')">
                        Delete Recipe
                    </button>
                </div>

                <div class="recipe-detail-section">
                    <h3>Ingredients</h3>
                    <ul>
                        ${ingredients.map(i => `<li>${this.escapeHtml(i)}</li>`).join('')}
                    </ul>
                </div>

                <div class="recipe-detail-section">
                    <h3>Instructions</h3>
                    <ol>
                        ${steps.map(s => `<li>${this.escapeHtml(s)}</li>`).join('')}
                    </ol>
                </div>

                ${recipe.nutrition ? `
                    <div class="recipe-detail-section">
                        <h3>Nutrition Information</h3>
                        <p>${this.escapeHtml(recipe.nutrition).replace(/\n/g, '<br>')}</p>
                    </div>
                ` : ''}

                ${recipe.notes ? `
                    <div class="recipe-detail-section">
                        <h3>Notes</h3>
                        <p>${this.escapeHtml(recipe.notes).replace(/\n/g, '<br>')}</p>
                    </div>
                ` : ''}
            `;

            document.getElementById('recipe-detail-modal').classList.add('active');
        } catch (e) {
            console.error('Error viewing recipe:', e);
            alert('Error loading recipe. It may be corrupted.');
        }
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

        if (this.recipes.length === 0) {
            grid.innerHTML = '<p class="empty-message">No recipes available. Add some recipes first!</p>';
            return;
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
                    <option value="">-- Select a recipe --</option>
                    ${this.recipes.map(r => 
                        `<option value="${r.id}" ${r.id === selectedRecipe ? 'selected' : ''}>
                            ${this.escapeHtml(r.name)}
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
                
                const recipeIngredients = recipe.ingredients || [];
                recipeIngredients.forEach(ingredient => {
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

        if (this.shoppingList.length === 0) {
            alert('No meals planned yet. Add recipes to your meal plan first.');
            return;
        }

        this.switchView('shopping-list');
    }

    renderShoppingList() {
        const content = document.getElementById('shopping-list-content');
        
        if (this.shoppingList.length === 0) {
            content.innerHTML = '<p class="empty-message">No shopping list generated yet. Go to Meal Plan and click "Generate Shopping List".</p>';
            return;
        }

        // Group by category
        const categorized = {
            'Produce': [],
            'Proteins': [],
            'Dairy': [],
            'Pantry': [],
            'Other': []
        };

        this.shoppingList.forEach(item => {
            const lower = item.ingredient.toLowerCase();
            if (lower.match(/vegetable|fruit|lettuce|tomato|onion|garlic|herb|spice|pepper|carrot|celery|potato|apple|banana|orange|berry/)) {
                categorized['Produce'].push(item);
            } else if (lower.match(/chicken|beef|pork|fish|meat|egg|turkey|salmon|shrimp/)) {
                categorized['Proteins'].push(item);
            } else if (lower.match(/milk|cheese|butter|cream|yogurt/)) {
                categorized['Dairy'].push(item);
            } else if (lower.match(/flour|sugar|salt|oil|rice|pasta|bread|sauce|stock|broth/)) {
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
                            `<li>${this.escapeHtml(item.ingredient)} ${item.count > 1 ? `(×${item.count})` : ''}</li>`
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
                this.migrateData();
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
const recipeManager = new RecipeManager();
