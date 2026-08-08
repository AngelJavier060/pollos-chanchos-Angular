package com.wil.avicola_backend.dto;

import lombok.Data;

@Data
public class GestacionChanchaRequestDto {
    private String loteId;
    private Integer numeroEnLote;
    private String fechaInseminacion;
    private Integer numeroParto;
    private String observaciones;
    private String fotoUrl;
    private Boolean activa;
    /**
     * Solo admin (frontend modo edición): permite corregir cupo/lote aunque
     * la chancha figure ocupada o marcada como vendida, y cierra conflictos.
     */
    private Boolean correccionAdmin;
}
