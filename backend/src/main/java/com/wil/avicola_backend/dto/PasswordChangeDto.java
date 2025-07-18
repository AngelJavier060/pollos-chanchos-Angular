package com.wil.avicola_backend.dto;

import lombok.*;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class PasswordChangeDto {
    @NotBlank(message = "La contraseña actual es obligatoria")
    private String currentPassword;
    
    @NotBlank(message = "La nueva contraseña es obligatoria")
    @Size(min = 6, max = 40, message = "La nueva contraseña debe tener entre 6 y 40 caracteres")
    private String newPassword;
    
    @NotBlank(message = "La confirmación de la nueva contraseña es obligatoria")
    private String confirmPassword;
}
