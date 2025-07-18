-- Crear tabla de causas de mortalidad
CREATE TABLE causas_mortalidad (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    color VARCHAR(20),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insertar causas predefinidas
INSERT INTO causas_mortalidad (nombre, descripcion, color) VALUES
('Enfermedad Respiratoria', 'Problemas respiratorios', '#ff6b6b'),
('Enfermedad Digestiva', 'Problemas digestivos', '#4ecdc4'),
('Problemas Cardíacos', 'Fallos cardíacos', '#45b7d1'),
('Stress Térmico', 'Estrés por temperatura', '#f9ca24'),
('Deficiencias Nutricionales', 'Problemas nutricionales', '#6c5ce7'),
('Lesiones Físicas', 'Heridas o traumatismos', '#feca57'),
('Problemas Genéticos', 'Defectos genéticos', '#ff9ff3'),
('Causas Desconocidas', 'Origen no determinado', '#95a5a6'),
('Otras Causas', 'Otros factores', '#74b9ff');

-- Crear tabla de registros de mortalidad
CREATE TABLE registros_mortalidad (
    id INT PRIMARY KEY AUTO_INCREMENT,
    lote_id INT NOT NULL,
    cantidad_muertos INT NOT NULL,
    causa_id INT NOT NULL,
    observaciones TEXT,
    peso DECIMAL(10,2),
    edad INT,
    ubicacion VARCHAR(255),
    confirmado BOOLEAN DEFAULT FALSE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_registro VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lote_id) REFERENCES lotes(id),
    FOREIGN KEY (causa_id) REFERENCES causas_mortalidad(id)
);

-- Crear tabla de enfermedades
CREATE TABLE enfermedades (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    sintomas TEXT,
    tratamiento_recomendado TEXT,
    contagiosa BOOLEAN DEFAULT FALSE,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insertar enfermedades comunes
INSERT INTO enfermedades (nombre, descripcion, sintomas, tratamiento_recomendado, contagiosa) VALUES
('Bronquitis Infecciosa', 'Enfermedad respiratoria viral', 'Tos, dificultad respiratoria, secreción nasal', 'Antibiótico de amplio espectro', TRUE),
('Newcastle', 'Enfermedad viral grave', 'Síntomas respiratorios y nerviosos', 'Tratamiento sintomático', TRUE),
('Cólera Aviar', 'Enfermedad bacteriana', 'Diarrea, letargo, pérdida de apetito', 'Antibióticos específicos', TRUE),
('Coccidiosis', 'Enfermedad parasitaria', 'Diarrea con sangre, pérdida de peso', 'Anticoccidiales', FALSE),
('Salmonelosis', 'Infección bacteriana', 'Diarrea, fiebre, pérdida de apetito', 'Antibióticos', TRUE),
('E. Coli', 'Infección bacteriana', 'Problemas digestivos, septicemia', 'Antibióticos específicos', TRUE),
('Estrés Térmico', 'Problema ambiental', 'Jadeo, letargo, reducción de consumo', 'Manejo ambiental', FALSE),
('Problemas Respiratorios', 'Varios síntomas respiratorios', 'Tos, dificultad respiratoria', 'Según causa específica', FALSE),
('Problemas Digestivos', 'Varios síntomas digestivos', 'Diarrea, pérdida de apetito', 'Según causa específica', FALSE),
('Deficiencias Nutricionales', 'Falta de nutrientes', 'Varios síntomas según deficiencia', 'Suplementación nutricional', FALSE);

-- Crear tabla de medicamentos
CREATE TABLE medicamentos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(100),
    dosis_recomendada VARCHAR(255),
    tiempo_retiro INT, -- días
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insertar medicamentos comunes
INSERT INTO medicamentos (nombre, descripcion, tipo, dosis_recomendada, tiempo_retiro) VALUES
('Antibiótico Amplio Espectro', 'Antibiótico de amplio espectro', 'Antibiótico', '1ml/kg peso corporal', 7),
('Enrofloxacina', 'Antibiótico fluoroquinolona', 'Antibiótico', '10mg/kg peso corporal', 7),
('Amoxicilina', 'Antibiótico penicilina', 'Antibiótico', '15mg/kg peso corporal', 5),
('Tetraciclina', 'Antibiótico tetraciclina', 'Antibiótico', '20mg/kg peso corporal', 7),
('Sulfametoxazol', 'Antibiótico sulfamida', 'Antibiótico', '25mg/kg peso corporal', 10),
('Probióticos', 'Microorganismos benéficos', 'Probiótico', 'Según indicaciones', 0),
('Vitaminas A+D+E', 'Complejo vitamínico', 'Vitaminas', '0.5ml/kg peso corporal', 0),
('Electrolitos', 'Reposición de electrolitos', 'Suplemento', 'Según necesidad', 0),
('Antiinflamatorio', 'Reduce inflamación', 'Antiinflamatorio', 'Según indicaciones', 3),
('Anticoccidial', 'Específico para coccidiosis', 'Antiparasitario', 'Según indicaciones', 5);

-- Crear tabla de registros de morbilidad
CREATE TABLE registros_morbilidad (
    id INT PRIMARY KEY AUTO_INCREMENT,
    lote_id INT NOT NULL,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    cantidad_enfermos INT NOT NULL,
    enfermedad_id INT NOT NULL,
    sintomas_observados TEXT,
    gravedad ENUM('leve', 'moderada', 'severa') DEFAULT 'leve',
    estado_tratamiento ENUM('en_observacion', 'en_tratamiento', 'recuperado', 'movido_a_mortalidad') DEFAULT 'en_observacion',
    medicamento_id INT,
    dosis_aplicada VARCHAR(255),
    fecha_inicio_tratamiento DATE,
    fecha_fin_tratamiento DATE,
    observaciones_veterinario TEXT,
    proxima_revision DATE,
    costo DECIMAL(10,2),
    requiere_aislamiento BOOLEAN DEFAULT FALSE,
    contagioso BOOLEAN DEFAULT FALSE,
    usuario_registro VARCHAR(255),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    dias_en_tratamiento INT DEFAULT 0,
    porcentaje_afectado DECIMAL(5,2),
    animales_tratados INT DEFAULT 0,
    derivado_a_mortalidad BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lote_id) REFERENCES lotes(id),
    FOREIGN KEY (enfermedad_id) REFERENCES enfermedades(id),
    FOREIGN KEY (medicamento_id) REFERENCES medicamentos(id)
);

-- Crear tabla de alertas de mortalidad
CREATE TABLE alertas_mortalidad (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tipo ENUM('critica', 'advertencia', 'informativa') NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    mensaje TEXT NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    leida BOOLEAN DEFAULT FALSE,
    lote_id INT,
    usuario_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lote_id) REFERENCES lotes(id)
);

-- Crear tabla de alertas de morbilidad
CREATE TABLE alertas_morbilidad (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tipo ENUM('brote', 'aislamiento', 'tratamiento', 'seguimiento') NOT NULL,
    prioridad ENUM('alta', 'media', 'baja') NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    mensaje TEXT NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    leida BOOLEAN DEFAULT FALSE,
    lote_id INT,
    usuario_id INT,
    accion_requerida VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lote_id) REFERENCES lotes(id)
);

-- Crear índices para optimizar consultas
CREATE INDEX idx_registros_mortalidad_lote ON registros_mortalidad(lote_id);
CREATE INDEX idx_registros_mortalidad_fecha ON registros_mortalidad(fecha_registro);
CREATE INDEX idx_registros_morbilidad_lote ON registros_morbilidad(lote_id);
CREATE INDEX idx_registros_morbilidad_fecha ON registros_morbilidad(fecha);
CREATE INDEX idx_alertas_mortalidad_leida ON alertas_mortalidad(leida);
CREATE INDEX idx_alertas_morbilidad_leida ON alertas_morbilidad(leida); 