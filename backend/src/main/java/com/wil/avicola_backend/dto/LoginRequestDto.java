package com.wil.avicola_backend.dto;

import lombok.*;

import jakarta.validation.constraints.NotBlank;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginRequestDto {
    // Campo principal: puede ser username o email
    @NotBlank(message = "El usuario o email es obligatorio")
    private String username;
    
    @NotBlank(message = "La contraseña es obligatoria")
    private String password;
    
    private Boolean rememberMe;
    
    /**
     * Determina si el campo username contiene un email
     */
    public boolean isEmail() {
        return username != null && username.trim().contains("@");
    }

    /** Identificador normalizado (sin espacios al inicio/fin). */
    public String getIdentifier() {
        return username != null ? username.trim() : "";
    }
}
