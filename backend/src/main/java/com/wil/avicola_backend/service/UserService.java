package com.wil.avicola_backend.service;

import com.wil.avicola_backend.dto.UserDto;
import com.wil.avicola_backend.exception.ResourceNotFoundException;
import com.wil.avicola_backend.model.ERole;
import com.wil.avicola_backend.model.Role;
import com.wil.avicola_backend.model.Usuario;
import com.wil.avicola_backend.repository.RoleRepository;
import com.wil.avicola_backend.repository.UsuarioRepository;
import com.wil.avicola_backend.security.jwt.JwtUtils;
import com.wil.avicola_backend.security.services.UserDetailsImpl;

import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UsuarioRepository usuarioRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;

    public List<UserDto> getAllUsers() {
        return usuarioRepository.findAll().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public UserDto getUserById(Long id) {
        Usuario user = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con id: " + id));
        return mapToDto(user);
    }

    public UserDto getUserByUsername(String username) {
        Usuario user = usuarioRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con nombre de usuario: " + username));
        return mapToDto(user);
    }

    @Transactional
    public UserDto createUser(Usuario usuario, Set<ERole> roleNames) {
        // Verificar si el usuario ya existe
        if (usuarioRepository.existsByUsername(usuario.getUsername())) {
            throw new RuntimeException("El nombre de usuario ya está en uso");
        }
        if (usuarioRepository.existsByEmail(usuario.getEmail())) {
            throw new RuntimeException("El correo electrónico ya está en uso");
        }

        // Codificar contraseña
        usuario.setPassword(passwordEncoder.encode(usuario.getPassword()));
        
        // Establecer roles
        Set<Role> roles = new HashSet<>();
        if (roleNames == null || roleNames.isEmpty()) {
            Role userRole = roleRepository.findByName(ERole.ROLE_USER)
                    .orElseGet(() -> roleRepository.save(new Role(ERole.ROLE_USER)));
            roles.add(userRole);
        } else {
            roleNames.forEach(roleName -> {
                Role role = roleRepository.findByName(roleName)
                        .orElseGet(() -> roleRepository.save(new Role(roleName)));
                roles.add(role);
            });
        }
        usuario.setRoles(roles);
        
        // Establecer valores predeterminados
        usuario.setCreatedAt(LocalDateTime.now());
        usuario.setActive(true);
        
        Usuario savedUser = usuarioRepository.save(usuario);
        
        return mapToDto(savedUser);
    }

    @Transactional
    public UserDto updateUser(Long id, Usuario userDetails, Set<ERole> roleNames) {
        Usuario user = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con id: " + id));
        
        if (!user.getUsername().equals(userDetails.getUsername()) && 
                usuarioRepository.existsByUsername(userDetails.getUsername())) {
            throw new RuntimeException("El nombre de usuario ya está en uso");
        }
        
        if (!user.getEmail().equals(userDetails.getEmail()) && 
                usuarioRepository.existsByEmail(userDetails.getEmail())) {
            throw new RuntimeException("El correo electrónico ya está en uso");
        }
        
        user.setUsername(userDetails.getUsername());
        user.setEmail(userDetails.getEmail());
        user.setName(userDetails.getName());
        user.setPhone(userDetails.getPhone());
        user.setProfilePicture(userDetails.getProfilePicture());
        
        // Mantener el estado activo actual si no se especifica lo contrario
        boolean currentActiveState = user.isActive();
        user.setActive(currentActiveState);
        
        // Actualizar la contraseña solo si se proporciona una nueva y es diferente a la actual
        if (userDetails.getPassword() != null && !userDetails.getPassword().trim().isEmpty()) {
            // Solo actualizar si la nueva contraseña no es igual a la actual (ya codificada)
            if (!passwordEncoder.matches(userDetails.getPassword(), user.getPassword())) {
                user.setPassword(passwordEncoder.encode(userDetails.getPassword()));
                System.out.println("[UserService] Contraseña actualizada para usuario: " + user.getUsername());
            } else {
                System.out.println("[UserService] La nueva contraseña es igual a la actual, no se actualiza para usuario: " + user.getUsername());
            }
        } else {
            System.out.println("[UserService] No se proporcionó nueva contraseña, se mantiene la actual para usuario: " + user.getUsername());
        }
        
        // Actualizar roles si se proporcionan
        if (roleNames != null && !roleNames.isEmpty()) {
            Set<Role> roles = new HashSet<>();
            roleNames.forEach(roleName -> {
                Role role = roleRepository.findByName(roleName)
                        .orElseGet(() -> roleRepository.save(new Role(roleName)));
                roles.add(role);
            });
            user.setRoles(roles);
        }
        
        Usuario updatedUser = usuarioRepository.save(user);
        return mapToDto(updatedUser);
    }    @Transactional
    public void deleteUser(Long id) {
        Usuario user = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con id: " + id));
        usuarioRepository.delete(user);
    }

    @Transactional
    public void toggleUserStatus(Long id) {
        Usuario user = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con id: " + id));
        user.setActive(!user.isActive());
        usuarioRepository.save(user);
    }

    @Transactional
    public void updatePassword(Long id, String newPassword) {
        Usuario user = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con id: " + id));
        user.setPassword(passwordEncoder.encode(newPassword));
        usuarioRepository.save(user);
    }

    @Transactional
    public void updateLastLogin(String username) {
        Usuario user = usuarioRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con username: " + username));
        user.setLastLoginDate(LocalDateTime.now());
        usuarioRepository.save(user);
    }

    @Transactional
    public UserDto updateProfilePicture(Long id, String imageUrl) {
        Usuario user = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con id: " + id));
        
        user.setProfilePicture(imageUrl);
        Usuario updatedUser = usuarioRepository.save(user);
        return mapToDto(updatedUser);
    }

    private UserDto mapToDto(Usuario user) {
        UserDto dto = new UserDto();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setName(user.getName());
        dto.setPhone(user.getPhone());
        dto.setActive(user.isActive());
        dto.setProfilePicture(user.getProfilePicture());
        dto.setRoles(user.getRoles().stream()
                .map(role -> role.getName().toString())
                .collect(Collectors.toSet()));
        dto.setCreatedAt(user.getCreatedAt());
        return dto;
    }
    
    public String generateNewJwt(Authentication authentication) {
        if (authentication == null) {
            throw new IllegalArgumentException("La autenticación no puede ser nula");
        }
        
        // Extraer información del usuario autenticado y generar un nuevo token JWT
        return jwtUtils.generateJwtToken(authentication);
    }

    public Long getUserIdFromAuthentication(Authentication authentication) {
        if (authentication == null) {
            throw new IllegalArgumentException("La autenticación no puede ser nula");
        }
        
        Object principal = authentication.getPrincipal();
        if (principal instanceof UserDetailsImpl) {
            return ((UserDetailsImpl) principal).getId();
        }
        
        throw new RuntimeException("No se pudo obtener el ID de usuario de la autenticación");
    }
}
