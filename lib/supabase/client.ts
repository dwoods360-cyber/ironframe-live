import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://build-bypass.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'build-bypass-key';

export const createClient = () =>
  createBrowserClient(supabaseUrl, supabaseKey)
