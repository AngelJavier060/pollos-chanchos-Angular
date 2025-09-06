package com.wil.avicola_backend.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class VentaAnimalDTO {
    @NotNull
    private LocalDate fecha;

    @NotBlank
    private String loteId; // UUID string

    private String loteCodigo;

    private Long animalId; // opcional
    private String animalName; // opcional

    @NotNull
    @DecimalMin("0.01")
    private BigDecimal cantidad; // número de animales

    @NotNull
    @DecimalMin("0.00")
    private BigDecimal precioUnit;

    private BigDecimal total; // si no viene, se calcula
}
