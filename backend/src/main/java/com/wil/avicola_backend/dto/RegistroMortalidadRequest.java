package com.wil.avicola_backend.dto;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class RegistroMortalidadRequest {
    private String loteId;
    private Long causaId;
    private Integer cantidadMuertos;
    private String descripcion; // Este corresponde a observaciones
    private String observaciones;
    private BigDecimal peso;
    private Integer edad;
    private String ubicacion;
    private Boolean confirmado = false;
}
