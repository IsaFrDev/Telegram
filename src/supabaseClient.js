import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kxyzzkylkutjbiyeluck.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4eXp6a3lsa3V0amJpeWVsdWNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NDc4OTYsImV4cCI6MjA5MDQyMzg5Nn0.Y814FhhsN-CIxutJ90LvhkxoWnG6BlaZxRpqFoA8oM4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
