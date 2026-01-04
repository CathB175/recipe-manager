// Recipe Manager Application with Supabase - CHUNK 1 OF 4
class RecipeManager {
    constructor() {
        this.mealPlan = this.loadLocal('mealPlan') || {};
        this.dailyExtras = this.loadLocal('dailyExtras') || {};
        this.nutritionGoals = this.loadLocal('nutritionGoals') || {
            calories: 2000,
            protein: 150,
            carbs: 225,
            fat: 65,
            fiber: 25,
            sugar: 50
        };
        
        this.recipes = [];
        this.quickFoods = [];
        this.shoppingList = [];
        this.currentView = 'dashboard';
        this.editingRecipeId = null;
        this.editingQuickFoodId = null;
        this.mealPlanDays = 7;
        this.currentNutritionDate = new Date().toISOString().split('T')[0];
        this.isLoading = false;
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadRecipesFromSupabase();
        await this.loadQuickFoodsFromSupabase();
        this.renderRecipes();
        this.updateCollectionFilter();
        this.cleanOldMealPlan();
        this.renderMealPlan();
        this.setupNutritionDatePicker();
        this.renderDashboard(); 
    }

    loadLocal(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Error loading local data:', e);
            return null;
        }
    }

    saveLocal(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error('Error saving local data:', e);
        }
    }

   async loadRecipesFromSupabase() {
        try {
            this.isLoading = true;
            console.log('Attempting to load recipes from Supabase...');
            
            const { data, error } = await supabase
                .from('recipes')
                .select('*')
                .order('name');
            
            console.log('Supabase response:', { data, error });
            
            if (error) {
                console.error('Supabase error details:', error);
                throw error;
            }
            
            if (!data) {
                console.warn('No data returned from Supabase');
                this.recipes = [];
                return;
            }
            
            this.recipes = data.map(recipe => ({
                id: recipe.id,
                name: recipe.name,
                servings: recipe.servings,
                prepTime: recipe.prep_time,
                cookTime: recipe.cook_time,
                source: recipe.source,
                image: recipe.image_url,
                collections: recipe.collections || [],
                keywords: recipe.keywords || [],
                ingredients: recipe.ingredients || [],
                steps: recipe.steps || [],
                notes: recipe.notes,
                nutrition: recipe.nutrition || {
                    calories: 0,
                    protein: 0,
                    carbs: 0,
                    fat: 0,
                    fiber: 0,
                    sugar: 0
                }
            }));
            
            console.log('Successfully loaded', this.recipes.length, 'recipes from Supabase');
        } catch (error) {
            console.error('Full error loading recipes:', error);
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            alert('Error loading recipes from cloud: ' + error.message + '. Please check the console for details.');
        } finally {
            this.isLoading = false;
        }
    }
    async loadQuickFoodsFromSupabase() {
        try {
            const { data, error } = await supabase
                .from('quick_foods')
                .select('*')
                .order('name');
            
            if (error) throw error;
            
            this.quickFoods = data.map(food => ({
                id: food.id,
                name: food.name,
                calories: parseFloat(food.calories) || 0,
                protein: parseFloat(food.protein) || 0,
                carbs: parseFloat(food.carbs) || 0,
                fat: parseFloat(food.fat) || 0,
                fiber: parseFloat(food.fiber) || 0,
                sugar: parseFloat(food.sugar) || 0
            }));
            
            console.log('Loaded', this.quickFoods.length, 'quick foods from Supabase');
        } catch (error) {
            console.error('Error loading quick foods:', error);
        }
    }

    async saveRecipeToSupabase(recipe) {
        try {
            const supabaseRecipe = {
                name: recipe.name,
                servings: recipe.servings,
                prep_time: recipe.prepTime,
                cook_time: recipe.cookTime,
                source: recipe.source,
                image_url: recipe.image,
                collections: recipe.collections,
                keywords: recipe.keywords,
                ingredients: recipe.ingredients,
                steps: recipe.steps,
                notes: recipe.notes,
                nutrition: recipe.nutrition,
                updated_at: new Date().toISOString()
            };

            // Check if this is a new recipe (timestamp ID or no valid UUID)
            const isValidUUID = recipe.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recipe.id);
            
            if (!isValidUUID) {
                // New recipe - insert and let Supabase generate UUID
                const { data, error } = await supabase
                    .from('recipes')
                    .insert([supabaseRecipe])
                    .select()
                    .single();
                
                if (error) throw error;
                return data.id;
            } else {
                // Existing recipe with valid UUID - update
                const { error } = await supabase
                    .from('recipes')
                    .update(supabaseRecipe)
                    .eq('id', recipe.id);
                
                if (error) throw error;
                return recipe.id;
            }
        } catch (error) {
            console.error('Error saving recipe:', error);
            throw error;
        }
    }

    async deleteRecipeFromSupabase(id) {
        try {
            const { error } = await supabase
                .from('recipes')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
        } catch (error) {
            console.error('Error deleting recipe:', error);
            throw error;
        }
    }

    async saveQuickFoodToSupabase(food) {
        try {
            const supabaseFood = {
                name: food.name,
                calories: food.calories,
                protein: food.protein,
                carbs: food.carbs,
                fat: food.fat,
                fiber: food.fiber,
                sugar: food.sugar
            };

            // Check if this is a new food (timestamp ID or no valid UUID)
            const isValidUUID = food.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(food.id);
            
            if (!isValidUUID) {
                // New food - insert and let Supabase generate UUID
                const { data, error } = await supabase
                    .from('quick_foods')
                    .insert([supabaseFood])
                    .select()
                    .single();
                
                if (error) throw error;
                return data.id;
            } else {
                // Existing food with valid UUID - update
                const { error } = await supabase
                    .from('quick_foods')
                    .update(supabaseFood)
                    .eq('id', food.id);
                
                if (error) throw error;
                return food.id;
            }
        } catch (error) {
            console.error('Error saving quick food:', error);
            throw error;
        }
    }
    async deleteQuickFoodFromSupabase(id) {
        try {
            const { error } = await supabase
                .from('quick_foods')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
        } catch (error) {
            console.error('Error deleting quick food:', error);
            throw error;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    // CHUNK 2 OF 4 - Add this below Chunk 1
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

        document.getElementById('dashboard-add-recipe').addEventListener('click', () => {
            this.openRecipeModal();
        });

        document.getElementById('dashboard-search').addEventListener('input', () => {
            this.renderDashboard();
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
    }

   switchView(view) {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.view').forEach(v => {
            v.classList.remove('active');
        });

        document.querySelector('[data-view="' + view + '"]').classList.add('active');
        document.getElementById(view + '-view').classList.add('active');
        this.currentView = view;

        if (view === 'dashboard') {
            this.renderDashboard();
        } else if (view === 'shopping-list') {
            this.renderShoppingList();
        } else if (view === 'import-export') {
            this.addClearAllButton();
        } else if (view === 'meal-plan') {
            this.renderMealPlan();
        } else if (view === 'nutrition') {
            this.renderNutritionView();
        } else if (view === 'quick-foods') {
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
            section.innerHTML = '<h2 style="color: #ef4444;">Danger Zone</h2><p>Permanently delete all data from cloud and local storage. This cannot be undone!</p><button id="clear-all-data-btn" class="btn btn-danger">Clear All Data</button>';
            importExportView.appendChild(section);
            
            document.getElementById('clear-all-data-btn').addEventListener('click', async () => {
                if (confirm('WARNING: This will delete ALL data from Supabase and local storage permanently. This cannot be undone! Are you absolutely sure?')) {
                    if (confirm('Last chance! Click OK to delete everything.')) {
                        await this.clearAllData();
                    }
                }
            });
        }
    }

    async clearAllData() {
        try {
            await supabase.from('recipes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            await supabase.from('quick_foods').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            
            localStorage.removeItem('mealPlan');
            localStorage.removeItem('dailyExtras');
            
            this.recipes = [];
            this.quickFoods = [];
            this.mealPlan = {};
            this.dailyExtras = {};
            this.shoppingList = [];
            
            this.renderRecipes();
            this.updateCollectionFilter();
            this.renderMealPlan();
            alert('All data has been cleared.');
            this.switchView('recipes');
        } catch (error) {
            console.error('Error clearing data:', error);
            alert('Error clearing data. Please try again.');
        }
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
        
        this.saveLocal('mealPlan', this.mealPlan);
        this.saveLocal('dailyExtras', this.dailyExtras);
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
                '<option value="' + this.escapeHtml(c) + '">' + this.escapeHtml(c) + '</option>'
            ).join('');
        
        if (currentValue && collections.has(currentValue)) {
            select.value = currentValue;
        }
    }
        renderDashboard() {
        this.renderDashboardMeals();
        this.renderDashboardNutrition();
        this.renderDashboardCollections();
    }

    renderDashboardMeals() {
        const content = document.getElementById('dashboard-todays-meals');
        const today = new Date().toISOString().split('T')[0];
        const meals = this.mealPlan[today] || {};
        
        const mealOrder = ['breakfast', 'lunch', 'dinner'];
        const mealLabels = {
            breakfast: '🌅 Breakfast',
            lunch: '☀️ Lunch',
            dinner: '🌙 Dinner'
        };
        
        const self = this;
        let html = '';
        
        mealOrder.forEach(mealType => {
            const recipeId = meals[mealType];
            const recipe = recipeId ? self.recipes.find(r => r.id === recipeId) : null;
            
            html += '<div class="dashboard-meal-item">' +
                '<div class="dashboard-meal-info">' +
                '<div class="dashboard-meal-type">' + mealLabels[mealType] + '</div>';
            
            if (recipe) {
                html += '<div class="dashboard-meal-name">' + self.escapeHtml(recipe.name) + '</div>';
            } else {
                html += '<div class="dashboard-meal-empty">Not planned yet</div>';
            }
            
            html += '</div>';
            
            if (recipe) {
                html += '<button class="btn btn-secondary" onclick="recipeManager.viewRecipe(\'' + recipe.id + '\')" style="padding: 8px 16px;">View</button>';
            } else {
                html += '<button class="btn btn-primary" onclick="recipeManager.switchView(\'meal-plan\')" style="padding: 8px 16px;">Plan</button>';
            }
            
            html += '</div>';
        });
        
        if (!meals.breakfast && !meals.lunch && !meals.dinner) {
            html = '<div class="dashboard-empty">No meals planned for today. <a href="#" onclick="recipeManager.switchView(\'meal-plan\'); return false;" style="color: #667eea;">Plan your meals</a></div>';
        }
        
        content.innerHTML = html;
    }

    renderDashboardNutrition() {
        const content = document.getElementById('dashboard-nutrition');
        const today = new Date().toISOString().split('T')[0];
        const meals = this.mealPlan[today] || {};
        const extras = this.dailyExtras[today] || [];
        
        let totals = {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0
        };
        
        const self = this;
        const mealOrder = ['breakfast', 'lunch', 'dinner'];
        
        mealOrder.forEach(mealType => {
            const recipeId = meals[mealType];
            if (!recipeId) return;
            
            const recipe = self.recipes.find(r => r.id === recipeId);
            if (!recipe) return;
            
            const nutrition = recipe.nutrition || {};
            totals.calories += nutrition.calories || 0;
            totals.protein += nutrition.protein || 0;
            totals.carbs += nutrition.carbs || 0;
            totals.fat += nutrition.fat || 0;
        });
        
        extras.forEach(extra => {
            totals.calories += extra.calories || 0;
            totals.protein += extra.protein || 0;
            totals.carbs += extra.carbs || 0;
            totals.fat += extra.fat || 0;
        });
        
        const goals = this.nutritionGoals;
        
        const calcPercent = function(actual, goal) {
            if (!goal) return 0;
            return Math.round((actual / goal) * 100);
        };
        
        let html = '<div class="dashboard-nutrition-grid">';
        html += '<div class="dashboard-nutrition-card">' +
            '<div class="dashboard-nutrition-value">' + Math.round(totals.calories) + '</div>' +
            '<div class="dashboard-nutrition-label">Calories</div>' +
            '<div class="dashboard-nutrition-progress">' + calcPercent(totals.calories, goals.calories) + '% of goal</div>' +
            '</div>';
        
        html += '<div class="dashboard-nutrition-card">' +
            '<div class="dashboard-nutrition-value">' + totals.protein.toFixed(0) + 'g</div>' +
            '<div class="dashboard-nutrition-label">Protein</div>' +
            '<div class="dashboard-nutrition-progress">' + calcPercent(totals.protein, goals.protein) + '% of goal</div>' +
            '</div>';
        
        html += '<div class="dashboard-nutrition-card">' +
            '<div class="dashboard-nutrition-value">' + totals.carbs.toFixed(0) + 'g</div>' +
            '<div class="dashboard-nutrition-label">Carbs</div>' +
            '<div class="dashboard-nutrition-progress">' + calcPercent(totals.carbs, goals.carbs) + '% of goal</div>' +
            '</div>';
        
        html += '<div class="dashboard-nutrition-card">' +
            '<div class="dashboard-nutrition-value">' + totals.fat.toFixed(0) + 'g</div>' +
            '<div class="dashboard-nutrition-label">Fat</div>' +
            '<div class="dashboard-nutrition-progress">' + calcPercent(totals.fat, goals.fat) + '% of goal</div>' +
            '</div>';
        
        html += '</div>';
        
        content.innerHTML = html;
    }

    renderDashboardCollections() {
        const content = document.getElementById('dashboard-collections');
        const searchTerm = document.getElementById('dashboard-search').value.toLowerCase();
        
        // Group recipes by collection
        const collectionMap = {};
        const unallocated = [];
        
        this.recipes.forEach(recipe => {
            // Filter by search
            if (searchTerm) {
                const matchesSearch = recipe.name.toLowerCase().includes(searchTerm) ||
                    (recipe.ingredients || []).some(i => i.toLowerCase().includes(searchTerm)) ||
                    (recipe.keywords || []).some(k => k.toLowerCase().includes(searchTerm));
                if (!matchesSearch) return;
            }
            
            const collections = recipe.collections || [];
            
            if (collections.length === 0) {
                unallocated.push(recipe);
            } else {
                collections.forEach(collection => {
                    if (!collectionMap[collection]) {
                        collectionMap[collection] = [];
                    }
                    collectionMap[collection].push(recipe);
                });
            }
        });
        
        // Add unallocated to collection map
        if (unallocated.length > 0) {
            collectionMap['Not Allocated'] = unallocated;
        }
        
        const self = this;
        const sortedCollections = Object.keys(collectionMap).sort();
        
        if (sortedCollections.length === 0) {
            content.innerHTML = '<div class="dashboard-empty">No recipes found. <a href="#" onclick="recipeManager.switchView(\'recipes\'); return false;" style="color: #667eea;">Add your first recipe</a></div>';
            return;
        }
        
        let html = '<div class="dashboard-collections-grid">';
        
        sortedCollections.forEach(collection => {
            const recipes = collectionMap[collection];
            html += '<div class="dashboard-collection-card" onclick="recipeManager.viewCollection(\'' + collection.replace(/'/g, "\\'") + '\')">' +
                '<div class="dashboard-collection-name">' + self.escapeHtml(collection) + '</div>' +
                '<div class="dashboard-collection-count">' + recipes.length + '</div>' +
                '<div class="dashboard-collection-recipes">' + (recipes.length === 1 ? 'recipe' : 'recipes') + '</div>' +
                '</div>';
        });
        
        html += '</div>';
        content.innerHTML = html;
    }

    viewCollection(collectionName) {
        this.switchView('recipes');
        
        // Set the collection filter
        const select = document.getElementById('collection-filter');
        
        // For "Not Allocated", we need to clear the filter and only show recipes with no collections
        if (collectionName === 'Not Allocated') {
            select.value = '';
            document.getElementById('search-input').value = '';
            
            // We need a custom filter for this - let's add a temporary flag
            this.showOnlyUnallocated = true;
            this.renderRecipes();
            this.showOnlyUnallocated = false;
        } else {
            select.value = collectionName;
            document.getElementById('search-input').value = '';
            this.renderRecipes();
        }
    }
        
    // CHUNK 3 OF 4 - Add this below Chunk 2
    openRecipeModal(recipe) {
        this.closeRecipeDetailModal();
        recipe = recipe || null;
        
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

    async saveRecipe() {
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
            id: this.editingRecipeId || Date.now().toString() + '-temp',
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

        try {
            const newId = await this.saveRecipeToSupabase(recipe);
            recipe.id = newId;

            if (this.editingRecipeId) {
                const index = this.recipes.findIndex(r => r.id === this.editingRecipeId);
                if (index !== -1) {
                    this.recipes[index] = recipe;
                }
            } else {
                this.recipes.push(recipe);
            }

            this.renderRecipes();
            this.updateCollectionFilter();
            this.renderMealPlan();
            this.renderDashboard(); // ADD THIS LINE
            this.closeRecipeModal();
            
            alert('Recipe saved to cloud!');
        } catch (error) {
            alert('Error saving recipe. Please try again.');
        }
    }

    async deleteRecipe(id) {
        if (confirm('Delete this recipe from the cloud?')) {
            try {
                await this.deleteRecipeFromSupabase(id);
                this.recipes = this.recipes.filter(r => r.id !== id);
                this.renderRecipes();
                this.updateCollectionFilter();
                this.renderMealPlan();
                this.closeRecipeDetailModal();
                alert('Recipe deleted!');
            } catch (error) {
                alert('Error deleting recipe. Please try again.');
            }
        }
    }

    async duplicateRecipe(id) {
        const originalRecipe = this.recipes.find(r => r.id === id);
        if (!originalRecipe) {
            alert('Recipe not found');
            return;
        }

        // Create a copy with "(Copy)" added to the name
        const duplicatedRecipe = {
            id: Date.now().toString() + '-temp',
            name: originalRecipe.name + ' (Copy)',
            servings: originalRecipe.servings,
            prepTime: originalRecipe.prepTime,
            cookTime: originalRecipe.cookTime,
            source: originalRecipe.source,
            image: originalRecipe.image,
            collections: [...(originalRecipe.collections || [])],
            keywords: [...(originalRecipe.keywords || [])],
            ingredients: [...(originalRecipe.ingredients || [])],
            steps: [...(originalRecipe.steps || [])],
            notes: originalRecipe.notes,
            nutrition: {
                calories: originalRecipe.nutrition?.calories || 0,
                protein: originalRecipe.nutrition?.protein || 0,
                carbs: originalRecipe.nutrition?.carbs || 0,
                fat: originalRecipe.nutrition?.fat || 0,
                fiber: originalRecipe.nutrition?.fiber || 0,
                sugar: originalRecipe.nutrition?.sugar || 0
            }
        };

        try {
            const newId = await this.saveRecipeToSupabase(duplicatedRecipe);
            duplicatedRecipe.id = newId;
            
            this.recipes.push(duplicatedRecipe);
            
            this.renderRecipes();
            this.updateCollectionFilter();
            this.renderDashboard();
            this.closeRecipeDetailModal();
            
            alert('Recipe duplicated! You can now edit "' + duplicatedRecipe.name + '"');
            
            // Optionally open the editor right away
            this.openRecipeModal(duplicatedRecipe);
        } catch (error) {
            console.error('Error duplicating recipe:', error);
            alert('Error duplicating recipe. Please try again.');
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

            // Handle "Not Allocated" special case
            if (this.showOnlyUnallocated) {
                return matchesSearch && collections.length === 0;
            }
            
            const matchesCollection = !collectionFilter || 
                collections.includes(collectionFilter);
            
            return matchesSearch && matchesCollection;
        });

          

        const grid = document.getElementById('recipes-grid');
        
        if (this.isLoading) {
            grid.innerHTML = '<p class="empty-message">Loading recipes from cloud...</p>';
            return;
        }
        
        if (filtered.length === 0) {
            grid.innerHTML = '<p class="empty-message">No recipes found. Add your first recipe!</p>';
            return;
        }

        const self = this;
        grid.innerHTML = filtered.map(recipe => {
            const collections = recipe.collections || [];
            const prepTime = recipe.prepTime || 0;
            const cookTime = recipe.cookTime || 0;
            
            return '<div class="recipe-card" onclick="recipeManager.viewRecipe(\'' + recipe.id + '\')" style="cursor: pointer;">' +
                (recipe.image ? 
                    '<img src="' + recipe.image + '" alt="' + recipe.name + '" class="recipe-card-image" onerror="this.style.display=\'none\'">' :
                    '<div class="recipe-card-image"></div>') +
                '<div class="recipe-card-content">' +
                '<div class="recipe-card-title">' + self.escapeHtml(recipe.name) + '</div>' +
                '<div class="recipe-card-meta">' +
                (recipe.servings || 0) + ' servings • ' +
                (prepTime + cookTime) + ' min total' +
                '</div>' +
                '<div class="recipe-card-collections">' +
                collections.map(c => 
                    '<span class="collection-tag">' + self.escapeHtml(c) + '</span>'
                ).join('') +
                '</div>' +
                '</div>' +
                '</div>';
        }).join('');
    }

 viewRecipe(id, scale) {
        scale = scale || 1; // Default scale is 1x
        
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

            const self = this;
            const content = document.getElementById('recipe-detail-content');
            
            // Function to scale ingredient amounts
            const scaleIngredient = function(ingredient) {
                if (scale === 1) return ingredient;
                
                // Try to find numbers in the ingredient and scale them
                return ingredient.replace(/(\d+\.?\d*)/g, function(match) {
                    const num = parseFloat(match);
                    const scaled = num * scale;
                    // Round to 2 decimal places and remove trailing zeros
                    return parseFloat(scaled.toFixed(2)).toString();
                });
            };
            
            let html = '<div class="recipe-detail-header">';
            if (recipe.image) {
                html += '<img src="' + recipe.image + '" alt="' + self.escapeHtml(recipe.name) + '" class="recipe-detail-image" onerror="this.style.display=\'none\'">';
            }
            html += '<h2 class="recipe-detail-title">' + self.escapeHtml(recipe.name) + '</h2>';
            html += '<div class="recipe-detail-meta">';
            html += '<span>🍽️ ' + Math.round((recipe.servings || 0) * scale) + ' servings</span>';
            html += '<span>⏱️ Prep: ' + (recipe.prepTime || 0) + ' min</span>';
            html += '<span>🔥 Cook: ' + (recipe.cookTime || 0) + ' min</span>';
            if (recipe.source) {
                html += '<span>📖 ' + self.escapeHtml(recipe.source) + '</span>';
            }
            html += '</div>';
            html += '<div class="recipe-card-collections">';
            html += collections.map(c => '<span class="collection-tag">' + self.escapeHtml(c) + '</span>').join('');
            html += '</div></div>';

            // Scaling buttons
            html += '<div class="recipe-scale-controls">';
            html += '<span class="recipe-scale-label">Scale Recipe:</span>';
            html += '<button class="recipe-scale-btn ' + (scale === 0.5 ? 'active' : '') + '" onclick="recipeManager.viewRecipe(\'' + recipe.id + '\', 0.5)">×0.5</button>';
            html += '<button class="recipe-scale-btn ' + (scale === 1 ? 'active' : '') + '" onclick="recipeManager.viewRecipe(\'' + recipe.id + '\', 1)">×1</button>';
            html += '<button class="recipe-scale-btn ' + (scale === 2 ? 'active' : '') + '" onclick="recipeManager.viewRecipe(\'' + recipe.id + '\', 2)">×2</button>';
            html += '<button class="recipe-scale-btn ' + (scale === 3 ? 'active' : '') + '" onclick="recipeManager.viewRecipe(\'' + recipe.id + '\', 3)">×3</button>';
            html += '</div>';

          html += '<div class="recipe-detail-actions">';
            html += '<button class="btn btn-primary" onclick="recipeManager.printRecipeCard()">🖨️ Print Card</button>';
            html += '<button class="btn btn-primary" onclick="recipeManager.duplicateRecipe(\'' + recipe.id + '\')">📋 Duplicate</button>';
            html += '<button class="btn btn-primary" onclick="recipeManager.addToMealPlan(\'' + recipe.id + '\')">📅 Add to Meal Plan</button>';
            html += '<button class="btn btn-primary" onclick="recipeManager.openRecipeModal(recipeManager.recipes.find(r => r.id === \'' + recipe.id + '\'))">✏️ Edit Recipe</button>';
            html += '<button class="btn btn-danger" onclick="recipeManager.deleteRecipe(\'' + recipe.id + '\')">🗑️ Delete</button>';
            html += '</div>';

            html += '<div class="recipe-detail-section"><h3>Ingredients' + (scale !== 1 ? ' (scaled ×' + scale + ')' : '') + '</h3><ul>';
            html += ingredients.map(i => '<li>' + self.escapeHtml(scaleIngredient(i)) + '</li>').join('');
            html += '</ul></div>';

            html += '<div class="recipe-detail-section"><h3>Instructions</h3><ol>';
            html += steps.map(s => '<li>' + self.escapeHtml(s) + '</li>').join('');
            html += '</ol></div>';

            if (nutrition.calories || nutrition.protein || nutrition.carbs || nutrition.fat) {
                html += '<div class="recipe-detail-section"><h3>Nutrition Information (per serving)</h3><div class="nutrition-meal-stats">';
                if (nutrition.calories) html += '<div class="nutrition-stat"><div class="nutrition-stat-value">' + nutrition.calories + '</div><div class="nutrition-stat-label">Calories</div></div>';
                if (nutrition.protein) html += '<div class="nutrition-stat"><div class="nutrition-stat-value">' + nutrition.protein + 'g</div><div class="nutrition-stat-label">Protein</div></div>';
                if (nutrition.carbs) html += '<div class="nutrition-stat"><div class="nutrition-stat-value">' + nutrition.carbs + 'g</div><div class="nutrition-stat-label">Carbs</div></div>';
                if (nutrition.fat) html += '<div class="nutrition-stat"><div class="nutrition-stat-value">' + nutrition.fat + 'g</div><div class="nutrition-stat-label">Fat</div></div>';
                if (nutrition.fiber) html += '<div class="nutrition-stat"><div class="nutrition-stat-value">' + nutrition.fiber + 'g</div><div class="nutrition-stat-label">Fiber</div></div>';
                if (nutrition.sugar) html += '<div class="nutrition-stat"><div class="nutrition-stat-value">' + nutrition.sugar + 'g</div><div class="nutrition-stat-label">Sugar</div></div>';
                html += '</div></div>';
            }

            if (recipe.notes) {
                html += '<div class="recipe-detail-section"><h3>Notes</h3><p>' + self.escapeHtml(recipe.notes).replace(/\n/g, '<br>') + '</p></div>';
            }

            content.innerHTML = html;
            document.getElementById('recipe-detail-modal').classList.add('active');
        } catch (e) {
            console.error('Error viewing recipe:', e);
            alert('Error loading recipe.');
        }
    }

    closeRecipeDetailModal() {
        document.getElementById('recipe-detail-modal').classList.remove('active');
    }

   printRecipeCard() {
        // Get current recipe ID from the modal
        const modal = document.getElementById('recipe-detail-modal');
        if (!modal || !modal.classList.contains('active')) return;
        
        // Find which recipe is currently displayed
        const titleElement = modal.querySelector('.recipe-detail-title');
        if (!titleElement) return;
        
        const recipeName = titleElement.textContent;
        const recipe = this.recipes.find(r => r.name === recipeName);
        if (!recipe) return;
        
        // Get current scale from active button
        const activeScaleBtn = modal.querySelector('.recipe-scale-btn.active');
        const scale = activeScaleBtn ? parseFloat(activeScaleBtn.textContent.replace('×', '')) : 1;
        
        this.openPrintWindow(recipe, scale);
    }

    openPrintWindow(recipe, scale) {
        const self = this;
        
        // Function to scale ingredients
        const scaleIngredient = function(ingredient) {
            if (scale === 1) return ingredient;
            return ingredient.replace(/(\d+\.?\d*)/g, function(match) {
                const num = parseFloat(match);
                const scaled = num * scale;
                return parseFloat(scaled.toFixed(2)).toString();
            });
        };
        
        const collections = recipe.collections || [];
        const ingredients = recipe.ingredients || [];
        const steps = recipe.steps || [];
        const nutrition = recipe.nutrition || {};
        
        // Create print HTML
        const printHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Print: ${recipe.name}</title>
    <style>
        @page {
            size: A5 portrait;
            margin: 10mm;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: Arial, sans-serif;
            font-size: 10pt;
            line-height: 1.3;
            color: #000;
            background: white;
        }
        
        .recipe-card {
            width: 100%;
            max-width: 128mm;
        }
        
        h1 {
            font-size: 18pt;
            margin-bottom: 4pt;
            color: #000;
        }
        
        .meta {
            font-size: 8pt;
            margin-bottom: 6pt;
            padding-bottom: 4pt;
            border-bottom: 1pt solid #000;
        }
        
        .meta span {
            margin-right: 10pt;
        }
        
        .collections {
            margin-bottom: 8pt;
        }
        
        .tag {
            display: inline-block;
            font-size: 7pt;
            padding: 2pt 4pt;
            border: 0.5pt solid #000;
            border-radius: 2pt;
            background: #f0f0f0;
            margin-right: 3pt;
            margin-bottom: 2pt;
        }
        
        .section {
            margin-bottom: 8pt;
        }
        
        h2 {
            font-size: 11pt;
            margin-bottom: 3pt;
            margin-top: 6pt;
            padding-bottom: 2pt;
            border-bottom: 0.5pt solid #666;
        }
        
        ul, ol {
            margin-left: 12pt;
            padding: 0;
        }
        
        li {
            margin-bottom: 2pt;
            font-size: 8.5pt;
        }
        
        .nutrition {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 3pt;
            margin-top: 3pt;
        }
        
        .nutrition-item {
            text-align: center;
            border: 0.5pt solid #666;
            padding: 3pt;
            border-radius: 2pt;
        }
        
        .nutrition-value {
            font-size: 9pt;
            font-weight: bold;
            display: block;
        }
        
        .nutrition-label {
            font-size: 6pt;
            display: block;
        }
        
        .notes {
            font-size: 8pt;
        }
        
        @media print {
            body {
                margin: 0;
            }
        }
    </style>
</head>
<body>
    <div class="recipe-card">
        <h1>${self.escapeHtml(recipe.name)}</h1>
        
        <div class="meta">
            <span>🍽️ ${Math.round((recipe.servings || 0) * scale)} servings</span>
            <span>⏱️ Prep: ${recipe.prepTime || 0} min</span>
            <span>🔥 Cook: ${recipe.cookTime || 0} min</span>
            ${recipe.source ? '<span>📖 ' + self.escapeHtml(recipe.source) + '</span>' : ''}
            ${scale !== 1 ? '<span style="font-weight: bold;">Scaled: ×' + scale + '</span>' : ''}
        </div>
        
        ${collections.length > 0 ? '<div class="collections">' + 
            collections.map(c => '<span class="tag">' + self.escapeHtml(c) + '</span>').join('') + 
        '</div>' : ''}
        
        <div class="section">
            <h2>Ingredients${scale !== 1 ? ' (scaled ×' + scale + ')' : ''}</h2>
            <ul>
                ${ingredients.map(i => '<li>' + self.escapeHtml(scaleIngredient(i)) + '</li>').join('')}
            </ul>
        </div>
        
        <div class="section">
            <h2>Instructions</h2>
            <ol>
                ${steps.map(s => '<li>' + self.escapeHtml(s) + '</li>').join('')}
            </ol>
        </div>
        
        ${nutrition.calories || nutrition.protein || nutrition.carbs || nutrition.fat ? `
        <div class="section">
            <h2>Nutrition (per serving)</h2>
            <div class="nutrition">
                ${nutrition.calories ? '<div class="nutrition-item"><span class="nutrition-value">' + nutrition.calories + '</span><span class="nutrition-label">Calories</span></div>' : ''}
                ${nutrition.protein ? '<div class="nutrition-item"><span class="nutrition-value">' + nutrition.protein + 'g</span><span class="nutrition-label">Protein</span></div>' : ''}
                ${nutrition.carbs ? '<div class="nutrition-item"><span class="nutrition-value">' + nutrition.carbs + 'g</span><span class="nutrition-label">Carbs</span></div>' : ''}
                ${nutrition.fat ? '<div class="nutrition-item"><span class="nutrition-value">' + nutrition.fat + 'g</span><span class="nutrition-label">Fat</span></div>' : ''}
                ${nutrition.fiber ? '<div class="nutrition-item"><span class="nutrition-value">' + nutrition.fiber + 'g</span><span class="nutrition-label">Fiber</span></div>' : ''}
                ${nutrition.sugar ? '<div class="nutrition-item"><span class="nutrition-value">' + nutrition.sugar + 'g</span><span class="nutrition-label">Sugar</span></div>' : ''}
            </div>
        </div>
        ` : ''}
        
        ${recipe.notes ? '<div class="section"><h2>Notes</h2><div class="notes">' + self.escapeHtml(recipe.notes).replace(/\n/g, '<br>') + '</div></div>' : ''}
    </div>
    
    <script>
        window.onload = function() {
            window.print();
        };
        
        window.onafterprint = function() {
            window.close();
        };
    </script>
</body>
</html>`;
        
        // Open new window and write content
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        printWindow.document.write(printHTML);
        printWindow.document.close();
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
            return '<option value="' + dateStr + '">' + dayName + '</option>';
        }).join('');
        
        const html = '<div style="padding: 20px;"><h3 style="margin-bottom: 16px;">Add to Meal Plan</h3>' +
            '<div style="margin-bottom: 12px;"><label style="display: block; margin-bottom: 6px; font-weight: 600;">Day:</label>' +
            '<select id="add-meal-day" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;">' +
            dayOptions + '</select></div>' +
            '<div style="margin-bottom: 20px;"><label style="display: block; margin-bottom: 6px; font-weight: 600;">Meal:</label>' +
            '<select id="add-meal-type" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;">' +
            '<option value="breakfast">Breakfast</option><option value="lunch">Lunch</option><option value="dinner">Dinner</option>' +
            '</select></div>' +
            '<div style="display: flex; gap: 12px;">' +
            '<button onclick="recipeManager.confirmAddToMealPlan(\'' + recipeId + '\')" class="btn btn-primary" style="flex: 1;">Add to Plan</button>' +
            '<button onclick="recipeManager.cancelAddToMealPlan()" class="btn btn-secondary" style="flex: 1;">Cancel</button>' +
            '</div></div>';
        
        const tempModal = document.createElement('div');
        tempModal.id = 'temp-add-meal-modal';
        tempModal.className = 'modal active';
        tempModal.innerHTML = '<div class="modal-content" style="max-width: 400px;">' + html + '</div>';
        document.body.appendChild(tempModal);
    }

    confirmAddToMealPlan(recipeId) {
        const day = document.getElementById('add-meal-day').value;
        const mealType = document.getElementById('add-meal-type').value;
        
        if (!this.mealPlan[day]) this.mealPlan[day] = {};
        this.mealPlan[day][mealType] = recipeId;
        this.saveLocal('mealPlan', this.mealPlan);
        
        this.cancelAddToMealPlan();
        alert('Recipe added to meal plan!');
    }

    cancelAddToMealPlan() {
        const tempModal = document.getElementById('temp-add-meal-modal');
        if (tempModal) {
            tempModal.remove();
        }
    }
    // CHUNK 4 OF 4 - Add this below Chunk 3 (FINAL CHUNK!)
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

        const self = this;
        grid.innerHTML = days.map(date => {
            const dateStr = date.toISOString().split('T')[0];
            const isPast = date < today;
            const dayName = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
            
            // Calculate nutrition for the day
            const dayNutrition = self.calculateDayNutrition(dateStr);
            const nutritionSummary = dayNutrition.calories > 0 ? 
                `${Math.round(dayNutrition.calories)} cal • ${Math.round(dayNutrition.protein)}g protein` : 
                'No meals planned';
            
            return `<div class="meal-day-card ${isPast ? 'past' : ''}" data-date="${dateStr}">
                <div class="meal-day-header">
                    <div class="meal-day-date">${dayName}</div>
                    <div class="meal-day-nutrition-summary">${nutritionSummary}</div>
                </div>
                <div class="meal-day-body">
                    <div class="meal-slots-modern">
                        ${self.renderMealSlotModern(dateStr, 'breakfast', '🌅 Breakfast')}
                        ${self.renderMealSlotModern(dateStr, 'lunch', '☀️ Lunch')}
                        ${self.renderMealSlotModern(dateStr, 'dinner', '🌙 Dinner')}
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    calculateDayNutrition(dateStr) {
        const meals = this.mealPlan[dateStr] || {};
        const extras = this.dailyExtras[dateStr] || [];
        
        let totals = {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0
        };
        
        const self = this;
        ['breakfast', 'lunch', 'dinner'].forEach(mealType => {
            const meal = meals[mealType];
            if (!meal) return;
            
            if (meal.type === 'recipe') {
                const recipe = self.recipes.find(r => r.id === meal.recipeId);
                if (recipe && recipe.nutrition) {
                    totals.calories += recipe.nutrition.calories || 0;
                    totals.protein += recipe.nutrition.protein || 0;
                    totals.carbs += recipe.nutrition.carbs || 0;
                    totals.fat += recipe.nutrition.fat || 0;
                }
            }
        });
        
        extras.forEach(extra => {
            totals.calories += extra.calories || 0;
            totals.protein += extra.protein || 0;
        });
        
        return totals;
    }

    renderMealSlotModern(date, mealType, label) {
        const meals = this.mealPlan[date] || {};
        const meal = meals[mealType];
        const self = this;
        
        let contentHTML = '';
        
        if (!meal) {
            contentHTML = `<div class="meal-slot-empty" onclick="recipeManager.openMealSelector('${date}', '${mealType}')">
                + Click to add ${mealType}
            </div>`;
        } else if (meal.type === 'recipe') {
            const recipe = self.recipes.find(r => r.id === meal.recipeId);
            if (recipe) {
                const nutrition = recipe.nutrition || {};
                contentHTML = `<div class="meal-slot-recipe">
                    ${recipe.image ? `<img src="${recipe.image}" class="meal-slot-recipe-image" onerror="this.style.display='none'">` : ''}
                    <div class="meal-slot-recipe-info">
                        <div class="meal-slot-recipe-name">${self.escapeHtml(recipe.name)}</div>
                        <div class="meal-slot-recipe-meta">${recipe.servings} servings • ${(recipe.prepTime || 0) + (recipe.cookTime || 0)} min</div>
                        <div class="meal-slot-recipe-nutrition">
                            ${nutrition.calories ? `<span>${Math.round(nutrition.calories)} cal</span>` : ''}
                            ${nutrition.protein ? `<span>${nutrition.protein}g protein</span>` : ''}
                        </div>
                    </div>
                </div>`;
            } else {
                contentHTML = `<div class="meal-slot-custom-text">Recipe not found</div>`;
            }
        } else if (meal.type === 'custom') {
            contentHTML = `<div class="meal-slot-custom-text">${self.escapeHtml(meal.text)}</div>`;
        }
        
        return `<div class="meal-slot-card ${mealType}">
            <div class="meal-slot-header">
                <div class="meal-slot-label ${mealType}">${label}</div>
                <div class="meal-slot-actions">
                    ${meal ? `<button class="meal-slot-icon-btn" onclick="recipeManager.clearMealSlot('${date}', '${mealType}')" title="Clear">✕</button>` : ''}
                    <button class="meal-slot-icon-btn" onclick="recipeManager.openMealSelector('${date}', '${mealType}')" title="Change">✏️</button>
                </div>
            </div>
            <div class="meal-slot-content">
                ${contentHTML}
            </div>
        </div>`;
    }

    openMealSelector(date, mealType) {
        const self = this;
        const currentMeal = (this.mealPlan[date] && this.mealPlan[date][mealType]) || null;
        
        // Create modal HTML
        const modalHTML = `
            <div id="meal-select-modal" class="meal-select-modal active">
                <div class="meal-select-content">
                    <div class="meal-select-header">
                        <h3>Select ${mealType.charAt(0).toUpperCase() + mealType.slice(1)}</h3>
                        <p style="color: #666; font-size: 14px;">${new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                    </div>
                    
                    <div class="meal-select-tabs">
                        <button class="meal-select-tab active" data-tab="recipes">From Recipes</button>
                        <button class="meal-select-tab" data-tab="custom">Custom Text</button>
                    </div>
                    
                    <div id="meal-select-tab-recipes" class="meal-select-tab-content">
                        <div class="meal-select-search">
                            <input type="text" id="meal-search-input" placeholder="Search recipes...">
                        </div>
                        <div id="meal-select-recipe-list" class="meal-select-list"></div>
                    </div>
                    
                    <div id="meal-select-tab-custom" class="meal-select-tab-content" style="display: none;">
                        <div class="meal-custom-input-section">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600;">Enter meal description:</label>
                            <input type="text" id="meal-custom-text" placeholder="e.g., Eating out, Leftovers, Takeaway..." value="${currentMeal && currentMeal.type === 'custom' ? currentMeal.text : ''}">
                            <div class="meal-custom-input-actions">
                                <button class="btn btn-primary" onclick="recipeManager.saveCustomMeal('${date}', '${mealType}')">Save Custom Meal</button>
                                <button class="btn btn-secondary" onclick="recipeManager.closeMealSelector()">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('meal-select-modal');
        if (existingModal) existingModal.remove();
        
        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Setup tab switching
        document.querySelectorAll('.meal-select-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                document.querySelectorAll('.meal-select-tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                const tabName = this.dataset.tab;
                document.querySelectorAll('.meal-select-tab-content').forEach(content => {
                    content.style.display = 'none';
                });
                document.getElementById('meal-select-tab-' + tabName).style.display = 'block';
            });
        });
        
        // Setup search
        document.getElementById('meal-search-input').addEventListener('input', function() {
            self.filterMealRecipes(this.value);
        });
        
        // Close on background click
        document.getElementById('meal-select-modal').addEventListener('click', function(e) {
            if (e.target === this) {
                self.closeMealSelector();
            }
        });
        
        // Initial recipe list
        this.currentMealDate = date;
        this.currentMealType = mealType;
        this.filterMealRecipes('');
    }

    filterMealRecipes(searchTerm) {
        const list = document.getElementById('meal-select-recipe-list');
        const self = this;
        
        const filtered = this.recipes.filter(recipe => {
            if (!searchTerm) return true;
            const term = searchTerm.toLowerCase();
            return recipe.name.toLowerCase().includes(term) ||
                   (recipe.ingredients || []).some(i => i.toLowerCase().includes(term)) ||
                   (recipe.keywords || []).some(k => k.toLowerCase().includes(term));
        });
        
        if (filtered.length === 0) {
            list.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No recipes found</p>';
            return;
        }
        
        list.innerHTML = filtered.map(recipe => {
            const nutrition = recipe.nutrition || {};
            return `<div class="meal-select-item" onclick="recipeManager.selectRecipeForMeal('${recipe.id}')">
                <div>
                    <div class="meal-select-item-name">${self.escapeHtml(recipe.name)}</div>
                    <div class="meal-select-item-meta">
                        ${recipe.servings} servings
                        ${nutrition.calories ? ' • ' + Math.round(nutrition.calories) + ' cal' : ''}
                        ${nutrition.protein ? ' • ' + nutrition.protein + 'g protein' : ''}
                    </div>
                </div>
                <span>→</span>
            </div>`;
        }).join('');
    }

    selectRecipeForMeal(recipeId) {
        const date = this.currentMealDate;
        const mealType = this.currentMealType;
        
        if (!this.mealPlan[date]) {
            this.mealPlan[date] = {};
        }
        
        this.mealPlan[date][mealType] = {
            type: 'recipe',
            recipeId: recipeId
        };
        
        this.saveLocal('mealPlan', this.mealPlan);
        this.closeMealSelector();
        this.renderMealPlan();
        this.renderDashboard();
    }

    saveCustomMeal(date, mealType) {
        const text = document.getElementById('meal-custom-text').value.trim();
        
        if (!text) {
            alert('Please enter a meal description');
            return;
        }
        
        if (!this.mealPlan[date]) {
            this.mealPlan[date] = {};
        }
        
        this.mealPlan[date][mealType] = {
            type: 'custom',
            text: text
        };
        
        this.saveLocal('mealPlan', this.mealPlan);
        this.closeMealSelector();
        this.renderMealPlan();
        this.renderDashboard();
    }

    clearMealSlot(date, mealType) {
        if (this.mealPlan[date] && this.mealPlan[date][mealType]) {
            delete this.mealPlan[date][mealType];
            
            // Clean up empty date objects
            if (Object.keys(this.mealPlan[date]).length === 0) {
                delete this.mealPlan[date];
            }
            
            this.saveLocal('mealPlan', this.mealPlan);
            this.renderMealPlan();
            this.renderDashboard();
        }
    }

    closeMealSelector() {
        const modal = document.getElementById('meal-select-modal');
        if (modal) {
            modal.remove();
        }
    }
    
    renderMealSlot(date, mealType, label) {
        const selectedRecipe = this.mealPlan[date] && this.mealPlan[date][mealType] ? this.mealPlan[date][mealType] : '';
        const self = this;
        
        return '<div class="meal-slot">' +
            '<div class="meal-slot-label">' + label + '</div>' +
            '<select data-meal="' + date + '|' + mealType + '">' +
            '<option value="">-- Select a recipe --</option>' +
            this.recipes.map(r => 
                '<option value="' + r.id + '" ' + (r.id === selectedRecipe ? 'selected' : '') + '>' +
                self.escapeHtml(r.name) +
                '</option>'
            ).join('') +
            '</select></div>';
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
        
        const self = this;
        mealOrder.forEach(mealType => {
            const recipeId = meals[mealType];
            if (!recipeId) return;
            
            const recipe = self.recipes.find(r => r.id === recipeId);
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
            content.innerHTML = '<div style="display: flex; justify-content: flex-end; margin-bottom: 16px;">' +
                '<button class="btn btn-secondary" onclick="recipeManager.showNutritionGoalsModal()">⚙️ Set Daily Goals</button></div>' +
                '<div class="nutrition-empty"><p>No meals planned for ' + formattedDate + '</p>' +
                '<p>Add recipes to your meal plan to see nutrition information.</p></div>';
            return;
        }

        const calcPercent = function(actual, goal) {
            if (!goal) return 0;
            return Math.round((actual / goal) * 100);
        };

        const getProgressColor = function(percent) {
            if (percent < 80) return '#ef4444';
            if (percent < 95) return '#f59e0b';
            if (percent <= 110) return '#10b981';
            return '#ef4444';
        };

        let html = '<div style="display: flex; justify-content: flex-end; margin-bottom: 16px;">' +
            '<button class="btn btn-secondary" onclick="recipeManager.showNutritionGoalsModal()">⚙️ Set Daily Goals</button></div>';

        html += '<div class="nutrition-summary-modern"><div class="nutrition-summary-header"><h2>' + formattedDate + '</h2></div>';
        html += '<div class="nutrition-macros-grid">';

        const macros = [
            {label: 'Calories', value: Math.round(totals.calories), goal: goals.calories, unit: ''},
            {label: 'Protein', value: totals.protein.toFixed(1), goal: goals.protein, unit: 'g'},
            {label: 'Carbs', value: totals.carbs.toFixed(1), goal: goals.carbs, unit: 'g'},
            {label: 'Fat', value: totals.fat.toFixed(1), goal: goals.fat, unit: 'g'},
            {label: 'Fiber', value: totals.fiber.toFixed(1), goal: goals.fiber, unit: 'g'},
            {label: 'Sugar', value: totals.sugar.toFixed(1), goal: goals.sugar, unit: 'g'}
        ];

        macros.forEach(macro => {
            const percent = calcPercent(parseFloat(macro.value), macro.goal);
            const color = getProgressColor(percent);
            html += '<div class="macro-card">' +
                '<div class="macro-header">' +
                '<span class="macro-label">' + macro.label + '</span>' +
                '<span class="macro-value">' + macro.value + macro.unit + ' / ' + macro.goal + macro.unit + '</span>' +
                '</div>' +
                '<div class="macro-progress-bar">' +
                '<div class="macro-progress-fill" style="width: ' + Math.min(percent, 100) + '%; background: ' + color + '"></div>' +
                '</div>' +
                '<div class="macro-percent">' + percent + '%</div>' +
                '</div>';
        });

        html += '</div></div>';

        if (mealData.length > 0) {
            html += '<div class="nutrition-meals"><h3>Planned Meals</h3>';
            mealData.forEach(meal => {
                html += '<div class="nutrition-meal-item">' +
                    '<div class="nutrition-meal-header">' +
                    '<div class="nutrition-meal-name">' + self.escapeHtml(meal.name) + '</div>' +
                    '<div class="nutrition-meal-type">' + meal.type + '</div>' +
                    '</div>' +
                    '<div class="nutrition-meal-stats">' +
                    '<div class="nutrition-stat"><div class="nutrition-stat-value">' + Math.round(meal.nutrition.calories || 0) + '</div><div class="nutrition-stat-label">Calories</div></div>' +
                    '<div class="nutrition-stat"><div class="nutrition-stat-value">' + (meal.nutrition.protein || 0).toFixed(1) + 'g</div><div class="nutrition-stat-label">Protein</div></div>' +
                    '<div class="nutrition-stat"><div class="nutrition-stat-value">' + (meal.nutrition.carbs || 0).toFixed(1) + 'g</div><div class="nutrition-stat-label">Carbs</div></div>' +
                    '<div class="nutrition-stat"><div class="nutrition-stat-value">' + (meal.nutrition.fat || 0).toFixed(1) + 'g</div><div class="nutrition-stat-label">Fat</div></div>' +
                    '</div></div>';
            });
            html += '</div>';
        }

        html += '<div class="nutrition-extras"><h3>Snacks & Extras</h3>';
        extras.forEach((extra, index) => {
            html += '<div class="extra-item">' +
                '<div class="extra-item-info">' +
                '<div class="extra-item-name">' + self.escapeHtml(extra.name) + '</div>' +
                '<div class="extra-item-stats">' +
                '<span>' + Math.round(extra.calories || 0) + ' cal</span>' +
                '<span>' + (extra.protein || 0).toFixed(1) + 'g protein</span>' +
                '<span>' + (extra.carbs || 0).toFixed(1) + 'g carbs</span>' +
                '<span>' + (extra.fat || 0).toFixed(1) + 'g fat</span>' +
                '</div></div>' +
                '<button class="extra-item-remove" onclick="recipeManager.removeExtra(' + index + ')">×</button>' +
                '</div>';
        });
        html += '<button class="add-extra-btn" onclick="recipeManager.showAddExtraModal()">+ Add Snack/Extra</button></div>';

        content.innerHTML = '<div class="recipe-print-card">' + html + '</div>';
    }

    showNutritionGoalsModal() {
        const goals = this.nutritionGoals;
        const html = '<div style="padding: 20px;"><h3 style="margin-bottom: 16px;">Daily Nutrition Goals</h3>' +
            '<p style="margin-bottom: 20px; color: #666;">Set your daily nutrition targets. You can update these anytime.</p>' +
            '<div class="nutrition-grid" style="margin-bottom: 20px;">' +
            '<div><label style="display: block; margin-bottom: 6px; font-weight: 600;">Calories:</label>' +
            '<input type="number" id="goal-calories" value="' + goals.calories + '" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;"></div>' +
            '<div><label style="display: block; margin-bottom: 6px; font-weight: 600;">Protein (g):</label>' +
            '<input type="number" id="goal-protein" value="' + goals.protein + '" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;"></div>' +
            '<div><label style="display: block; margin-bottom: 6px; font-weight: 600;">Carbs (g):</label>' +
            '<input type="number" id="goal-carbs" value="' + goals.carbs + '" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;"></div>' +
            '<div><label style="display: block; margin-bottom: 6px; font-weight: 600;">Fat (g):</label>' +
            '<input type="number" id="goal-fat" value="' + goals.fat + '" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;"></div>' +
            '<div><label style="display: block; margin-bottom: 6px; font-weight: 600;">Fiber (g):</label>' +
            '<input type="number" id="goal-fiber" value="' + goals.fiber + '" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;"></div>' +
            '<div><label style="display: block; margin-bottom: 6px; font-weight: 600;">Sugar (g):</label>' +
            '<input type="number" id="goal-sugar" value="' + goals.sugar + '" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;"></div>' +
            '</div>' +
            '<div style="display: flex; gap: 12px;">' +
            '<button onclick="recipeManager.saveNutritionGoals()" class="btn btn-primary" style="flex: 1;">Save Goals</button>' +
            '<button onclick="recipeManager.cancelNutritionGoals()" class="btn btn-secondary" style="flex: 1;">Cancel</button>' +
            '</div></div>';
        
        const tempModal = document.createElement('div');
        tempModal.id = 'temp-goals-modal';
        tempModal.className = 'modal active';
        tempModal.innerHTML = '<div class="modal-content" style="max-width: 500px;">' + html + '</div>';
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
        
        this.saveLocal('nutritionGoals', this.nutritionGoals);
        this.cancelNutritionGoals();
        this.renderNutritionView();
    }

    cancelNutritionGoals() {
        const tempModal = document.getElementById('temp-goals-modal');
        if (tempModal) {
            tempModal.remove();
        }
    }

    showAddExtraModal() {
        const html = '<div style="padding: 20px;"><h3 style="margin-bottom: 16px;">Add Snack or Extra Food</h3>' +
            '<div style="margin-bottom: 12px;"><label style="display: block; margin-bottom: 6px; font-weight: 600;">Name:</label>' +
            '<input type="text" id="extra-name" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;" placeholder="e.g., Apple, Protein shake"></div>' +
            '<div class="nutrition-grid" style="margin-bottom: 20px;">' +
            '<div><label style="display: block; margin-bottom: 6px; font-weight: 600;">Calories:</label>' +
            '<input type="number" id="extra-calories" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;" placeholder="95"></div>' +
            '<div><label style="display: block; margin-bottom: 6px; font-weight: 600;">Protein (g):</label>' +
            '<input type="number" id="extra-protein" step="0.1" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;" placeholder="0.5"></div>' +
            '<div><label style="display: block; margin-bottom: 6px; font-weight: 600;">Carbs (g):</label>' +
            '<input type="number" id="extra-carbs" step="0.1" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;" placeholder="25"></div>' +
            '<div><label style="display: block; margin-bottom: 6px; font-weight: 600;">Fat (g):</label>' +
            '<input type="number" id="extra-fat" step="0.1" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;" placeholder="0.3"></div>' +
            '<div><label style="display: block; margin-bottom: 6px; font-weight: 600;">Fiber (g):</label>' +
            '<input type="number" id="extra-fiber" step="0.1" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;" placeholder="4"></div>' +
            '<div><label style="display: block; margin-bottom: 6px; font-weight: 600;">Sugar (g):</label>' +
            '<input type="number" id="extra-sugar" step="0.1" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;" placeholder="19"></div>' +
            '</div>' +
            '<div style="display: flex; gap: 12px;">' +
            '<button onclick="recipeManager.confirmAddExtra()" class="btn btn-primary" style="flex: 1;">Add Extra</button>' +
            '<button onclick="recipeManager.cancelAddExtra()" class="btn btn-secondary" style="flex: 1;">Cancel</button>' +
            '</div></div>';
        
        const tempModal = document.createElement('div');
        tempModal.id = 'temp-extra-modal';
        tempModal.className = 'modal active';
        tempModal.innerHTML = '<div class="modal-content" style="max-width: 500px;">' + html + '</div>';
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
        this.saveLocal('dailyExtras', this.dailyExtras);

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
            this.saveLocal('dailyExtras', this.dailyExtras);
            this.renderNutritionView();
        }
    }

    openQuickFoodModal(food) {
        food = food || null;
        this.editingQuickFoodId = food ? food.id : null;
        
        const html = '<div style="padding: 20px;"><h3 style="margin-bottom: 16px;">' + (food ? 'Edit' : 'Add') + ' Quick Food</h3>' +
            '<div style="margin-bottom: 12px;"><label style="display: block; margin-bottom: 6px; font-weight: 600;">Name: *</label>' +
            '<input type="text" id="qf-name" value="' + (food ? food.name : '') + '" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;" placeholder="e.g., Apple, Protein Bar, Yogurt"></div>' +
            '<div class="nutrition-grid" style="margin-bottom: 20px;">' +
            '<div><label style="display: block; margin-bottom: 6px; font-weight: 600;">Calories:</label>' +
            '<input type="number" id="qf-calories" value="' + (food ? food.calories : '') + '" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;" placeholder="95"></div>' +
            '<div><label style="display: block; margin-bottom: 6px; font-weight: 600;">Protein (g):</label>' +
            '<input type="number" id="qf-protein" value="' + (food ? food.protein : '') + '" step="0.1" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;" placeholder="0.5"></div>' +
            '<div><label style="display: block; margin-bottom: 6px; font-weight: 600;">Carbs (g):</label>' +
            '<input type="number" id="qf-carbs" value="' + (food ? food.carbs : '') + '" step="0.1" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;" placeholder="25"></div>' +
            '<div><label style="display: block; margin-bottom: 6px; font-weight: 600;">Fat (g):</label>' +
            '<input type="number" id="qf-fat" value="' + (food ? food.fat : '') + '" step="0.1" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;" placeholder="0.3"></div>' +
            '<div><label style="display: block; margin-bottom: 6px; font-weight: 600;">Fiber (g):</label>' +
            '<input type="number" id="qf-fiber" value="' + (food ? food.fiber : '') + '" step="0.1" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;" placeholder="4"></div>' +
            '<div><label style="display: block; margin-bottom: 6px; font-weight: 600;">Sugar (g):</label>' +
            '<input type="number" id="qf-sugar" value="' + (food ? food.sugar : '') + '" step="0.1" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px;" placeholder="19"></div>' +
            '</div>' +
            '<div style="display: flex; gap: 12px;">' +
            '<button onclick="recipeManager.saveQuickFood()" class="btn btn-primary" style="flex: 1;">Save</button>' +
            '<button onclick="recipeManager.cancelQuickFood()" class="btn btn-secondary" style="flex: 1;">Cancel</button>' +
            '</div></div>';
        
        const tempModal = document.createElement('div');
        tempModal.id = 'temp-quick-food-modal';
        tempModal.className = 'modal active';
        tempModal.innerHTML = '<div class="modal-content" style="max-width: 500px;">' + html + '</div>';
        document.body.appendChild(tempModal);
    }

    async saveQuickFood() {
        const name = document.getElementById('qf-name').value.trim();
        if (!name) {
            alert('Please enter a name');
            return;
        }

        const food = {
            id: this.editingQuickFoodId || Date.now().toString() + '-temp',
            name: name,
            calories: parseFloat(document.getElementById('qf-calories').value) || 0,
            protein: parseFloat(document.getElementById('qf-protein').value) || 0,
            carbs: parseFloat(document.getElementById('qf-carbs').value) || 0,
            fat: parseFloat(document.getElementById('qf-fat').value) || 0,
            fiber: parseFloat(document.getElementById('qf-fiber').value) || 0,
            sugar: parseFloat(document.getElementById('qf-sugar').value) || 0
        };

        try {
            const newId = await this.saveQuickFoodToSupabase(food);
            food.id = newId;

            if (this.editingQuickFoodId) {
                const index = this.quickFoods.findIndex(f => f.id === this.editingQuickFoodId);
                if (index !== -1) {
                    this.quickFoods[index] = food;
                }
            } else {
                this.quickFoods.push(food);
            }

            this.cancelQuickFood();
            this.renderQuickFoods();
            alert('Quick food saved to cloud!');
        } catch (error) {
            alert('Error saving quick food. Please try again.');
        }
    }

    cancelQuickFood() {
        const tempModal = document.getElementById('temp-quick-food-modal');
        if (tempModal) {
            tempModal.remove();
        }
        this.editingQuickFoodId = null;
    }

    async deleteQuickFood(id) {
        if (confirm('Delete this quick food from the cloud?')) {
            try {
                await this.deleteQuickFoodFromSupabase(id);
                this.quickFoods = this.quickFoods.filter(f => f.id !== id);
                this.renderQuickFoods();
                alert('Quick food deleted!');
            } catch (error) {
                alert('Error deleting quick food. Please try again.');
            }
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
        
        this.saveLocal('dailyExtras', this.dailyExtras);
        alert(food.name + ' added to ' + this.currentNutritionDate + '!');
        
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

        const self = this;
        grid.innerHTML = this.quickFoods.map(food => {
            return '<div class="quick-food-card">' +
                '<div class="quick-food-header"><h3 class="quick-food-name">' + self.escapeHtml(food.name) + '</h3></div>' +
                '<div class="quick-food-nutrition">' +
                '<div class="quick-food-stat"><span class="stat-value">' + Math.round(food.calories) + '</span><span class="stat-label">cal</span></div>' +
                '<div class="quick-food-stat"><span class="stat-value">' + food.protein.toFixed(1) + 'g</span><span class="stat-label">protein</span></div>' +
                '<div class="quick-food-stat"><span class="stat-value">' + food.carbs.toFixed(1) + 'g</span><span class="stat-label">carbs</span></div>' +
                '<div class="quick-food-stat"><span class="stat-value">' + food.fat.toFixed(1) + 'g</span><span class="stat-label">fat</span></div>' +
                '</div>' +
                '<div class="quick-food-actions">' +
                '<button class="btn btn-primary" onclick="recipeManager.addQuickFoodToDay(\'' + food.id + '\')" style="flex: 1;">➕ Add to Today</button>' +
                '<button class="btn btn-secondary" onclick="recipeManager.openQuickFoodModal(recipeManager.quickFoods.find(f => f.id === \'' + food.id + '\'))" style="padding: 10px;">✏️</button>' +
                '<button class="btn btn-danger" onclick="recipeManager.deleteQuickFood(\'' + food.id + '\')" style="padding: 10px;">🗑️</button>' +
                '</div></div>';
        }).join('');
    }

    generateShoppingList() {
        const ingredients = {};
        const self = this;
        
        Object.keys(this.mealPlan).forEach(function(date) {
            const meals = self.mealPlan[date];
            Object.keys(meals).forEach(function(mealType) {
                const recipeId = meals[mealType];
                if (!recipeId) return;
                
                const recipe = self.recipes.find(r => r.id === recipeId);
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

    this.shoppingList = Object.keys(ingredients).map(function(ingredient) {
        return {
            ingredient: ingredient,
            count: ingredients[ingredient].count,
            checked: false
        };
    });

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

    const self = this;
    this.shoppingList.forEach(function(item, index) {
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

    let html = '';
    Object.keys(categorized).forEach(function(category) {
        const items = categorized[category];
        if (items.length > 0) {
            html += '<div class="shopping-category"><h3>' + category + '</h3><ul class="shopping-list-items">';
            items.forEach(function(item) {
                html += '<li class="shopping-list-item ' + (item.checked ? 'checked' : '') + '" data-index="' + item.index + '">' +
                    '<label class="shopping-checkbox">' +
                    '<input type="checkbox" ' + (item.checked ? 'checked' : '') + ' onchange="recipeManager.toggleShoppingItem(' + item.index + ')">' +
                    '<span>' + self.escapeHtml(item.ingredient) + (item.count > 1 ? ' (×' + item.count + ')' : '') + '</span>' +
                    '</label>' +
                    '<button class="shopping-remove-btn" onclick="recipeManager.removeShoppingItem(' + item.index + ')" title="Remove item">×</button>' +
                    '</li>';
            });
            html += '</ul></div>';
        }
    });

    content.innerHTML = html;
}

async exportData() {
    const data = {
        recipes: this.recipes,
        quickFoods: this.quickFoods,
        mealPlan: this.mealPlan,
        dailyExtras: this.dailyExtras,
        nutritionGoals: this.nutritionGoals,
        exportDate: new Date().toISOString(),
        source: 'supabase-hybrid'
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

async importData() {
    const textarea = document.getElementById('import-textarea');
    try {
        const data = JSON.parse(textarea.value);
        
        if (!data.recipes || !Array.isArray(data.recipes)) {
            throw new Error('Invalid data format');
        }
        
        if (confirm('This will import data. Local recipes will be uploaded to Supabase. Continue?')) {
            for (let i = 0; i < data.recipes.length; i++) {
                try {
                    await this.saveRecipeToSupabase(data.recipes[i]);
                } catch (error) {
                    console.error('Error importing recipe:', data.recipes[i].name, error);
                }
            }
            
            if (data.quickFoods && Array.isArray(data.quickFoods)) {
                for (let i = 0; i < data.quickFoods.length; i++) {
                    try {
                        await this.saveQuickFoodToSupabase(data.quickFoods[i]);
                    } catch (error) {
                        console.error('Error importing quick food:', data.quickFoods[i].name, error);
                    }
                }
            }
            
            this.mealPlan = data.mealPlan || {};
            this.dailyExtras = data.dailyExtras || {};
            this.nutritionGoals = data.nutritionGoals || this.nutritionGoals;
            
            this.saveLocal('mealPlan', this.mealPlan);
            this.saveLocal('dailyExtras', this.dailyExtras);
            this.saveLocal('nutritionGoals', this.nutritionGoals);
            
            await this.loadRecipesFromSupabase();
            await this.loadQuickFoodsFromSupabase();
            
            this.renderRecipes();
            this.updateCollectionFilter();
            this.renderMealPlan();
            textarea.value = '';
            alert('Data imported successfully to cloud!');
        }
    } catch (e) {
        alert('Error importing data: ' + e.message);
    }
}
    }
// Initialize the app
// Initialize the app with error handling
let recipeManager;
try {
    console.log('Starting RecipeManager...');
    recipeManager = new RecipeManager();
    console.log('RecipeManager started successfully!');
} catch (error) {
    console.error('Error starting RecipeManager:', error);
    alert('Error starting app: ' + error.message);
}
