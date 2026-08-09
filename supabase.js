import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://veifigwusojkurqwodhk.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlaWZpZ3d1c29qa3VycXdvZGhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyMTA4OTksImV4cCI6MjEwMTc4Njg5OX0.QFm9cPf9c47G37oIiTrzsD19DC-XKD6aTEHbqcY_Azs';

export const supabaseClient = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
