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

    @Autowired
    LoginIdentifierResolver loginIdentifierResolver;
    
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
        String normalized = identifier != null ? identifier.trim() : "";
        Usuario usuario = loginIdentifierResolver.resolve(normalized)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado: " + normalized));
        return UserDetailsImpl.build(usuario);
    }
}
