import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://ibkmhcowgwgwhrzoyoft.supabase.co'
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlia21oY293Z3dnd2hyem95b2Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMDA1MDIsImV4cCI6MjEwMzU3NjUwMn0.kH0we1C5eYy_ph_bIWELre-5PNi3ZO24sV1qR-qz_54'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
