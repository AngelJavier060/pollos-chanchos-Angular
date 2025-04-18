package com.wil.avicola_backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    @SuppressWarnings("null")
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                /// .allowedOrigins("https://ferreteria.elitesoftsolution.com") // Solo tu
                // frontend puede acceder
                // .allowedOrigins("http://localhost:3000")
                .allowedOrigins("*") // Permitir cualquier origen
                .allowedMethods("GET", "POST", "PUT", "DELETE")
                .allowedHeaders("*");
    }
}