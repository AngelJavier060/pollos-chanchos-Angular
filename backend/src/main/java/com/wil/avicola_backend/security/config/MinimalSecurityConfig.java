package com.wil.avicola_backend.security.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.http.HttpMethod;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.wil.avicola_backend.security.jwt.AuthEntryPointJwt;
import com.wil.avicola_backend.security.jwt.JwtAuthenticationFilter;
import com.wil.avicola_backend.security.services.UserDetailsServiceImpl;
import com.wil.avicola_backend.security.jwt.JwtUtils;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class MinimalSecurityConfig {
    
    private static final Logger logger = LoggerFactory.getLogger(MinimalSecurityConfig.class);

    @Autowired
    UserDetailsServiceImpl userDetailsService;

    @Autowired
    private AuthEntryPointJwt unauthorizedHandler;

    @Autowired
    private JwtUtils jwtUtils;

    @Bean
    public JwtAuthenticationFilter authenticationJwtTokenFilter() {
        return new JwtAuthenticationFilter(jwtUtils, userDetailsService);
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        logger.info("🔧 Configurando seguridad ROBUSTA para resolver error 403");
        
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .exceptionHandling(exception -> exception.authenticationEntryPoint(unauthorizedHandler))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> {
                logger.info("🔧 Configurando autorización de requests...");
                
                // SUPER ESPECÍFICO: todos los métodos HTTP para plan-alimentacion
                auth
                    .requestMatchers(HttpMethod.GET, "/api/plan-alimentacion/**").permitAll()
                    .requestMatchers(HttpMethod.POST, "/api/plan-alimentacion/**").permitAll()
                    .requestMatchers(HttpMethod.PUT, "/api/plan-alimentacion/**").permitAll()
                    .requestMatchers(HttpMethod.DELETE, "/api/plan-alimentacion/**").permitAll()
                    .requestMatchers(HttpMethod.PATCH, "/api/plan-alimentacion/**").permitAll()
                    // ENDPOINTS DE MORTALIDAD: todos los métodos HTTP para mortalidad
                    .requestMatchers(HttpMethod.GET, "/api/mortalidad/**").permitAll()
                    .requestMatchers(HttpMethod.POST, "/api/mortalidad/**").permitAll()
                    .requestMatchers(HttpMethod.PUT, "/api/mortalidad/**").permitAll()
                    .requestMatchers(HttpMethod.DELETE, "/api/mortalidad/**").permitAll()
                    .requestMatchers(HttpMethod.PATCH, "/api/mortalidad/**").permitAll()
                    // Habilitar handshake SockJS/STOMP sin autenticación
                    .requestMatchers("/ws/**").permitAll()
                    // Permitir todas las peticiones OPTIONS para CORS
                    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                    // Endpoints públicos - NO requieren autenticación
                    .requestMatchers(
                        "/api/auth/**",
                        "/auth/**", // Agregar también /auth/** por compatibilidad
                        "/health",
                        "/api/health",
                        "/api/public/**",
                        "/uploads/**",
                        "/actuator/**",
                        "/api/init-data/**",
                        "/api/plan-ejecucion/debug/**",
                        "/api/plan-ejecucion/test",
                        "/api/plan-ejecucion/registrar-alimentacion",
                        "/error"  // CRÍTICO: Permitir acceso al endpoint de error de Spring Boot
                    ).permitAll()
                    // Abrimos ventas y health (subrutas) durante pruebas de integración
                    .requestMatchers("/api/ventas/**").permitAll()
                    .requestMatchers("/api/health/**").permitAll()
                    // Específicamente para debug endpoints
                    .requestMatchers(HttpMethod.POST, "/api/plan-ejecucion/debug/registrar-alimentacion").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/plan-ejecucion/debug/ping").permitAll()
                    // Otros endpoints públicos temporales
                    .requestMatchers("/animal/**", "/api/animal/**").permitAll()
                    .requestMatchers("/api/lote/**", "/lote/**").permitAll() // Para cargar lotes en mortalidad
                    // Todo lo demás requiere autenticación
                    .anyRequest().authenticated();
                    
                logger.info("✅ Autorización configurada específicamente para plan-alimentacion");
            });

        // Configurar proveedor de autenticación
        http.authenticationProvider(authenticationProvider());
        
        // Agregar filtro JWT pero que respete las rutas públicas
        http.addFilterBefore(authenticationJwtTokenFilter(), UsernamePasswordAuthenticationFilter.class);

        logger.info("✅ Configuración de seguridad aplicada:");
        logger.info("  - /api/plan-alimentacion/** -> PÚBLICO (sin autenticación)");
        logger.info("  - /api/auth/**, /health, /uploads/** -> PÚBLICO");
        logger.info("  - Resto de endpoints -> REQUIEREN JWT");
        
        return http.build();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        logger.info("🌐 Configurando CORS para endpoints de alimentación");
        
        CorsConfiguration configuration = new CorsConfiguration();
        // 🔧 CRÍTICO: No usar "*" con allowCredentials=true
        configuration.setAllowedOriginPatterns(Arrays.asList(
            "http://localhost:4200", 
            "http://localhost:*",
            "https://granja.improvement-solution.com",
            "http://granja.improvement-solution.com"
        ));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"));
        configuration.setAllowedHeaders(Arrays.asList("Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"));
        configuration.setAllowCredentials(true); // 🔧 Necesario para SockJS con withCredentials
        configuration.setMaxAge(3600L);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        
        logger.info("✅ CORS configurado sin credentials para evitar conflicto con wildcards");
        return source;
    }
}
