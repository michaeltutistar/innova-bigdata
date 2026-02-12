-- Base de datos: innovabigdata
-- Tabla: usuarios (superadmin y operadores)

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('superadmin', 'operador')),
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_login TIMESTAMP,
    reset_token VARCHAR(64),
    reset_token_expires TIMESTAMP,
    email VARCHAR(255)
);

-- Tabla: lideres

CREATE TABLE IF NOT EXISTS lideres (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    cedula VARCHAR(10) UNIQUE NOT NULL,
    edad INT NOT NULL CHECK (edad >= 18 AND edad <= 120),
    celular VARCHAR(10) NOT NULL,
    direccion TEXT NOT NULL,
    genero VARCHAR(10) NOT NULL CHECK (genero IN ('M', 'F', 'Otro')),
    departamento TEXT NOT NULL,
    municipio TEXT NOT NULL,
    barrio TEXT,
    zona_influencia TEXT,
    tipo_liderazgo TEXT CHECK (tipo_liderazgo IN ('Comunitario', 'Social', 'Politico', 'Religioso', 'Juvenil', 'Otro')),
    usuario_registro TEXT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT true
);

-- Tabla: sufragantes

CREATE TABLE IF NOT EXISTS sufragantes (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    cedula VARCHAR(10) UNIQUE NOT NULL,
    edad INT NOT NULL CHECK (edad >= 18 AND edad <= 120),
    celular VARCHAR(10) NULL,
    direccion_residencia TEXT NOT NULL,
    genero VARCHAR(10) NULL CHECK (genero IS NULL OR genero IN ('M', 'F', 'Otro')),

    -- Datos de Verifik (solo lectura)
    departamento TEXT,
    municipio TEXT,
    lugar_votacion TEXT,
    mesa_votacion TEXT,
    direccion_puesto TEXT,

    -- Clasificación y estado
    estado_validacion VARCHAR(20) NOT NULL CHECK (estado_validacion IN ('verificado', 'inconsistente', 'revision', 'sin_verificar')),
    discrepancias_verifik TEXT,

    -- Referencias
    lider_id INT REFERENCES lideres(id),
    usuario_registro TEXT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar rendimiento

CREATE INDEX IF NOT EXISTS idx_sufragantes_cedula ON sufragantes(cedula);
CREATE INDEX IF NOT EXISTS idx_sufragantes_lider_id ON sufragantes(lider_id);
CREATE INDEX IF NOT EXISTS idx_sufragantes_municipio ON sufragantes(municipio);
CREATE INDEX IF NOT EXISTS idx_sufragantes_estado ON sufragantes(estado_validacion);
CREATE INDEX IF NOT EXISTS idx_sufragantes_fecha ON sufragantes(fecha_registro);
CREATE INDEX IF NOT EXISTS idx_lideres_cedula ON lideres(cedula);
CREATE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios(username);

-- Insertar usuario superadmin por defecto
-- Contraseña: Admin2026! (hasheada con bcrypt)
INSERT INTO usuarios (username, password_hash, rol)
VALUES ('admin', '$2b$12$l9GunnxdqAbG/ujD1ju9kuPvUwN2NNKvO0Nc4X36ZrWcz2wKh9rwK', 'superadmin')
ON CONFLICT (username) DO NOTHING;
