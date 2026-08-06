package com.wil.avicola_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GestacionNoPrenadaResponseDto {
    private String id;
    private String gestacionId;
    private String loteId;
    private Integer numeroEnLote;
    private String nombreChancha;
    private String fechaInseminacion;
    private String fechaConfirmacion;
    private Integer diasGestacion;
    private String motivo;
    private String observaciones;
    private String fotoUrl;
    private String loteNombre;
}
