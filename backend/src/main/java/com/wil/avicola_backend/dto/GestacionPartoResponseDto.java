package com.wil.avicola_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GestacionPartoResponseDto {
    private String id;
    private String gestacionId;
    private String loteId;
    private Integer numeroEnLote;
    private String nombreChancha;
    private Integer numeroParto;
    private String fechaParto;
    private Integer lechonesNacidos;
    private Integer lechonesVivos;
    private Integer lechonesMuertos;
    private String observaciones;
    /** Foto del parto / camada */
    private String fotoUrl;
    /** Foto de la chancha tomada en la gestación */
    private String fotoChanchaUrl;
    private String loteNombre;
}
