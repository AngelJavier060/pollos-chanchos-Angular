package com.wil.avicola_backend.security.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.wil.avicola_backend.repository.UsuarioRepository;
import com.wil.avicola_backend.model.Usuario;

import java.util.Optional;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {
    @Autowired
    UsuarioRepository usuarioRepository;
    
    /**
     * Carga el usuario por username o email.
     * - Si el identificador contiene '@', busca por email (case-insensitive)
     * - Si no, busca por username con validación CASE-SENSITIVE exacta
     * 
     * @param identifier puede ser username o email
     */
    @Override
    @Transactional
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        Optional<Usuario> usuarioOpt;
        
        // Determinar si es email o username
        if (identifier != null && identifier.contains("@")) {
            // Buscar por email (case-insensitive es aceptable para emails)
            usuarioOpt = usuarioRepository.findByEmail(identifier);
        } else {
            // Buscar por username - CASE SENSITIVE
            // Primero buscamos el usuario
            usuarioOpt = usuarioRepository.findByUsernameIgnoreCase(identifier);
            
            // Si existe, validamos que el username coincida EXACTAMENTE (case-sensitive)
            if (usuarioOpt.isPresent()) {
                Usuario usuario = usuarioOpt.get();
                // Comparación estricta: el username debe coincidir exactamente
                if (!usuario.getUsername().equals(identifier)) {
                    throw new UsernameNotFoundException(
                        "Usuario no encontrado. Verifique mayúsculas y minúsculas: " + identifier);
                }
            }
        }
        
        Usuario usuario = usuarioOpt.orElseThrow(() -> 
            new UsernameNotFoundException("Usuario no encontrado: " + identifier));

        return UserDetailsImpl.build(usuario);
    }
}
