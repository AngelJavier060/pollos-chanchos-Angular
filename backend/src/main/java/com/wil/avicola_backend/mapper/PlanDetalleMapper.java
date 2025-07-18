package com.wil.avicola_backend.mapper;

import com.wil.avicola_backend.dto.PlanDetalleResponseDto;
import com.wil.avicola_backend.dto.ProductSimpleDto;
import com.wil.avicola_backend.dto.AnimalSimpleDto;
import com.wil.avicola_backend.model.PlanDetalle;
import com.wil.avicola_backend.model.Product;
import com.wil.avicola_backend.model.Animal;
import com.wil.avicola_backend.model.Category;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Mapper para convertir entidades JPA a DTOs seguros para serialización
 * Evita problemas con proxies de Hibernate
 */
@Component
public class PlanDetalleMapper {
    
    /**
     * Convierte una entidad PlanDetalle a DTO
     */
    public PlanDetalleResponseDto toDto(PlanDetalle entity) {
        if (entity == null) {
            return null;
        }
        
        PlanDetalleResponseDto dto = new PlanDetalleResponseDto();
        dto.setId(entity.getId());
        dto.setDayStart(entity.getDayStart());
        dto.setDayEnd(entity.getDayEnd());
        dto.setQuantityPerAnimal(entity.getQuantityPerAnimal() != null ? 
            java.math.BigDecimal.valueOf(entity.getQuantityPerAnimal()) : null);
        dto.setObservations(entity.getInstructions());
        dto.setFrequency(entity.getFrequency() != null ? entity.getFrequency().name() : null); // Mapear frequency
        dto.setCreatedAt(entity.getCreateDate());
        dto.setUpdatedAt(entity.getUpdateDate());
        
        // Mapear plan de alimentación ID (evitar proxy)
        if (entity.getPlanAlimentacion() != null) {
            dto.setPlanAlimentacionId(entity.getPlanAlimentacion().getId());
        }
        
        // Mapear producto (evitar proxy)
        if (entity.getProduct() != null) {
            dto.setProduct(toProductDto(entity.getProduct()));
        }
        
        // Mapear animal (evitar proxy)
        if (entity.getPlanAlimentacion() != null && entity.getPlanAlimentacion().getAnimal() != null) {
            dto.setAnimal(toAnimalDto(entity.getPlanAlimentacion().getAnimal()));
        }
        
        return dto;
    }
    
    /**
     * Convierte una lista de entidades PlanDetalle a DTOs
     */
    public List<PlanDetalleResponseDto> toDtoList(List<PlanDetalle> entities) {
        if (entities == null) {
            return null;
        }
        
        return entities.stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }
    
    /**
     * Convierte una entidad Product a DTO simple
     */
    private ProductSimpleDto toProductDto(Product product) {
        if (product == null) {
            return null;
        }
        
        ProductSimpleDto dto = new ProductSimpleDto();
        dto.setId(product.getId());
        dto.setName(product.getName());
        dto.setDescription(product.getName_stage()); // Usando name_stage como descripción
        dto.setPrice(product.getPrice_unit() != 0 ? 
            java.math.BigDecimal.valueOf(product.getPrice_unit()) : null);
        
        // Obtener unidad de medida
        if (product.getUnitMeasurement() != null) {
            dto.setUnit(product.getUnitMeasurement().getName());
        }
        
        // Mapear categoría evitando proxy
        if (product.getCategory() != null) {
            Category category = product.getCategory();
            dto.setCategoryId(category.getId());
            dto.setCategoryName(category.getName());
        }
        
        return dto;
    }
    
    /**
     * Convierte una entidad Animal a DTO simple
     */
    private AnimalSimpleDto toAnimalDto(Animal animal) {
        if (animal == null) {
            return null;
        }
        
        AnimalSimpleDto dto = new AnimalSimpleDto();
        dto.setId(animal.getId());
        dto.setName(animal.getName());
        dto.setDescription(animal.getDescription());
        
        return dto;
    }
}
