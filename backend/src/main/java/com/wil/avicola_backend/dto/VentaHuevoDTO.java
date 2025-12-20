package com.wil.avicola_backend.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class VentaHuevoDTO {
    @NotNull
    private LocalDate fecha;

    @NotBlank
    private String loteId; // UUID string

    private String loteCodigo;

    private Long animalId; // opcional
    private String animalName; // opcional

    @NotNull
    @DecimalMin("0.01")
    private BigDecimal cantidad; // unidades

    @NotNull
    @DecimalMin("0.00")
    private BigDecimal precioUnit;

    // total opcional: si no viene, se calcula en backend
    private BigDecimal total;
    private String observaciones;
}
