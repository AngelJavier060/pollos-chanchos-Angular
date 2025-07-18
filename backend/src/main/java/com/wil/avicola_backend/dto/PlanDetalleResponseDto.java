package com.wil.avicola_backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * DTO de respuesta para los detalles del plan de alimentación
 * Evita problemas de serialización con proxies de Hibernate
 */
public class PlanDetalleResponseDto {
    
    @JsonProperty("id")
    private Long id;
    
    @JsonProperty("dayStart")
    private Integer dayStart;
    
    @JsonProperty("dayEnd")
    private Integer dayEnd;
    
    @JsonProperty("quantityPerAnimal")
    private BigDecimal quantityPerAnimal;
    
    @JsonProperty("observations")
    private String observations;
    
    @JsonProperty("frequency")
    private String frequency;
    
    @JsonProperty("product")
    private ProductSimpleDto product;
    
    @JsonProperty("animal")
    private AnimalSimpleDto animal;
    
    @JsonProperty("planAlimentacionId")
    private Long planAlimentacionId;
    
    @JsonProperty("createdAt")
    private LocalDateTime createdAt;
    
    @JsonProperty("updatedAt")
    private LocalDateTime updatedAt;
    
    // Constructor vacío
    public PlanDetalleResponseDto() {}
    
    // Constructor completo
    public PlanDetalleResponseDto(Long id, Integer dayStart, Integer dayEnd, 
                                 BigDecimal quantityPerAnimal, String observations, String frequency,
                                 ProductSimpleDto product, AnimalSimpleDto animal, Long planAlimentacionId,
                                 LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.dayStart = dayStart;
        this.dayEnd = dayEnd;
        this.quantityPerAnimal = quantityPerAnimal;
        this.observations = observations;
        this.frequency = frequency;
        this.product = product;
        this.animal = animal;
        this.planAlimentacionId = planAlimentacionId;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
    
    // Getters y Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public Integer getDayStart() {
        return dayStart;
    }
    
    public void setDayStart(Integer dayStart) {
        this.dayStart = dayStart;
    }
    
    public Integer getDayEnd() {
        return dayEnd;
    }
    
    public void setDayEnd(Integer dayEnd) {
        this.dayEnd = dayEnd;
    }
    
    public BigDecimal getQuantityPerAnimal() {
        return quantityPerAnimal;
    }
    
    public void setQuantityPerAnimal(BigDecimal quantityPerAnimal) {
        this.quantityPerAnimal = quantityPerAnimal;
    }
    
    public String getObservations() {
        return observations;
    }
    
    public void setObservations(String observations) {
        this.observations = observations;
    }
    
    public String getFrequency() {
        return frequency;
    }
    
    public void setFrequency(String frequency) {
        this.frequency = frequency;
    }
    
    public ProductSimpleDto getProduct() {
        return product;
    }
    
    public void setProduct(ProductSimpleDto product) {
        this.product = product;
    }
    
    public AnimalSimpleDto getAnimal() {
        return animal;
    }
    
    public void setAnimal(AnimalSimpleDto animal) {
        this.animal = animal;
    }
    
    public Long getPlanAlimentacionId() {
        return planAlimentacionId;
    }
    
    public void setPlanAlimentacionId(Long planAlimentacionId) {
        this.planAlimentacionId = planAlimentacionId;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
    
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
    
    @Override
    public String toString() {
        return "PlanDetalleResponseDto{" +
                "id=" + id +
                ", dayStart=" + dayStart +
                ", dayEnd=" + dayEnd +
                ", quantityPerAnimal=" + quantityPerAnimal +
                ", observations='" + observations + '\'' +
                ", product=" + product +
                ", animal=" + animal +
                ", planAlimentacionId=" + planAlimentacionId +
                ", createdAt=" + createdAt +
                ", updatedAt=" + updatedAt +
                '}';
    }
}
