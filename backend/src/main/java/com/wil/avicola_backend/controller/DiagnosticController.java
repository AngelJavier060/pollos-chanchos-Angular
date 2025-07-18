package com.wil.avicola_backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.wil.avicola_backend.model.*;
import com.wil.avicola_backend.repository.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import jakarta.transaction.Transactional;

@RestController
@RequestMapping("/api/diagnostic")
@CrossOrigin(origins = "http://localhost:4200")
public class DiagnosticController {
    private static final Logger logger = LoggerFactory.getLogger(DiagnosticController.class);

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @GetMapping("/system-check")
    public ResponseEntity<?> checkSystem() {
        Map<String, Object> response = new HashMap<>();
        Map<String, Object> details = new HashMap<>();
        boolean hasErrors = false;

        // Verificar roles
        try {
            List<Role> roles = roleRepository.findAll();
            details.put("rolesCount", roles.size());
            details.put("availableRoles", roles.stream()
                .map(role -> role.getName().name())
                .toList());
            
            // Verificar si faltan roles
            List<ERole> missingRoles = new ArrayList<>();
            for (ERole role : ERole.values()) {
                if (roles.stream().noneMatch(r -> r.getName() == role)) {
                    missingRoles.add(role);
                    hasErrors = true;
                }
            }
            details.put("missingRoles", missingRoles);
        } catch (Exception e) {
            details.put("rolesError", e.getMessage());
            hasErrors = true;
        }

        // Verificar usuario admin
        try {
            Optional<Usuario> adminUser = usuarioRepository.findByUsername("admin");
            if (adminUser.isPresent()) {
                Usuario admin = adminUser.get();
                Map<String, Object> adminDetails = new HashMap<>();
                adminDetails.put("exists", true);
                adminDetails.put("active", admin.isActive());
                adminDetails.put("roles", admin.getRoles().stream()
                    .map(role -> role.getName().name())
                    .toList());
                adminDetails.put("email", admin.getEmail());
                details.put("adminUser", adminDetails);

                if (!admin.isActive()) {
                    hasErrors = true;
                }
            } else {
                details.put("adminUser", Map.of("exists", false));
                hasErrors = true;
            }
        } catch (Exception e) {
            details.put("adminError", e.getMessage());
            hasErrors = true;
        }

        response.put("status", hasErrors ? "errors_detected" : "healthy");
        response.put("details", details);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/fix-roles")
    @Transactional
    public ResponseEntity<?> fixRoles() {
        Map<String, Object> response = new HashMap<>();
        List<String> fixes = new ArrayList<>();

        try {
            // Crear o actualizar todos los roles necesarios
            for (ERole roleType : ERole.values()) {
                Role role = roleRepository.findByName(roleType)
                    .orElseGet(() -> {
                        Role newRole = new Role();
                        newRole.setName(roleType);
                        fixes.add("Creado rol: " + roleType);
                        return roleRepository.save(newRole);
                    });
            }

            response.put("status", "success");
            response.put("message", "Roles verificados y corregidos");
            response.put("fixes", fixes);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error al corregir roles", e);
            response.put("status", "error");
            response.put("message", "Error al corregir roles: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @PostMapping("/fix-admin")
    @Transactional
    public ResponseEntity<?> fixAdminUser() {
        Map<String, Object> response = new HashMap<>();
        List<String> fixes = new ArrayList<>();

        try {
            // Asegurarse de que existe el rol ADMIN
            Role adminRole = roleRepository.findByName(ERole.ROLE_ADMIN)
                .orElseGet(() -> {
                    Role newRole = new Role();
                    newRole.setName(ERole.ROLE_ADMIN);
                    fixes.add("Creado rol ADMIN");
                    return roleRepository.save(newRole);
                });

            // Buscar o crear el usuario admin
            Usuario admin = usuarioRepository.findByUsername("admin")
                .orElse(new Usuario());

            if (admin.getId() == null) {
                fixes.add("Creado nuevo usuario admin");
            }

            // Configurar el usuario admin
            admin.setUsername("admin");
            admin.setEmail("elvia2@granja-elvita.com");
            admin.setPassword(passwordEncoder.encode("Admin2025*"));
            admin.setActive(true);
            
            // Asignar rol admin
            Set<Role> roles = new HashSet<>();
            roles.add(adminRole);
            admin.setRoles(roles);

            // Guardar el usuario
            admin = usuarioRepository.save(admin);
            fixes.add("Usuario admin configurado y activado");

            response.put("status", "success");
            response.put("message", "Usuario admin configurado correctamente");
            response.put("fixes", fixes);
            response.put("user", Map.of(
                "username", admin.getUsername(),
                "email", admin.getEmail(),
                "active", admin.isActive(),
                "roles", admin.getRoles().stream()
                    .map(role -> role.getName().name())
                    .toList()
            ));
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error al configurar usuario admin", e);
            response.put("status", "error");
            response.put("message", "Error al configurar usuario admin: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @PostMapping("/fix-all")
    @Transactional
    public ResponseEntity<?> fixAll() {
        Map<String, Object> response = new HashMap<>();
        List<String> allFixes = new ArrayList<>();

        try {
            // Primero arreglar roles
            ResponseEntity<?> rolesResponse = fixRoles();
            if (rolesResponse.getBody() instanceof Map) {
                @SuppressWarnings("unchecked")
                List<String> rolesFixes = (List<String>) ((Map<String, Object>) rolesResponse.getBody()).get("fixes");
                if (rolesFixes != null) {
                    allFixes.addAll(rolesFixes);
                }
            }

            // Luego arreglar admin
            ResponseEntity<?> adminResponse = fixAdminUser();
            if (adminResponse.getBody() instanceof Map) {
                @SuppressWarnings("unchecked")
                List<String> adminFixes = (List<String>) ((Map<String, Object>) adminResponse.getBody()).get("fixes");
                if (adminFixes != null) {
                    allFixes.addAll(adminFixes);
                }
            }

            response.put("status", "success");
            response.put("message", "Sistema corregido completamente");
            response.put("fixes", allFixes);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error al corregir el sistema", e);
            response.put("status", "error");
            response.put("message", "Error al corregir el sistema: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
}
