import { createClient } from '@supabase/supabase-js'

const win = (typeof window !== 'undefined' ? (window as any) : {})
const runtimeConfig = win.__SUPABASE_CONFIG__ || {}

const supabaseUrl = runtimeConfig.url || import.meta.env.VITE_SUPABASE_URL
const supabaseKey = runtimeConfig.anonKey || import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = !!(supabaseUrl && supabaseKey && !supabaseUrl.includes('placeholder'))

if (!supabaseConfigured) {
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

// Show a banner if Supabase is not configured
if (!supabaseConfigured && typeof document !== 'undefined') {
  const banner = document.createElement('div')
  banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#dc2626;color:white;padding:12px 20px;text-align:center;z-index:99999;font-family:sans-serif;font-size:14px'
  banner.textContent = '⚠️ Supabase não configurado — defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env'
  document.body.appendChild(banner)
}

export type Database = {
  public: {
    tables: {
      leads: {
        schema: {
          id: string
          name: string
          email: string
          phone: string
          status: 'qualified' | 'new' | 'contacted' | 'proposal' | 'negotiation' | 'won' | 'lost'
          created_at: string
          source: 'website' | 'referral' | 'purchase' | 'IA Vision' | 'Google Maps' | 'CSV'
          whatsapp_id: string | null
          whatsapp_sent: boolean
        }
      }
    }
  }
}