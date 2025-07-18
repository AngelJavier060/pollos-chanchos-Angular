package com.wil.avicola_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class PlanAlimentacionUpdateDto {
    
    @NotBlank(message = "El nombre del plan es obligatorio")
    @Size(min = 2, max = 100, message = "El nombre debe tener entre 2 y 100 caracteres")
    private String name;
    
    @Size(max = 500, message = "La descripción no puede exceder 500 caracteres")
    private String description;
    
    @NotNull(message = "El animal es obligatorio")
    private Long animalId;
    
    // Constructores
    public PlanAlimentacionUpdateDto() {}
    
    public PlanAlimentacionUpdateDto(String name, String description, Long animalId) {
        this.name = name;
        this.description = description;
        this.animalId = animalId;
    }
    
    // Getters y Setters
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
    }
    
    public Long getAnimalId() {
        return animalId;
    }
    
    public void setAnimalId(Long animalId) {
        this.animalId = animalId;
    }
} 