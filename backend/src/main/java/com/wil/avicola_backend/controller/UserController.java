package com.wil.avicola_backend.controller;

import com.wil.avicola_backend.dto.PasswordChangeDto;
import com.wil.avicola_backend.dto.RegisterRequestDto;
import com.wil.avicola_backend.dto.UserDto;
import com.wil.avicola_backend.model.Usuario;
import com.wil.avicola_backend.model.ERole;
import com.wil.avicola_backend.security.services.UserDetailsImpl;
import com.wil.avicola_backend.service.UserService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Controlador para la gestión de usuarios del sistema.
 * 
 * Nota: A pesar de que la ruta es "/api/users", este controlador trabaja exclusivamente 
 * con la entidad Usuario y la tabla `usuarios` de la base de datos.
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class UserController {
    
    private static final Logger logger = LoggerFactory.getLogger(UserController.class);
    private final UserService userService;
    private final PasswordEncoder passwordEncoder;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserDto>> getAllUsers() {
        try {
            logger.info("Obteniendo todos los usuarios");
            List<UserDto> users = userService.getAllUsers();
            return ResponseEntity.ok(users);
        } catch (Exception e) {
            logger.error("Error al obtener usuarios", e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, 
                "Error al obtener usuarios: " + e.getMessage());
        }
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @userSecurity.isUserSelf(authentication, #id)")
    public ResponseEntity<UserDto> getUserById(@PathVariable Long id) {
        UserDto user = userService.getUserById(id);
        return new ResponseEntity<>(user, HttpStatus.OK);
    }

    @GetMapping("/me")
    public ResponseEntity<UserDto> getCurrentUser(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        logger.info("[PERFIL] getCurrentUser: username={}, id={}", userDetails.getUsername(), userDetails.getId());
        UserDto user = userService.getUserByUsername(userDetails.getUsername());
        logger.info("[PERFIL] UserDto retornado: {}", user);
        return new ResponseEntity<>(user, HttpStatus.OK);
    }    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createUser(@Valid @RequestBody RegisterRequestDto userRequest) {
        try {
            logger.info("Creando nuevo usuario: {}", userRequest.getUsername());
            
            // Validaciones
            List<String> errors = new ArrayList<>();
            if (userRequest.getUsername() == null || userRequest.getUsername().trim().isEmpty()) {
                errors.add("El nombre de usuario es requerido");
            }
            if (userRequest.getPassword() == null || userRequest.getPassword().trim().isEmpty()) {
                errors.add("La contraseña es requerida");
            }
            
            if (!errors.isEmpty()) {
                logger.warn("Validación fallida para crear usuario: {}", errors);
                return ResponseEntity.badRequest().body(Map.of("errors", errors));
            }            // Crear usuario
            Usuario newUser = new Usuario();
            newUser.setUsername(userRequest.getUsername().trim());
            newUser.setEmail(userRequest.getEmail());
            newUser.setPassword(passwordEncoder.encode(userRequest.getPassword()));
            newUser.setName(userRequest.getName());
            newUser.setPhone(userRequest.getPhone());
            newUser.setActive(true);
            newUser.setProfilePicture(userRequest.getProfilePicture());
            // Convertir String a ERole (normalizando el nombre)
            Set<ERole> roles = userRequest.getRoles().stream()
                    .map(roleName -> {
                        String normalized = roleName.startsWith("ROLE_") ? roleName : ("ROLE_" + roleName);
                        return ERole.valueOf(normalized);
                    })
                    .collect(Collectors.toSet());
            
            UserDto createdUser = userService.createUser(newUser, roles);
            logger.info("Usuario creado exitosamente: {}", createdUser.getUsername());
            return ResponseEntity.status(HttpStatus.CREATED).body(createdUser);
            
        } catch (Exception e) {
            logger.error("Error al crear usuario", e);
            Map<String, String> response = new HashMap<>();
            response.put("error", "Error al crear usuario");
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @userSecurity.isUserSelf(authentication, #id)")
    public ResponseEntity<UserDto> updateUser(@PathVariable Long id, 
                                            @Valid @RequestBody UserDto userDto) {        
        logger.info("Actualizando usuario: {} (ID: {})", userDto.getUsername(), id);
        if (userDto.getPassword() != null) {
            logger.info("Password recibido en updateUser, longitud: {}", userDto.getPassword().length());
        } else {
            logger.info("Password no recibido en updateUser");
        }
        Usuario userToUpdate = new Usuario();
        userToUpdate.setUsername(userDto.getUsername());
        userToUpdate.setEmail(userDto.getEmail());
        userToUpdate.setName(userDto.getName());
        userToUpdate.setPhone(userDto.getPhone());
        userToUpdate.setActive(userDto.isActive());
        userToUpdate.setProfilePicture(userDto.getProfilePicture());
        userToUpdate.setPassword(userDto.getPassword());

        Set<ERole> roles = userDto.getRoles().stream()
                .map(roleName -> {
                    String normalized = roleName.startsWith("ROLE_") ? roleName : ("ROLE_" + roleName);
                    return ERole.valueOf(normalized);
                })
                .collect(Collectors.toSet());
        
        UserDto updatedUser = userService.updateUser(id, userToUpdate, roles);
        return new ResponseEntity<>(updatedUser, HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    @PostMapping("/{id}/toggle-status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> toggleUserStatus(@PathVariable Long id) {
        userService.toggleUserStatus(id);
        return new ResponseEntity<>(HttpStatus.OK);
    }
    
    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@Valid @RequestBody PasswordChangeDto passwordChangeDto) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        // Verificar contraseña actual
        if (!passwordEncoder.matches(passwordChangeDto.getCurrentPassword(), userDetails.getPassword())) {
            return ResponseEntity.badRequest().body(Map.of("message", "La contraseña actual es incorrecta"));
        }
        
        // Verificar que las nuevas contraseñas coincidan
        if (!passwordChangeDto.getNewPassword().equals(passwordChangeDto.getConfirmPassword())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Las nuevas contraseñas no coinciden"));
        }
        
        userService.updatePassword(userDetails.getId(), passwordChangeDto.getNewPassword());
        return ResponseEntity.ok(Map.of("message", "Contraseña actualizada exitosamente"));
    }

    @PutMapping("/{id}/profile-picture")
    @PreAuthorize("hasRole('ADMIN') or @userSecurity.isUserSelf(authentication, #id)")
    public ResponseEntity<?> updateProfilePicture(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        try {
            String profilePicture = request.get("profilePicture");
            if (profilePicture == null || profilePicture.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "La URL de la imagen es requerida"));
            }

            logger.info("Actualizando imagen de perfil para usuario ID {}: {}", id, profilePicture);
            UserDto updatedUser = userService.updateProfilePicture(id, profilePicture);
            return ResponseEntity.ok(updatedUser);
        } catch (Exception e) {
            logger.error("Error al actualizar imagen de perfil", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Error al actualizar imagen de perfil: " + e.getMessage()));
        }
    }
}
