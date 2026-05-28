# Migración MySQL → PostgreSQL

## Resumen de cambios realizados

| Archivo | Cambio |
|---|---|
| `pom.xml` | `mysql-connector-j` → `postgresql`, `flyway-mysql` → `flyway-database-postgresql` |
| `application.properties` | URL, driver y dialect actualizados para PostgreSQL |
| `application-local.properties` | URL, driver y dialect actualizados para PostgreSQL |
| `application-production.properties` | URL, driver y dialect actualizados para PostgreSQL |
| `application-local.example.properties` | URL, driver y dialect actualizados para PostgreSQL |
| `db/migration/V1` al `V9` | Sintaxis MySQL → PostgreSQL (ver detalles abajo) |
| `MortalidadRepository.java` | `DATE()` → `CAST(... AS DATE)` |
| `ConsumosLoteController.java` | Nombres de tabla corregidos: `lotes`→`lote`, `races`→`race`, `animals`→`animal` |
| `inventario_tables_create.sql` | Backticks, AUTO_INCREMENT, DATETIME, ENGINE eliminados |
| `inventario_alter_archivado.sql` | DATETIME(6) → TIMESTAMP |

---

## Pasos para crear la base de datos en PostgreSQL

### 1. Instalar PostgreSQL

- Descargar desde https://www.postgresql.org/download/
- Versión recomendada: **PostgreSQL 15** o superior
- Durante la instalación, anotar la contraseña del usuario `postgres`

### 2. Crear la base de datos y el usuario

Abrir **psql** o **pgAdmin** y ejecutar:

```sql
-- Crear usuario de la aplicación
CREATE USER avicola_user WITH PASSWORD 'avicola_password';

-- Crear la base de datos
CREATE DATABASE db_avicola
    WITH OWNER = avicola_user
    ENCODING = 'UTF8'
    LC_COLLATE = 'es_PE.UTF-8'
    LC_CTYPE = 'es_PE.UTF-8'
    TEMPLATE = template0;

-- Otorgar todos los privilegios
GRANT ALL PRIVILEGES ON DATABASE db_avicola TO avicola_user;

-- Conectarse a la base de datos y otorgar permisos de esquema
\c db_avicola
GRANT ALL ON SCHEMA public TO avicola_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO avicola_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO avicola_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO avicola_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO avicola_user;
```

> **Nota para desarrollo local**: Si usas el usuario `postgres` directamente, ajusta
> `application-local.properties`:
> ```properties
> spring.datasource.username=postgres
> spring.datasource.password=TU_CONTRASEÑA_POSTGRES
> ```

### 3. Configurar la aplicación

Editar `src/main/resources/application-local.properties`:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/db_avicola
spring.datasource.username=avicola_user
spring.datasource.password=avicola_password
spring.datasource.driver-class-name=org.postgresql.Driver
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
```

### 4. Ejecutar la aplicación

```bash
# Opción A: Con perfil local
mvn spring-boot:run "-Dspring-boot.run.profiles=local"

# Opción B: Sin perfil (usa application.properties por defecto)
mvn spring-boot:run

# Opción C: JAR compilado
mvn clean package -DskipTests
java -jar target/avicola_backend-0.0.1-SNAPSHOT.jar
```

Hibernate con `ddl-auto=update` creará automáticamente todas las tablas al arrancar.

### 5. Verificar que Flyway está deshabilitado

En `application.properties`:
```properties
spring.flyway.enabled=false
```

> Flyway está deshabilitado intencionalmente. Las tablas las crea Hibernate (`ddl-auto=update`).
> Los scripts en `db/migration/` son de referencia histórica.
> Si deseas activar Flyway en el futuro, asegúrate de que la BD esté vacía antes del primer arranque.

---

## Diferencias clave MySQL → PostgreSQL resueltas

| MySQL | PostgreSQL | Archivos afectados |
|---|---|---|
| `AUTO_INCREMENT` | `BIGSERIAL` / `SERIAL` | V1–V7, scripts raíz |
| `DATETIME(6)` | `TIMESTAMP` | V2, V5, V7, scripts raíz |
| `ENUM('A','B')` inline | `VARCHAR(n) CHECK (col IN ('A','B'))` | V2, V7 |
| `ON UPDATE CURRENT_TIMESTAMP` | Eliminado (JPA `@LastModifiedDate` lo maneja) | V6, V7 |
| `SET FOREIGN_KEY_CHECKS=0` | `SET session_replication_role='replica'` | V3 |
| `MODIFY COLUMN col TYPE NULL` | `ALTER COLUMN col DROP NOT NULL` | V7 |
| `DROP FOREIGN KEY nombre` | `DROP CONSTRAINT IF EXISTS nombre` | V7 |
| `ALTER TABLE t COMMENT='...'` | `COMMENT ON TABLE t IS '...'` | V2, V5, V6 |
| `COMMENT ON COLUMN` inline | `COMMENT ON COLUMN t.c IS '...'` (separado) | V4, V9 |
| `DATE(timestamp_col)` en JPQL | `CAST(col AS date)` | MortalidadRepository |
| `DATE_SUB(NOW(), INTERVAL 30 DAY)` | `NOW() - INTERVAL '30 days'` | V5 |
| `CREATE UNIQUE INDEX IF NOT EXISTS` | Compatible en PostgreSQL ✓ | V8 |
| `UNIQUE KEY nombre (cols)` | `CONSTRAINT nombre UNIQUE (cols)` | V2 |
| `INDEX nombre (col)` inline | `CREATE INDEX nombre ON tabla(col)` | V2, V5, V6, V7 |
| Backticks `` `tabla` `` | Sin comillas o comillas dobles | scripts raíz |
| `ENGINE=InnoDB CHARSET=utf8mb4` | No aplica en PostgreSQL | scripts raíz |
| `INSERT IGNORE INTO` | `INSERT ... ON CONFLICT DO NOTHING` | scripts raíz |
| Tabla `lotes` (nombre incorrecto) | `lote` (nombre real de entidad JPA) | ConsumosLoteController |
| Tabla `races` (nombre incorrecto) | `race` (nombre real de entidad JPA) | ConsumosLoteController |
| Tabla `animals` (nombre incorrecto) | `animal` (nombre real de entidad JPA) | ConsumosLoteController |

---

## Docker Compose para producción (referencia)

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: db_avicola
      POSTGRES_USER: avicola_user
      POSTGRES_PASSWORD: avicola_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: .
    ports:
      - "8088:8088"
    environment:
      SPRING_PROFILES_ACTIVE: production
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: db_avicola
      DB_USER: avicola_user
      DB_PASSWORD: avicola_password
    depends_on:
      - postgres

volumes:
  postgres_data:
```

---

## Migración de datos existentes desde MySQL

Si tienes datos en MySQL que necesitas migrar a PostgreSQL:

1. **Exportar desde MySQL** (sin CREATE TABLE, solo datos):
   ```bash
   mysqldump -u root -p --no-create-info --complete-insert db_avicola > datos_mysql.sql
   ```

2. **Convertir el dump** usando `pgloader` (herramienta recomendada):
   ```bash
   pgloader mysql://root:password@localhost/db_avicola postgresql://avicola_user:avicola_password@localhost/db_avicola
   ```

3. **Alternativa manual**: Usar DBeaver o DataGrip para exportar/importar tabla por tabla.

---

*Migración completada: Feb 2026*
