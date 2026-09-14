import { useCallback } from 'react'

export type ErrorSeverity = 'error' | 'warning' | 'info'

interface ErrorHandlerOptions {
  showToast?: (msg: string, type?: string) => void
  fallbackMessage?: string
  logToConsole?: boolean
}

/**
 * Centralized error handler hook.
 * Shows toast notifications and logs errors consistently.
 */
export function useErrorHandler(options: ErrorHandlerOptions = {}) {
  const { showToast, fallbackMessage = 'Ocorreu um erro inesperado', logToConsole = true } = options

  const handleError = useCallback((err: unknown, context?: string): string => {
    const message = extractErrorMessage(err, fallbackMessage)
    const fullMessage = context ? `${context}: ${message}` : message

    if (logToConsole) {
      console.error(`[ERROR]${context ? ` [${context}]` : ''}`, err)
    }

    if (showToast) {
      showToast(fullMessage, 'error')
    }

    return fullMessage
  }, [showToast, fallbackMessage, logToConsole])

  const handleWarning = useCallback((msg: string, context?: string) => {
    const fullMessage = context ? `${context}: ${msg}` : msg
    if (logToConsole) console.warn(`[WARN]${context ? ` [${context}]` : ''}`, msg)
    if (showToast) showToast(fullMessage, 'warning')
  }, [showToast, logToConsole])

  const handleSuccess = useCallback((msg: string) => {
    if (showToast) showToast(msg, 'success')
  }, [showToast])

  return { handleError, handleWarning, handleSuccess }
}

/**
 * Extract a human-readable error message from various error types.
 */
export function extractErrorMessage(err: unknown, fallback = 'Erro desconhecido'): string {
  if (!err) return fallback

  // String error
  if (typeof err === 'string') return err

  // Error object
  if (err instanceof Error) return err.message || fallback

  // Supabase/PostgrestError: { message, details, hint, code }
  if (typeof err === 'object' && 'message' in err) {
    const msg = (err as any).message
    if (typeof msg === 'string') {
      // Supabase auth errors
      if (msg.includes('Invalid login credentials')) return 'Credenciais inválidas'
      if (msg.includes('Email not confirmed')) return 'Email não confirmado'
      if (msg.includes('duplicate key')) return 'Registro já existe'
      if (msg.includes('foreign key')) return 'Registro relacionado não encontrado'
      if (msg.includes('permission denied')) return 'Sem permissão para esta operação'
      if (msg.includes('JWT expired')) return 'Sessão expirada, faça login novamente'
      return msg
    }
  }

  // Fetch API error (network)
  if (typeof err === 'object' && 'status' in err) {
    const status = (err as any).status
    if (status === 429) return 'Muitas requisições. Aguarde um momento.'
    if (status === 401) return 'Não autorizado. Faça login novamente.'
    if (status === 403) return 'Sem permissão.'
    if (status === 404) return 'Recurso não encontrado.'
    if (status >= 500) return 'Erro no servidor. Tente novamente.'
    return `Erro HTTP ${status}`
  }

  return fallback
}

/**
 * Wrap an async function with error handling.
 * Returns [result, error] tuple.
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<[T | null, string | null]> {
  try {
    const result = await fn()
    return [result, null]
  } catch (err) {
    const message = extractErrorMessage(err)
    console.error(`[ERROR]${context ? ` [${context}]` : ''}`, err)
    return [null, message]
  }
}
