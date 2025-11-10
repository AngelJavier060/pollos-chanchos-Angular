package com.wil.avicola_backend.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConsumoManualRequestDto {
    private String loteId;
    private LocalDate fecha; // si viene null, usar hoy
    private Long nombreProductoId; // opcional (papas, lechuga) tomado de configuracion general
    private String nombreLibre; // si no existe en configuracion
    private String unidadMedida; // kg, g, ml, L, unidad, etc.
    private BigDecimal cantidad; // total consumida (si no viene y viene porAnimal+vivos, calcular)
    private BigDecimal cantidadPorAnimal; // opcional
    private Integer animalesVivos; // opcional, para calcular cantidad
    private BigDecimal costoUnitario; // opcional
    private BigDecimal costoTotal; // opcional; si no viene, calcular
    private String observaciones;
}
