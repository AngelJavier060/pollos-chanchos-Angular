package com.wil.avicola_backend.dto;

import com.wil.avicola_backend.model.PlanDetalle;
import com.wil.avicola_backend.model.Product;
import com.wil.avicola_backend.model.Animal;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlanDetalleRequestDto {
    
    @NotNull(message = "El día inicial es obligatorio")
    @Min(value = 1, message = "El día inicial debe ser mayor a 0")
    private Integer dayStart;
    
    @NotNull(message = "El día final es obligatorio")
    @Min(value = 1, message = "El día final debe ser mayor a 0")
    private Integer dayEnd;
    
    @NotNull(message = "El producto es obligatorio")
    private ProductDto product;
    
    private AnimalDto animal;
    
    @NotNull(message = "La cantidad por animal es obligatoria")
    @Positive(message = "La cantidad debe ser mayor a 0")
    private Double quantityPerAnimal;
    
    private PlanDetalle.Frequency frequency = PlanDetalle.Frequency.DIARIA;
    
    private String instructions;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductDto {
        @NotNull
        private Long id;
        private String name;
    }
    
    @Data
    @NoArgsConstructor  
    @AllArgsConstructor
    public static class AnimalDto {
        private Long id;
        private String name;
    }
    
    /**
     * Convierte el DTO a entidad PlanDetalle (sin planAlimentacion)
     */
    public PlanDetalle toEntity() {
        Product prod = new Product();
        prod.setId(this.product.getId());
        prod.setName(this.product.getName());
        
        PlanDetalle.PlanDetalleBuilder builder = PlanDetalle.builder()
            .dayStart(this.dayStart)
            .dayEnd(this.dayEnd)
            .product(prod)
            .quantityPerAnimal(this.quantityPerAnimal)
            .frequency(this.frequency != null ? this.frequency : PlanDetalle.Frequency.DIARIA)
            .instructions(this.instructions);
            
        // Agregar animal si está presente
        if (this.animal != null && this.animal.getId() != null) {
            Animal animalEntity = new Animal();
            animalEntity.setId(this.animal.getId());
            animalEntity.setName(this.animal.getName());
            builder.animal(animalEntity);
        }
        
        return builder.build();
    }
}
