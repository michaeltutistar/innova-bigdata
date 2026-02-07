-- Permite NULL en sufragantes.genero (registro masivo sin columna género)
-- Ejecutar una sola vez: docker exec -i innovabigdata-db psql -U postgres -d innovabigdata -f - < fix_genero_nullable.sql

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT c.conname FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey) AND NOT a.attisdropped
        WHERE c.conrelid = 'sufragantes'::regclass AND c.contype = 'c' AND a.attname = 'genero'
    LOOP
        EXECUTE format('ALTER TABLE sufragantes DROP CONSTRAINT IF EXISTS %I', r.conname);
    END LOOP;
END $$;

ALTER TABLE sufragantes DROP CONSTRAINT IF EXISTS sufragantes_genero_check;
ALTER TABLE sufragantes ALTER COLUMN genero DROP NOT NULL;
ALTER TABLE sufragantes ADD CONSTRAINT sufragantes_genero_check CHECK (genero IS NULL OR genero IN ('M', 'F', 'Otro'));
