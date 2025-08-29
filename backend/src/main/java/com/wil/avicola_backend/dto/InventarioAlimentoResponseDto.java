package com.wil.avicola_backend.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventarioAlimentoResponseDto {
    private Long inventarioId;

    private Long tipoAlimentoId;
    private String tipoAlimentoNombre;

    private Long productoId;        // puede ser null si no hay producto asociado
    private String productoNombre;  // puede ser null si no hay producto asociado

    private BigDecimal cantidadStock;
    private String unidadMedida;
    private BigDecimal stockMinimo;
    private BigDecimal maxNivel;

    private String estado;
    private LocalDateTime fechaCreacion;
    private LocalDateTime archivadoAt;

    private String observaciones;
}
