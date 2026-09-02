export interface Lead {
  id: string
  name: string
  email: string
  phone: string
  age?: number | null
  city: string
  plan: 'Individual' | 'Empresarial' | 'Grupo'
  status: 'new' | 'contacted' | 'qualified'
  score: number // 0-100
  source: 'website' | 'referral' | 'purchase' | 'IA Vision' | 'Google Maps' | 'CSV'
  created_at: string
  enriched_data?: any | null
  website?: string | null
  cnpj?: string | null
  responsavel?: string | null
}

export interface FilterOptions {
  city?: string
  minAge?: number
  maxAge?: number
  plan?: Lead['plan']
  status?: Lead['status']
}

export const INITIAL_FILTERS: FilterOptions = {
  minAge: 25,
  maxAge: 40,
  plan: 'Individual'
}