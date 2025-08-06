package com.wil.avicola_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * DTO para respuesta de inventario con datos calculados
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventarioResponseDto {
    
    private Long id;
    private TipoAlimentoDto tipoAlimento;
    private BigDecimal cantidadStock;
    private BigDecimal cantidadOriginal; // Calculado: stock actual + total consumido
    private BigDecimal totalConsumido;  // Calculado desde movimientos
    private String unidadMedida;
    private BigDecimal stockMinimo;
    private String observaciones;
    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaActualizacion;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TipoAlimentoDto {
        private Long id;
        private String name;
        private String categoria; // ALIMENTO o MEDICINA
    }
}
