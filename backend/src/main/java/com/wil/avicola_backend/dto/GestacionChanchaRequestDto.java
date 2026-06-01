package com.wil.avicola_backend.dto;

import lombok.Data;

@Data
public class GestacionChanchaRequestDto {
    private String loteId;
    private Integer numeroEnLote;
    private String fechaInseminacion;
    private Integer numeroParto;
    private String observaciones;
    private Boolean activa;
}
