package com.wil.avicola_backend.dto;

import lombok.Data;

@Data
public class GestacionNoPrenadaRequestDto {
    /** Fecha en que se confirma que no quedó prenada (yyyy-MM-dd) */
    private String fechaConfirmacion;
    /** retorno_celo | ultrasonido_negativo | otro */
    private String motivo;
    private String observaciones;
    private String fotoUrl;
}
