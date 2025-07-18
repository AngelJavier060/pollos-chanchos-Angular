package com.wil.avicola_backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class RequestLoggingInterceptor implements HandlerInterceptor {
    
    private static final Logger logger = LoggerFactory.getLogger(RequestLoggingInterceptor.class);
    
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        
        String requestURI = request.getRequestURI();
        String method = request.getMethod();
        String authHeader = request.getHeader("Authorization");
        
        logger.info("=== 🌐 INCOMING REQUEST ===");
        logger.info("Method: {}", method);
        logger.info("URI: {}", requestURI);
        logger.info("Authorization Header: {}", authHeader != null ? "Present" : "Not present");
        logger.info("User-Agent: {}", request.getHeader("User-Agent"));
        logger.info("Content-Type: {}", request.getContentType());
        logger.info("Parameters: {}", request.getParameterMap());
        
        // Verificar específicamente rutas de plan-alimentacion
        if (requestURI.startsWith("/api/plan-alimentacion")) {
            logger.info("🎯 PLAN-ALIMENTACION REQUEST DETECTED!");
            logger.info("Should be PUBLIC - No auth required");
            
            // Verificar contexto de seguridad
            var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            logger.info("Security Context: {}", auth != null ? auth.getClass().getSimpleName() : "null");
        }
        
        return true;
    }
    
    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) throws Exception {
        logger.info("=== 📤 RESPONSE COMPLETED ===");
        logger.info("Status: {}", response.getStatus());
        logger.info("URI: {}", request.getRequestURI());
        
        if (response.getStatus() == 401) {
            logger.error("❌ 401 UNAUTHORIZED for: {}", request.getRequestURI());
            logger.error("This should NOT happen for plan-alimentacion routes!");
        }
    }
} 