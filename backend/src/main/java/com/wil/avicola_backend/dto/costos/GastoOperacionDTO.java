package com.wil.avicola_backend.dto.costos;

import java.time.LocalDate;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class GastoOperacionDTO {
    @NotBlank
    private String nombreGasto;
    private String detalle;
    private String unidad;
    @NotNull @Min(0)
    private Double cantidadConsumida;
    @NotNull @Min(0)
    private Double costoUnitario;
    @NotNull
    private LocalDate fecha;
    private String loteId;
    private String loteCodigo;
    private String observaciones;
}
