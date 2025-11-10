package com.wil.avicola_backend.dto.costos;

import java.time.LocalDate;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class GastoManoObraDTO {
    @NotBlank
    private String nombreTrabajador;
    @NotBlank
    private String cargo;
    @NotNull @Min(0)
    private Double horasTrabajadas;
    @NotNull @Min(0)
    private Double costoPorHora;
    @NotNull
    private LocalDate fecha;
    private String loteId;
    private String loteCodigo;
    private String observaciones;
}
