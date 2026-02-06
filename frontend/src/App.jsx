import { Routes, Route, Navigate, Outlet, NavLink } from 'react-router-dom'
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
      <div className="min-h-screen flex items-center justify-center">
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
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="card max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">InnovaBigData</h1>
          <p className="text-gray-600 mt-2">Sistema de Registro</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="alert alert-error">{error}</div>
          )}

          <div>
            <label className="form-label">Usuario</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label className="form-label">Contraseña</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? 'Iniciando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Credenciales de prueba:</p>
          <p className="mt-1">Usuario: admin | Contraseña: Admin2026!</p>
        </div>
      </div>
    </div>
  )
}

// Layout Component (Outlet renderiza la ruta hija: Dashboard, Leaders, etc.)
function Layout() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-6">
              <h1 className="text-xl font-bold text-gray-900">InnovaBigData</h1>
              <nav className="hidden sm:flex space-x-4">
                <NavLink to="/" className={({ isActive }) => `text-sm font-medium ${isActive ? 'text-primary-600' : 'text-gray-600 hover:text-gray-900'}`} end>Dashboard</NavLink>
                <NavLink to="/leaders" className={({ isActive }) => `text-sm font-medium ${isActive ? 'text-primary-600' : 'text-gray-600 hover:text-gray-900'}`}>Líderes</NavLink>
                <NavLink to="/voters" className={({ isActive }) => `text-sm font-medium ${isActive ? 'text-primary-600' : 'text-gray-600 hover:text-gray-900'}`}>Sufragantes</NavLink>
                <NavLink to="/register" className={({ isActive }) => `text-sm font-medium ${isActive ? 'text-primary-600' : 'text-gray-600 hover:text-gray-900'}`}>Registro</NavLink>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user?.username} ({user?.rol})
              </span>
              <button
                onClick={logout}
                className="btn-secondary text-sm"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}

// Dashboard Page (Superadmin)
function DashboardPage() {
  const [metrics, setMetrics] = useState(null)
  const [municipios, setMunicipios] = useState([])
  const [lideres, setLideres] = useState([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [metricsRes, munRes, lidRes] = await Promise.all([
        api.get('/dashboard'),
        api.get('/dashboard/municipios'),
        api.get('/dashboard/lideres')
      ])
      setMetrics(metricsRes.data)
      setMunicipios(munRes.data)
      setLideres(lidRes.data)
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <button
          onClick={exportExcel}
          className="btn-primary"
          disabled={exporting}
        >
          {exporting ? 'Exportando...' : 'Exportar Excel'}
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <p className="text-sm text-gray-500">Total Líderes</p>
          <p className="text-3xl font-bold text-gray-900">{metrics?.total_lideres || 0}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Total Sufragantes</p>
          <p className="text-3xl font-bold text-gray-900">{metrics?.total_sufragantes || 0}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Verificados</p>
          <p className="text-3xl font-bold text-green-600">{metrics?.sufragantes_verificados || 0}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Inconsistentes</p>
          <p className="text-3xl font-bold text-red-600">{metrics?.sufragantes_inconsistentes || 0}</p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <p className="text-sm text-gray-500 mb-2">Registros Hoy</p>
          <p className="text-2xl font-bold text-primary-600">{metrics?.registros_hoy || 0}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500 mb-2">Registros Esta Semana</p>
          <p className="text-2xl font-bold text-primary-600">{metrics?.registros_semana || 0}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500 mb-2">Registros Este Mes</p>
          <p className="text-2xl font-bold text-primary-600">{metrics?.registros_mes || 0}</p>
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Municipalities */}
        <div className="card">
          <h2 className="card-header">Sufragantes por Municipio</h2>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Municipio</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {municipios.slice(0, 10).map((m, i) => (
                  <tr key={i}>
                    <td>{m.municipio}</td>
                    <td className="text-right font-medium">{m.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Leaders */}
        <div className="card">
          <h2 className="card-header">Sufragantes por Líder</h2>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Líder</th>
                  <th className="text-right">Cédula</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {lideres.slice(0, 10).map((l, i) => (
                  <tr key={i}>
                    <td>{l.lider_nombre}</td>
                    <td className="text-right">{l.lider_cedula}</td>
                    <td className="text-right font-medium">{l.total_sufragantes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Registro de Sufragantes</h1>

      {success && (
        <div className="alert alert-success">{success}</div>
      )}
      {error && (
        <div className="alert alert-error">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-6">
        {/* Leader Selection */}
        <div>
          <label className="form-label">Líder Asociado</label>
          <select
            className="form-input"
            value={selectedLeader || ''}
            onChange={(e) => setSelectedLeader(e.target.value ? parseInt(e.target.value) : null)}
          >
            <option value="">Seleccionar líder...</option>
            {leaders.map(l => (
              <option key={l.id} value={l.id}>{l.nombre} - {l.cedula}</option>
            ))}
          </select>
        </div>

        {/* Datos básicos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Nombres y Apellidos *</label>
            <input
              type="text"
              name="nombre"
              className="form-input"
              value={formData.nombre}
              onChange={handleChange}
              required
              placeholder="NOMBRE COMPLETO"
            />
          </div>
          <div>
            <label className="form-label">Cédula *</label>
            <input
              type="text"
              name="cedula"
              className="form-input"
              value={formData.cedula}
              onChange={handleChange}
              required
              placeholder="Solo números (6-10 dígitos)"
              maxLength={10}
            />
          </div>
        </div>

        {/* Datos de Verifik (ingresar manualmente según cédula) */}
        <div className="border-t pt-4 mt-4">
          <h3 className="form-label font-semibold text-gray-800 mb-3">Datos de votación (Verifik) – ingrese según la cédula</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Departamento</label>
              <input
                type="text"
                name="departamento"
                className="form-input"
                value={formData.departamento}
                onChange={handleChange}
                placeholder="Ej. BOGOTA D.C."
              />
            </div>
            <div>
              <label className="form-label">Municipio</label>
              <input
                type="text"
                name="municipio"
                className="form-input"
                value={formData.municipio}
                onChange={handleChange}
                placeholder="Ej. BOGOTA D.C."
              />
            </div>
            <div>
              <label className="form-label">Lugar de Votación</label>
              <input
                type="text"
                name="lugar_votacion"
                className="form-input"
                value={formData.lugar_votacion}
                onChange={handleChange}
                placeholder="Nombre del puesto"
              />
            </div>
            <div>
              <label className="form-label">Mesa</label>
              <input
                type="text"
                name="mesa_votacion"
                className="form-input"
                value={formData.mesa_votacion}
                onChange={handleChange}
                placeholder="Número de mesa"
              />
            </div>
            <div className="md:col-span-2">
              <label className="form-label">Dirección del Puesto</label>
              <input
                type="text"
                name="direccion_puesto"
                className="form-input"
                value={formData.direccion_puesto}
                onChange={handleChange}
                placeholder="Dirección del puesto de votación"
              />
            </div>
          </div>
        </div>

        {verifikError && (
          <div className="alert alert-warning">{verifikError}</div>
        )}

        {/* Resultado de verificación (después de hacer clic en Verificar) */}
        {estadoValidacion && (
          <div className={`rounded-lg p-4 border ${
            estadoValidacion === 'verificado' ? 'bg-green-50 border-green-200' :
            estadoValidacion === 'revision' ? 'bg-amber-50 border-amber-200' :
            'bg-gray-50 border-gray-200'
          }`}>
            <h3 className="font-semibold mb-2">
              {estadoValidacion === 'verificado' && '✓ Verificado – todos los datos coinciden con Verifik'}
              {estadoValidacion === 'revision' && '⚠ En revisión – no coinciden con Verifik: ' + (discrepancias.map(d => VERIFIK_LABELS[d] || d).join(', ') || 'algún campo')}
              {estadoValidacion === 'inconsistente' && '⚠ Inconsistente – Verifik no encontró la cédula o hubo error. Puede registrar de todas formas.'}
            </h3>
            {verifikData && estadoValidacion !== 'inconsistente' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm mt-2 text-gray-600">
                <span>Verifik: {verifikData.department || '–'}</span>
                <span>{verifikData.municipality || '–'}</span>
                <span>{verifikData.votingStation || '–'}</span>
                <span>Mesa: {verifikData.pollingTable || '–'}</span>
                <span className="col-span-2">{verifikData.address || '–'}</span>
              </div>
            )}
          </div>
        )}

        {/* Datos adicionales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Edad * (18-120)</label>
            <input
              type="number"
              name="edad"
              className="form-input"
              value={formData.edad}
              onChange={handleChange}
              required
              min={18}
              max={120}
            />
          </div>
          <div>
            <label className="form-label">Celular (debe iniciar por 3)</label>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                name="celular"
                className="form-input flex-1 min-w-[140px]"
                value={formData.celular}
                onChange={handleChange}
                placeholder="10 dígitos, inicia por 3"
                maxLength={10}
                disabled={noTieneCelular}
              />
              <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={noTieneCelular}
                  onChange={(e) => {
                    setNoTieneCelular(e.target.checked)
                    if (e.target.checked) setFormData(prev => ({ ...prev, celular: '' }))
                  }}
                  className="rounded border-gray-300"
                />
                <span>No tiene celular</span>
              </label>
            </div>
            {!noTieneCelular && formData.celular && formData.celular[0] !== '3' && formData.celular.length > 0 && (
              <p className="text-sm text-amber-600 mt-1">El celular debe iniciar por 3</p>
            )}
          </div>
        </div>

        <div>
          <label className="form-label">Dirección de Residencia *</label>
          <input
            type="text"
            name="direccion_residencia"
            className="form-input"
            value={formData.direccion_residencia}
            onChange={handleChange}
            required
            placeholder="Dirección completa"
          />
        </div>

        <div>
          <label className="form-label">Género *</label>
          <select
            name="genero"
            className="form-input"
            value={formData.genero}
            onChange={handleChange}
            required
          >
            <option value="">Seleccionar...</option>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
            <option value="Otro">Otro</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t">
          <p className="text-sm text-gray-500 w-full">Puede registrar sin verificar; en ese caso el sufragante quedará con estado «Sin verificar».</p>
          <button
            type="button"
            onClick={verifyCedula}
            className="btn-secondary"
            disabled={verifikLoading || !formData.cedula || formData.cedula.length < 6}
          >
            {verifikLoading ? 'Verificando...' : 'Verificar con Verifik'}
          </button>
          <button
            type="button"
            onClick={() => {
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
            }}
            className="btn-secondary"
          >
            Limpiar
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Líderes</h1>
        <button onClick={openCreateModal} className="btn-primary">
          + Nuevo Líder
        </button>
      </div>

      {success && (
        <div className="alert alert-success">{success}</div>
      )}
      {error && (
        <div className="alert alert-error">{error}</div>
      )}

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Cédula</th>
              <th>Celular</th>
              <th>Municipio</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {leaders.map(leader => (
              <tr key={leader.id}>
                <td>{leader.nombre}</td>
                <td>{leader.cedula}</td>
                <td>{leader.celular}</td>
                <td>{leader.municipio}</td>
                <td>{leader.tipo_liderazgo || '-'}</td>
                <td>
                  <span className={`badge ${leader.activo ? 'badge-success' : 'badge-danger'}`}>
                    {leader.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="text-right space-x-2">
                  <button
                    onClick={() => openEditModal(leader)}
                    className="text-primary-600 hover:text-primary-900"
                  >
                    Editar
                  </button>
                  {leader.activo && (
                    <button
                      onClick={() => deactivateLeader(leader.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Desactivar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">
              {editingLeader ? 'Editar Líder' : 'Nuevo Líder'}
            </h2>

            {error && <div className="alert alert-error mb-4">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">Nombre *</label>
                <input
                  type="text"
                  name="nombre"
                  className="form-input"
                  value={formData.nombre}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Cédula *</label>
                  <input
                    type="text"
                    name="cedula"
                    className="form-input"
                    value={formData.cedula}
                    onChange={handleChange}
                    required
                    maxLength={10}
                    disabled={!!editingLeader}
                  />
                </div>
                <div>
                  <label className="form-label">Edad *</label>
                  <input
                    type="number"
                    name="edad"
                    className="form-input"
                    value={formData.edad}
                    onChange={handleChange}
                    required
                    min={18}
                    max={120}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Celular *</label>
                  <input
                    type="text"
                    name="celular"
                    className="form-input"
                    value={formData.celular}
                    onChange={handleChange}
                    required
                    maxLength={10}
                  />
                </div>
                <div>
                  <label className="form-label">Género *</label>
                  <select
                    name="genero"
                    className="form-input"
                    value={formData.genero}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Seleccionar...</option>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label">Dirección *</label>
                <input
                  type="text"
                  name="direccion"
                  className="form-input"
                  value={formData.direccion}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Departamento *</label>
                  <input
                    type="text"
                    name="departamento"
                    className="form-input"
                    value={formData.departamento}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Municipio *</label>
                  <input
                    type="text"
                    name="municipio"
                    className="form-input"
                    value={formData.municipio}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Barrio</label>
                  <input
                    type="text"
                    name="barrio"
                    className="form-input"
                    value={formData.barrio}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="form-label">Zona de Influencia</label>
                  <input
                    type="text"
                    name="zona_influencia"
                    className="form-input"
                    value={formData.zona_influencia}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Tipo de Liderazgo</label>
                <select
                  name="tipo_liderazgo"
                  className="form-input"
                  value={formData.tipo_liderazgo}
                  onChange={handleChange}
                >
                  <option value="">Seleccionar...</option>
                  <option value="Comunitario">Comunitario</option>
                  <option value="Social">Social</option>
                  <option value="Politico">Político</option>
                  <option value="Religioso">Religioso</option>
                  <option value="Juvenil">Juvenil</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div className="flex justify-end space-x-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loadingForm}
                >
                  {loadingForm ? 'Guardando...' : 'Guardar'}
                </button>
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
      <h1 className="text-2xl font-bold text-gray-900">Lista de Sufragantes</h1>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="form-label">Estado</label>
            <select
              className="form-input"
              value={filters.estado}
              onChange={(e) => setFilters(prev => ({ ...prev, estado: e.target.value }))}
            >
              <option value="">Todos</option>
              <option value="verificado">Verificado</option>
              <option value="inconsistente">Inconsistente</option>
              <option value="revision">En Revisión</option>
              <option value="sin_verificar">Sin verificar</option>
            </select>
          </div>
          <div>
            <label className="form-label">Municipio</label>
            <input
              type="text"
              className="form-input"
              placeholder="Filtrar por municipio"
              value={filters.municipio}
              onChange={(e) => setFilters(prev => ({ ...prev, municipio: e.target.value }))}
            />
          </div>
          <div className="flex items-end">
            <button onClick={loadVoters} className="btn-primary w-full">
              Filtrar
            </button>
          </div>
        </div>
      </div>

      <div className="table-container overflow-x-auto">
        <table className="table min-w-[1200px]">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Cédula</th>
              <th>Edad</th>
              <th>Celular</th>
              <th>Dirección residencia</th>
              <th>Género</th>
              <th>Departamento</th>
              <th>Municipio</th>
              <th>Lugar votación</th>
              <th>Mesa</th>
              <th>Dirección puesto</th>
              <th>Estado</th>
              <th>Registro</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {voters.map(voter => (
              <tr key={voter.id}>
                <td>{voter.nombre}</td>
                <td>{voter.cedula}</td>
                <td>{voter.edad}</td>
                <td>{voter.celular ?? 'No tiene'}</td>
                <td className="max-w-[200px] truncate" title={voter.direccion_residencia}>{voter.direccion_residencia || '-'}</td>
                <td>{voter.genero === 'M' ? 'M' : voter.genero === 'F' ? 'F' : voter.genero || '-'}</td>
                <td>{voter.departamento || '-'}</td>
                <td>{voter.municipio || '-'}</td>
                <td className="max-w-[180px] truncate" title={voter.lugar_votacion}>{voter.lugar_votacion || '-'}</td>
                <td>{voter.mesa_votacion || '-'}</td>
                <td className="max-w-[180px] truncate" title={voter.direccion_puesto}>{voter.direccion_puesto || '-'}</td>
                <td>{getStatusBadge(voter.estado_validacion, voter.discrepancias_verifik)}</td>
                <td className="text-sm text-gray-500 whitespace-nowrap">
                  {new Date(voter.fecha_registro).toLocaleDateString()}
                </td>
                <td className="whitespace-nowrap">
                  {voter.estado_validacion === 'revision' && (
                    <span className="inline-flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(voter)}
                        className="btn-secondary text-sm py-1 px-2"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVerifyRow(voter)}
                        disabled={verifyLoadingId === voter.id}
                        className="btn-primary text-sm py-1 px-2"
                      >
                        {verifyLoadingId === voter.id ? 'Verificando...' : 'Verificar con Verifik'}
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Editar sufragante (En revisión) */}
      {editVoter && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Editar datos que no coinciden – {editVoter.nombre}</h2>
              <p className="text-sm text-gray-500 mt-1">Cédula: {editVoter.cedula}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="form-label">Departamento</label>
                <input
                  type="text"
                  className="form-input"
                  value={editFormData.departamento}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, departamento: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label">Municipio</label>
                <input
                  type="text"
                  className="form-input"
                  value={editFormData.municipio}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, municipio: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label">Lugar de Votación</label>
                <input
                  type="text"
                  className="form-input"
                  value={editFormData.lugar_votacion}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, lugar_votacion: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label">Mesa</label>
                <input
                  type="text"
                  className="form-input"
                  value={editFormData.mesa_votacion}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, mesa_votacion: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label">Dirección del Puesto</label>
                <input
                  type="text"
                  className="form-input"
                  value={editFormData.direccion_puesto}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, direccion_puesto: e.target.value }))}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <button type="button" onClick={handleEditVerify} disabled={editVerifyLoading} className="btn-secondary">
                  {editVerifyLoading ? 'Verificando...' : 'Verificar con Verifik'}
                </button>
                {editEstado && (
                  <span className={`badge ${editEstado === 'verificado' ? 'badge-success' : editEstado === 'revision' ? 'badge-warning' : 'badge-danger'}`}>
                    {editEstado === 'verificado' ? 'Verificado' : editEstado === 'revision' ? 'En Revisión' : editEstado === 'sin_verificar' ? 'Sin verificar' : 'Inconsistente'}
                  </span>
                )}
              </div>
              {editDiscrepancias.length > 0 && (
                <p className="text-sm text-amber-700">No coinciden: {editDiscrepancias.map(k => VERIFIK_LABELS_LIST[k] || k).join(', ')}</p>
              )}
            </div>
            <div className="p-6 border-t flex justify-end gap-2">
              <button type="button" onClick={() => setEditVoter(null)} className="btn-secondary">
                Cerrar
              </button>
              <button type="button" onClick={handleEditSave} disabled={editSaving} className="btn-primary">
                {editSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {voters.length === 0 && (
        <p className="text-center text-gray-500 py-8">No se encontraron sufragantes</p>
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

        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={
            <ProtectedRoute requiredRole="superadmin">
              <DashboardPage />
            </ProtectedRoute>
          } />
          <Route path="leaders" element={
            <ProtectedRoute requiredRole="superadmin">
              <LeadersPage />
            </ProtectedRoute>
          } />
          <Route path="voters" element={
            <ProtectedRoute requiredRole="superadmin">
              <VotersListPage />
            </ProtectedRoute>
          } />
          <Route path="register" element={
            <VoterRegistrationPage />
          } />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App
