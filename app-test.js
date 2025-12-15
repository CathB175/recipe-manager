// Simple Supabase Test
async function testSupabase() {
    console.log('Testing Supabase connection...');
    
    try {
        // Test reading recipes
        const { data, error } = await supabase.from('recipes').select('*');
        
        if (error) {
            console.error('Supabase Error:', error);
            alert('Error connecting to Supabase: ' + error.message);
        } else {
            console.log('Success! Found', data.length, 'recipes');
            alert('Supabase connected! Found ' + data.length + ' recipes');
        }
    } catch (e) {
        console.error('Connection failed:', e);
        alert('Failed to connect: ' + e.message);
    }
}

// Run test when page loads
window.addEventListener('load', testSupabase);
