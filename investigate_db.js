const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'fake';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'fake';

console.log("To run this, we need the real keys passed into the environment.");
