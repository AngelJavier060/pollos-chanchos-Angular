package com.wil.avicola_backend.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ConvertirMortalidadDTO {
    private Long causaId; // opcional

    @NotNull
    private Integer cantidad; // animales muertos a registrar

    // Para resolver el lote correctamente en el sistema actual (UUID o código)
    private String loteId;     // UUID del lote (preferido)
    private String loteCodigo; // Código amigable del lote (fallback)

    // Datos opcionales
    private String observaciones;
    private BigDecimal peso;
    private Integer edad;
    private String ubicacion;
    private Boolean confirmado;
    private String usuarioRegistro;
}
