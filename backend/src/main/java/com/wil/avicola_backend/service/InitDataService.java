package com.wil.avicola_backend.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;

import com.wil.avicola_backend.repository.AnimalRepository;
import com.wil.avicola_backend.repository.LoteRepository;
import com.wil.avicola_backend.repository.PlanAlimentacionRepository;
import com.wil.avicola_backend.repository.PlanAsignacionRepository;
import com.wil.avicola_backend.repository.PlanDetalleRepository;
import com.wil.avicola_backend.repository.ProductRepository;
import com.wil.avicola_backend.repository.RaceRepository;
import com.wil.avicola_backend.repository.UsuarioRepository;

/**
 * Servicio para inicializar datos de ejemplo en el sistema
 * Versión simplificada para evitar problemas de tipos
 */
@Service
@Transactional
public class InitDataService {
    
    @Autowired
    private AnimalRepository animalRepository;
    
    @Autowired
    private ProductRepository productRepository;
    
    @Autowired
    private PlanAlimentacionRepository planAlimentacionRepository;
    
    @Autowired
    private PlanDetalleRepository planDetalleRepository;
    
    @Autowired
    private RaceRepository raceRepository;
    
    @Autowired
    private LoteRepository loteRepository;
    
    @Autowired
    private PlanAsignacionRepository planAsignacionRepository;
    
    @Autowired
    private UsuarioRepository usuarioRepository;
    
    @Autowired
    private JdbcTemplate jdbcTemplate;
    
    /**
     * Verificar datos existentes en el sistema
     */
    public ResponseEntity<Object> checkExistingData() {
        Map<String, Object> result = new HashMap<>();
        
        try {
            result.put("animales", animalRepository.count());
            result.put("productos", productRepository.count());
            result.put("planes", planAlimentacionRepository.count());
            result.put("detalles", planDetalleRepository.count());
            result.put("razas", raceRepository.count());
            result.put("lotes", loteRepository.count());
            result.put("asignaciones", planAsignacionRepository.count());
            result.put("usuarios", usuarioRepository.count());
            result.put("timestamp", LocalDateTime.now());
            result.put("status", "success");
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            result.put("error", e.getMessage());
            result.put("status", "error");
            return ResponseEntity.ok(result);
        }
    }
    
    /**
     * Inicializar datos de ejemplo mediante SQL directo
     */
    public ResponseEntity<Object> initializeExampleData() {
        Map<String, Object> result = new HashMap<>();
        
        try {
            // Crear las asignaciones que faltan
            createPlanAssignments();
            
            result.put("message", "Datos de ejemplo inicializados correctamente");
            result.put("status", "success");
            result.put("timestamp", LocalDateTime.now());
            
            // Verificar conteos finales
            result.put("current_counts", Map.of(
                "animales", animalRepository.count(),
                "productos", productRepository.count(),
                "planes", planAlimentacionRepository.count(),
                "detalles", planDetalleRepository.count(),
                "razas", raceRepository.count(),
                "lotes", loteRepository.count(),
                "asignaciones", planAsignacionRepository.count()
            ));
            
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            result.put("error", e.getMessage());
            result.put("status", "error");
            result.put("details", e.toString());
            return ResponseEntity.ok(result);
        }
    }
    
    /**
     * Limpiar todos los datos (solo para desarrollo)
     */
    public ResponseEntity<Object> clearAllData() {
        Map<String, Object> result = new HashMap<>();
        
        try {
            planAsignacionRepository.deleteAll();
            loteRepository.deleteAll();
            raceRepository.deleteAll();
            planDetalleRepository.deleteAll();
            planAlimentacionRepository.deleteAll();
            productRepository.deleteAll();
            animalRepository.deleteAll();
            
            result.put("message", "Todos los datos eliminados");
            result.put("status", "success");
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            result.put("error", e.getMessage());
            result.put("status", "error");
            return ResponseEntity.ok(result);
        }
    }
    
    /**
     * Setup completo del sistema
     */
    public ResponseEntity<Object> setupSystem() {
        Map<String, Object> result = new HashMap<>();
        
        try {
            // Verificar si ya existen asignaciones
            long asignaciones = planAsignacionRepository.count();
            
            if (asignaciones > 0) {
                result.put("message", "El sistema ya tiene asignaciones inicializadas");
                result.put("status", "already_initialized");
                result.put("existing_assignments", asignaciones);
                return ResponseEntity.ok(result);
            }
            
            // Si no hay asignaciones, crearlas
            return initializeExampleData();
            
        } catch (Exception e) {
            result.put("error", e.getMessage());
            result.put("status", "error");
            return ResponseEntity.ok(result);
        }
    }
    
    /**
     * Crear asignaciones de planes usando SQL directo con IDs reales
     */
    private void createPlanAssignments() {
        try {
            // Obtener planes y lotes de pollos (animal_id/race_id = 1)
            String planPollos = "18"; // Plan 1-20 dias para pollos
            String lotePollos1 = "0f2a23f9-5580-4202-9b1a-a356c62d4123"; // Lote002
            String lotePollos2 = "753cf6a3-7266-4fb6-99d1-c4f141889442"; // Lote001
            
            // Obtener planes y lotes de chanchos (animal_id/race_id = 2)
            String planChanchos = "14"; // Plan 1-20 para chanchos
            String loteChanchos1 = "47ec9c8b-9ca3-4bd8-a0a7-5d333be85888"; // Lote 002
            String loteChanchos2 = "8ee9adaa-48a7-418a-8f9e-cfab8c668dbd"; // Lote001
            
            // Asignación 1: Plan de pollos al primer lote de pollos
            jdbcTemplate.update(
                "INSERT IGNORE INTO plan_asignacion (plan_id, lote_id, assigned_user_id, assigned_by_user_id, start_date, status, create_date, update_date) " +
                "VALUES (?, ?, 1, 1, '2025-01-18', 'ACTIVO', NOW(), NOW())",
                planPollos, lotePollos1
            );
            
            // Asignación 2: Plan de pollos al segundo lote de pollos
            jdbcTemplate.update(
                "INSERT IGNORE INTO plan_asignacion (plan_id, lote_id, assigned_user_id, assigned_by_user_id, start_date, status, create_date, update_date) " +
                "VALUES (?, ?, 1, 1, '2025-01-15', 'ACTIVO', NOW(), NOW())",
                planPollos, lotePollos2
            );
            
            // Asignación 3: Plan de chanchos al primer lote de chanchos
            jdbcTemplate.update(
                "INSERT IGNORE INTO plan_asignacion (plan_id, lote_id, assigned_user_id, assigned_by_user_id, start_date, status, create_date, update_date) " +
                "VALUES (?, ?, 1, 1, '2025-01-10', 'ACTIVO', NOW(), NOW())",
                planChanchos, loteChanchos1
            );
            
            // Asignación 4: Plan de chanchos al segundo lote de chanchos
            jdbcTemplate.update(
                "INSERT IGNORE INTO plan_asignacion (plan_id, lote_id, assigned_user_id, assigned_by_user_id, start_date, status, create_date, update_date) " +
                "VALUES (?, ?, 1, 1, '2025-01-12', 'ACTIVO', NOW(), NOW())",
                planChanchos, loteChanchos2
            );
            
        } catch (Exception e) {
            throw new RuntimeException("Error creando asignaciones: " + e.getMessage(), e);
        }
    }
    
    /**
     * Debug: Mostrar datos actuales en la base de datos
     */
    public ResponseEntity<Object> debugCurrentData() {
        Map<String, Object> result = new HashMap<>();
        
        try {
            // Consultar planes existentes
            result.put("planes", jdbcTemplate.queryForList(
                "SELECT id, name, animal_id FROM plan_alimentacion"
            ));
            
            // Consultar lotes existentes  
            result.put("lotes", jdbcTemplate.queryForList(
                "SELECT id, name, race_id FROM lote"
            ));
            
            // Consultar asignaciones existentes
            result.put("asignaciones", jdbcTemplate.queryForList(
                "SELECT id, plan_id, lote_id, assigned_user_id, status FROM plan_asignacion"
            ));
            
            // Consultar usuarios
            result.put("usuarios", jdbcTemplate.queryForList(
                "SELECT id, username, email FROM usuarios LIMIT 5"
            ));
            
            result.put("status", "success");
            result.put("timestamp", LocalDateTime.now());
            
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            result.put("error", e.getMessage());
            result.put("status", "error");
            result.put("details", e.toString());
            return ResponseEntity.ok(result);
        }
    }
}
