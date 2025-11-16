-- =====================================================
-- SCRIPT DE VERIFICACIÓN POST-MIGRACIÓN FEFO
-- =====================================================
-- Ejecuta este script después de la migración para validar
-- que todo quedó correctamente sincronizado

USE avicola;

-- =====================================================
-- 1. ESTADO GENERAL DEL INVENTARIO
-- =====================================================
SELECT '=== ESTADO GENERAL DEL INVENTARIO ===' AS Seccion;

SELECT 
    'Resumen General' AS Tipo,
    COUNT(DISTINCT p.id) AS TotalProductos,
    SUM(COALESCE(ip.cantidad_stock, 0)) AS StockConsolidado,
    COALESCE((SELECT SUM(stock_base_restante) 
              FROM inventario_entrada_producto 
              WHERE activo IS NULL OR activo = TRUE), 0) AS StockEnEntradas,
    COALESCE((SELECT COUNT(*) 
              FROM inventario_entrada_producto 
              WHERE activo IS NULL OR activo = TRUE), 0) AS TotalEntradas
FROM product p
LEFT JOIN inventario_producto ip ON ip.product_id = p.id
WHERE p.active = TRUE AND p.type_food_id IS NOT NULL;

-- =====================================================
-- 2. PRODUCTOS CON STOCK POSITIVO
-- =====================================================
SELECT '=== PRODUCTOS CON STOCK ===' AS Seccion;

SELECT 
    p.id AS ID,
    p.name AS Producto,
    COALESCE(ip.cantidad_stock, 0) AS StockConsolidado,
    COALESCE(SUM(iep.stock_base_restante), 0) AS StockEnEntradas,
    COUNT(iep.id) AS NumEntradas,
    CASE 
        WHEN ABS(COALESCE(ip.cantidad_stock, 0) - COALESCE(SUM(iep.stock_base_restante), 0)) <= 0.01 
        THEN '✅ OK'
        ELSE '❌ DISCREPANCIA'
    END AS Estado
FROM product p
LEFT JOIN inventario_producto ip ON ip.product_id = p.id
LEFT JOIN inventario_entrada_producto iep ON iep.product_id = p.id
    AND (iep.activo IS NULL OR iep.activo = TRUE)
WHERE p.active = TRUE
  AND p.type_food_id IS NOT NULL
  AND COALESCE(ip.cantidad_stock, 0) > 0
GROUP BY p.id, p.name, ip.cantidad_stock
ORDER BY p.name;

-- =====================================================
-- 3. ENTRADAS CREADAS EN LA MIGRACIÓN
-- =====================================================
SELECT '=== ENTRADAS CREADAS EN MIGRACIÓN ===' AS Seccion;

SELECT 
    p.name AS Producto,
    iep.codigo_lote AS CodigoLote,
    iep.stock_base_restante AS Stock,
    iep.fecha_ingreso AS FechaIngreso,
    iep.observaciones AS Observaciones
FROM inventario_entrada_producto iep
INNER JOIN product p ON p.id = iep.product_id
WHERE (iep.observaciones LIKE '%Migración FEFO%' 
   OR iep.observaciones LIKE '%Ajuste FEFO%')
  AND (iep.activo IS NULL OR iep.activo = TRUE)
ORDER BY p.name;

-- =====================================================
-- 4. PRODUCTOS SIN ENTRADAS (CRÍTICO - DEBE ESTAR VACÍO)
-- =====================================================
SELECT '=== PRODUCTOS SIN ENTRADAS (DEBE ESTAR VACÍO) ===' AS Seccion;

SELECT 
    p.id AS ProductoID,
    p.name AS Producto,
    COALESCE(ip.cantidad_stock, 0) AS StockConsolidado,
    '⚠️ REQUIERE ATENCIÓN' AS Estado
FROM product p
LEFT JOIN inventario_producto ip ON ip.product_id = p.id
WHERE p.active = TRUE
  AND p.type_food_id IS NOT NULL
  AND COALESCE(ip.cantidad_stock, 0) > 0
  AND NOT EXISTS (
      SELECT 1 FROM inventario_entrada_producto iep
      WHERE iep.product_id = p.id
        AND (iep.activo IS NULL OR iep.activo = TRUE)
        AND iep.stock_base_restante > 0
  );

-- =====================================================
-- 5. DISCREPANCIAS PENDIENTES (DEBE ESTAR VACÍO)
-- =====================================================
SELECT '=== DISCREPANCIAS PENDIENTES (DEBE ESTAR VACÍO) ===' AS Seccion;

SELECT 
    p.id AS ProductoID,
    p.name AS Producto,
    COALESCE(ip.cantidad_stock, 0) AS Consolidado,
    COALESCE(SUM(iep.stock_base_restante), 0) AS EnEntradas,
    COALESCE(ip.cantidad_stock, 0) - COALESCE(SUM(iep.stock_base_restante), 0) AS Diferencia,
    '⚠️ REVISAR MANUALMENTE' AS Estado
FROM product p
LEFT JOIN inventario_producto ip ON ip.product_id = p.id
LEFT JOIN inventario_entrada_producto iep ON iep.product_id = p.id
    AND (iep.activo IS NULL OR iep.activo = TRUE)
WHERE p.active = TRUE
  AND p.type_food_id IS NOT NULL
GROUP BY p.id, p.name, ip.cantidad_stock
HAVING ABS(COALESCE(ip.cantidad_stock, 0) - COALESCE(SUM(iep.stock_base_restante), 0)) > 0.01
ORDER BY ABS(Diferencia) DESC;

-- =====================================================
-- 6. ENTRADAS VENCIDAS
-- =====================================================
SELECT '=== ENTRADAS VENCIDAS (INFORMATIVO) ===' AS Seccion;

SELECT 
    p.name AS Producto,
    iep.codigo_lote AS Lote,
    iep.stock_base_restante AS StockVencido,
    iep.fecha_vencimiento AS FechaVencimiento,
    DATEDIFF(CURDATE(), iep.fecha_vencimiento) AS DiasVencidos
FROM inventario_entrada_producto iep
INNER JOIN product p ON p.id = iep.product_id
WHERE (iep.activo IS NULL OR iep.activo = TRUE)
  AND iep.fecha_vencimiento IS NOT NULL
  AND iep.fecha_vencimiento < CURDATE()
  AND iep.stock_base_restante > 0
ORDER BY iep.fecha_vencimiento ASC;

-- =====================================================
-- 7. PRÓXIMOS A VENCER (15 DÍAS)
-- =====================================================
SELECT '=== PRÓXIMOS A VENCER (15 DÍAS) ===' AS Seccion;

SELECT 
    p.name AS Producto,
    iep.codigo_lote AS Lote,
    iep.stock_base_restante AS Stock,
    iep.fecha_vencimiento AS FechaVencimiento,
    DATEDIFF(iep.fecha_vencimiento, CURDATE()) AS DiasRestantes
FROM inventario_entrada_producto iep
INNER JOIN product p ON p.id = iep.product_id
WHERE (iep.activo IS NULL OR iep.activo = TRUE)
  AND iep.fecha_vencimiento IS NOT NULL
  AND iep.fecha_vencimiento >= CURDATE()
  AND iep.fecha_vencimiento <= DATE_ADD(CURDATE(), INTERVAL 15 DAY)
  AND iep.stock_base_restante > 0
ORDER BY iep.fecha_vencimiento ASC;

-- =====================================================
-- 8. MOVIMIENTOS RECIENTES
-- =====================================================
SELECT '=== ÚLTIMOS 10 MOVIMIENTOS ===' AS Seccion;

SELECT 
    DATE_FORMAT(mip.fecha_movimiento, '%Y-%m-%d %H:%i:%s') AS Fecha,
    p.name AS Producto,
    mip.tipo_movimiento AS Tipo,
    mip.cantidad AS Cantidad,
    mip.stock_anterior AS StockAnterior,
    mip.stock_nuevo AS StockNuevo,
    mip.usuario_registro AS Usuario,
    LEFT(mip.observaciones, 50) AS Observaciones
FROM movimiento_inventario_producto mip
INNER JOIN inventario_producto ip ON ip.id = mip.inventario_producto_id
INNER JOIN product p ON p.id = ip.product_id
ORDER BY mip.fecha_movimiento DESC
LIMIT 10;

-- =====================================================
-- 9. VALIDACIÓN FINAL
-- =====================================================
SELECT '=== VALIDACIÓN FINAL ===' AS Seccion;

SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM (
            SELECT p.id
            FROM product p
            LEFT JOIN inventario_producto ip ON ip.product_id = p.id
            LEFT JOIN inventario_entrada_producto iep ON iep.product_id = p.id
                AND (iep.activo IS NULL OR iep.activo = TRUE)
            WHERE p.active = TRUE
              AND p.type_food_id IS NOT NULL
            GROUP BY p.id, ip.cantidad_stock
            HAVING ABS(COALESCE(ip.cantidad_stock, 0) - 
                      COALESCE(SUM(iep.stock_base_restante), 0)) > 0.01
        ) AS discrepancias) = 0 
        THEN '✅ MIGRACIÓN EXITOSA - Todo sincronizado correctamente'
        ELSE '⚠️ ADVERTENCIA - Hay discrepancias pendientes (revisar sección 5)'
    END AS ResultadoFinal;

-- =====================================================
-- 10. RECOMENDACIONES
-- =====================================================
SELECT '=== RECOMENDACIONES ===' AS Seccion;

SELECT 
    'Si hay productos sin entradas en la sección 4, ejecuta:' AS Recomendacion
UNION ALL
SELECT 
    'DELETE FROM inventario_producto WHERE product_id IN (IDs sin entradas);'
UNION ALL
SELECT 
    'Esto limpiará productos fantasma del consolidado.'
UNION ALL
SELECT 
    ''
UNION ALL
SELECT 
    'Si hay discrepancias en la sección 5, verifica manualmente:'
UNION ALL
SELECT 
    '1. Consumos no registrados en entradas'
UNION ALL
SELECT 
    '2. Movimientos manuales directos en BD'
UNION ALL
SELECT 
    '3. Entradas duplicadas o con stock incorrecto';
