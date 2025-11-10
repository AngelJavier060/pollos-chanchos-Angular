package com.wil.avicola_backend.dto.costos;

import java.time.LocalDate;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CostoFijoDTO {
    @NotBlank
    private String nombreCosto;
    @NotNull @Min(0)
    private Double montoTotal;
    private String periodoProrrateo;
    private String metodoProrrateo;
    private String observaciones;
    @NotNull
    private LocalDate fecha;
    private String loteId;
    private String loteCodigo;
}
