package com.wil.avicola_backend.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PlanAsignacionRequestDto {
    
    @NotNull(message = "El ID del plan es obligatorio")
    private Long planId;
    
    @NotNull(message = "El ID del lote es obligatorio")
    private String loteId;
    
    @NotNull(message = "El ID del usuario asignado es obligatorio")
    private Long assignedUserId;
    
    @NotNull(message = "La fecha de inicio es obligatoria")
    private LocalDate startDate;
    
    private LocalDate endDate;
}
