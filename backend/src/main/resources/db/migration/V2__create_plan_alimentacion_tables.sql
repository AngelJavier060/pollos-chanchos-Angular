-- Migración para crear las tablas del módulo Plan de Alimentación
-- Compatible con PostgreSQL

-- Tabla principal de planes de alimentación
CREATE TABLE plan_alimentacion (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    animal_id BIGINT NOT NULL,
    created_by_user_id BIGINT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    create_date TIMESTAMP,
    update_date TIMESTAMP,

    CONSTRAINT fk_plan_alimentacion_animal
        FOREIGN KEY (animal_id) REFERENCES animal(id),
    CONSTRAINT fk_plan_alimentacion_user
        FOREIGN KEY (created_by_user_id) REFERENCES usuarios(id),

    CONSTRAINT uk_plan_name_animal UNIQUE (name, animal_id, active)
);

CREATE INDEX idx_plan_animal ON plan_alimentacion(animal_id);
CREATE INDEX idx_plan_created_by ON plan_alimentacion(created_by_user_id);
CREATE INDEX idx_plan_active ON plan_alimentacion(active);

-- Tabla de detalles del plan (rangos de días y productos)
CREATE TABLE plan_detalle (
    id BIGSERIAL PRIMARY KEY,
    plan_id BIGINT NOT NULL,
    day_start INT NOT NULL,
    day_end INT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity_per_animal DOUBLE PRECISION NOT NULL,
    frequency VARCHAR(20) DEFAULT 'DIARIA' CHECK (frequency IN ('DIARIA', 'SEMANAL', 'QUINCENAL')),
    instructions TEXT,
    create_date TIMESTAMP,
    update_date TIMESTAMP,

    CONSTRAINT fk_plan_detalle_plan
        FOREIGN KEY (plan_id) REFERENCES plan_alimentacion(id) ON DELETE CASCADE,
    CONSTRAINT fk_plan_detalle_product
        FOREIGN KEY (product_id) REFERENCES product(id),

    CHECK (day_start > 0),
    CHECK (day_end >= day_start),
    CHECK (quantity_per_animal > 0)
);

CREATE INDEX idx_detalle_plan ON plan_detalle(plan_id);
CREATE INDEX idx_detalle_product ON plan_detalle(product_id);
CREATE INDEX idx_detalle_days ON plan_detalle(day_start, day_end);

-- Tabla de asignaciones de planes a lotes y usuarios
CREATE TABLE plan_asignacion (
    id BIGSERIAL PRIMARY KEY,
    plan_id BIGINT NOT NULL,
    lote_id VARCHAR(255) NOT NULL,
    assigned_user_id BIGINT NOT NULL,
    assigned_by_user_id BIGINT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'ACTIVO' CHECK (status IN ('ACTIVO', 'PAUSADO', 'COMPLETADO')),
    create_date TIMESTAMP,
    update_date TIMESTAMP,

    CONSTRAINT fk_plan_asignacion_plan
        FOREIGN KEY (plan_id) REFERENCES plan_alimentacion(id),
    CONSTRAINT fk_plan_asignacion_lote
        FOREIGN KEY (lote_id) REFERENCES lote(id),
    CONSTRAINT fk_plan_asignacion_assigned_user
        FOREIGN KEY (assigned_user_id) REFERENCES usuarios(id),
    CONSTRAINT fk_plan_asignacion_assigned_by
        FOREIGN KEY (assigned_by_user_id) REFERENCES usuarios(id),

    CONSTRAINT uk_plan_lote_active UNIQUE (plan_id, lote_id, status),

    CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_asignacion_plan ON plan_asignacion(plan_id);
CREATE INDEX idx_asignacion_lote ON plan_asignacion(lote_id);
CREATE INDEX idx_asignacion_user ON plan_asignacion(assigned_user_id);
CREATE INDEX idx_asignacion_status ON plan_asignacion(status);
CREATE INDEX idx_asignacion_dates ON plan_asignacion(start_date, end_date);

-- Tabla de ejecución de planes (registro diario)
CREATE TABLE plan_ejecucion (
    id BIGSERIAL PRIMARY KEY,
    asignacion_id BIGINT NOT NULL,
    detalle_id BIGINT NOT NULL,
    executed_by_user_id BIGINT NOT NULL,
    execution_date DATE NOT NULL,
    day_number INT NOT NULL,
    quantity_applied DOUBLE PRECISION NOT NULL,
    observations TEXT,
    status VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (status IN ('PENDIENTE', 'EJECUTADO', 'OMITIDO')),
    create_date TIMESTAMP,
    update_date TIMESTAMP,

    CONSTRAINT fk_plan_ejecucion_asignacion
        FOREIGN KEY (asignacion_id) REFERENCES plan_asignacion(id) ON DELETE CASCADE,
    CONSTRAINT fk_plan_ejecucion_detalle
        FOREIGN KEY (detalle_id) REFERENCES plan_detalle(id),
    CONSTRAINT fk_plan_ejecucion_user
        FOREIGN KEY (executed_by_user_id) REFERENCES usuarios(id),

    CONSTRAINT uk_ejecucion_unique UNIQUE (asignacion_id, detalle_id, day_number),

    CHECK (day_number > 0),
    CHECK (quantity_applied >= 0)
);

CREATE INDEX idx_ejecucion_asignacion ON plan_ejecucion(asignacion_id);
CREATE INDEX idx_ejecucion_detalle ON plan_ejecucion(detalle_id);
CREATE INDEX idx_ejecucion_user ON plan_ejecucion(executed_by_user_id);
CREATE INDEX idx_ejecucion_date ON plan_ejecucion(execution_date);
CREATE INDEX idx_ejecucion_status ON plan_ejecucion(status);
CREATE INDEX idx_ejecucion_day ON plan_ejecucion(day_number);

COMMENT ON TABLE plan_alimentacion IS 'Planes maestros de alimentación por tipo de animal';
COMMENT ON TABLE plan_detalle IS 'Configuración de rangos de días y productos para cada plan';
COMMENT ON TABLE plan_asignacion IS 'Asignación de planes específicos a lotes y usuarios responsables';
COMMENT ON TABLE plan_ejecucion IS 'Registro diario de ejecución de los planes de alimentación';