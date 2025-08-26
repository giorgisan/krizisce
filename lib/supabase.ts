import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

// Če obstaja service role key, ga uporabimo na strežniku; drugače anon ključ
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabaseKey =
  // `typeof window === 'undefined'` je res samo na strežniku (v API-jih, getStaticProps itd.)
  typeof window === 'undefined' && serviceKey ? serviceKey : anonKey

const supabase = createClient(supabaseUrl, supabaseKey)

export default supabase
