// Supabase Configuration
const SUPABASE_URL = 'https://uukbovpsixcczmhtemgi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1a2JvdnBzaXhjY3ptaHRlbWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3OTA2NzEsImV4cCI6MjA4MTM2NjY3MX0.SI3DntZc_ewcL4AcvhruXsXZqd50uAreUX5lIKnXtlQ';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
