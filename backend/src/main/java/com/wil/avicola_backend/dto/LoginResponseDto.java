package com.wil.avicola_backend.dto;

import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponseDto {
    private String token;
    private String refreshToken;
    private String type;
    private Long id;
    private String username;
    private String email;
    private String name;
    private String profilePicture;
    private List<String> roles;
}
