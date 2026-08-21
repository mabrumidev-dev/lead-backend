// @ts-nocheck
import { createClient } from '@supabase/supabase-js'

const win = (typeof window !== 'undefined' ? (window as any) : {})
const runtimeConfig = win.__SUPABASE_CONFIG__ || {}

const supabaseUrl = runtimeConfig.url || import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.com'
const supabaseKey = runtimeConfig.anonKey || import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseKey)

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