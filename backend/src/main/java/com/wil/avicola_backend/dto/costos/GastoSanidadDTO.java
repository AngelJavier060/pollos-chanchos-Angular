package com.wil.avicola_backend.dto.costos;

import java.time.LocalDate;
import java.time.LocalDateTime;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class GastoSanidadDTO {
    @NotBlank
    private String nombreGasto;
    private String detalle;
    @NotNull @Min(0)
    private Double cantidad;
    @NotNull @Min(0)
    private Double costoUnitario;
    @NotNull
    private LocalDate fecha;

    private Long productId;
    private String tipoAplicacion;
    private String via;
    private String aplicadoPorTipo;
    private String responsable;
    private Double costoAplicacion;
    private LocalDate proximaFecha;
    private LocalDateTime fechaHoraAplicacion;

    private String loteId;
    private String loteCodigo;
    private String observaciones;
}
