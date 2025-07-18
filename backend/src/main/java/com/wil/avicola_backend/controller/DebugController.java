package com.wil.avicola_backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Controlador para depuración de token y autenticación
 * Solo disponible en entornos no productivos
 */
@RestController
@RequestMapping("/api/debug")
public class DebugController {

    @GetMapping("/token-info")
    public ResponseEntity<Map<String, Object>> getTokenInfo(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body(Map.of(
                "authenticated", false,
                "message", "No hay autenticación activa"
            ));
        }
        
        List<String> authorities = authentication.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .collect(Collectors.toList());
        
        Map<String, Object> tokenInfo = new HashMap<>();
        tokenInfo.put("authenticated", true);
        tokenInfo.put("username", authentication.getName());
        tokenInfo.put("authorities", authorities);
        tokenInfo.put("principal", authentication.getPrincipal().toString());
        tokenInfo.put("details", authentication.getDetails());
        
        return ResponseEntity.ok(tokenInfo);
    }
    
    @GetMapping("/admin-check")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> adminCheck(Authentication authentication) {
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Tienes permisos de administrador");
        response.put("username", authentication.getName());
        
        return ResponseEntity.ok(response);
    }
}
