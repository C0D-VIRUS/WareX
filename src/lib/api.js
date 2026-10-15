const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5050/api').replace(/\/$/, '')
const TOKEN_KEY = 'warex-auth-token'

export function getAuthToken() {
  return sessionStorage.getItem(TOKEN_KEY)
}

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {})
  const token = getAuthToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, {
      ...options,
      headers,
    })
  } catch {
    throw new Error(`Cannot reach WAREX API at ${API_BASE_URL}. Make sure the backend is running.`)
  }

  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json') ? await response.json() : await response.text()
  if (!response.ok) {
    const error = new Error(payload && typeof payload === 'object' && payload.message ? payload.message : `Request failed (${response.status}).`)
    error.status = response.status
    error.payload = payload
    throw error
  }
  return payload
}

export function toSessionUser(user) {
  return {
    userId: user.id,
    roleId: user.roleId || user.role?.id,
    roleName: user.roleName || user.role?.name,
    email: user.email,
    name: user.fullName || user.name,
    isMainAdmin: Boolean(user.isMainAdmin),
  }
}
