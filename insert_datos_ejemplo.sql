-- Script para insertar datos de ejemplo en el sistema de alimentación
-- Ejecutar en MySQL para poblar las tablas con datos de prueba

-- Verificar que existan animales (pollos y chanchos)
INSERT IGNORE INTO animal (id, name, create_date, update_date) VALUES 
(1, 'Pollos', NOW(), NOW()),
(2, 'Chanchos', NOW(), NOW());

-- Verificar que exista al menos un usuario
INSERT IGNORE INTO usuarios (id, name, email, password, role, create_date, update_date) VALUES 
(1, 'Usuario Admin', 'admin@avicola.com', '$2a$10$encrypted_password', 'ROLE_ADMIN', NOW(), NOW());

-- Verificar que existan productos de alimento
INSERT IGNORE INTO product (id, name, name_stage, quantity, price_unit, level_max, level_min, animal_id, create_date, update_date) VALUES 
(1, 'Concentrado Inicial Pollos', 'Iniciación', 1000, 2.50, 100, 10, 1, NOW(), NOW()),
(2, 'Concentrado Crecimiento Pollos', 'Crecimiento', 1000, 2.30, 100, 10, 1, NOW(), NOW()),
(3, 'Concentrado Acabado Pollos', 'Acabado', 1000, 2.20, 100, 10, 1, NOW(), NOW()),
(4, 'Concentrado Inicial Chanchos', 'Iniciación', 1000, 3.00, 100, 10, 2, NOW(), NOW()),
(5, 'Concentrado Crecimiento Chanchos', 'Crecimiento', 1000, 2.80, 100, 10, 2, NOW(), NOW());

-- Crear plan de alimentación para pollos
INSERT IGNORE INTO plan_alimentacion (id, name, description, animal_id, created_by_user_id, active, create_date, update_date) VALUES 
(1, 'Plan Estándar Pollos de Engorde', 'Plan de alimentación completo para pollos de engorde desde 1 día hasta 42 días', 1, 1, true, NOW(), NOW()),
(2, 'Plan Estándar Chanchos', 'Plan de alimentación para chanchos desde destete hasta engorde', 2, 1, true, NOW(), NOW());

-- Crear detalles del plan para pollos (etapas por rangos de días)
INSERT IGNORE INTO plan_detalle (id, plan_id, day_start, day_end, product_id, quantity_per_animal, frequency, instructions, create_date, update_date) VALUES 
-- Pollos: Etapa Inicial (1-14 días)
(1, 1, 1, 14, 1, 0.050, 'DIARIA', 'Concentrado inicial, alimentar 3 veces al día', NOW(), NOW()),
-- Pollos: Etapa Crecimiento (15-28 días)
(2, 1, 15, 28, 2, 0.120, 'DIARIA', 'Concentrado de crecimiento, alimentar 2 veces al día', NOW(), NOW()),
-- Pollos: Etapa Acabado (29-42 días)
(3, 1, 29, 42, 3, 0.180, 'DIARIA', 'Concentrado de acabado, alimentar 2 veces al día', NOW(), NOW()),
-- Chanchos: Etapa Inicial (1-30 días)
(4, 2, 1, 30, 4, 0.80, 'DIARIA', 'Concentrado inicial para lechones', NOW(), NOW()),
-- Chanchos: Etapa Crecimiento (31-90 días)
(5, 2, 31, 90, 5, 2.50, 'DIARIA', 'Concentrado de crecimiento', NOW(), NOW());

-- Verificar que existan razas
INSERT IGNORE INTO race (id, name, animal_id, create_date, update_date) VALUES 
(1, 'Broiler Ross 308', 1, NOW(), NOW()),
(2, 'Yorkshire', 2, NOW(), NOW());

-- Crear lotes de ejemplo
INSERT IGNORE INTO lote (id, codigo, name, quantity, birthdate, race_id, create_date, update_date) VALUES 
('L001', '00001', 'Lote Pollos A - Enero 2025', 100, '2025-06-18', 1, NOW(), NOW()),
('L002', '00002', 'Lote Pollos B - Enero 2025', 150, '2025-06-15', 1, NOW(), NOW()),
('L003', '00003', 'Lote Chanchos A - Enero 2025', 50, '2025-06-10', 2, NOW(), NOW());

-- Crear asignaciones de planes a lotes
INSERT IGNORE INTO plan_asignacion (id, plan_id, lote_id, assigned_user_id, assigned_by_user_id, start_date, status, create_date, update_date) VALUES 
(1, 1, 'L001', 1, 1, '2025-06-18', 'ACTIVO', NOW(), NOW()),
(2, 1, 'L002', 1, 1, '2025-06-15', 'ACTIVO', NOW(), NOW()),
(3, 2, 'L003', 1, 1, '2025-06-10', 'ACTIVO', NOW(), NOW());

-- Verificar datos insertados
SELECT 'RESUMEN DE DATOS INSERTADOS' as mensaje;
SELECT 'Animales:' as tabla, COUNT(*) as registros FROM animal;
SELECT 'Productos:' as tabla, COUNT(*) as registros FROM product;
SELECT 'Planes:' as tabla, COUNT(*) as registros FROM plan_alimentacion;
SELECT 'Detalles:' as tabla, COUNT(*) as registros FROM plan_detalle;
SELECT 'Lotes:' as tabla, COUNT(*) as registros FROM lote;
SELECT 'Asignaciones:' as tabla, COUNT(*) as registros FROM plan_asignacion;

-- Mostrar estructura de los planes creados
SELECT 
    pa.name as plan_nombre,
    a.name as animal,
    pd.day_start,
    pd.day_end,
    p.name as producto,
    pd.quantity_per_animal,
    pd.frequency
FROM plan_alimentacion pa
JOIN animal a ON pa.animal_id = a.id
JOIN plan_detalle pd ON pa.id = pd.plan_id
JOIN product p ON pd.product_id = p.id
ORDER BY pa.id, pd.day_start;
