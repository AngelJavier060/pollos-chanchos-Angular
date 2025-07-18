package com.wil.avicola_backend.dto;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlanAlimentacionResponseDto {
    private Long id;
    private String name;
    private String description;
    private Boolean active;
    private LocalDateTime createDate;
    private LocalDateTime updateDate;
    
    // Información del animal
    private Long animalId;
    private String animalName;
    private String animalType;
    
    // Información del usuario creador
    private Long createdByUserId;
    private String createdByUserName;
    private String createdByUserEmail;
}
