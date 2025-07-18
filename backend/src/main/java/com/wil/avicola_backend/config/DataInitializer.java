package com.wil.avicola_backend.config;

import com.wil.avicola_backend.model.ERole;
import com.wil.avicola_backend.model.Role;
import com.wil.avicola_backend.model.Usuario;
import com.wil.avicola_backend.repository.RoleRepository;
import com.wil.avicola_backend.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Component
@Profile("!test") // No ejecutar durante pruebas
public class DataInitializer implements CommandLineRunner {
    private static final Logger logger = LoggerFactory.getLogger(DataInitializer.class);

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        try {
            logger.info("Iniciando la verificación y carga de datos iniciales...");
            
            // Siempre asegurar que los roles existan
            initializeRoles();

            // Siempre asegurar que el usuario admin exista
            ensureAdminUserExists();

            logger.info("Verificación de datos iniciales completada.");

        } catch (Exception e) {
            logger.error("Error crítico durante la inicialización de datos: {}", e.getMessage(), e);
            throw new RuntimeException("Error crítico durante la inicialización de datos", e);
        }
    }

    private void initializeRoles() {
        logger.info("Inicializando roles...");
        try {
            for (ERole roleEnum : ERole.values()) {
                if (!roleRepository.findByName(roleEnum).isPresent()) {
                    Role role = new Role(roleEnum);
                    roleRepository.save(role);
                    logger.info("Rol creado: {}", roleEnum);
                }
            }
        } catch (Exception e) {
            logger.error("Error al inicializar roles: {}", e.getMessage(), e);
            throw e;
        }
    }

    private void ensureAdminUserExists() {
        final String adminUsername = "admin";
        Optional<Usuario> adminOptional = usuarioRepository.findByUsername(adminUsername);

        if (!adminOptional.isPresent()) {
            logger.info("El usuario '{}' no existe, procediendo a crearlo...", adminUsername);
            try {
                Role adminRole = roleRepository.findByName(ERole.ROLE_ADMIN)
                        .orElseThrow(() -> new RuntimeException("Error: Rol ROLE_ADMIN no encontrado."));

                Usuario adminUser = new Usuario();
                adminUser.setUsername(adminUsername);
                adminUser.setEmail("admin@granja-elvita.com");
                adminUser.setPassword(passwordEncoder.encode("Admin2025*"));
                adminUser.setRoles(Collections.singleton(adminRole));
                adminUser.setActive(true);
                
                usuarioRepository.save(adminUser);
                logger.info("Usuario '{}' creado exitosamente.", adminUsername);
            } catch (Exception e) {
                logger.error("No se pudo crear el usuario '{}': {}", adminUsername, e.getMessage(), e);
                throw new RuntimeException("Falla crítica: no se pudo crear el usuario administrador.", e);
            }
        } else {
            Usuario adminUser = adminOptional.get();
            boolean needsUpdate = false;
            if (!adminUser.isActive()) {
                adminUser.setActive(true);
                needsUpdate = true;
                logger.info("El usuario '{}' estaba inactivo. Se ha activado.", adminUsername);
            }
            // Opcional: verificar si tiene el rol de administrador
            boolean hasAdminRole = adminUser.getRoles().stream()
                .anyMatch(role -> role.getName().equals(ERole.ROLE_ADMIN));
            if (!hasAdminRole) {
                 Role adminRole = roleRepository.findByName(ERole.ROLE_ADMIN)
                        .orElseThrow(() -> new RuntimeException("Error: Rol ROLE_ADMIN no encontrado."));
                Set<Role> roles = new HashSet<>(adminUser.getRoles());
                roles.add(adminRole);
                adminUser.setRoles(roles);
                needsUpdate = true;
                logger.info("Al usuario '{}' le faltaba el rol de administrador. Se ha añadido.", adminUsername);
            }
            
            if (needsUpdate) {
                usuarioRepository.save(adminUser);
                logger.info("El usuario '{}' ha sido actualizado.", adminUsername);
            } else {
                logger.info("El usuario 'admin' ya existe y está configurado correctamente.");
            }
        }
    }
}
