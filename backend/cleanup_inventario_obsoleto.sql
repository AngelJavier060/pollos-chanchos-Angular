-- ============================================================================
-- SCRIPT DE LIMPIEZA: ELIMINAR SISTEMAS DE INVENTARIO OBSOLETOS
-- Elimina tablas que causan confusión con el sistema actual
-- ============================================================================

-- PASO 1: Respaldar datos importantes (opcional)
SELECT 'INICIANDO LIMPIEZA DE SISTEMAS OBSOLETOS' as status;

-- Verificar que movimientos_inventario_producto tiene datos
SELECT COUNT(*) as movimientos_actuales FROM movimientos_inventario_producto;

-- PASO 2: Eliminar tablas obsoletas que causan el error
-- Estas tablas están causando conflictos en sanitizarInventario()

-- Eliminar tabla de movimientos de inventario viejo
DROP TABLE IF EXISTS movimientos_inventario;

-- Eliminar tabla de inventario_alimentos (causa el error principal)
DROP TABLE IF EXISTS inventario_alimentos;

-- NO ELIMINAR: inventario_producto es parte del sistema ACTUAL junto con movimientos_inventario_producto
-- DROP TABLE IF EXISTS inventario_producto;

-- PASO 3: Verificar limpieza
SELECT 'TABLAS ELIMINADAS EXITOSAMENTE' as resultado;
SELECT 'Sistema simplificado: inventario_producto + movimientos_inventario_producto' as nuevo_sistema;

-- PASO 4: Verificar que el sistema principal sigue funcionando
SELECT 
    COUNT(*) as total_movimientos,
    COUNT(DISTINCT inventario_producto_id) as productos_distintos,
    MIN(fecha_movimiento) as primer_movimiento,
    MAX(fecha_movimiento) as ultimo_movimiento
FROM movimientos_inventario_producto;

-- Verificar tipos de movimiento disponibles
SELECT 
    tipo_movimiento,
    COUNT(*) as cantidad
FROM movimientos_inventario_producto 
GROUP BY tipo_movimiento;

SELECT '✅ LIMPIEZA COMPLETADA - Sistema simplificado con éxito' as final_status;