package com.wil.avicola_backend.controller;

import com.wil.avicola_backend.dto.LoginRequestDto;
import com.wil.avicola_backend.dto.LoginResponseDto;
import com.wil.avicola_backend.dto.RegisterRequestDto;
import com.wil.avicola_backend.dto.UserDto;
import com.wil.avicola_backend.model.Usuario;
import com.wil.avicola_backend.model.ERole;
import com.wil.avicola_backend.model.UserSession;
import com.wil.avicola_backend.repository.UserSessionRepository;
import com.wil.avicola_backend.repository.UsuarioRepository;
import com.wil.avicola_backend.security.jwt.JwtUtils;
import com.wil.avicola_backend.security.services.UserDetailsImpl;
import com.wil.avicola_backend.service.UserService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.Collection;

@Slf4j
@RestController
@CrossOrigin(origins = {"http://localhost:4200"})
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthenticationManager authenticationManager;
    private final UserService userService;
    private final JwtUtils jwtUtils;
    private final UserSessionRepository userSessionRepository;
    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    @PostMapping({"/signin", "/login"})
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequestDto loginRequest, HttpServletRequest request) {
        String identifier = loginRequest.getUsername();
        boolean isEmail = loginRequest.isEmail();
        
        log.info("Intento de login con {}: '{}'", isEmail ? "email" : "usuario", identifier);
        
        try {
            // Buscar usuario en la base de datos (por username o email)
            var usuarioOpt = isEmail 
                ? usuarioRepository.findByEmail(identifier)
                : usuarioRepository.findByUsernameIgnoreCase(identifier);
            
            if (usuarioOpt.isEmpty()) {
                log.warn("{} '{}' no encontrado en la base de datos", isEmail ? "Email" : "Usuario", identifier);
                Map<String, String> response = new HashMap<>();
                response.put("message", "Usuario o contraseña incorrectos");
                return ResponseEntity.status(401).body(response);
            }
            
            var usuario = usuarioOpt.get();
            
            // Si es username, validar CASE-SENSITIVE
            if (!isEmail && !usuario.getUsername().equals(identifier)) {
                log.warn("Username no coincide exactamente: esperado='{}', recibido='{}'", 
                    usuario.getUsername(), identifier);
                Map<String, String> response = new HashMap<>();
                response.put("message", "Usuario o contraseña incorrectos. Verifique mayúsculas y minúsculas.");
                return ResponseEntity.status(401).body(response);
            }
            
            log.info("Usuario encontrado: username='{}', activo={}, roles={}", 
                usuario.getUsername(), usuario.isActive(), usuario.getRoles());
            
            // Verificar contraseña manualmente para loguear el resultado
            boolean passwordMatches = false;
            try {
                passwordMatches = passwordEncoder.matches(loginRequest.getPassword(), usuario.getPassword());
            } catch (Exception e) {
                log.error("Error al verificar la contraseña: {}", e.getMessage());
            }
            log.info("¿Contraseña coincide?: {}", passwordMatches);
            
            // Usar el username real del usuario (no el identifier) para autenticación
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(usuario.getUsername(), loginRequest.getPassword()));

            SecurityContextHolder.getContext().setAuthentication(authentication);
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            
            String jwt = jwtUtils.generateJwtToken(authentication);
            String refreshToken = jwtUtils.generateRefreshToken(authentication);
            
            List<String> roles = userDetails.getAuthorities().stream()
                    .map(item -> item.getAuthority())
                    .collect(Collectors.toList());
            
            // Actualizar último login (usar username real, no identifier)
            userService.updateLastLogin(userDetails.getUsername());
            
            // Registrar sesión
            Usuario user = usuarioRepository.findById(userDetails.getId())
                    .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
            
            // Invalidar sesiones anteriores
            List<UserSession> activeSessions = userSessionRepository.findByUserAndActiveTrue(user);
            for (UserSession session : activeSessions) {
                session.setActive(false);
                session.setLogoutTime(LocalDateTime.now());
                userSessionRepository.save(session);
            }
            
            UserSession session = UserSession.builder()
                    .user(user)
                    .sessionToken(refreshToken)
                    .ipAddress(request.getRemoteAddr())
                    .userAgent(request.getHeader("User-Agent"))
                    .loginTime(LocalDateTime.now())
                    .active(true)
                    .lastActivity(LocalDateTime.now())
                    .expiryDate(LocalDateTime.now().plusDays(7)) // Token válido por 7 días
                    .build();
            
            userSessionRepository.save(session);
            
            log.info("Login exitoso para usuario: {}", userDetails.getUsername());
            
            return ResponseEntity.ok(LoginResponseDto.builder()
                    .token(jwt)
                    .refreshToken(refreshToken)
                    .type("Bearer")
                    .id(userDetails.getId())
                    .username(userDetails.getUsername())
                    .email(userDetails.getEmail())
                    .name(userDetails.getName())
                    .profilePicture(userDetails.getProfilePicture())
                    .roles(roles)
                    .build());

        } catch (BadCredentialsException e) {
            log.warn("Credenciales inválidas para: {}", identifier);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Usuario o contraseña incorrectos. Verifique que la contraseña respete mayúsculas y minúsculas.");
            return ResponseEntity.status(401).body(response);
        } catch (Exception e) {
            log.error("Error en el proceso de autenticación para: {}", identifier, e);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Error en el proceso de autenticación");
            return ResponseEntity.status(500).body(response);
        }
    }    @PostMapping("/refresh-token")
    public ResponseEntity<?> refreshToken(@RequestBody Map<String, String> body) {
        String refreshToken = body.get("refreshToken");
        if (refreshToken == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Refresh token no proporcionado"));
        }

        try {
            // Verificar si el refresh token es válido
            UserSession session = userSessionRepository.findBySessionTokenAndActiveTrue(refreshToken)
                    .orElseThrow(() -> new RuntimeException("Sesión no encontrada o inactiva"));

            if (session.getExpiryDate().isBefore(LocalDateTime.now())) {
                session.setActive(false);
                session.setLogoutTime(LocalDateTime.now());
                userSessionRepository.save(session);
                return ResponseEntity.status(401).body(Map.of("message", "Refresh token expirado"));
            }

            // Obtener el usuario asociado a la sesión
            Usuario usuario = session.getUser();
            
            // Reconstruir el objeto de autenticación para generar un token completo
            UserDetailsImpl userDetails = UserDetailsImpl.build(usuario);
            Authentication authentication = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
            
            // Generar nuevo token JWT y refresh token
            String newToken = jwtUtils.generateJwtToken(authentication);
            String newRefreshToken = refreshToken; // Mantener el mismo refresh token
            
            // Extender la vida de la sesión
            session.setExpiryDate(LocalDateTime.now().plusDays(7));
            session.setLastActivity(LocalDateTime.now());
            userSessionRepository.save(session);

            return ResponseEntity.ok(Map.of(
                "token", newToken,
                "refreshToken", newRefreshToken,
                "type", "Bearer",
                "id", usuario.getId(),
                "username", usuario.getUsername(),
                "email", usuario.getEmail(),
                "roles", userDetails.getAuthorities().stream()
                    .map(item -> item.getAuthority())
                    .collect(Collectors.toList())
            ));

        } catch (Exception e) {
            log.error("Error al refrescar token", e);
            return ResponseEntity.status(401).body(Map.of("message", "Token inválido"));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestBody Map<String, String> body) {
        String refreshToken = body.get("refreshToken");
        if (refreshToken == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Refresh token no proporcionado"));
        }

        try {
            UserSession session = userSessionRepository.findBySessionTokenAndActiveTrue(refreshToken)
                    .orElseThrow(() -> new RuntimeException("Sesión no encontrada"));

            session.setActive(false);
            session.setLogoutTime(LocalDateTime.now());
            userSessionRepository.save(session);

            return ResponseEntity.ok(Map.of("message", "Sesión cerrada exitosamente"));
        } catch (Exception e) {
            log.error("Error al cerrar sesión", e);
            return ResponseEntity.status(500).body(Map.of("message", "Error al cerrar sesión"));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody RegisterRequestDto registerRequest) {
        Usuario newUser = new Usuario();
        newUser.setUsername(registerRequest.getUsername());
        newUser.setEmail(registerRequest.getEmail());
        newUser.setPassword(registerRequest.getPassword());
        newUser.setName(registerRequest.getName());
        newUser.setPhone(registerRequest.getPhone());
        newUser.setActive(true);
        newUser.setProfilePicture(registerRequest.getProfilePicture());

        // Convertir String a ERole
        Set<ERole> roles = registerRequest.getRoles().stream()
                .map(roleName -> ERole.valueOf(roleName))
                .collect(Collectors.toSet());
        
        UserDto createdUser = userService.createUser(newUser, roles);
        
        return ResponseEntity.ok(createdUser);
    }

    /**
     * Endpoint para verificar la validez de un token
     * Útil para diagnóstico de problemas de autenticación
     */
    @PostMapping("/verify-token")
    public ResponseEntity<?> verifyToken(@RequestBody Map<String, String> body) {
        String token = body.get("token");
        if (token == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Token no proporcionado"));
        }
        
        try {
            boolean isValid = jwtUtils.validateJwtToken(token);
            String username = null;
            Long expiryTime = null;
            
            if (isValid) {
                username = jwtUtils.getUserNameFromJwtToken(token);
                // Intentar extraer fecha de expiración
                try {
                    String[] parts = token.split("\\.");
                    if (parts.length == 3) {
                        String payload = new String(java.util.Base64.getDecoder().decode(parts[1]));
                        expiryTime = com.fasterxml.jackson.databind.JsonNode.class.cast(
                            new com.fasterxml.jackson.databind.ObjectMapper().readTree(payload).get("exp")
                        ).asLong() * 1000; // Convertir a milisegundos
                    }
                } catch (Exception e) {
                    log.warn("No se pudo extraer fecha de expiración del token");
                }
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("valid", isValid);
            response.put("username", username);
            if (expiryTime != null) {
                response.put("expiry", expiryTime);
                response.put("expiryDate", new java.util.Date(expiryTime).toString());
                response.put("currentTime", System.currentTimeMillis());
                response.put("timeRemaining", expiryTime - System.currentTimeMillis());
            }
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error al verificar token", e);
            return ResponseEntity.status(500).body(Map.of(
                "message", "Error al verificar token",
                "error", e.getMessage()
            ));
        }
    }

    /**
     * DIAGNÓSTICO: Verificar roles del usuario autenticado
     */
    @GetMapping("/debug/roles")
    public ResponseEntity<?> debugUserRoles(Authentication authentication) {
        Map<String, Object> response = new HashMap<>();
        
        if (authentication == null) {
            response.put("authenticated", false);
            response.put("message", "No hay usuario autenticado");
            return ResponseEntity.ok(response);
        }
        
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Collection<? extends GrantedAuthority> authorities = authentication.getAuthorities();
        
        response.put("authenticated", true);
        response.put("username", userDetails.getUsername());
        response.put("id", userDetails.getId());
        response.put("email", userDetails.getEmail());
        response.put("roles", authorities.stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList()));
        
        System.out.println("=== DEBUG ROLES ===");
        System.out.println("Usuario: " + userDetails.getUsername());
        System.out.println("ID: " + userDetails.getId());
        System.out.println("Roles: " + authorities);
        
        return ResponseEntity.ok(response);
    }
}
