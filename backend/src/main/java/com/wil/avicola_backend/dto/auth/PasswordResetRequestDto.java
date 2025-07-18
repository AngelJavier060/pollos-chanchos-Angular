package com.wil.avicola_backend.dto.auth;

import jakarta.validation.constraints.NotBlank;

public class PasswordResetRequestDto {
    
    @NotBlank(message = "El email no puede estar vacío")
    private String email;

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }
}
