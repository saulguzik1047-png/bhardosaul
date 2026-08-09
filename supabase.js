import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://perjhxqgcdccmfyazubi.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlcmpoeHFnY2RjY21meWF6dWJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MDA1ODQsImV4cCI6MjA5OTQ3NjU4NH0.fADhYiAjHFWRvp30UHdS5my9ROkemKB2dGgYKPeGQWM';

export const supabaseClient = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
