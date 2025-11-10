package com.wil.avicola_backend.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.wil.avicola_backend.model.TypeFood;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventarioAlimentoResponse {
    private Long id;
    private TypeFood tipoAlimento; // Incluye id y name
    private BigDecimal cantidadStock;
    private BigDecimal cantidadOriginal; // Stock inicial para mostrar "Stock Original"
    private String unidadMedida;
    private BigDecimal stockMinimo;
    private String observaciones;
    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaActualizacion;
}
