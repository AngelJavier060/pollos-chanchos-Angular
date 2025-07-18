package com.wil.avicola_backend.controller;

import com.wil.avicola_backend.model.ERole;
import com.wil.avicola_backend.model.Role;
import com.wil.avicola_backend.model.Usuario;
import com.wil.avicola_backend.repository.RoleRepository;
import com.wil.avicola_backend.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/admin/tools")
public class AdminToolsController {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @Autowired
    private DataSource dataSource;

    @GetMapping("/check-admin")
    public ResponseEntity<?> checkAndFixAdminUser() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // 1. Verificar si existe el usuario admin
            Usuario adminUser = usuarioRepository.findByUsername("admin").orElse(null);
            
            if (adminUser == null) {
                // Crear usuario admin si no existe
                adminUser = new Usuario();
                adminUser.setUsername("admin");
                adminUser.setEmail("admin@granja-elvita.com");
                adminUser.setPassword(passwordEncoder.encode("Admin2025*"));
                adminUser.setActive(true);
                
                // Asegurar que existe el rol ADMIN
                Role adminRole = roleRepository.findByName(ERole.ROLE_ADMIN)
                    .orElseGet(() -> {
                        Role newRole = new Role(ERole.ROLE_ADMIN);
                        return roleRepository.save(newRole);
                    });
                
                Set<Role> roles = new HashSet<>();
                roles.add(adminRole);
                adminUser.setRoles(roles);
                
                adminUser = usuarioRepository.save(adminUser);
                response.put("message", "Usuario admin creado exitosamente");
            } else {
                // Verificar y actualizar el estado si es necesario
                if (!adminUser.isActive()) {
                    adminUser.setActive(true);
                    adminUser = usuarioRepository.save(adminUser);
                    response.put("message", "Usuario admin activado exitosamente");
                } else {
                    response.put("message", "Usuario admin ya existe y está activo");
                }
            }
            
            response.put("status", "success");
            response.put("adminUser", Map.of(
                "id", adminUser.getId(),
                "username", adminUser.getUsername(),
                "email", adminUser.getEmail(),
                "active", adminUser.isActive()
            ));
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("status", "error");
            response.put("message", "Error: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
    
    @PostMapping("/clean-plan-detalle")
    public ResponseEntity<?> cleanPlanDetalle(@RequestParam(required = false) Long planId) {
        Map<String, Object> response = new HashMap<>();
        
        try (Connection connection = dataSource.getConnection()) {
            
            // Contar registros antes de eliminar
            String countQuery = planId != null 
                ? "SELECT COUNT(*) FROM plan_detalle WHERE plan_id = ?"
                : "SELECT COUNT(*) FROM plan_detalle";
            
            int totalBefore = 0;
            try (PreparedStatement countStmt = connection.prepareStatement(countQuery)) {
                if (planId != null) {
                    countStmt.setLong(1, planId);
                }
                ResultSet rs = countStmt.executeQuery();
                if (rs.next()) {
                    totalBefore = rs.getInt(1);
                }
            }
            
            // Eliminar registros
            String deleteQuery = planId != null 
                ? "DELETE FROM plan_detalle WHERE plan_id = ?"
                : "DELETE FROM plan_detalle";
            
            int deletedRows = 0;
            try (PreparedStatement deleteStmt = connection.prepareStatement(deleteQuery)) {
                if (planId != null) {
                    deleteStmt.setLong(1, planId);
                }
                deletedRows = deleteStmt.executeUpdate();
            }
            
            response.put("status", "success");
            response.put("message", "Datos de plan_detalle eliminados exitosamente");
            response.put("planId", planId);
            response.put("totalBefore", totalBefore);
            response.put("deletedRows", deletedRows);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("status", "error");
            response.put("message", "Error al eliminar datos: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
    
    @GetMapping("/count-plan-detalle")
    public ResponseEntity<?> countPlanDetalle() {
        Map<String, Object> response = new HashMap<>();
        
        try (Connection connection = dataSource.getConnection()) {
            
            // Contar total de registros
            String countTotalQuery = "SELECT COUNT(*) FROM plan_detalle";
            int totalRecords = 0;
            try (PreparedStatement stmt = connection.prepareStatement(countTotalQuery)) {
                ResultSet rs = stmt.executeQuery();
                if (rs.next()) {
                    totalRecords = rs.getInt(1);
                }
            }
            
            // Contar por plan
            String countByPlanQuery = """
                SELECT 
                    p.id as plan_id,
                    p.name as plan_name,
                    COUNT(pd.id) as total_detalles
                FROM plan_alimentacion p
                LEFT JOIN plan_detalle pd ON p.id = pd.plan_id
                GROUP BY p.id, p.name
                ORDER BY p.id
            """;
            
            Map<String, Object> planDetails = new HashMap<>();
            try (PreparedStatement stmt = connection.prepareStatement(countByPlanQuery)) {
                ResultSet rs = stmt.executeQuery();
                while (rs.next()) {
                    planDetails.put(rs.getString("plan_name"), rs.getInt("total_detalles"));
                }
            }
            
            response.put("status", "success");
            response.put("totalRecords", totalRecords);
            response.put("planDetails", planDetails);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("status", "error");
            response.put("message", "Error al contar datos: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
}
