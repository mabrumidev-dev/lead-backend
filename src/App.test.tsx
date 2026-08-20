import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('Mabrumi CRM Pro', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'scrollY', {
      value: 0,
      writable: true
    })
  })

  it('renders login form', () => {
    render(<App />)
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/senha/i)
    const loginButton = screen.getByRole('button', { name: /Acessar Plataforma/i })
    expect(emailInput).toBeDefined()
    expect(passwordInput).toBeDefined()
    expect(loginButton).toBeDefined()
  })

  it('renders dashboard components after login click', () => {
    render(<App />)
    const loginBtn = screen.getByRole('button', { name: /Acessar Plataforma/i })
    loginBtn?.click()
    expect(screen.getByText(/Olá, Corretor/i)).toBeDefined()
  })

  it('has navigation menu items', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Buscar Leads' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Base de Leads' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Disparo WhatsApp' })).toBeDefined()
  })
})