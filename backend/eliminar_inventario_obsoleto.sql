-- ============================================================================
-- SCRIPT PARA ELIMINAR SOLO LAS TABLAS PROBLEMÁTICAS
-- Elimina ÚNICAMENTE las tablas que causan el error 400
-- Mantiene movimientos_inventario_producto que funciona correctamente
-- ============================================================================

-- PASO 1: Eliminar SOLO la tabla de movimientos de inventario del sistema viejo
DROP TABLE IF EXISTS movimientos_inventario;

-- PASO 2: Eliminar las tablas problemáticas que causan el error 400
DROP TABLE IF EXISTS inventario_alimentos;
-- NO ELIMINAR: inventario_producto es parte del sistema actual
-- DROP TABLE IF EXISTS inventario_producto;

-- PASO 3: Verificar que se mantiene la tabla que funciona
SELECT 'TABLAS ELIMINADAS:' as status;
SELECT 'inventario_alimentos - ELIMINADA' as tabla1;
SELECT 'inventario_producto - CONSERVADA ✅' as tabla2;
SELECT 'movimientos_inventario - ELIMINADA' as tabla3;
SELECT '' as separador;
SELECT 'TABLAS CONSERVADAS (las que funcionan):' as status2;
SELECT 'inventario_producto - CONSERVADA ✅' as tabla_ok1;
SELECT 'movimientos_inventario_producto - CONSERVADA ✅' as tabla_ok2;

-- PASO 4: Verificar que la tabla principal sigue existiendo
SELECT COUNT(*) as registros_conservados FROM movimientos_inventario_producto;

SELECT '✅ Limpieza completada - Solo se eliminaron las tablas problemáticas' AS resultado;
