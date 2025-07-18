package com.wil.avicola_backend.security.jwt;

import com.wil.avicola_backend.security.services.UserDetailsServiceImpl;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtils jwtUtils;
    private final UserDetailsServiceImpl userDetailsService;
    
    private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    // Lista consolidada de rutas públicas
    private static final List<String> PUBLIC_PATHS = Arrays.asList(
            "/api/auth/**",
            "/health",
            "/api/health",
            "/actuator/**",
            "/api/public/**",
            "/uploads/**",
            "/api/plan-alimentacion/**",  // TEMPORAL: todos los endpoints de plan-alimentacion
            "/api/plan-ejecucion/debug/**",
            "/api/plan-ejecucion/test",
            "/api/plan-ejecucion/registrar-alimentacion",  // Permitir registro de alimentación
            "/animal/**"
    );

    public JwtAuthenticationFilter(JwtUtils jwtUtils, UserDetailsServiceImpl userDetailsService) {
        this.jwtUtils = jwtUtils;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        final String requestURI = request.getRequestURI();
        final String method = request.getMethod();

        logger.debug("🔍 Filtro JWT procesando: {} {}", method, requestURI);

        // VERIFICAR SI ES UNA RUTA COMPLETAMENTE PÚBLICA (incluye plan-alimentacion)
        boolean isPublicPath = PUBLIC_PATHS.stream()
                .anyMatch(pattern -> pathMatcher.match(pattern, requestURI));
        
        // También verificar específicamente debug endpoints
        if (requestURI.startsWith("/api/plan-alimentacion") || 
            requestURI.startsWith("/api/plan-ejecucion/debug") ||
            requestURI.equals("/api/plan-ejecucion/registrar-alimentacion") ||
            isPublicPath) {
            logger.info("🟢 SALTANDO COMPLETAMENTE filtro JWT para ruta pública: {} {}", method, requestURI);
            // PARA RUTAS PÚBLICAS: NO HACER NADA, CONTINUAR DIRECTAMENTE
            filterChain.doFilter(request, response);
            return;
        }

        logger.trace("Procesando ruta protegida con filtro JWT: {}", requestURI);

        try {
            String jwt = jwtUtils.parseJwt(request);
            
            logger.debug("=== DEBUG JWT FILTER (RUTA PROTEGIDA) ===");
            logger.debug("URI: {}", requestURI);
            logger.debug("Token presente: {}", jwt != null);
            
            if (jwt != null) {
                logger.debug("Token (primeros 20 chars): {}", jwt.substring(0, Math.min(20, jwt.length())));
                boolean isValid = jwtUtils.validateJwtToken(jwt);
                logger.debug("Token válido: {}", isValid);
                
                if (isValid) {
                    String username = jwtUtils.getUserNameFromJwtToken(jwt);
                    logger.debug("Username extraído del token: {}", username);

                    UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                    logger.debug("UserDetails cargado: {}", userDetails.getUsername());

                    UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities());
                    
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                    
                    logger.info("✅ Usuario '{}' autenticado correctamente vía JWT para la ruta: {}", username, requestURI);
                } else {
                    logger.warn("❌ Token JWT inválido para la ruta protegida: {}", requestURI);
                }
            } else {
                logger.warn("❌ Token JWT no encontrado para la ruta protegida: {}", requestURI);
            }
        } catch (Exception e) {
            logger.error("❌ Error al procesar el token JWT para ruta protegida '{}': {}", requestURI, e.getMessage());
        }

        filterChain.doFilter(request, response);
    }
}
