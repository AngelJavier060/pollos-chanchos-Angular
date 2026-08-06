package com.wil.avicola_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GestacionChanchaResponseDto {
    private String id;
    private String nombre;
    private String raza;
    private String fechaInseminacion;
    private Integer numeroParto;
    private String observaciones;
    private String fotoUrl;
    private String loteId;
    private String loteCodigo;
    private String loteNombre;
    private Integer numeroEnLote;
    private Boolean activa;
}
