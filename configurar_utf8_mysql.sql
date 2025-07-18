-- CONFIGURACION UTF-8 PARA MySQL
-- Ejecutar este script ANTES de aplicar la migracion

-- 1. Configurar la base de datos para UTF-8
ALTER DATABASE db_avicola CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. Verificar la configuracion de caracteres
SHOW VARIABLES LIKE 'character%';
SHOW VARIABLES LIKE 'collation%';

-- 3. Verificar que las tablas principales usen UTF-8
SELECT 
    TABLE_NAME,
    TABLE_COLLATION 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'db_avicola';

-- 4. Si es necesario, convertir tablas existentes a UTF-8
-- (Descomenta solo si es necesario)
/*
ALTER TABLE plan_ejecucion CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE plan_asignacion CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE plan_detalle CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE lote CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE product CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
*/

-- 5. Establecer la conexion en UTF-8
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
