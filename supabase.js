import { createClient } from '@supabase/supabase-js';

const CHAVE_URL = 'bhar_config_supabase_url';
const CHAVE_ANON_KEY = 'bhar_config_supabase_anon_key';

function lerConfigSalva(chave) {
  try {
    return localStorage.getItem(chave) || '';
  } catch {
    return '';
  }
}

// Permite que o admin troque as chaves do Supabase pela tela de Acessos, sem precisar mexer em código/Vercel.
export function obterConfigSupabase() {
  return {
    url: lerConfigSalva(CHAVE_URL) || import.meta.env.VITE_SUPABASE_URL || 'https://perjhxqgcdccmfyazubi.supabase.co',
    anonKey: lerConfigSalva(CHAVE_ANON_KEY) || import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlcmpoeHFnY2RjY21meWF6dWJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MDA1ODQsImV4cCI6MjA5OTQ3NjU4NH0.fADhYiAjHFWRvp30UHdS5my9ROkemKB2dGgYKPeGQWM',
  };
}

export function salvarConfigSupabase({ url, anonKey }) {
  localStorage.setItem(CHAVE_URL, String(url || '').trim());
  localStorage.setItem(CHAVE_ANON_KEY, String(anonKey || '').trim());
}

export function limparConfigSupabase() {
  localStorage.removeItem(CHAVE_URL);
  localStorage.removeItem(CHAVE_ANON_KEY);
}

const { url: supabaseUrl, anonKey: supabaseAnonKey } = obterConfigSupabase();

export const supabaseClient = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
