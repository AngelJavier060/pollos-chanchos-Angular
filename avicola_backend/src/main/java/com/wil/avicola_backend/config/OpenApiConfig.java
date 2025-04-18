package com.wil.avicola_backend.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI avicolaOpenAPI() {
        Server devServer = new Server()
                .url("http://localhost:8080")
                .description("Servidor de desarrollo");

        Contact contact = new Contact()
                .name("Wilson Cayo")
                .email("info@granjaelvita.com")
                .url("https://www.granjaelvita.com");

        License license = new License()
                .name("Apache 2.0")
                .url("http://www.apache.org/licenses/LICENSE-2.0.html");

        Info info = new Info()
                .title("API de Granja Elvita")
                .version("1.0")
                .contact(contact)
                .description("API para la gestión de la granja avícola y porcina")
                .termsOfService("https://www.granjaelvita.com/terms")
                .license(license);

        return new OpenAPI()
                .info(info)
                .servers(List.of(devServer));
    }
}