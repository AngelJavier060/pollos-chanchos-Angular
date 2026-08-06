package com.wil.avicola_backend.dto;

import lombok.Data;

@Data
public class GestacionPartoRequestDto {
    /** Fecha real del parto (yyyy-MM-dd) */
    private String fechaParto;
    private Integer lechonesNacidos;
    private Integer lechonesVivos;
    private Integer lechonesMuertos;
    private String observaciones;
    private String fotoUrl;
}
