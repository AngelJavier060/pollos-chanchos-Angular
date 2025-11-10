package com.wil.avicola_backend.dto.costos;

import java.time.LocalDate;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class GastoLogisticaDTO {
    @NotBlank
    private String tipoTransporte;
    @NotBlank
    private String concepto;
    private String unidad;
    @NotNull @Min(0)
    private Double cantidadTransportada;
    @NotNull @Min(0)
    private Double costoUnitario;
    @NotNull
    private LocalDate fecha;
    private String loteId;
    private String loteCodigo;
    private String observaciones;
}
