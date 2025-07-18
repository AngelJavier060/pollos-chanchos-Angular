package com.wil.avicola_backend.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/test")
public class TestController {

    @GetMapping("/public")
    @RequestMapping("/api/auth/test/public") // Ruta pública explícita
    public String publicAccess() {
        return "Contenido público. Accesible por todos.";
    }

    @GetMapping("/user")
    @PreAuthorize("hasRole('USER') or hasRole('POULTRY') or hasRole('PORCINE') or hasRole('ADMIN')")
    public String userAccess() {
        return "Contenido para usuarios registrados.";
    }
    
    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public String adminAccess() {
        return "Contenido solo para administradores.";
    }
}
