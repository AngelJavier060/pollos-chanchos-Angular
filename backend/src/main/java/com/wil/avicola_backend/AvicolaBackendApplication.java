package com.wil.avicola_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@SpringBootApplication
@EntityScan(basePackages = {"com.wil.avicola_backend.model", "com.wil.avicola_backend.entity"})
@EnableJpaRepositories(basePackages = "com.wil.avicola_backend.repository")
@EnableJpaAuditing
@ComponentScan(basePackages = {
    "com.wil.avicola_backend.security",
    "com.wil.avicola_backend.config",
    "com.wil.avicola_backend.controller",
    "com.wil.avicola_backend.service",
    "com.wil.avicola_backend.mapper"
})
public class AvicolaBackendApplication {
    private static final Logger logger = LoggerFactory.getLogger(AvicolaBackendApplication.class);

    public static void main(String[] args) {
        SpringApplication.run(AvicolaBackendApplication.class, args);
        logger.info("Aplicación Avícola iniciada - Sistema de gestión de pollos y chanchos");
    }
    
    // Nota: La configuración CORS y seguridad se encuentra en WebSecurityConfig.java
}
