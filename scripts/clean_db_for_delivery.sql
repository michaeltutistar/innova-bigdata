-- Limpieza de BD para entrega al cliente
-- Elimina: todos los sufragantes, todos los líderes, todos los usuarios excepto admin

BEGIN;

-- 1. Sufragantes (primero por FK a lideres)
DELETE FROM sufragantes;

-- 2. Líderes
DELETE FROM lideres;

-- 3. Usuarios: solo dejar admin
DELETE FROM usuarios WHERE username != 'admin';

-- 4. Reiniciar secuencias para que nuevos IDs empiecen en 1
ALTER SEQUENCE sufragantes_id_seq RESTART WITH 1;
ALTER SEQUENCE lideres_id_seq RESTART WITH 1;

COMMIT;
