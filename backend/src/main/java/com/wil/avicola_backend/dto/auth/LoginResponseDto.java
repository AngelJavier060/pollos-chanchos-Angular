package com.wil.avicola_backend.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO para las respuestas de inicio de sesión
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginResponseDto {
    
    private String token;
    private String refreshToken;
    
    @Builder.Default
    private String type = "Bearer";
    
    private Long id;
    private String username;
    private String email;
    private String name;
    private String profilePicture;
    private List<String> roles;
    
    @Builder.Default
    private Long expiresIn = 86400L; // 24 horas por defecto
}
