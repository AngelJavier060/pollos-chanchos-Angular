-- Eliminar el sistema antiguo de plan_aliment
-- Mantener solo plan_alimentacion como sistema unificado

-- Paso 1: Primero deshabilitar las verificaciones de claves foráneas temporalmente
SET FOREIGN_KEY_CHECKS = 0;

-- Paso 2: Eliminar tabla de relación muchos a muchos
DROP TABLE IF EXISTS planaliment_product;

-- Paso 3: Eliminar tabla principal antigua
DROP TABLE IF EXISTS plan_aliment;

-- Paso 4: Rehabilitar las verificaciones de claves foráneas
SET FOREIGN_KEY_CHECKS = 1;
