import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vkckxborcohmovtogsrn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrY2t4Ym9yY29obW92dG9nc3JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NjAwOTgsImV4cCI6MjA4OTQzNjA5OH0.EUhVHt76SqDRmzBNy7sRCujewUQ6mHi6EVlRHFz7dbU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
