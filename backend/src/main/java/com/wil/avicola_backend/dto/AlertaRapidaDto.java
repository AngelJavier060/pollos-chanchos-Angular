package com.wil.avicola_backend.dto;

import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AlertaRapidaDto {
    private LocalDate fechaObjetivo;
    private Integer diaDeVida;
    private Long asignacionId;
    private String loteId;
    private String loteCodigo;
    private Long planDetalleId;
    private Long productId;
    private String productName;
    private String tipo; // alimentacion_especial, vacuna, medicina, etc.
    private String mensaje;
}
