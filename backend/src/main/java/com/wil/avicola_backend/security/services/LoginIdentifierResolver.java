package com.wil.avicola_backend.security.services;

import java.util.Optional;

import org.springframework.stereotype.Component;

import com.wil.avicola_backend.model.Usuario;
import com.wil.avicola_backend.repository.UsuarioRepository;

import lombok.RequiredArgsConstructor;

/**
 * Resuelve un usuario por nombre de usuario o correo electrónico.
 * - Correo: búsqueda sin distinguir mayúsculas/minúsculas.
 * - Usuario: coincidencia exacta de mayúsculas/minúsculas (Javier ≠ javier).
 */
@Component
@RequiredArgsConstructor
public class LoginIdentifierResolver {

    private final UsuarioRepository usuarioRepository;

    public boolean isEmailIdentifier(String raw) {
        return raw != null && raw.trim().contains("@");
    }

    public Optional<Usuario> resolve(String rawIdentifier) {
        if (rawIdentifier == null) {
            return Optional.empty();
        }
        String identifier = rawIdentifier.trim();
        if (identifier.isEmpty()) {
            return Optional.empty();
        }

        if (identifier.contains("@")) {
            return usuarioRepository.findByEmailIgnoreCase(identifier);
        }

        Optional<Usuario> exact = usuarioRepository.findByUsername(identifier);
        if (exact.isPresent()) {
            return exact;
        }

        return usuarioRepository.findByUsernameIgnoreCase(identifier)
                .filter(u -> u.getUsername().equals(identifier));
    }
}
