package com.wil.avicola_backend.security;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import com.wil.avicola_backend.security.services.UserDetailsImpl;

@Component
public class UserSecurity {
    /**
     * Verifica si el usuario autenticado es el mismo que el del ID solicitado.
     * @param authentication el objeto de autenticación actual
     * @param id el ID del usuario a comparar
     * @return true si el usuario autenticado tiene el mismo ID, false en caso contrario
     */
    public boolean isUserSelf(Authentication authentication, Long id) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof UserDetailsImpl userDetails) {
            return userDetails.getId().equals(id);
        }
        return false;
    }
}
