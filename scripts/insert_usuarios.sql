-- Crear 2 admins (superadmin) y 2 operadores en la tabla usuarios
-- Ejecutar en pgAdmin sobre la base innovabigdata

-- Admin Camila | Usuario: MCamila | Clave: 98382873
INSERT INTO usuarios (username, password_hash, rol, activo)
VALUES ('MCamila', '$2b$12$vYXbiVQVQ8Tq0OdPx8SMQ.aDHq0q0UUfutALiIjF31spx.YZh9v1W', 'superadmin', true)
ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, rol = EXCLUDED.rol, activo = EXCLUDED.activo;

-- Admin Luis | Usuario: Ljob | Clave: Ljob10100110
INSERT INTO usuarios (username, password_hash, rol, activo)
VALUES ('Ljob', '$2b$12$5nFBWndsVoeJ9Pj5cD/BIuXpTDAZdF8TZm8icsSMYMs1zVSlOSzY.', 'superadmin', true)
ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, rol = EXCLUDED.rol, activo = EXCLUDED.activo;

-- Operador Lyna | Usuario: LynaH | Clave: LMH1983
-- (Usuario sin espacio para evitar problemas de login; si prefieres "Lyna H", cámbialo y vuelve a hashear la clave)
INSERT INTO usuarios (username, password_hash, rol, activo)
VALUES ('LynaH', '$2b$12$9tfaVtbdD0RJdz0WRm/bZuf63fUAxE5HszXcQLIzLcJCZgS/.90HK', 'operador', true)
ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, rol = EXCLUDED.rol, activo = EXCLUDED.activo;

-- Operador Darlin | Usuario: innovabigdata_ops | Clave: Innova*Data!73
INSERT INTO usuarios (username, password_hash, rol, activo)
VALUES ('innovabigdata_ops', '$2b$12$9NFmljTqoK.rhGpypDAiYejv4MhmrHKtdAdGctvVfHbzmAUBUDpwS', 'operador', true)
ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, rol = EXCLUDED.rol, activo = EXCLUDED.activo;
