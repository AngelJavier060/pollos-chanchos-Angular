-- Crear la tabla users si no existe
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(120) NOT NULL,
    name VARCHAR(100),
    phone VARCHAR(15),
    profile_picture VARCHAR(255),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP,
    last_login_date TIMESTAMP
);

-- Migrar datos de usuarios a users (solo si la tabla usuarios existe)
INSERT INTO users (id, username, email, password, name, phone, profile_picture, active, created_at, last_login_date)
SELECT id, username, email, password, name, phone, profile_picture, active, created_at, last_login_date
FROM usuarios
ON CONFLICT (id) DO NOTHING;

-- Actualizar la tabla user_roles para que apunte a la nueva tabla users
-- (asumiendo que la tabla user_roles existe y tiene las columnas user_id y role_id)
-- No es necesario migrar datos de user_roles ya que los IDs se mantienen igual

-- Eliminar la tabla antigua después de verificar que la migración fue exitosa
-- DROP TABLE usuarios;
