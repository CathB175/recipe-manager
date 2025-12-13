// Recipe Manager Application
class RecipeManager {
    constructor() {
    this.recipes = this.loadData('recipes') || [];
    this.mealPlan = this.loadData('mealPlan') || {};
    this.dailyExtras = this.loadData('dailyExtras') || {};
    this.quickFoods = this.loadData('quickFoods') || []; // ADD THIS LINE
    this.shoppingList = [];
    this.currentView = 'recipes';
    this.editingRecipeId = null;
    this.editingQuickFoodId = null; // ADD THIS LINE
    this.mealPlanDays = 7;
    this.currentNutritionDate = new Date().toISOString().split('T')[0];
    
    this.migrateData();
    this.init();
}

    init() {
        this.setupEventListeners();
        this.renderRecipes();
        this.updateCollectionFilter();
        this.cleanOldMealPlan();
        this.renderMealPlan();
        this.setupNutritionDatePicker();
    }

    migrateData() {
        let validRecipes = [];
        
        this.recipes.forEach(recipe => {
            try {
                if (!recipe.id) {
                    recipe.id = Date.now().toString() + Math.random();
                }
                
                if (!recipe.name || typeof recipe.name !== 'string') {
                    recipe.name = 'Untitled Recipe';
                }
                
                recipe.collections = Array.isArray(recipe.collections) ? recipe.collections : [];
                recipe.keywords = Array.isArray(recipe.keywords) ? recipe.keywords : [];
                recipe.ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
                recipe.steps = Array.isArray(recipe.steps) ? recipe.steps : [];
                
                recipe.servings = parseInt(recipe.servings) || 4;
                recipe.prepTime = parseInt(recipe.prepTime) || 0;
                recipe.cookTime = parseInt(recipe.cookTime) || 0;
                
                recipe.source = recipe.source || '';
                recipe.image = recipe.image || '';
                recipe.notes = recipe.notes || '';
                
                if (typeof recipe.nutrition === 'string') {
                    recipe.nutrition = {
                        calories: 0,
                        protein: 0,
                        carbs: 0,
                        fat: 0,
                        fiber: 0,
                        sugar: 0
                    };
                } else if (!recipe.nutrition) {
                    recipe.nutrition = {
                        calories: 0,
                        protein: 0,
                        carbs: 0,
                        fat: 0,
                        fiber: 0,
                        sugar: 0
                    };
                }
                
                validRecipes.push(recipe);
            } catch (e) {
                console.error('Skipping invalid recipe:', e);
            }
        });
        
        this.recipes = validRecipes;
        this.saveData('recipes', this.recipes);
    }

    setupEventListeners() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.switchView(view);
            });
        });

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

        document.querySelector('#recipe-detail-modal .close').addEventListener('click', () => {
            this.closeRecipeDetailModal();
        });

        document.getElementById('search-input').addEventListener('input', () => {
            this.renderRecipes();
        });

        document.getElementById('collection-filter').addEventListener('change', () => {
            this.renderRecipes();
        });

        document.querySelectorAll('input[name="plan-days"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.mealPlanDays = parseInt(e.target.value);
                this.renderMealPlan();
            });
        });

        document.getElementById('generate-shopping-list').addEventListener('click', () => {
            this.generateShoppingList();
        });

        document.getElementById('print-shopping-list').addEventListener('click', () => {
            window.print();
        });

        document.getElementById('clear-shopping-list').addEventListener('click', () => {
            if (confirm('Clear shopping list?')) {
                this.shoppingList = [];
                this.renderShoppingList();
            }
        });

        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('copy-export-btn').addEventListener('click', () => {
            this.copyExportToClipboard();
        });

        document.getElementById('import-btn').addEventListener('click', () => {
            this.importData();
        });

        // Quick Foods
document.getElementById('add-quick-food-btn').addEventListener('click', () => {
    this.openQuickFoodModal();
});
        
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('active');
            }
        });
    }

    setupNutritionDatePicker() {
        const picker = document.getElementById('nutrition-date-picker');
        picker.value = this.currentNutritionDate;
        picker.addEventListener('change', (e) => {
            this.currentNutritionDate = e.target.value;
            this.renderNutritionView();
        });
        
        this.nutritionGoals = this.loadData('nutritionGoals') || {
            calories: 2000,
            protein: 150,
            carbs: 225,
            fat: 65,
            fiber: 25,
            sugar: 50
        };
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
    } else if (view === 'nutrition') {
        this.renderNutritionView();
    } else if (view === 'quick-foods') { // ADD THIS
        this.renderQuickFoods();
    }
}

    addClearAllButton() {
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
    this.dailyExtras = {};
    this.quickFoods = []; // ADD THIS LINE
    this.shoppingList = [];
    localStorage.removeItem('recipes');
    localStorage.removeItem('mealPlan');
    localStorage.removeItem('dailyExtras');
    localStorage.removeItem('quickFoods'); // ADD THIS LINE
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
            document.getElementById('recipe-notes').value = recipe.notes || '';
            
            const nutrition = recipe.nutrition || {};
            document.getElementById('recipe-calories').value = nutrition.calories || '';
            document.getElementById('recipe-protein').value = nutrition.protein || '';
            document.getElementById('recipe-carbs').value = nutrition.carbs || '';
            document.getElementById('recipe-fat').value = nutrition.fat || '';
            document.getElementById('recipe-fiber').value = nutrition.fiber || '';
            document.getElementById('recipe-sugar').value = nutrition.sugar || '';
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
            notes: document.getElementById('recipe-notes').value.trim(),
            nutrition: {
                calories: parseFloat(document.getElementById('recipe-calories').value) || 0,
                protein: parseFloat(document.getElementById('recipe-protein').value) || 0,
                carbs: parseFloat(document.getElementById('recipe-carbs').value) || 0,
                fat: parseFloat(document.getElementById('recipe-fat').value) || 0,
                fiber: parseFloat(document.getElementById('recipe-fiber').value) || 0,
                sugar: parseFloat(document.getElementById('recipe-sugar').value) || 0
            }
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
        this.renderMealPlan();
        this.closeRecipeModal();
        
        alert('Recipe saved successfully!');
    }

    deleteRecipe(id) {
        if (confirm('Delete this recipe?')) {
            this.recipes = this.recipes.filter(r => r.id !== id);
            this.saveData('recipes', this.recipes);
            this.renderRecipes();
            this.updateCollectionFilter();
            this.renderMealPlan();
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
                <div class="recipe-card" onclick="recipeManager.viewRecipe('${recipe.id}')" style="cursor: pointer;">
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

    addToMealPlan(recipeId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const days = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + i);
            days.push(date);
        }
        
        const dayOptions = days.map(date => {
            const dateStr = date.toISOString().split('T')[0];
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            return `<option value="${dateStr}">${dayName}</option>`;
        }).join('');
        
        const html = `
            <div style="padding: 20px;">
                <h3 style="margin-bottom: 16px;">Add to Meal Plan</h3>
                <div style="margin-bottom: 12px;">
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Day:</label>
                    <select id="add-meal-day" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;">
                        ${dayOptions}
                    </select>
                </div>
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Meal:</label>
                    <select id="add-meal-type" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;">
                        <option value="breakfast">Breakfast</option>
                        <option value="lunch">Lunch</option>
                        <option value="dinner">Dinner</option>
                    </select>
                </div>
                <div style="display: flex; gap: 12px;">
                    <button onclick="recipeManager.confirmAddToMealPlan('${recipeId}')" class="btn btn-primary" style="flex: 1;">Add to Plan</button>
                    <button onclick="recipeManager.cancelAddToMealPlan()" class="btn btn-secondary" style="flex: 1;">Cancel</button>
                </div>
            </div>
        `;
        
        const tempModal = document.createElement('div');
        tempModal.id = 'temp-add-meal-modal';
        tempModal.className = 'modal active';
        tempModal.innerHTML = `<div class="modal-content" style="max-width: 400px;">${html}</div>`;
        document.body.appendChild(tempModal);
    }

    confirmAddToMealPlan(recipeId) {
        const day = document.getElementById('add-meal-day').value;
        const mealType = document.getElementById('add-meal-type').value;
        
        if (!this.mealPlan[day]) this.mealPlan[day] = {};
        this.mealPlan[day][mealType] = recipeId;
        this.saveData('mealPlan', this.mealPlan);
        
        this.cancelAddToMealPlan();
        alert('Recipe added to meal plan!');
    }

    cancelAddToMealPlan() {
        const tempModal = document.getElementById('temp-add-meal-modal');
        if (tempModal) {
            tempModal.remove();
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
            const nutrition = recipe.nutrition || {};

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
                    <button class="btn btn-primary" onclick="recipeManager.addToMealPlan('${recipe.id}')">
                        📅 Add to Meal Plan
                    </button>
                    <button class="btn btn-primary" onclick="recipeManager.openRecipeModal(recipeManager.recipes.find(r => r.id === '${recipe.id}'))">
                        ✏️ Edit Recipe
                    </button>
                    <button class="btn btn-danger" onclick="recipeManager.deleteRecipe('${recipe.id}')">
                        🗑️ Delete
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

                ${nutrition.calories || nutrition.protein || nutrition.carbs || nutrition.fat ? `
                    <div class="recipe-detail-section">
                        <h3>Nutrition Information (per serving)</h3>
                        <div class="nutrition-meal-stats">
                            ${nutrition.calories ? `<div class="nutrition-stat"><div class="nutrition-stat-value">${nutrition.calories}</div><div class="nutrition-stat-label">Calories</div></div>` : ''}
                            ${nutrition.protein ? `<div class="nutrition-stat"><div class="nutrition-stat-value">${nutrition.protein}g</div><div class="nutrition-stat-label">Protein</div></div>` : ''}
                            ${nutrition.carbs ? `<div class="nutrition-stat"><div class="nutrition-stat-value">${nutrition.carbs}g</div><div class="nutrition-stat-label">Carbs</div></div>` : ''}
                            ${nutrition.fat ? `<div class="nutrition-stat"><div class="nutrition-stat-value">${nutrition.fat}g</div><div class="nutrition-stat-label">Fat</div></div>` : ''}
                            ${nutrition.fiber ? `<div class="nutrition-stat"><div class="nutrition-stat-value">${nutrition.fiber}g</div><div class="nutrition-stat-label">Fiber</div></div>` : ''}
                            ${nutrition.sugar ? `<div class="nutrition-stat"><div class="nutrition-stat-value">${nutrition.sugar}g</div><div class="nutrition-stat-label">Sugar</div></div>` : ''}
                        </div>
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
        
        Object.keys(this.dailyExtras).forEach(dateStr => {
            const planDate = new Date(dateStr);
            if (planDate < today) {
                delete this.dailyExtras[dateStr];
            }
        });
        
        this.saveData('mealPlan', this.mealPlan);
        this.saveData('dailyExtras', this.dailyExtras);
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

    showNutritionGoalsModal() {
        const goals = this.nutritionGoals;
        
        const html = `
            <div style="padding: 20px;">
                <h3 style="margin-bottom: 16px;">Daily Nutrition Goals</h3>
                <p style="margin-bottom: 20px; color: #666;">Set your daily nutrition targets. You can update these anytime.</p>
                <div class="nutrition-grid" style="margin-bottom: 20px;">
                    <div>
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Calories:</label>
                        <input type="number" id="goal-calories" value="${goals.calories}" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Protein (g):</label>
                        <input type="number" id="goal-protein" value="${goals.protein}" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Carbs (g):</label>
                        <input type="number" id="goal-carbs" value="${goals.carbs}" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Fat (g):</label>
                        <input type="number" id="goal-fat" value="${goals.fat}" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Fiber (g):</label>
                        <input type="number" id="goal-fiber" value="${goals.fiber}" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;">
</div>
<div>
<label style="display: block; margin-bottom: 6px; font-weight: 600;">Sugar (g):</label>
<input type="number" id="goal-sugar" value="${goals.sugar}" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;">
</div>
</div>
<div style="display: flex; gap: 12px;">
<button onclick="recipeManager.saveNutritionGoals()" class="btn btn-primary" style="flex: 1;">Save Goals</button>
<button onclick="recipeManager.cancelNutritionGoals()" class="btn btn-secondary" style="flex: 1;">Cancel</button>
</div>
</div>
`;
        const tempModal = document.createElement('div');
    tempModal.id = 'temp-goals-modal';
    tempModal.className = 'modal active';
    tempModal.innerHTML = `<div class="modal-content" style="max-width: 500px;">${html}</div>`;
    document.body.appendChild(tempModal);
}

saveNutritionGoals() {
    this.nutritionGoals = {
        calories: parseFloat(document.getElementById('goal-calories').value) || 2000,
        protein: parseFloat(document.getElementById('goal-protein').value) || 150,
        carbs: parseFloat(document.getElementById('goal-carbs').value) || 225,
        fat: parseFloat(document.getElementById('goal-fat').value) || 65,
        fiber: parseFloat(document.getElementById('goal-fiber').value) || 25,
        sugar: parseFloat(document.getElementById('goal-sugar').value) || 50
    };
    
    this.saveData('nutritionGoals', this.nutritionGoals);
    this.cancelNutritionGoals();
    this.renderNutritionView();
}

cancelNutritionGoals() {
    const tempModal = document.getElementById('temp-goals-modal');
    if (tempModal) {
        tempModal.remove();
    }
}

renderNutritionView() {
    const content = document.getElementById('nutrition-content');
    const dateStr = this.currentNutritionDate;
    const meals = this.mealPlan[dateStr] || {};
    const extras = this.dailyExtras[dateStr] || [];

    let totals = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugar: 0
    };

    const mealOrder = ['breakfast', 'lunch', 'dinner'];
    const mealData = [];
    
    mealOrder.forEach(mealType => {
        const recipeId = meals[mealType];
        if (!recipeId) return;
        
        const recipe = this.recipes.find(r => r.id === recipeId);
        if (!recipe) return;
        
        const nutrition = recipe.nutrition || {};
        mealData.push({
            name: recipe.name,
            type: mealType,
            nutrition: nutrition
        });
        
        totals.calories += nutrition.calories || 0;
        totals.protein += nutrition.protein || 0;
        totals.carbs += nutrition.carbs || 0;
        totals.fat += nutrition.fat || 0;
        totals.fiber += nutrition.fiber || 0;
        totals.sugar += nutrition.sugar || 0;
    });

    extras.forEach(extra => {
        totals.calories += extra.calories || 0;
        totals.protein += extra.protein || 0;
        totals.carbs += extra.carbs || 0;
        totals.fat += extra.fat || 0;
        totals.fiber += extra.fiber || 0;
        totals.sugar += extra.sugar || 0;
    });

    const dateObj = new Date(dateStr);
    const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const goals = this.nutritionGoals;

    if (mealData.length === 0 && extras.length === 0) {
        content.innerHTML = `
            <div style="display: flex; justify-content: flex-end; margin-bottom: 16px;">
                <button class="btn btn-secondary" onclick="recipeManager.showNutritionGoalsModal()">⚙️ Set Daily Goals</button>
            </div>
            <div class="nutrition-empty">
                <p>No meals planned for ${formattedDate}</p>
                <p>Add recipes to your meal plan to see nutrition information.</p>
            </div>
        `;
        return;
    }

    const calcPercent = (actual, goal) => {
        if (!goal) return 0;
        return Math.round((actual / goal) * 100);
    };

    const getProgressColor = (percent) => {
        if (percent < 80) return '#ef4444';
        if (percent < 95) return '#f59e0b';
        if (percent <= 110) return '#10b981';
        return '#ef4444';
    };

    content.innerHTML = `
        <div style="display: flex; justify-content: flex-end; margin-bottom: 16px;">
            <button class="btn btn-secondary" onclick="recipeManager.showNutritionGoalsModal()">⚙️ Set Daily Goals</button>
        </div>

        <div class="nutrition-summary-modern">
            <div class="nutrition-summary-header">
                <h2>${formattedDate}</h2>
            </div>
            
            <div class="nutrition-macros-grid">
                <div class="macro-card">
                    <div class="macro-header">
                        <span class="macro-label">Calories</span>
                        <span class="macro-value">${Math.round(totals.calories)} / ${goals.calories}</span>
                    </div>
                    <div class="macro-progress-bar">
                        <div class="macro-progress-fill" style="width: ${Math.min(calcPercent(totals.calories, goals.calories), 100)}%; background: ${getProgressColor(calcPercent(totals.calories, goals.calories))}"></div>
                    </div>
                    <div class="macro-percent">${calcPercent(totals.calories, goals.calories)}%</div>
                </div>

                <div class="macro-card">
                    <div class="macro-header">
                        <span class="macro-label">Protein</span>
                        <span class="macro-value">${totals.protein.toFixed(1)}g / ${goals.protein}g</span>
                    </div>
                    <div class="macro-progress-bar">
                        <div class="macro-progress-fill" style="width: ${Math.min(calcPercent(totals.protein, goals.protein), 100)}%; background: ${getProgressColor(calcPercent(totals.protein, goals.protein))}"></div>
                    </div>
                    <div class="macro-percent">${calcPercent(totals.protein, goals.protein)}%</div>
                </div>

                <div class="macro-card">
                    <div class="macro-header">
                        <span class="macro-label">Carbs</span>
                        <span class="macro-value">${totals.carbs.toFixed(1)}g / ${goals.carbs}g</span>
                    </div>
                    <div class="macro-progress-bar">
                        <div class="macro-progress-fill" style="width: ${Math.min(calcPercent(totals.carbs, goals.carbs), 100)}%; background: ${getProgressColor(calcPercent(totals.carbs, goals.carbs))}"></div>
                    </div>
                    <div class="macro-percent">${calcPercent(totals.carbs, goals.carbs)}%</div>
                </div>

                <div class="macro-card">
                    <div class="macro-header">
                        <span class="macro-label">Fat</span>
                        <span class="macro-value">${totals.fat.toFixed(1)}g / ${goals.fat}g</span>
                    </div>
                    <div class="macro-progress-bar">
                        <div class="macro-progress-fill" style="width: ${Math.min(calcPercent(totals.fat, goals.fat), 100)}%; background: ${getProgressColor(calcPercent(totals.fat, goals.fat))}"></div>
                    </div>
                    <div class="macro-percent">${calcPercent(totals.fat, goals.fat)}%</div>
                </div>

                <div class="macro-card">
                    <div class="macro-header">
                        <span class="macro-label">Fiber</span>
                        <span class="macro-value">${totals.fiber.toFixed(1)}g / ${goals.fiber}g</span>
                    </div>
                    <div class="macro-progress-bar">
                        <div class="macro-progress-fill" style="width: ${Math.min(calcPercent(totals.fiber, goals.fiber), 100)}%; background: ${getProgressColor(calcPercent(totals.fiber, goals.fiber))}"></div>
                    </div>
                    <div class="macro-percent">${calcPercent(totals.fiber, goals.fiber)}%</div>
                </div>

                <div class="macro-card">
                    <div class="macro-header">
                        <span class="macro-label">Sugar</span>
                        <span class="macro-value">${totals.sugar.toFixed(1)}g / ${goals.sugar}g</span>
                    </div>
                    <div class="macro-progress-bar">
                        <div class="macro-progress-fill" style="width: ${Math.min(calcPercent(totals.sugar, goals.sugar), 100)}%; background: ${getProgressColor(calcPercent(totals.sugar, goals.sugar))}"></div>
                    </div>
                    <div class="macro-percent">${calcPercent(totals.sugar, goals.sugar)}%</div>
                </div>
            </div>
        </div>

        ${mealData.length > 0 ? `
            <div class="nutrition-meals">
                <h3>Planned Meals</h3>
                ${mealData.map(meal => `
                    <div class="nutrition-meal-item">
                        <div class="nutrition-meal-header">
                            <div class="nutrition-meal-name">${this.escapeHtml(meal.name)}</div>
                            <div class="nutrition-meal-type">${meal.type}</div>
                        </div>
                        <div class="nutrition-meal-stats">
                            <div class="nutrition-stat">
                                <div class="nutrition-stat-value">${Math.round(meal.nutrition.calories || 0)}</div>
                                <div class="nutrition-stat-label">Calories</div>
                            </div>
                            <div class="nutrition-stat">
                                <div class="nutrition-stat-value">${(meal.nutrition.protein || 0).toFixed(1)}g</div>
                                <div class="nutrition-stat-label">Protein</div>
                            </div>
                            <div class="nutrition-stat">
                                <div class="nutrition-stat-value">${(meal.nutrition.carbs || 0).toFixed(1)}g</div>
                                <div class="nutrition-stat-label">Carbs</div>
                            </div>
                            <div class="nutrition-stat">
                                <div class="nutrition-stat-value">${(meal.nutrition.fat || 0).toFixed(1)}g</div>
                                <div class="nutrition-stat-label">Fat</div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        ` : ''}

        <div class="nutrition-extras">
            <h3>Snacks & Extras</h3>
            ${extras.map((extra, index) => `
                <div class="extra-item">
                    <div class="extra-item-info">
                        <div class="extra-item-name">${this.escapeHtml(extra.name)}</div>
                        <div class="extra-item-stats">
                            <span>${Math.round(extra.calories || 0)} cal</span>
                            <span>${(extra.protein || 0).toFixed(1)}g protein</span>
                            <span>${(extra.carbs || 0).toFixed(1)}g carbs</span>
                            <span>${(extra.fat || 0).toFixed(1)}g fat</span>
                        </div>
                    </div>
                    <button class="extra-item-remove" onclick="recipeManager.removeExtra(${index})">×</button>
                </div>
            `).join('')}
            <button class="add-extra-btn" onclick="recipeManager.showAddExtraModal()">+ Add Snack/Extra</button>
        </div>
    `;
}

showAddExtraModal() {
    const html = `
        <div style="padding: 20px;">
            <h3 style="margin-bottom: 16px;">Add Snack or Extra Food</h3>
            <div style="margin-bottom: 12px;">
                <label style="display: block; margin-bottom: 6px; font-weight: 600;">Name:</label>
                <input type="text" id="extra-name" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;" placeholder="e.g., Apple, Protein shake">
            </div>
            <div class="nutrition-grid" style="margin-bottom: 20px;">
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Calories:</label>
                    <input type="number" id="extra-calories" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;" placeholder="95">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Protein (g):</label>
                    <input type="number" id="extra-protein" step="0.1" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;" placeholder="0.5">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Carbs (g):</label>
                    <input type="number" id="extra-carbs" step="0.1" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;" placeholder="25">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Fat (g):</label>
                    <input type="number" id="extra-fat" step="0.1" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;" placeholder="0.3">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Fiber (g):</label>
                    <input type="number" id="extra-fiber" step="0.1" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;" placeholder="4">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Sugar (g):</label>
                    <input type="number" id="extra-sugar" step="0.1" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;" placeholder="19">
                </div>
            </div>
            <div style="display: flex; gap: 12px;">
                <button onclick="recipeManager.confirmAddExtra()" class="btn btn-primary" style="flex: 1;">Add Extra</button>
                <button onclick="recipeManager.cancelAddExtra()" class="btn btn-secondary" style="flex: 1;">Cancel</button>
            </div>
        </div>
    `;
    
    const tempModal = document.createElement('div');
    tempModal.id = 'temp-extra-modal';
    tempModal.className = 'modal active';
    tempModal.innerHTML = `<div class="modal-content" style="max-width: 500px;">${html}</div>`;
    document.body.appendChild(tempModal);
}

confirmAddExtra() {
    const name = document.getElementById('extra-name').value.trim();
    if (!name) {
        alert('Please enter a name');
        return;
    }

    const extra = {
        name: name,
        calories: parseFloat(document.getElementById('extra-calories').value) || 0,
        protein: parseFloat(document.getElementById('extra-protein').value) || 0,
        carbs: parseFloat(document.getElementById('extra-carbs').value) || 0,
        fat: parseFloat(document.getElementById('extra-fat').value) || 0,
        fiber: parseFloat(document.getElementById('extra-fiber').value) || 0,
        sugar: parseFloat(document.getElementById('extra-sugar').value) || 0
    };

    const dateStr = this.currentNutritionDate;
    if (!this.dailyExtras[dateStr]) {
        this.dailyExtras[dateStr] = [];
    }
    this.dailyExtras[dateStr].push(extra);
    this.saveData('dailyExtras', this.dailyExtras);

    this.cancelAddExtra();
    this.renderNutritionView();
}

cancelAddExtra() {
    const tempModal = document.getElementById('temp-extra-modal');
    if (tempModal) {
        tempModal.remove();
    }
}

removeExtra(index) {
    const dateStr = this.currentNutritionDate;
    if (this.dailyExtras[dateStr]) {
        this.dailyExtras[dateStr].splice(index, 1);
        if (this.dailyExtras[dateStr].length === 0) {
            delete this.dailyExtras[dateStr];
        }
        this.saveData('dailyExtras', this.dailyExtras);
        this.renderNutritionView();
    }
}

    openQuickFoodModal(food = null) {
    this.editingQuickFoodId = food ? food.id : null;
    
    const html = `
        <div style="padding: 20px;">
            <h3 style="margin-bottom: 16px;">${food ? 'Edit' : 'Add'} Quick Food</h3>
            <div style="margin-bottom: 12px;">
                <label style="display: block; margin-bottom: 6px; font-weight: 600;">Name: *</label>
                <input type="text" id="qf-name" value="${food ? food.name : ''}" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;" placeholder="e.g., Apple, Protein Bar, Yogurt">
            </div>
            <div class="nutrition-grid" style="margin-bottom: 20px;">
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Calories:</label>
                    <input type="number" id="qf-calories" value="${food ? food.calories : ''}" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;" placeholder="95">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Protein (g):</label>
                    <input type="number" id="qf-protein" value="${food ? food.protein : ''}" step="0.1" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;" placeholder="0.5">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Carbs (g):</label>
                    <input type="number" id="qf-carbs" value="${food ? food.carbs : ''}" step="0.1" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;" placeholder="25">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Fat (g):</label>
                    <input type="number" id="qf-fat" value="${food ? food.fat : ''}" step="0.1" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;" placeholder="0.3">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Fiber (g):</label>
                    <input type="number" id="qf-fiber" value="${food ? food.fiber : ''}" step="0.1" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;" placeholder="4">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Sugar (g):</label>
                    <input type="number" id="qf-sugar" value="${food ? food.sugar : ''}" step="0.1" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;" placeholder="19">
                </div>
            </div>
            <div style="display: flex; gap: 12px;">
                <button onclick="recipeManager.saveQuickFood()" class="btn btn-primary" style="flex: 1;">Save</button>
                <button onclick="recipeManager.cancelQuickFood()" class="btn btn-secondary" style="flex: 1;">Cancel</button>
            </div>
        </div>
    `;
    
    const tempModal = document.createElement('div');
    tempModal.id = 'temp-quick-food-modal';
    tempModal.className = 'modal active';
    tempModal.innerHTML = `<div class="modal-content" style="max-width: 500px;">${html}</div>`;
    document.body.appendChild(tempModal);
}

saveQuickFood() {
    const name = document.getElementById('qf-name').value.trim();
    if (!name) {
        alert('Please enter a name');
        return;
    }

    const food = {
        id: this.editingQuickFoodId || Date.now().toString(),
        name: name,
        calories: parseFloat(document.getElementById('qf-calories').value) || 0,
        protein: parseFloat(document.getElementById('qf-protein').value) || 0,
        carbs: parseFloat(document.getElementById('qf-carbs').value) || 0,
        fat: parseFloat(document.getElementById('qf-fat').value) || 0,
        fiber: parseFloat(document.getElementById('qf-fiber').value) || 0,
        sugar: parseFloat(document.getElementById('qf-sugar').value) || 0
    };

    if (this.editingQuickFoodId) {
        const index = this.quickFoods.findIndex(f => f.id === this.editingQuickFoodId);
        if (index !== -1) {
            this.quickFoods[index] = food;
        }
    } else {
        this.quickFoods.push(food);
    }

    this.saveData('quickFoods', this.quickFoods);
    this.cancelQuickFood();
    this.renderQuickFoods();
    alert('Quick food saved!');
}

cancelQuickFood() {
    const tempModal = document.getElementById('temp-quick-food-modal');
    if (tempModal) {
        tempModal.remove();
    }
    this.editingQuickFoodId = null;
}

deleteQuickFood(id) {
    if (confirm('Delete this quick food?')) {
        this.quickFoods = this.quickFoods.filter(f => f.id !== id);
        this.saveData('quickFoods', this.quickFoods);
        this.renderQuickFoods();
    }
}

addQuickFoodToDay(foodId) {
    const food = this.quickFoods.find(f => f.id === foodId);
    if (!food) return;

    const dateStr = this.currentNutritionDate;
    if (!this.dailyExtras[dateStr]) {
        this.dailyExtras[dateStr] = [];
    }
    
    this.dailyExtras[dateStr].push({
        name: food.name,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        fiber: food.fiber,
        sugar: food.sugar
    });
    
    this.saveData('dailyExtras', this.dailyExtras);
    alert(`${food.name} added to ${this.currentNutritionDate}!`);
    
    // Switch to nutrition view if not already there
    if (this.currentView !== 'nutrition') {
        this.switchView('nutrition');
    } else {
        this.renderNutritionView();
    }
}

renderQuickFoods() {
    const grid = document.getElementById('quick-foods-grid');
    
    if (this.quickFoods.length === 0) {
        grid.innerHTML = '<p class="empty-message">No quick foods saved yet. Add common snacks and foods you eat regularly!</p>';
        return;
    }

    grid.innerHTML = this.quickFoods.map(food => `
        <div class="quick-food-card">
            <div class="quick-food-header">
                <h3 class="quick-food-name">${this.escapeHtml(food.name)}</h3>
            </div>
            <div class="quick-food-nutrition">
                <div class="quick-food-stat">
                    <span class="stat-value">${Math.round(food.calories)}</span>
                    <span class="stat-label">cal</span>
                </div>
                <div class="quick-food-stat">
                    <span class="stat-value">${food.protein.toFixed(1)}g</span>
                    <span class="stat-label">protein</span>
                </div>
                <div class="quick-food-stat">
                    <span class="stat-value">${food.carbs.toFixed(1)}g</span>
                    <span class="stat-label">carbs</span>
                </div>
                <div class="quick-food-stat">
                    <span class="stat-value">${food.fat.toFixed(1)}g</span>
                    <span class="stat-label">fat</span>
                </div>
            </div>
            <div class="quick-food-actions">
                <button class="btn btn-primary" onclick="recipeManager.addQuickFoodToDay('${food.id}')" style="flex: 1;">
                    ➕ Add to Today
                </button>
                <button class="btn btn-secondary" onclick="recipeManager.openQuickFoodModal(recipeManager.quickFoods.find(f => f.id === '${food.id}'))" style="padding: 10px;">
                    ✏️
                </button>
                <button class="btn btn-danger" onclick="recipeManager.deleteQuickFood('${food.id}')" style="padding: 10px;">
                    🗑️
                </button>
            </div>
        </div>
    `).join('');
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
                    ingredients[ingredient] = {count: 0, checked: false};
                }
                ingredients[ingredient].count++;
            });
        });
    });

    this.shoppingList = Object.entries(ingredients).map(([ingredient, data]) => ({
        ingredient,
        count: data.count,
        checked: false
    }));

    if (this.shoppingList.length === 0) {
        alert('No meals planned yet. Add recipes to your meal plan first.');
        return;
    }

    this.switchView('shopping-list');
}

toggleShoppingItem(index) {
    this.shoppingList[index].checked = !this.shoppingList[index].checked;
    this.renderShoppingList();
}

removeShoppingItem(index) {
    this.shoppingList.splice(index, 1);
    this.renderShoppingList();
}

renderShoppingList() {
    const content = document.getElementById('shopping-list-content');
    
    if (this.shoppingList.length === 0) {
        content.innerHTML = '<p class="empty-message">No shopping list generated yet. Go to Meal Plan and click "Generate Shopping List".</p>';
        return;
    }

    const categorized = {
        'Produce': [],
        'Proteins': [],
        'Dairy': [],
        'Pantry': [],
        'Other': []
    };

    this.shoppingList.forEach((item, index) => {
        item.index = index;
        const lower = item.ingredient.toLowerCase();
        if (lower.match(/vegetable|fruit|lettuce|tomato|onion|garlic|herb|spice|pepper|carrot|celery|potato|apple|banana|orange|berry|spinach|kale|broccoli|cauliflower|cucumber|zucchini/)) {
            categorized['Produce'].push(item);
        } else if (lower.match(/chicken|beef|pork|fish|meat|egg|turkey|salmon|shrimp|bacon|sausage|ham/)) {
            categorized['Proteins'].push(item);
        } else if (lower.match(/milk|cheese|butter|cream|yogurt/)) {
            categorized['Dairy'].push(item);
        } else if (lower.match(/flour|sugar|salt|oil|rice|pasta|bread|sauce|stock|broth|can|jar/)) {
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
                <ul class="shopping-list-items">
                    ${items.map(item => `
                        <li class="shopping-list-item ${item.checked ? 'checked' : ''}" data-index="${item.index}">
                            <label class="shopping-checkbox">
                                <input type="checkbox" ${item.checked ? 'checked' : ''} 
                                       onchange="recipeManager.toggleShoppingItem(${item.index})">
                                <span>${this.escapeHtml(item.ingredient)} ${item.count > 1 ? `(×${item.count})` : ''}</span>
                            </label>
                            <button class="shopping-remove-btn" onclick="recipeManager.removeShoppingItem(${item.index})" title="Remove item">×</button>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `).join('');
}

exportData() {
    const data = {
        recipes: this.recipes,
        mealPlan: this.mealPlan,
        dailyExtras: this.dailyExtras,
        quickFoods: this.quickFoods, // ADD THIS LINE
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
            this.dailyExtras = data.dailyExtras || {};
            this.quickFoods = data.quickFoods || []; // ADD THIS LINE
            this.migrateData();
            this.saveData('recipes', this.recipes);
            this.saveData('mealPlan', this.mealPlan);
            this.saveData('dailyExtras', this.dailyExtras);
            this.saveData('quickFoods', this.quickFoods); // ADD THIS LINE
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
