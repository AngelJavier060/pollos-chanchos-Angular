-- Migración para crear las tablas del módulo Plan de Alimentación
-- Compatible con tu estructura de base de datos existente

-- Tabla principal de planes de alimentación
CREATE TABLE plan_alimentacion (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    animal_id BIGINT NOT NULL,
    created_by_user_id BIGINT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    create_date DATETIME(6),
    update_date DATETIME(6),
    
    -- Claves foráneas
    CONSTRAINT fk_plan_alimentacion_animal 
        FOREIGN KEY (animal_id) REFERENCES animal(id),
    CONSTRAINT fk_plan_alimentacion_user 
        FOREIGN KEY (created_by_user_id) REFERENCES usuarios(id),
    
    -- Índices para optimizar consultas
    INDEX idx_plan_animal (animal_id),
    INDEX idx_plan_created_by (created_by_user_id),
    INDEX idx_plan_active (active),
    
    -- Restricción única: no puede haber dos planes activos con el mismo nombre para el mismo animal
    UNIQUE KEY uk_plan_name_animal (name, animal_id, active)
);

-- Tabla de detalles del plan (rangos de días y productos)
CREATE TABLE plan_detalle (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    plan_id BIGINT NOT NULL,
    day_start INT NOT NULL,
    day_end INT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity_per_animal DOUBLE NOT NULL,
    frequency ENUM('DIARIA', 'SEMANAL', 'QUINCENAL') DEFAULT 'DIARIA',
    instructions TEXT,
    create_date DATETIME(6),
    update_date DATETIME(6),
    
    -- Claves foráneas
    CONSTRAINT fk_plan_detalle_plan 
        FOREIGN KEY (plan_id) REFERENCES plan_alimentacion(id) ON DELETE CASCADE,
    CONSTRAINT fk_plan_detalle_product 
        FOREIGN KEY (product_id) REFERENCES product(id),
    
    -- Índices
    INDEX idx_detalle_plan (plan_id),
    INDEX idx_detalle_product (product_id),
    INDEX idx_detalle_days (day_start, day_end),
    
    -- Validaciones
    CHECK (day_start > 0),
    CHECK (day_end >= day_start),
    CHECK (quantity_per_animal > 0)
);

-- Tabla de asignaciones de planes a lotes y usuarios
CREATE TABLE plan_asignacion (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    plan_id BIGINT NOT NULL,
    lote_id VARCHAR(255) NOT NULL,
    assigned_user_id BIGINT NOT NULL,
    assigned_by_user_id BIGINT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status ENUM('ACTIVO', 'PAUSADO', 'COMPLETADO') DEFAULT 'ACTIVO',
    create_date DATETIME(6),
    update_date DATETIME(6),
    
    -- Claves foráneas
    CONSTRAINT fk_plan_asignacion_plan 
        FOREIGN KEY (plan_id) REFERENCES plan_alimentacion(id),
    CONSTRAINT fk_plan_asignacion_lote 
        FOREIGN KEY (lote_id) REFERENCES lote(id),
    CONSTRAINT fk_plan_asignacion_assigned_user 
        FOREIGN KEY (assigned_user_id) REFERENCES usuarios(id),
    CONSTRAINT fk_plan_asignacion_assigned_by 
        FOREIGN KEY (assigned_by_user_id) REFERENCES usuarios(id),
    
    -- Índices
    INDEX idx_asignacion_plan (plan_id),
    INDEX idx_asignacion_lote (lote_id),
    INDEX idx_asignacion_user (assigned_user_id),
    INDEX idx_asignacion_status (status),
    INDEX idx_asignacion_dates (start_date, end_date),
    
    -- Restricción: no puede haber dos asignaciones activas del mismo plan para el mismo lote
    UNIQUE KEY uk_plan_lote_active (plan_id, lote_id, status),
    
    -- Validaciones
    CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Tabla de ejecución de planes (registro diario)
CREATE TABLE plan_ejecucion (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    asignacion_id BIGINT NOT NULL,
    detalle_id BIGINT NOT NULL,
    executed_by_user_id BIGINT NOT NULL,
    execution_date DATE NOT NULL,
    day_number INT NOT NULL,
    quantity_applied DOUBLE NOT NULL,
    observations TEXT,
    status ENUM('PENDIENTE', 'EJECUTADO', 'OMITIDO') DEFAULT 'PENDIENTE',
    create_date DATETIME(6),
    update_date DATETIME(6),
    
    -- Claves foráneas
    CONSTRAINT fk_plan_ejecucion_asignacion 
        FOREIGN KEY (asignacion_id) REFERENCES plan_asignacion(id) ON DELETE CASCADE,
    CONSTRAINT fk_plan_ejecucion_detalle 
        FOREIGN KEY (detalle_id) REFERENCES plan_detalle(id),
    CONSTRAINT fk_plan_ejecucion_user 
        FOREIGN KEY (executed_by_user_id) REFERENCES usuarios(id),
    
    -- Índices
    INDEX idx_ejecucion_asignacion (asignacion_id),
    INDEX idx_ejecucion_detalle (detalle_id),
    INDEX idx_ejecucion_user (executed_by_user_id),
    INDEX idx_ejecucion_date (execution_date),
    INDEX idx_ejecucion_status (status),
    INDEX idx_ejecucion_day (day_number),
    
    -- Restricción: no puede haber dos ejecuciones del mismo detalle para el mismo día en la misma asignación
    UNIQUE KEY uk_ejecucion_unique (asignacion_id, detalle_id, day_number),
    
    -- Validaciones
    CHECK (day_number > 0),
    CHECK (quantity_applied >= 0)
);

-- Comentarios para documentación
ALTER TABLE plan_alimentacion COMMENT = 'Planes maestros de alimentación por tipo de animal';
ALTER TABLE plan_detalle COMMENT = 'Configuración de rangos de días y productos para cada plan';
ALTER TABLE plan_asignacion COMMENT = 'Asignación de planes específicos a lotes y usuarios responsables';
ALTER TABLE plan_ejecucion COMMENT = 'Registro diario de ejecución de los planes de alimentación'; 