-- Insertar líderes desde Lideres.csv (nombre, departamento, municipio)
-- Campos obligatorios no en CSV: cedula (única), edad 18, celular 0000000000, direccion '-', genero 'Otro'
-- Municipio vacío en CSV → 'Por definir'

INSERT INTO lideres (nombre, cedula, edad, celular, direccion, genero, departamento, municipio) VALUES
('Hernán Meléndez - GSI', '1000000001', 18, '0000000000', '-', 'Otro', 'NARIÑO', 'PASTO'),
('Giovanny Delgado - STB', '1000000002', 18, '0000000000', '-', 'Otro', 'NARIÑO', 'PASTO'),
('Miguel Coral - Administrativos', '1000000003', 18, '0000000000', '-', 'Otro', 'NARIÑO', 'PASTO'),
('Adriana Rivadeneira', '1000000004', 18, '0000000000', '-', 'Otro', 'NARIÑO', 'PASTO'),
('Jaime Sánchez', '1000000005', 18, '0000000000', '-', 'Otro', 'NARIÑO', 'PASTO'),
('Daniel Coral - FCS', '1000000006', 18, '0000000000', '-', 'Otro', 'NARIÑO', 'PASTO'),
('María José Villegas - H. Departamental', '1000000007', 18, '0000000000', '-', 'Otro', 'NARIÑO', 'PASTO'),
('María José Villegas', '1000000008', 18, '0000000000', '-', 'Otro', 'NARIÑO', 'IPIALES'),
('Ana María Noya', '1000000009', 18, '0000000000', '-', 'Otro', 'MAGDALENA', 'Por definir'),
('Jorge Echeverri - Magdalena', '1000000010', 18, '0000000000', '-', 'Otro', 'MAGDALENA', 'Por definir'),
('Cristian Ruiz - Santander', '1000000011', 18, '0000000000', '-', 'Otro', 'SANTANDER', 'Por definir'),
('Cristian Ruiz - Palmira', '1000000012', 18, '0000000000', '-', 'Otro', 'VALLE DEL CAUCA', 'PALMIRA'),
('Darwin Aguirre - FF', '1000000013', 18, '0000000000', '-', 'Otro', 'NARIÑO', 'PASTO'),
('Gabriel Rosero - Popayan', '1000000014', 18, '0000000000', '-', 'Otro', 'CAUCA', 'POPAYAN'),
('Libardo - Alban', '1000000015', 18, '0000000000', '-', 'Otro', 'NARIÑO', 'ALBAN'),
('José Castillo - Consaca', '1000000016', 18, '0000000000', '-', 'Otro', 'NARIÑO', 'CONSACA'),
('Natalia Gualguan - Cauca', '1000000017', 18, '0000000000', '-', 'Otro', 'CAUCA', 'Por definir'),
('Miguel Coral - Nariño', '1000000018', 18, '0000000000', '-', 'Otro', 'NARIÑO', 'Por definir'),
('Punzara - Tuquerres', '1000000019', 18, '0000000000', '-', 'Otro', 'NARIÑO', 'TUQUERRES'),
('Natalia Fajardo - Gualmatan', '1000000020', 18, '0000000000', '-', 'Otro', 'NARIÑO', 'GUALMATAN');
