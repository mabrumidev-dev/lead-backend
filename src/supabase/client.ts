import { createClient } from '@supabase/supabase-js'

const win = (typeof window !== 'undefined' ? (window as any) : {})
const runtimeConfig = win.__SUPABASE_CONFIG__ || {}

const supabaseUrl = runtimeConfig.url || import.meta.env.VITE_SUPABASE_URL
const supabaseKey = runtimeConfig.anonKey || import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('[Supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configuradas. Verifique o .env')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    }
  }
)

export type Database = {
  public: {
    tables: {
      leads: {
        schema: {
          id: string
          name: string
          email: string
          phone: string
          status: 'qualified' | 'new' | 'contacted'
          created_at: string
          source: 'website' | 'referral' | 'purchase'
          whatsapp_id: string | null
          whatsapp_sent: boolean
        }
      }
    }
  }
}