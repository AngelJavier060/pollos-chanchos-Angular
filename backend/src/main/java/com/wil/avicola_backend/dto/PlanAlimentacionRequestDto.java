package com.wil.avicola_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PlanAlimentacionRequestDto {
    
    @NotBlank(message = "El nombre del plan es obligatorio")
    private String name;
    
    private String description;
    
    @NotNull(message = "El ID del animal es obligatorio")
    private Long animalId;
} 