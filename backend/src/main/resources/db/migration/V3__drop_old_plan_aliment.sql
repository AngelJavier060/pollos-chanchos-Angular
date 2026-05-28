-- Eliminar el sistema antiguo de plan_aliment
-- Mantener solo plan_alimentacion como sistema unificado

-- Paso 1: Deshabilitar triggers de FK temporalmente (equivalente PostgreSQL)
SET session_replication_role = 'replica';

-- Paso 2: Eliminar tabla de relación muchos a muchos
DROP TABLE IF EXISTS planaliment_product;

-- Paso 3: Eliminar tabla principal antigua
DROP TABLE IF EXISTS plan_aliment;

-- Paso 4: Rehabilitar los triggers de FK
SET session_replication_role = 'origin';
