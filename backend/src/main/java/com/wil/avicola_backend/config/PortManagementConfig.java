package com.wil.avicola_backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.boot.web.servlet.server.ConfigurableServletWebServerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

import java.io.IOException;
import java.net.ServerSocket;

@Configuration
public class PortManagementConfig {
    
    private static final Logger logger = LoggerFactory.getLogger(PortManagementConfig.class);
    
    @Bean
    public WebServerFactoryCustomizer<ConfigurableServletWebServerFactory> portCustomizer(Environment env) {
        return factory -> {
            int preferredPort = env.getProperty("server.port", Integer.class, 8088);
            
            // Verificar si el puerto preferido está disponible
            if (isPortAvailable(preferredPort)) {
                logger.info("🟢 Puerto {} disponible - usando puerto preferido", preferredPort);
                factory.setPort(preferredPort);
            } else {
                // Buscar puerto disponible automáticamente
                int availablePort = findAvailablePort(preferredPort);
                logger.warn("⚠️ Puerto {} ocupado - usando puerto alternativo: {}", preferredPort, availablePort);
                logger.info("🔧 IMPORTANTE: Actualiza la URL del frontend a http://localhost:{}", availablePort);
                factory.setPort(availablePort);
            }
        };
    }
    
    private boolean isPortAvailable(int port) {
        try (ServerSocket serverSocket = new ServerSocket(port)) {
            return true;
        } catch (IOException e) {
            return false;
        }
    }
    
    private int findAvailablePort(int startPort) {
        for (int port = startPort; port <= startPort + 100; port++) {
            if (isPortAvailable(port)) {
                return port;
            }
        }
        // Si no encuentra puerto en el rango, usar puerto 0 (automático)
        return 0;
    }
}
