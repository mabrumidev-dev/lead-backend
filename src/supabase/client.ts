// @ts-nocheck
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.com',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'
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