-- Añadir columna email a usuarios (si no existe) y actualizar correos de operadores y admins
-- Ejecutar en pgAdmin sobre la base innovabigdata

-- 1. Añadir columna email si la tabla ya existía sin ella
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- 2. Actualizar emails por usuario (username)
-- Operador: Lyna Hernández (LynaH)
UPDATE usuarios SET email = 'hernandezplyna@gmail.com' WHERE username = 'LynaH';

-- Operador: Darlin Apraez (innovabigdata_ops)
UPDATE usuarios SET email = 'darlingapra4@gmail.com' WHERE username = 'innovabigdata_ops';

-- Admin: Camila Guerrero (MCamila)
UPDATE usuarios SET email = 'camiliguerrero10@gmail.com' WHERE username = 'MCamila';

-- Admin: Luis Ojeda (Ljob)
UPDATE usuarios SET email = 'ljob.franciscofajardoabogados@gmail.com' WHERE username = 'Ljob';
