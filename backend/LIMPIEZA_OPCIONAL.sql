-- =====================================================
-- SCRIPT DE LIMPIEZA OPCIONAL (SOLO SI ES NECESARIO)
-- =====================================================
-- Este script es OPCIONAL y solo debe ejecutarse si:
-- 1. El script de verificación muestra productos huérfanos
-- 2. Quieres limpiar registros históricos muy antiguos
-- 3. Necesitas optimizar espacio en BD
-- =====================================================

USE avicola;

-- =====================================================
-- OPCIÓN 1: LIMPIAR PRODUCTOS SIN STOCK EN CONSOLIDADO NI ENTRADAS
-- =====================================================
-- Esto NO elimina productos, solo limpia registros de inventario vacíos

SELECT '=== LIMPIEZA DE INVENTARIO VACÍO ===' AS Paso;

-- Ver qué se va a eliminar (PREVIEW)
SELECT 
    'Preview: Registros vacíos a eliminar' AS Tipo,
    COUNT(*) AS Total
FROM inventario_producto ip
WHERE NOT EXISTS (
    SELECT 1 FROM inventario_entrada_producto iep
    WHERE iep.product_id = ip.product_id
      AND (iep.activo IS NULL OR iep.activo = TRUE)
      AND iep.stock_base_restante > 0
)
AND (ip.cantidad_stock IS NULL OR ip.cantidad_stock <= 0);

-- Ejecuta esto solo si estás seguro:
-- DELETE FROM inventario_producto
-- WHERE NOT EXISTS (
--     SELECT 1 FROM inventario_entrada_producto iep
--     WHERE iep.product_id = inventario_producto.product_id
--       AND (iep.activo IS NULL OR iep.activo = TRUE)
--       AND iep.stock_base_restante > 0
-- )
-- AND (cantidad_stock IS NULL OR cantidad_stock <= 0);

-- =====================================================
-- OPCIÓN 2: DESACTIVAR ENTRADAS TOTALMENTE CONSUMIDAS (STOCK = 0)
-- =====================================================
-- Esto mantiene el historial pero marca como inactivo

SELECT '=== DESACTIVAR ENTRADAS CONSUMIDAS ===' AS Paso;

-- Preview
SELECT 
    'Entradas a desactivar' AS Tipo,
    COUNT(*) AS Total
FROM inventario_entrada_producto
WHERE (activo IS NULL OR activo = TRUE)
  AND stock_base_restante <= 0;

-- Ejecuta solo si quieres limpiar:
-- UPDATE inventario_entrada_producto
-- SET activo = FALSE,
--     observaciones = CONCAT(COALESCE(observaciones, ''), ' | Desactivada automáticamente: stock consumido')
-- WHERE (activo IS NULL OR activo = TRUE)
--   AND stock_base_restante <= 0;

-- =====================================================
-- OPCIÓN 3: ARCHIVAR MOVIMIENTOS MUY ANTIGUOS (OPCIONAL)
-- =====================================================
-- Si tienes muchos movimientos (>10,000), puedes archivar los viejos

SELECT '=== MOVIMIENTOS ANTIGUOS ===' AS Paso;

SELECT 
    'Movimientos con más de 1 año' AS Tipo,
    COUNT(*) AS Total,
    MIN(fecha_movimiento) AS MasAntiguo,
    MAX(fecha_movimiento) AS MasReciente
FROM movimiento_inventario_producto
WHERE fecha_movimiento < DATE_SUB(NOW(), INTERVAL 1 YEAR);

-- Si quieres archivar (NO eliminar), crea tabla de archivo:
-- CREATE TABLE IF NOT EXISTS movimiento_inventario_producto_archivo (
--     LIKE movimiento_inventario_producto
-- );

-- INSERT INTO movimiento_inventario_producto_archivo
-- SELECT * FROM movimiento_inventario_producto
-- WHERE fecha_movimiento < DATE_SUB(NOW(), INTERVAL 1 YEAR);

-- Y luego elimina de la tabla principal:
-- DELETE FROM movimiento_inventario_producto
-- WHERE fecha_movimiento < DATE_SUB(NOW(), INTERVAL 1 YEAR);

-- =====================================================
-- OPCIÓN 4: CONSOLIDAR MOVIMIENTOS DE MIGRACIÓN
-- =====================================================
-- Si la migración creó muchos movimientos duplicados

SELECT '=== MOVIMIENTOS DE MIGRACIÓN ===' AS Paso;

SELECT 
    'Movimientos de migración' AS Tipo,
    COUNT(*) AS Total
FROM movimiento_inventario_producto
WHERE observaciones LIKE '%Migración FEFO%';

-- Si quieres consolidar (solo mantener uno por producto):
-- Esta es una operación avanzada, mejor dejar como está

-- =====================================================
-- OPCIÓN 5: RECREAR INVENTARIO_PRODUCTO DESDE CERO
-- =====================================================
-- Si quieres que inventario_producto sea una vista calculada

SELECT '=== RECALCULAR CONSOLIDADO ===' AS Paso;

-- Actualizar cantidad_stock desde entradas
UPDATE inventario_producto ip
SET cantidad_stock = COALESCE((
    SELECT SUM(iep.stock_base_restante)
    FROM inventario_entrada_producto iep
    WHERE iep.product_id = ip.product_id
      AND (iep.activo IS NULL OR iep.activo = TRUE)
), 0)
WHERE EXISTS (
    SELECT 1 FROM product p WHERE p.id = ip.product_id AND p.active = TRUE
);

-- =====================================================
-- OPCIÓN 6: OPTIMIZAR TABLAS
-- =====================================================
-- Después de limpiezas, optimiza las tablas

SELECT '=== OPTIMIZACIÓN ===' AS Paso;

-- Ejecuta esto al final de cualquier limpieza:
-- OPTIMIZE TABLE inventario_producto;
-- OPTIMIZE TABLE inventario_entrada_producto;
-- OPTIMIZE TABLE movimiento_inventario_producto;
-- OPTIMIZE TABLE consumo_entrada_producto;

SELECT 'Scripts de limpieza completados (si los ejecutaste)' AS Resultado;
SELECT 'Recuerda: Estas limpiezas son OPCIONALES, no obligatorias' AS Nota;
