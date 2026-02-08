import { Routes, Route, Navigate, Outlet, NavLink, Link, useSearchParams } from 'react-router-dom'
import { useState, useEffect, createContext, useContext } from 'react'
import axios from 'axios'

// Context for authentication
const AuthContext = createContext(null)

// API configuration
const API_URL = import.meta.env.VITE_API_URL || '/api'

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth Provider Component
function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    if (token && savedUser) {
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

  const login = async (username, password) => {
    const response = await api.post('/auth/login', new URLSearchParams({
      username,
      password
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    const { access_token, user_role, username: userName } = response.data

    localStorage.setItem('token', access_token)
    localStorage.setItem('user', JSON.stringify({ username: userName, rol: user_role }))

    setUser({ username: userName, rol: user_role })
    return response.data
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider')
  }
  return context
}

// Protected Route Component
function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="se-body min-h-screen flex items-center justify-center">
        <div className="se-bg" aria-hidden="true" />
        <div className="spinner"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && user.rol !== requiredRole) {
    return <Navigate to="/" replace />
  }

  return children
}

// Operador va a Sufragantes; superadmin ve Dashboard
function HomeOrRedirect() {
  const { user } = useAuth()
  if (user?.rol === 'operador') {
    return <Navigate to="/voters" replace />
  }
  return (
    <ProtectedRoute requiredRole="superadmin">
      <DashboardPage />
    </ProtectedRoute>
  )
}

// Login Page
function LoginPage() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(username, password)
      window.location.href = '/'
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="se-body se-h100">
      <div className="se-bg" aria-hidden="true" />
      <main className="min-h-screen flex items-center justify-center py-4 px-4">
        <div className="w-full max-w-md">
          <div className="se-card shadow-lg">
            <div className="se-card-head">
              <h1 className="se-title mb-1">InnovaBigData</h1>
              <p className="se-subtitle mb-0">Sistema de Registro</p>
            </div>
            <div className="se-card-body">
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="alert alert-error">{error}</div>}

                <div>
                  <label className="form-label se-label block mb-1">Usuario</label>
                  <div className="se-inputgroup flex rounded-2xl overflow-hidden border border-[rgba(255,255,255,.12)] bg-[rgba(0,0,0,.25)]">
                    <span className="se-ig-icon flex items-center px-3"><i className="bi bi-person"></i></span>
                    <input
                      type="text"
                      className="se-input flex-1 min-w-0 px-3 py-2"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      autoComplete="username"
                      placeholder="Usuario"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label se-label block mb-1">Contraseña</label>
                  <div className="se-inputgroup flex rounded-2xl overflow-hidden border border-[rgba(255,255,255,.12)] bg-[rgba(0,0,0,.25)]">
                    <span className="se-ig-icon flex items-center px-3"><i className="bi bi-shield-lock"></i></span>
                    <input
                      type="password"
                      className="se-input flex-1 min-w-0 px-3 py-2"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button type="submit" className="btn se-btn-primary w-full" disabled={loading}>
                  <i className="bi bi-box-arrow-in-right me-2"></i>
                  {loading ? 'Iniciando...' : 'Iniciar Sesión'}
                </button>

                <p className="text-center mt-3 mb-0">
                  <Link to="/forgot-password" className="se-link"><i className="bi bi-life-preserver me-1"></i>¿Olvidó su contraseña?</Link>
                </p>
              </form>
            </div>
          </div>
          <p className="se-copy text-center mt-3">© {new Date().getFullYear()} InnovaBigData</p>
        </div>
      </main>
    </div>
  )
}

// Recuperación de contraseña (solo operadores)
function ForgotPasswordPage() {
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetLink, setResetLink] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setResetLink('')
    setMessage('')
    setLoading(true)
    try {
      const res = await api.post('/auth/forgot-password', { username: username.trim() })
      if (res.data?.reset_token) {
        const link = `${window.location.origin}/reset-password?token=${encodeURIComponent(res.data.reset_token)}`
        setResetLink(link)
        setMessage(res.data.message || 'Use el enlace para restablecer su contraseña (válido 1 hora).')
      } else {
        setMessage(res.data?.message || 'La recuperación solo está disponible para operadores. Contacte al administrador.')
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al solicitar restablecimiento')
    } finally {
      setLoading(false)
    }
  }

  const copyLink = () => {
    if (resetLink) navigator.clipboard.writeText(resetLink)
  }

  return (
    <div className="se-body se-h100">
      <div className="se-bg" aria-hidden="true" />
      <main className="min-h-screen flex items-center justify-center py-4 px-4">
        <div className="w-full max-w-md">
          <div className="se-card shadow-lg">
            <div className="se-card-head">
              <h1 className="se-title mb-1">Recuperar contraseña</h1>
              <p className="se-subtitle mb-0">Solo para operadores. Ingrese su usuario y se generará un enlace.</p>
            </div>
            <div className="se-card-body">
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="alert alert-error">{error}</div>}
                {message && !resetLink && <div className="alert alert-warning">{message}</div>}

                <div>
                  <label className="form-label se-label block mb-1">Usuario</label>
                  <div className="se-inputgroup flex rounded-2xl overflow-hidden">
                    <span className="se-ig-icon flex items-center px-3"><i className="bi bi-person"></i></span>
                    <input
                      type="text"
                      className="se-input flex-1 min-w-0 px-3 py-2"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      placeholder="Nombre de usuario"
                    />
                  </div>
                </div>
                <button type="submit" className="btn se-btn-primary w-full" disabled={loading}>
                  {loading ? 'Generando...' : 'Generar enlace'}
                </button>
              </form>

              {resetLink && (
                <div className="mt-6 p-4 rounded-2xl border border-[rgba(34,197,94,.35)] bg-[rgba(34,197,94,.15)]">
                  <p className="text-sm mb-2 text-[rgba(234,240,255,.9)]">{message}</p>
                  <div className="flex gap-2">
                    <input type="text" readOnly value={resetLink} className="se-input flex-1 text-sm px-3 py-2 rounded-xl bg-[rgba(0,0,0,.2)] border border-[rgba(255,255,255,.12)]" />
                    <button type="button" onClick={copyLink} className="btn se-btn-soft whitespace-nowrap">Copiar</button>
                  </div>
                  <p className="text-xs se-foot-muted mt-2">Abra este enlace en el navegador para definir la nueva contraseña.</p>
                </div>
              )}

              <p className="mt-6 text-center">
                <Link to="/login" className="se-link">Volver al inicio de sesión</Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (!token) {
      setError('Falta el enlace de restablecimiento. Solicite uno nuevo.')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, new_password: password })
      setSuccess(true)
      setTimeout(() => { window.location.href = '/login' }, 2000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al restablecer la contraseña')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="se-body se-h100">
        <div className="se-bg" aria-hidden="true" />
        <main className="min-h-screen flex items-center justify-center py-4 px-4">
          <div className="w-full max-w-md se-card shadow-lg">
            <div className="se-card-body text-center">
              <p className="se-label">Falta el enlace de restablecimiento.</p>
              <Link to="/forgot-password" className="se-link mt-4 inline-block">Solicitar uno nuevo</Link>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="se-body se-h100">
      <div className="se-bg" aria-hidden="true" />
      <main className="min-h-screen flex items-center justify-center py-4 px-4">
        <div className="w-full max-w-md">
          <div className="se-card shadow-lg">
            <div className="se-card-head">
              <h1 className="se-title mb-1">Nueva contraseña</h1>
              <p className="se-subtitle mb-0">Ingrese y confirme su nueva contraseña.</p>
            </div>
            <div className="se-card-body">
              {success ? (
                <div className="alert alert-success">Contraseña actualizada. Redirigiendo al inicio de sesión...</div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && <div className="alert alert-error">{error}</div>}
                  <div>
                    <label className="form-label se-label block mb-1">Nueva contraseña</label>
                    <div className="se-inputgroup flex rounded-2xl overflow-hidden">
                      <span className="se-ig-icon flex items-center px-3"><i className="bi bi-shield-lock"></i></span>
                      <input
                        type="password"
                        className="se-input flex-1 min-w-0 px-3 py-2"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        minLength={6}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="form-label se-label block mb-1">Confirmar contraseña</label>
                    <div className="se-inputgroup flex rounded-2xl overflow-hidden">
                      <span className="se-ig-icon flex items-center px-3"><i className="bi bi-shield-lock"></i></span>
                      <input
                        type="password"
                        className="se-input flex-1 min-w-0 px-3 py-2"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        minLength={6}
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn se-btn-primary w-full" disabled={loading}>
                    {loading ? 'Guardando...' : 'Restablecer contraseña'}
                  </button>
                </form>
              )}
              <p className="mt-6 text-center">
                <Link to="/login" className="se-link">Volver al inicio de sesión</Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// Layout Component (Outlet renderiza la ruta hija: Dashboard, Leaders, etc.)
function Layout() {
  const { user, logout } = useAuth()
  const [navOpen, setNavOpen] = useState(false)

  return (
    <div className="se-body se-dash" data-theme="dark" style={{ minHeight: '100vh' }}>
      <div className="se-bg" aria-hidden="true" />
      <header className="se-topbar">
        <div className="se-topbar-left">
          <button type="button" className="se-iconbtn se-only-mobile" onClick={() => setNavOpen(true)} aria-label="Abrir menú">
            <i className="bi bi-list"></i>
          </button>
          <div className="se-brand">
            <div className="se-brand-title">InnovaBigData</div>
            <div className="se-brand-sub">Sistema de Registro</div>
          </div>
        </div>
        <div className="se-topbar-right">
          <span className="se-foot-muted text-sm">{user?.username} ({user?.rol})</span>
          <button type="button" onClick={logout} className="btn se-btn-soft">
            <i className="bi bi-box-arrow-right me-1"></i>Cerrar sesión
          </button>
        </div>
      </header>

      <div className={`se-nav-overlay ${navOpen ? 'is-open' : ''}`} onClick={() => setNavOpen(false)} aria-hidden="true" />
      <aside className={`se-nav ${navOpen ? 'is-open' : ''}`}>
        <div className="se-nav-head">
          <span className="se-nav-title">Menú</span>
          <button type="button" className="se-iconbtn" id="btnCloseNav" onClick={() => setNavOpen(false)} aria-label="Cerrar menú">
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
        <nav className="se-nav-links">
          {user?.rol === 'superadmin' && (
            <>
              <NavLink to="/" end className={({ isActive }) => `se-nav-link ${isActive ? 'is-active' : ''}`} onClick={() => setNavOpen(false)}>
                <i className="bi bi-grid-1x2"></i> Dashboard
              </NavLink>
              <NavLink to="/leaders" className={({ isActive }) => `se-nav-link ${isActive ? 'is-active' : ''}`} onClick={() => setNavOpen(false)}>
                <i className="bi bi-person-badge"></i> Líderes
              </NavLink>
            </>
          )}
          <NavLink to="/voters" className={({ isActive }) => `se-nav-link ${isActive ? 'is-active' : ''}`} onClick={() => setNavOpen(false)}>
            <i className="bi bi-people"></i> Sufragantes
          </NavLink>
          <NavLink to="/register" className={({ isActive }) => `se-nav-link ${isActive ? 'is-active' : ''}`} onClick={() => setNavOpen(false)}>
            <i className="bi bi-person-plus"></i> Registro
          </NavLink>
        </nav>
        <div className="se-nav-foot">
          <p className="se-foot-muted text-sm mb-2">{user?.username} ({user?.rol})</p>
          <button type="button" onClick={() => { setNavOpen(false); logout(); }} className="btn se-btn-soft w-full">
            <i className="bi bi-box-arrow-right me-2"></i>Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="se-main">
        <Outlet />
      </main>
    </div>
  )
}

// Dashboard Page (Superadmin)
function DashboardPage() {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState(null)
  const [municipios, setMunicipios] = useState([])
  const [lideres, setLideres] = useState([])
  const [operadores, setOperadores] = useState([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [operadorForm, setOperadorForm] = useState({ username: '', password: '' })
  const [operadorLoading, setOperadorLoading] = useState(false)
  const [operadorError, setOperadorError] = useState('')
  const [operadorSuccess, setOperadorSuccess] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [metricsRes, munRes, lidRes, usersRes] = await Promise.all([
        api.get('/dashboard'),
        api.get('/dashboard/municipios'),
        api.get('/dashboard/lideres'),
        api.get('/users').catch(() => ({ data: [] }))
      ])
      setMetrics(metricsRes.data)
      setMunicipios(munRes.data)
      setLideres(lidRes.data)
      setOperadores(usersRes.data || [])
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOperador = async (e) => {
    e.preventDefault()
    setOperadorError('')
    setOperadorSuccess('')
    if (!operadorForm.username.trim() || !operadorForm.password) {
      setOperadorError('Usuario y contraseña son obligatorios')
      return
    }
    if (operadorForm.password.length < 6) {
      setOperadorError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setOperadorLoading(true)
    try {
      await api.post('/auth/register', {
        username: operadorForm.username.trim(),
        password: operadorForm.password,
        rol: 'operador'
      })
      setOperadorSuccess(`Operador "${operadorForm.username}" creado correctamente`)
      setOperadorForm({ username: '', password: '' })
      await loadData()
    } catch (err) {
      setOperadorError(err.response?.data?.detail || 'Error al crear operador')
    } finally {
      setOperadorLoading(false)
    }
  }

  const toggleOperadorActivo = async (user) => {
    try {
      await api.patch(`/users/${user.id}`, { activo: !user.activo })
      await loadData()
    } catch (err) {
      console.error('Error al actualizar operador:', err)
    }
  }

  const exportExcel = async () => {
    setExporting(true)
    try {
      const response = await api.get('/export/xlsx', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `exportacion_innovabigdata_${new Date().toISOString().split('T')[0]}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Error exporting:', error)
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="se-title mb-0">Dashboard</h1>
        <button type="button" onClick={exportExcel} className="se-chipbtn" disabled={exporting}>
          <i className="bi bi-download me-2"></i>{exporting ? 'Exportando...' : 'Exportar Excel'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="se-cardx">
          <p className="se-kpi-k">Total Líderes</p>
          <p className="se-kpi-v">{metrics?.total_lideres || 0}</p>
        </div>
        <div className="se-cardx">
          <p className="se-kpi-k">Total Sufragantes</p>
          <p className="se-kpi-v">{metrics?.total_sufragantes || 0}</p>
        </div>
        <div className="se-cardx">
          <p className="se-kpi-k">Verificados</p>
          <p className="se-kpi-v" style={{ color: 'var(--se-ok)' }}>{metrics?.sufragantes_verificados || 0}</p>
        </div>
        <div className="se-cardx">
          <p className="se-kpi-k">Inconsistentes</p>
          <p className="se-kpi-v" style={{ color: 'var(--se-bad)' }}>{metrics?.sufragantes_inconsistentes || 0}</p>
        </div>
        <div className="se-cardx">
          <p className="se-kpi-k">En revisión</p>
          <p className="se-kpi-v" style={{ color: 'var(--se-warn)' }}>{metrics?.sufragantes_en_revision || 0}</p>
        </div>
        <div className="se-cardx">
          <p className="se-kpi-k">Sin verificar</p>
          <p className="se-kpi-v" style={{ color: 'var(--dash-accent)' }}>{metrics?.sufragantes_sin_verificar || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="se-cardx">
          <p className="se-kpi-k">Registros Hoy</p>
          <p className="se-kpi-v">{metrics?.registros_hoy || 0}</p>
        </div>
        <div className="se-cardx">
          <p className="se-kpi-k">Registros Esta Semana</p>
          <p className="se-kpi-v">{metrics?.registros_semana || 0}</p>
        </div>
        <div className="se-cardx">
          <p className="se-kpi-k">Registros Este Mes</p>
          <p className="se-kpi-v">{metrics?.registros_mes || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="se-cardx">
          <h2 className="se-mini-title mb-3">Sufragantes por Municipio</h2>
          <div className="overflow-x-auto rounded-xl border border-[rgba(255,255,255,.08)]">
            <table className="se-table min-w-full divide-y divide-[rgba(255,255,255,.08)]">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Municipio</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Total</th>
                </tr>
              </thead>
              <tbody>
                {municipios.slice(0, 10).map((m, i) => (
                  <tr key={i} className="border-t border-[rgba(255,255,255,.06)]">
                    <td className="px-4 py-3">{m.municipio}</td>
                    <td className="px-4 py-3 text-right font-medium">{m.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="se-cardx">
          <h2 className="se-mini-title mb-3">Sufragantes por Líder</h2>
          <div className="overflow-x-auto rounded-xl border border-[rgba(255,255,255,.08)]">
            <table className="se-table min-w-[640px] divide-y divide-[rgba(255,255,255,.08)]">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Líder</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Cédula</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Total</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Verif.</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Sin verif.</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Revisión</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Incons.</th>
                </tr>
              </thead>
              <tbody>
                {lideres.slice(0, 10).map((l) => (
                  <tr key={l.lider_id} className="border-t border-[rgba(255,255,255,.06)]">
                    <td className="px-4 py-3">{l.lider_nombre}</td>
                    <td className="px-4 py-3 text-right">{l.lider_cedula}</td>
                    <td className="px-4 py-3 text-right font-medium">{l.total_sufragantes}</td>
                    <td className="px-4 py-3 text-right">{l.verificados ?? 0}</td>
                    <td className="px-4 py-3 text-right">{l.sin_verificar ?? 0}</td>
                    <td className="px-4 py-3 text-right">{l.en_revision ?? 0}</td>
                    <td className="px-4 py-3 text-right">{l.inconsistentes ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="se-cardx">
        <h2 className="se-mini-title mb-2">Operadores</h2>
        <p className="se-foot-muted mb-4">Usuarios con acceso a Registro y Sufragantes.</p>

        <div className="se-section mb-6">
          <form onSubmit={handleCreateOperador} className="flex flex-wrap items-end gap-4">
            <div>
              <label className="form-label se-label block mb-1">Usuario</label>
              <div className="se-inputgroup flex rounded-2xl overflow-hidden w-48">
                <span className="se-ig-icon flex items-center px-3"><i className="bi bi-person"></i></span>
                <input
                  type="text"
                  className="se-input flex-1 min-w-0 px-3 py-2"
                  value={operadorForm.username}
                  onChange={(e) => setOperadorForm(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Usuario"
                  minLength={3}
                  maxLength={50}
                />
              </div>
            </div>
            <div>
              <label className="form-label se-label block mb-1">Contraseña</label>
              <div className="se-inputgroup flex rounded-2xl overflow-hidden w-48">
                <span className="se-ig-icon flex items-center px-3"><i className="bi bi-shield-lock"></i></span>
                <input
                  type="password"
                  className="se-input flex-1 min-w-0 px-3 py-2"
                  value={operadorForm.password}
                  onChange={(e) => setOperadorForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Mín. 6 caracteres"
                  minLength={6}
                />
              </div>
            </div>
            <button type="submit" className="btn se-btn-primary" disabled={operadorLoading}>
              {operadorLoading ? 'Creando...' : 'Crear operador'}
            </button>
          </form>
        </div>

        {operadorError && <div className="alert alert-error mb-4">{operadorError}</div>}
        {operadorSuccess && <div className="alert alert-success mb-4">{operadorSuccess}</div>}

        <div className="overflow-x-auto rounded-xl border border-[rgba(255,255,255,.08)]">
          <table className="se-table min-w-full divide-y divide-[rgba(255,255,255,.08)]">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Fecha creación</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Último acceso</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {operadores.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center se-foot-muted">No hay operadores creados</td>
                </tr>
              ) : (
                operadores.map(op => (
                  <tr key={op.id} className="border-t border-[rgba(255,255,255,.06)]">
                    <td className="px-4 py-3 font-medium">{op.username}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${op.activo ? 'badge-success' : 'badge-danger'}`}>
                        {op.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm se-foot-muted">
                      {op.fecha_creacion ? new Date(op.fecha_creacion).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm se-foot-muted">
                      {op.ultimo_login ? new Date(op.ultimo_login).toLocaleString() : 'Nunca'}
                    </td>
                    <td className="px-4 py-3">
                      {op.username !== user?.username && (
                        <button
                          type="button"
                          onClick={() => toggleOperadorActivo(op)}
                          className="se-link text-sm border-0 bg-transparent cursor-pointer p-0"
                        >
                          {op.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Labels para campos de Verifik
const VERIFIK_LABELS = {
  department: 'Departamento',
  municipality: 'Municipio',
  votingStation: 'Lugar de Votación',
  pollingTable: 'Mesa',
  address: 'Dirección del Puesto'
}

// Voter Registration Page (Operador)
function VoterRegistrationPage() {
  const [leaders, setLeaders] = useState([])
  const [selectedLeader, setSelectedLeader] = useState(null)
  const [formData, setFormData] = useState({
    nombre: '',
    cedula: '',
    edad: '',
    celular: '',
    direccion_residencia: '',
    genero: '',
    departamento: '',
    municipio: '',
    lugar_votacion: '',
    mesa_votacion: '',
    direccion_puesto: ''
  })
  const [noTieneCelular, setNoTieneCelular] = useState(false)
  const [verifikData, setVerifikData] = useState(null)
  const [estadoValidacion, setEstadoValidacion] = useState(null)
  const [discrepancias, setDiscrepancias] = useState([])
  const [verifikLoading, setVerifikLoading] = useState(false)
  const [verifikError, setVerifikError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [massLeader, setMassLeader] = useState('')
  const [massFile, setMassFile] = useState(null)
  const [massLoading, setMassLoading] = useState(false)
  const [massResult, setMassResult] = useState(null)

  useEffect(() => {
    loadLeaders()
  }, [])

  const loadLeaders = async () => {
    try {
      const response = await api.get('/leaders/all')
      setLeaders(response.data)
    } catch (error) {
      console.error('Error loading leaders:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'nombre' ? value.toUpperCase() : value
    }))
  }

  const verifyCedula = async () => {
    if (!formData.cedula || formData.cedula.length < 6) {
      setVerifikError('Ingrese una cédula válida (6-10 dígitos)')
      return
    }

    setVerifikLoading(true)
    setVerifikError('')
    setVerifikData(null)
    setEstadoValidacion(null)
    setDiscrepancias([])

    try {
      const response = await api.post('/voters/verify', {
        cedula: formData.cedula,
        department: formData.departamento || null,
        municipality: formData.municipio || null,
        votingStation: formData.lugar_votacion || null,
        pollingTable: formData.mesa_votacion || null,
        address: formData.direccion_puesto || null
      })

      if (response.data.success) {
        setVerifikData(response.data.data)
        setEstadoValidacion(response.data.estado || null)
        setDiscrepancias(response.data.discrepancias || [])
        setVerifikError('')
      } else {
        setVerifikError(response.data.error || 'Cédula no encontrada')
        setEstadoValidacion(response.data.estado || 'inconsistente')
      }
    } catch (err) {
      setVerifikError(err.response?.data?.detail || 'Error al verificar cédula')
    } finally {
      setVerifikLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!noTieneCelular) {
      const cel = (formData.celular || '').trim()
      if (!cel) {
        setError('Ingrese el celular o marque "No tiene celular"')
        return
      }
      if (cel.length !== 10 || !/^\d+$/.test(cel)) {
        setError('El celular debe tener 10 dígitos numéricos')
        return
      }
      if (cel[0] !== '3') {
        setError('El celular debe iniciar por el número 3')
        return
      }
    }

    setLoading(true)

    try {
      await api.post('/voters', {
        nombre: formData.nombre,
        cedula: formData.cedula,
        edad: parseInt(formData.edad, 10),
        celular: noTieneCelular ? null : (formData.celular || '').trim(),
        direccion_residencia: formData.direccion_residencia,
        genero: formData.genero,
        lider_id: selectedLeader || null,
        departamento: formData.departamento || null,
        municipio: formData.municipio || null,
        lugar_votacion: formData.lugar_votacion || null,
        mesa_votacion: formData.mesa_votacion || null,
        direccion_puesto: formData.direccion_puesto || null,
        estado_validacion: estadoValidacion != null ? estadoValidacion : 'sin_verificar',
        discrepancias: estadoValidacion === 'revision' && discrepancias.length ? discrepancias : null
      })

      setSuccess('Sufragante registrado exitosamente')
      setFormData({
        nombre: '',
        cedula: '',
        edad: '',
        celular: '',
        direccion_residencia: '',
        genero: '',
        departamento: '',
        municipio: '',
        lugar_votacion: '',
        mesa_votacion: '',
        direccion_puesto: ''
      })
      setNoTieneCelular(false)
      setVerifikData(null)
      setEstadoValidacion(null)
      setDiscrepancias([])
      setSelectedLeader(null)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al registrar sufragante')
    } finally {
      setLoading(false)
    }
  }

  const handleMassUpload = async (e) => {
    e.preventDefault()
    if (!massLeader || !massFile) {
      setError('Seleccione el líder y adjunte el archivo Excel')
      return
    }
    setError('')
    setMassResult(null)
    setMassLoading(true)
    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', massFile)
      formDataUpload.append('lider_id', massLeader)
      const res = await api.post('/voters/upload', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setMassResult(res.data)
      setMassFile(null)
      if (res.data.created > 0) setSuccess(`${res.data.created} sufragante(s) registrado(s) por carga masiva`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al subir el archivo')
    } finally {
      setMassLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="se-title mb-6">Registro de Sufragantes</h1>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="se-cardx mb-6">
        <h2 className="se-mini-title mb-2">Registro masivo</h2>
        <p className="se-foot-muted mb-4">
          Seleccione el líder y adjunte un archivo Excel (.xlsx) con las columnas: NOMBRES Y APELLIDOS, CÉDULA, EDAD, CELULAR, DIRECCION (residencia), DEPARTAMENTO, MUNICIPIO, LUGAR DE VOTACION, MESA DE VOTACION. La columna QUIEN REFIERE no se usa.
        </p>
        <form onSubmit={handleMassUpload} className="space-y-4">
          <div>
            <label className="form-label se-label block mb-1">Líder</label>
            <div className="se-inputgroup flex rounded-2xl overflow-hidden">
              <span className="se-ig-icon flex items-center px-3"><i className="bi bi-people"></i></span>
              <select className="se-input flex-1 min-w-0 px-3 py-2 bg-transparent" value={massLeader} onChange={(e) => setMassLeader(e.target.value)} required>
                <option value="">Seleccionar líder...</option>
                {leaders.map(l => (
                  <option key={l.id} value={l.id}>{l.nombre} - {l.cedula}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="form-label se-label block mb-1">Archivo Excel</label>
            <div className="se-inputgroup flex rounded-2xl overflow-hidden">
              <input type="file" accept=".xlsx,.xls" className="se-input flex-1 min-w-0 px-3 py-2" onChange={(e) => setMassFile(e.target.files?.[0] || null)} />
            </div>
          </div>
          <button type="submit" className="btn se-btn-primary" disabled={massLoading}>
            {massLoading ? 'Subiendo...' : 'Subir y registrar'}
          </button>
        </form>
        {massResult && (
          <div className="mt-4 p-4 rounded-2xl border border-[rgba(34,197,94,.35)] bg-[rgba(34,197,94,.12)]">
            <p className="font-medium text-[rgba(234,240,255,.95)]">{massResult.created} registrado(s)</p>
            {massResult.total_rows != null && <p className="text-sm se-foot-muted">Filas en archivo: {massResult.total_rows}</p>}
            {massResult.errors?.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium se-foot-muted">Errores ({massResult.errors.length}):</p>
                <ul className="text-sm se-foot-muted list-disc list-inside max-h-32 overflow-y-auto mt-1">
                  {massResult.errors.slice(0, 20).map((err, i) => <li key={i}>{err}</li>)}
                  {massResult.errors.length > 20 && <li>... y {massResult.errors.length - 20} más</li>}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="se-cardx space-y-6">
        <div className="se-section">
          <div className="se-section-title"><i className="bi bi-people"></i> Líder Asociado</div>
          <div>
            <label className="form-label se-label block mb-1">Líder</label>
            <div className="se-inputgroup flex rounded-2xl overflow-hidden">
              <span className="se-ig-icon flex items-center px-3"><i className="bi bi-people"></i></span>
              <select className="se-input flex-1 min-w-0 px-3 py-2 bg-transparent" value={selectedLeader || ''} onChange={(e) => setSelectedLeader(e.target.value ? parseInt(e.target.value) : null)}>
                <option value="">Seleccionar líder...</option>
                {leaders.map(l => (
                  <option key={l.id} value={l.id}>{l.nombre} - {l.cedula}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="se-section">
          <div className="se-section-title"><i className="bi bi-person-vcard"></i> Datos básicos</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label se-label block mb-1">Nombres y Apellidos *</label>
              <div className="se-inputgroup flex rounded-2xl overflow-hidden">
                <span className="se-ig-icon flex items-center px-3"><i className="bi bi-person"></i></span>
                <input type="text" name="nombre" className="se-input flex-1 min-w-0 px-3 py-2" value={formData.nombre} onChange={handleChange} required placeholder="NOMBRE COMPLETO" />
              </div>
            </div>
            <div>
              <label className="form-label se-label block mb-1">Cédula *</label>
              <div className="se-inputgroup flex rounded-2xl overflow-hidden">
                <span className="se-ig-icon flex items-center px-3"><i className="bi bi-hash"></i></span>
                <input type="text" name="cedula" className="se-input flex-1 min-w-0 px-3 py-2" value={formData.cedula} onChange={handleChange} required placeholder="6-10 dígitos" maxLength={10} />
              </div>
            </div>
          </div>
        </div>

        <div className="se-section">
          <div className="se-section-title"><i className="bi bi-geo-alt"></i> Datos de votación (Verifik)</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label se-label block mb-1">Departamento</label>
              <div className="se-inputgroup flex rounded-2xl overflow-hidden">
                <input type="text" name="departamento" className="se-input flex-1 min-w-0 px-3 py-2" value={formData.departamento} onChange={handleChange} placeholder="Ej. BOGOTA D.C." />
              </div>
            </div>
            <div>
              <label className="form-label se-label block mb-1">Municipio</label>
              <div className="se-inputgroup flex rounded-2xl overflow-hidden">
                <input type="text" name="municipio" className="se-input flex-1 min-w-0 px-3 py-2" value={formData.municipio} onChange={handleChange} placeholder="Ej. BOGOTA D.C." />
              </div>
            </div>
            <div>
              <label className="form-label se-label block mb-1">Lugar de Votación</label>
              <div className="se-inputgroup flex rounded-2xl overflow-hidden">
                <input type="text" name="lugar_votacion" className="se-input flex-1 min-w-0 px-3 py-2" value={formData.lugar_votacion} onChange={handleChange} placeholder="Nombre del puesto" />
              </div>
            </div>
            <div>
              <label className="form-label se-label block mb-1">Mesa</label>
              <div className="se-inputgroup flex rounded-2xl overflow-hidden">
                <input type="text" name="mesa_votacion" className="se-input flex-1 min-w-0 px-3 py-2" value={formData.mesa_votacion} onChange={handleChange} placeholder="Número de mesa" />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="form-label se-label block mb-1">Dirección del Puesto</label>
              <div className="se-inputgroup flex rounded-2xl overflow-hidden">
                <input type="text" name="direccion_puesto" className="se-input flex-1 min-w-0 px-3 py-2" value={formData.direccion_puesto} onChange={handleChange} placeholder="Dirección del puesto" />
              </div>
            </div>
          </div>
        </div>

        {verifikError && <div className="alert alert-warning">{verifikError}</div>}

        {estadoValidacion && (
          <div className={`se-card-mini p-4 ${
            estadoValidacion === 'verificado' ? 'border-[rgba(34,197,94,.4)]' :
            estadoValidacion === 'revision' ? 'border-[rgba(245,158,11,.4)]' : ''
          }`}>
            <h3 className="se-mini-title mb-2">
              {estadoValidacion === 'verificado' && '✓ Verificado – datos coinciden con Verifik'}
              {estadoValidacion === 'revision' && '⚠ En revisión – no coinciden: ' + (discrepancias.map(d => VERIFIK_LABELS[d] || d).join(', ') || 'algún campo')}
              {estadoValidacion === 'inconsistente' && '⚠ Inconsistente – puede registrar de todas formas.'}
            </h3>
            {verifikData && estadoValidacion !== 'inconsistente' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm mt-2 se-foot-muted">
                <span>Verifik: {verifikData.department || '–'}</span>
                <span>{verifikData.municipality || '–'}</span>
                <span>{verifikData.votingStation || '–'}</span>
                <span>Mesa: {verifikData.pollingTable || '–'}</span>
                <span className="col-span-2">{verifikData.address || '–'}</span>
              </div>
            )}
          </div>
        )}

        <div className="se-section">
          <div className="se-section-title"><i className="bi bi-person-lines-fill"></i> Datos adicionales</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label se-label block mb-1">Edad * (18-120)</label>
              <div className="se-inputgroup flex rounded-2xl overflow-hidden">
                <span className="se-ig-icon flex items-center px-3"><i className="bi bi-calendar"></i></span>
                <input type="number" name="edad" className="se-input flex-1 min-w-0 px-3 py-2" value={formData.edad} onChange={handleChange} required min={18} max={120} />
              </div>
            </div>
            <div>
              <label className="form-label se-label block mb-1">Celular (iniciar por 3)</label>
              <div className="flex flex-wrap items-center gap-3">
                <div className="se-inputgroup flex rounded-2xl overflow-hidden flex-1 min-w-[140px]">
                  <span className="se-ig-icon flex items-center px-3"><i className="bi bi-telephone"></i></span>
                  <input type="text" name="celular" className="se-input flex-1 min-w-0 px-3 py-2" value={formData.celular} onChange={handleChange} placeholder="10 dígitos" maxLength={10} disabled={noTieneCelular} />
                </div>
                <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap se-label">
                  <input type="checkbox" checked={noTieneCelular} onChange={(e) => { setNoTieneCelular(e.target.checked); if (e.target.checked) setFormData(prev => ({ ...prev, celular: '' })) }} className="rounded border-[rgba(255,255,255,.22)] bg-[rgba(0,0,0,.35)]" />
                  No tiene celular
                </label>
              </div>
              {!noTieneCelular && formData.celular && formData.celular[0] !== '3' && formData.celular.length > 0 && (
                <p className="text-sm mt-1" style={{ color: 'var(--se-warn)' }}>El celular debe iniciar por 3</p>
              )}
            </div>
          </div>
          <div className="mt-4">
            <label className="form-label se-label block mb-1">Dirección de Residencia *</label>
            <div className="se-inputgroup flex rounded-2xl overflow-hidden">
              <span className="se-ig-icon flex items-center px-3"><i className="bi bi-geo-alt"></i></span>
              <input type="text" name="direccion_residencia" className="se-input flex-1 min-w-0 px-3 py-2" value={formData.direccion_residencia} onChange={handleChange} required placeholder="Dirección completa" />
            </div>
          </div>
          <div className="mt-4">
            <label className="form-label se-label block mb-1">Género *</label>
            <div className="se-inputgroup flex rounded-2xl overflow-hidden">
              <select name="genero" className="se-input flex-1 min-w-0 px-3 py-2 bg-transparent" value={formData.genero} onChange={handleChange} required>
                <option value="">Seleccionar...</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-[rgba(255,255,255,.1)]">
          <p className="se-foot-muted text-sm w-full">Puede registrar sin verificar; quedará «Sin verificar».</p>
          <button type="button" onClick={verifyCedula} className="btn se-btn-soft" disabled={verifikLoading || !formData.cedula || formData.cedula.length < 6}>
            {verifikLoading ? 'Verificando...' : 'Verificar con Verifik'}
          </button>
          <button type="button" onClick={() => { setFormData({ nombre: '', cedula: '', edad: '', celular: '', direccion_residencia: '', genero: '', departamento: '', municipio: '', lugar_votacion: '', mesa_votacion: '', direccion_puesto: '' }); setNoTieneCelular(false); setVerifikData(null); setEstadoValidacion(null); setDiscrepancias([]); setSelectedLeader(null) }} className="btn se-btn-soft">
            Limpiar
          </button>
          <button type="submit" className="btn se-btn-primary" disabled={loading}>
            {loading ? 'Registrando...' : 'Registrar Sufragante'}
          </button>
        </div>
      </form>
    </div>
  )
}

// Leaders Management Page (Superadmin)
function LeadersPage() {
  const [leaders, setLeaders] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingLeader, setEditingLeader] = useState(null)
  const [formData, setFormData] = useState({
    nombre: '',
    cedula: '',
    edad: '',
    celular: '',
    direccion: '',
    genero: '',
    departamento: '',
    municipio: '',
    barrio: '',
    zona_influencia: '',
    tipo_liderazgo: ''
  })
  const [loadingForm, setLoadingForm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadLeaders()
  }, [])

  const loadLeaders = async () => {
    try {
      const response = await api.get('/leaders')
      setLeaders(response.data)
    } catch (error) {
      console.error('Error loading leaders:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'nombre' ? value.toUpperCase() : value
    }))
  }

  const openCreateModal = () => {
    setEditingLeader(null)
    setFormData({
      nombre: '',
      cedula: '',
      edad: '',
      celular: '',
      direccion: '',
      genero: '',
      departamento: '',
      municipio: '',
      barrio: '',
      zona_influencia: '',
      tipo_liderazgo: ''
    })
    setShowModal(true)
    setError('')
    setSuccess('')
  }

  const openEditModal = (leader) => {
    setEditingLeader(leader)
    setFormData({
      nombre: leader.nombre,
      cedula: leader.cedula,
      edad: leader.edad,
      celular: leader.celular,
      direccion: leader.direccion,
      genero: leader.genero,
      departamento: leader.departamento,
      municipio: leader.municipio,
      barrio: leader.barrio || '',
      zona_influencia: leader.zona_influencia || '',
      tipo_liderazgo: leader.tipo_liderazgo || ''
    })
    setShowModal(true)
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoadingForm(true)

    try {
      if (editingLeader) {
        await api.put(`/leaders/${editingLeader.id}`, formData)
        setSuccess('Líder actualizado exitosamente')
      } else {
        await api.post('/leaders', formData)
        setSuccess('Líder creado exitosamente')
      }
      loadLeaders()
      setShowModal(false)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar líder')
    } finally {
      setLoadingForm(false)
    }
  }

  const deactivateLeader = async (id) => {
    if (!confirm('¿Está seguro de desactivar este líder?')) return

    try {
      await api.delete(`/leaders/${id}`)
      setSuccess('Líder desactivado')
      loadLeaders()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al desactivar líder')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="se-title mb-0">Gestión de Líderes</h1>
        <button type="button" onClick={openCreateModal} className="btn se-btn-primary">
          <i className="bi bi-person-plus me-2"></i>Nuevo Líder
        </button>
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="se-cardx">
        <div className="overflow-x-auto rounded-xl border border-[rgba(255,255,255,.08)]">
          <table className="se-table min-w-full divide-y divide-[rgba(255,255,255,.08)]">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Cédula</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Celular</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Municipio</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {leaders.map(leader => (
                <tr key={leader.id} className="border-t border-[rgba(255,255,255,.06)]">
                  <td className="px-4 py-3">{leader.nombre}</td>
                  <td className="px-4 py-3">{leader.cedula}</td>
                  <td className="px-4 py-3">{leader.celular}</td>
                  <td className="px-4 py-3">{leader.municipio}</td>
                  <td className="px-4 py-3">{leader.tipo_liderazgo || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${leader.activo ? 'badge-success' : 'badge-danger'}`}>
                      {leader.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => openEditModal(leader)} className="se-link border-0 bg-transparent cursor-pointer me-2">
                      Editar
                    </button>
                    {leader.activo && (
                      <button type="button" onClick={() => deactivateLeader(leader.id)} className="se-link border-0 bg-transparent cursor-pointer" style={{ color: 'var(--se-bad)' }}>
                        Desactivar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="se-modal max-w-lg w-full max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="se-title mb-4">{editingLeader ? 'Editar Líder' : 'Nuevo Líder'}</h2>
            {error && <div className="alert alert-error mb-4">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label se-label block mb-1">Nombre *</label>
                <div className="se-inputgroup flex rounded-2xl overflow-hidden">
                  <span className="se-ig-icon flex items-center px-3"><i className="bi bi-person-vcard"></i></span>
                  <input type="text" name="nombre" className="se-input flex-1 min-w-0 px-3 py-2" value={formData.nombre} onChange={handleChange} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label se-label block mb-1">Cédula *</label>
                  <div className="se-inputgroup flex rounded-2xl overflow-hidden">
                    <span className="se-ig-icon flex items-center px-3"><i className="bi bi-hash"></i></span>
                    <input type="text" name="cedula" className="se-input flex-1 min-w-0 px-3 py-2" value={formData.cedula} onChange={handleChange} required maxLength={10} disabled={!!editingLeader} />
                  </div>
                </div>
                <div>
                  <label className="form-label se-label block mb-1">Edad *</label>
                  <div className="se-inputgroup flex rounded-2xl overflow-hidden">
                    <span className="se-ig-icon flex items-center px-3"><i className="bi bi-calendar"></i></span>
                    <input type="number" name="edad" className="se-input flex-1 min-w-0 px-3 py-2" value={formData.edad} onChange={handleChange} required min={18} max={120} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label se-label block mb-1">Celular *</label>
                  <div className="se-inputgroup flex rounded-2xl overflow-hidden">
                    <span className="se-ig-icon flex items-center px-3"><i className="bi bi-telephone"></i></span>
                    <input type="text" name="celular" className="se-input flex-1 min-w-0 px-3 py-2" value={formData.celular} onChange={handleChange} required maxLength={10} />
                  </div>
                </div>
                <div>
                  <label className="form-label se-label block mb-1">Género *</label>
                  <div className="se-inputgroup flex rounded-2xl overflow-hidden">
                    <select name="genero" className="se-input flex-1 min-w-0 px-3 py-2 bg-transparent" value={formData.genero} onChange={handleChange} required>
                      <option value="">Seleccionar...</option>
                      <option value="M">Masculino</option>
                      <option value="F">Femenino</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                </div>
              </div>
              <div>
                <label className="form-label se-label block mb-1">Dirección *</label>
                <div className="se-inputgroup flex rounded-2xl overflow-hidden">
                  <span className="se-ig-icon flex items-center px-3"><i className="bi bi-geo-alt"></i></span>
                  <input type="text" name="direccion" className="se-input flex-1 min-w-0 px-3 py-2" value={formData.direccion} onChange={handleChange} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label se-label block mb-1">Departamento *</label>
                  <div className="se-inputgroup flex rounded-2xl overflow-hidden">
                    <input type="text" name="departamento" className="se-input flex-1 min-w-0 px-3 py-2" value={formData.departamento} onChange={handleChange} required />
                  </div>
                </div>
                <div>
                  <label className="form-label se-label block mb-1">Municipio *</label>
                  <div className="se-inputgroup flex rounded-2xl overflow-hidden">
                    <input type="text" name="municipio" className="se-input flex-1 min-w-0 px-3 py-2" value={formData.municipio} onChange={handleChange} required />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label se-label block mb-1">Barrio</label>
                  <div className="se-inputgroup flex rounded-2xl overflow-hidden">
                    <input type="text" name="barrio" className="se-input flex-1 min-w-0 px-3 py-2" value={formData.barrio} onChange={handleChange} />
                  </div>
                </div>
                <div>
                  <label className="form-label se-label block mb-1">Zona de Influencia</label>
                  <div className="se-inputgroup flex rounded-2xl overflow-hidden">
                    <input type="text" name="zona_influencia" className="se-input flex-1 min-w-0 px-3 py-2" value={formData.zona_influencia} onChange={handleChange} />
                  </div>
                </div>
              </div>
              <div>
                <label className="form-label se-label block mb-1">Tipo de Liderazgo</label>
                <div className="se-inputgroup flex rounded-2xl overflow-hidden">
                  <select name="tipo_liderazgo" className="se-input flex-1 min-w-0 px-3 py-2 bg-transparent" value={formData.tipo_liderazgo} onChange={handleChange}>
                    <option value="">Seleccionar...</option>
                    <option value="Comunitario">Comunitario</option>
                    <option value="Social">Social</option>
                    <option value="Politico">Político</option>
                    <option value="Religioso">Religioso</option>
                    <option value="Juvenil">Juvenil</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-[rgba(255,255,255,.1)]">
                <button type="button" onClick={() => setShowModal(false)} className="btn se-btn-soft">Cancelar</button>
                <button type="submit" className="btn se-btn-primary" disabled={loadingForm}>{loadingForm ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// Voters List Page (Superadmin)
function VotersListPage() {
  const [voters, setVoters] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    estado: '',
    municipio: ''
  })
  const [editVoter, setEditVoter] = useState(null)
  const [editFormData, setEditFormData] = useState({ departamento: '', municipio: '', lugar_votacion: '', mesa_votacion: '', direccion_puesto: '' })
  const [editEstado, setEditEstado] = useState(null)
  const [editDiscrepancias, setEditDiscrepancias] = useState([])
  const [verifyLoadingId, setVerifyLoadingId] = useState(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editVerifyLoading, setEditVerifyLoading] = useState(false)

  useEffect(() => {
    loadVoters()
  }, [filters])

  const loadVoters = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.estado) params.append('estado', filters.estado)
      if (filters.municipio) params.append('municipio', filters.municipio)

      const response = await api.get(`/voters?${params.toString()}`)
      setVoters(response.data)
    } catch (error) {
      console.error('Error loading voters:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyRow = async (voter) => {
    setVerifyLoadingId(voter.id)
    try {
      const res = await api.post('/voters/verify', {
        cedula: voter.cedula,
        department: voter.departamento || null,
        municipality: voter.municipio || null,
        votingStation: voter.lugar_votacion || null,
        pollingTable: voter.mesa_votacion || null,
        address: voter.direccion_puesto || null
      })
      const estado = res.data?.estado || 'inconsistente'
      const discrepancias = res.data?.discrepancias || []
      await api.patch(`/voters/${voter.id}`, {
        estado_validacion: estado,
        discrepancias: discrepancias.length ? discrepancias : null
      })
      await loadVoters()
    } catch (err) {
      console.error('Error verifying voter:', err)
    } finally {
      setVerifyLoadingId(null)
    }
  }

  const openEditModal = (voter) => {
    setEditVoter(voter)
    setEditFormData({
      departamento: voter.departamento || '',
      municipio: voter.municipio || '',
      lugar_votacion: voter.lugar_votacion || '',
      mesa_votacion: voter.mesa_votacion || '',
      direccion_puesto: voter.direccion_puesto || ''
    })
    let list = []
    try {
      list = typeof voter.discrepancias_verifik === 'string' ? JSON.parse(voter.discrepancias_verifik || '[]') : (voter.discrepancias_verifik || [])
    } catch (_) {}
    setEditDiscrepancias(Array.isArray(list) ? list : [])
    setEditEstado(voter.estado_validacion)
  }

  const handleEditVerify = async () => {
    if (!editVoter) return
    setEditVerifyLoading(true)
    try {
      const res = await api.post('/voters/verify', {
        cedula: editVoter.cedula,
        department: editFormData.departamento || null,
        municipality: editFormData.municipio || null,
        votingStation: editFormData.lugar_votacion || null,
        pollingTable: editFormData.mesa_votacion || null,
        address: editFormData.direccion_puesto || null
      })
      setEditEstado(res.data?.estado || 'inconsistente')
      setEditDiscrepancias(res.data?.discrepancias || [])
    } catch (err) {
      console.error('Error verifying:', err)
    } finally {
      setEditVerifyLoading(false)
    }
  }

  const handleEditSave = async () => {
    if (!editVoter) return
    setEditSaving(true)
    try {
      await api.patch(`/voters/${editVoter.id}`, {
        departamento: editFormData.departamento || null,
        municipio: editFormData.municipio || null,
        lugar_votacion: editFormData.lugar_votacion || null,
        mesa_votacion: editFormData.mesa_votacion || null,
        direccion_puesto: editFormData.direccion_puesto || null,
        estado_validacion: editEstado,
        discrepancias: editDiscrepancias.length ? editDiscrepancias : null
      })
      setEditVoter(null)
      await loadVoters()
    } catch (err) {
      console.error('Error saving:', err)
    } finally {
      setEditSaving(false)
    }
  }

  const VERIFIK_LABELS_LIST = {
    department: 'Departamento',
    municipality: 'Municipio',
    votingStation: 'Lugar de Votación',
    pollingTable: 'Mesa',
    address: 'Dirección del Puesto'
  }

  const getStatusBadge = (estado, discrepanciasVerifik) => {
    const classes = {
      verificado: 'badge-success',
      inconsistente: 'badge-danger',
      revision: 'badge-warning',
      sin_verificar: 'badge-info'
    }
    const labels = {
      verificado: 'Verificado',
      inconsistente: 'Inconsistente',
      revision: 'En Revisión',
      sin_verificar: 'Sin verificar'
    }
    const badge = <span className={`badge ${classes[estado] || 'badge-info'}`}>{labels[estado] || estado}</span>
    if (estado === 'revision' && discrepanciasVerifik) {
      let list = []
      try {
        list = typeof discrepanciasVerifik === 'string' ? JSON.parse(discrepanciasVerifik) : discrepanciasVerifik
      } catch (_) {}
      const noCoinciden = (Array.isArray(list) ? list : []).map(k => VERIFIK_LABELS_LIST[k] || k).join(', ')
      if (noCoinciden) {
        return (
          <span className="inline-flex flex-col items-start gap-0.5">
            {badge}
            <span className="text-xs text-amber-700">No coinciden: {noCoinciden}</span>
          </span>
        )
      }
    }
    return badge
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="se-title mb-0">Lista de Sufragantes</h1>

      <div className="se-cardx">
        <div className="se-section-title"><i className="bi bi-funnel"></i> Filtros</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="form-label se-label block mb-1">Estado</label>
            <div className="se-inputgroup flex rounded-2xl overflow-hidden">
              <select className="se-input flex-1 min-w-0 px-3 py-2 bg-transparent" value={filters.estado} onChange={(e) => setFilters(prev => ({ ...prev, estado: e.target.value }))}>
                <option value="">Todos</option>
                <option value="verificado">Verificado</option>
                <option value="inconsistente">Inconsistente</option>
                <option value="revision">En Revisión</option>
                <option value="sin_verificar">Sin verificar</option>
              </select>
            </div>
          </div>
          <div>
            <label className="form-label se-label block mb-1">Municipio</label>
            <div className="se-inputgroup flex rounded-2xl overflow-hidden">
              <input type="text" className="se-input flex-1 min-w-0 px-3 py-2" placeholder="Filtrar por municipio" value={filters.municipio} onChange={(e) => setFilters(prev => ({ ...prev, municipio: e.target.value }))} />
            </div>
          </div>
          <div className="flex items-end">
            <button type="button" onClick={loadVoters} className="btn se-btn-primary w-full">Filtrar</button>
          </div>
        </div>
      </div>

      <div className="se-cardx">
        <div className="overflow-x-auto rounded-xl border border-[rgba(255,255,255,.08)]">
          <table className="se-table min-w-[1200px] divide-y divide-[rgba(255,255,255,.08)]">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Cédula</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Edad</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Celular</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Dirección</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Género</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Depto</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Municipio</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Lugar vot.</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Mesa</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Dir. puesto</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Registro</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {voters.map(voter => (
                <tr key={voter.id} className="border-t border-[rgba(255,255,255,.06)]">
                  <td className="px-4 py-3">{voter.nombre}</td>
                  <td className="px-4 py-3">{voter.cedula}</td>
                  <td className="px-4 py-3">{voter.edad}</td>
                  <td className="px-4 py-3">{voter.celular ?? 'No tiene'}</td>
                  <td className="px-4 py-3 max-w-[200px] truncate" title={voter.direccion_residencia}>{voter.direccion_residencia || '-'}</td>
                  <td className="px-4 py-3">{voter.genero === 'M' ? 'M' : voter.genero === 'F' ? 'F' : voter.genero || '-'}</td>
                  <td className="px-4 py-3">{voter.departamento || '-'}</td>
                  <td className="px-4 py-3">{voter.municipio || '-'}</td>
                  <td className="px-4 py-3 max-w-[180px] truncate" title={voter.lugar_votacion}>{voter.lugar_votacion || '-'}</td>
                  <td className="px-4 py-3">{voter.mesa_votacion || '-'}</td>
                  <td className="px-4 py-3 max-w-[180px] truncate" title={voter.direccion_puesto}>{voter.direccion_puesto || '-'}</td>
                  <td className="px-4 py-3">{getStatusBadge(voter.estado_validacion, voter.discrepancias_verifik)}</td>
                  <td className="px-4 py-3 text-sm se-foot-muted whitespace-nowrap">{new Date(voter.fecha_registro).toLocaleDateString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {(voter.estado_validacion === 'revision' || voter.estado_validacion === 'sin_verificar') && (
                      <span className="inline-flex gap-2">
                        <button type="button" onClick={() => openEditModal(voter)} className="btn se-btn-soft text-sm py-1 px-2">Editar</button>
                        <button type="button" onClick={() => handleVerifyRow(voter)} disabled={verifyLoadingId === voter.id} className="btn se-btn-primary text-sm py-1 px-2">
                          {verifyLoadingId === voter.id ? 'Verificando...' : 'Verificar'}
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editVoter && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditVoter(null)}>
          <div className="se-modal max-w-lg w-full max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-[rgba(255,255,255,.1)] pb-4 mb-4">
              <h2 className="se-title mb-1">Editar – {editVoter.nombre}</h2>
              <p className="se-foot-muted">Cédula: {editVoter.cedula}</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="form-label se-label block mb-1">Departamento</label>
                <div className="se-inputgroup flex rounded-2xl overflow-hidden">
                  <input type="text" className="se-input flex-1 min-w-0 px-3 py-2" value={editFormData.departamento} onChange={(e) => setEditFormData(prev => ({ ...prev, departamento: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="form-label se-label block mb-1">Municipio</label>
                <div className="se-inputgroup flex rounded-2xl overflow-hidden">
                  <input type="text" className="se-input flex-1 min-w-0 px-3 py-2" value={editFormData.municipio} onChange={(e) => setEditFormData(prev => ({ ...prev, municipio: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="form-label se-label block mb-1">Lugar de Votación</label>
                <div className="se-inputgroup flex rounded-2xl overflow-hidden">
                  <input type="text" className="se-input flex-1 min-w-0 px-3 py-2" value={editFormData.lugar_votacion} onChange={(e) => setEditFormData(prev => ({ ...prev, lugar_votacion: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="form-label se-label block mb-1">Mesa</label>
                <div className="se-inputgroup flex rounded-2xl overflow-hidden">
                  <input type="text" className="se-input flex-1 min-w-0 px-3 py-2" value={editFormData.mesa_votacion} onChange={(e) => setEditFormData(prev => ({ ...prev, mesa_votacion: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="form-label se-label block mb-1">Dirección del Puesto</label>
                <div className="se-inputgroup flex rounded-2xl overflow-hidden">
                  <input type="text" className="se-input flex-1 min-w-0 px-3 py-2" value={editFormData.direccion_puesto} onChange={(e) => setEditFormData(prev => ({ ...prev, direccion_puesto: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button type="button" onClick={handleEditVerify} disabled={editVerifyLoading} className="btn se-btn-soft">{editVerifyLoading ? 'Verificando...' : 'Verificar con Verifik'}</button>
                {editEstado && (
                  <span className={`badge ${editEstado === 'verificado' ? 'badge-success' : editEstado === 'revision' ? 'badge-warning' : 'badge-danger'}`}>
                    {editEstado === 'verificado' ? 'Verificado' : editEstado === 'revision' ? 'En Revisión' : editEstado === 'sin_verificar' ? 'Sin verificar' : 'Inconsistente'}
                  </span>
                )}
              </div>
              {editDiscrepancias.length > 0 && (
                <p className="text-sm se-foot-muted">No coinciden: {editDiscrepancias.map(k => VERIFIK_LABELS_LIST[k] || k).join(', ')}</p>
              )}
            </div>
            <div className="pt-4 mt-4 border-t border-[rgba(255,255,255,.1)] flex justify-end gap-2">
              <button type="button" onClick={() => setEditVoter(null)} className="btn se-btn-soft">Cerrar</button>
              <button type="button" onClick={handleEditSave} disabled={editSaving} className="btn se-btn-primary">{editSaving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {voters.length === 0 && (
        <p className="text-center se-foot-muted py-8">No se encontraron sufragantes</p>
      )}
    </div>
  )
}

// Main App Component
function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<HomeOrRedirect />} />
          <Route path="leaders" element={
            <ProtectedRoute requiredRole="superadmin">
              <LeadersPage />
            </ProtectedRoute>
          } />
          <Route path="voters" element={<VotersListPage />} />
          <Route path="register" element={
            <VoterRegistrationPage />
          } />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App
