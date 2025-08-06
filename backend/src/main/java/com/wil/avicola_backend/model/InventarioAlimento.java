package com.wil.avicola_backend.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Entidad para gestionar el inventario de alimentos
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "inventario_alimentos")
@EntityListeners(AuditingEntityListener.class)
public class InventarioAlimento {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotNull(message = "El tipo de alimento es obligatorio")
    @ManyToOne
    @JoinColumn(name = "tipo_alimento_id")
    private TypeFood tipoAlimento;
    
    @NotNull(message = "La cantidad en stock es obligatoria")
    @DecimalMin(value = "0.0", inclusive = true, message = "La cantidad no puede ser negativa")
    @Column(precision = 10, scale = 3)
    private BigDecimal cantidadStock;
    
    @Builder.Default
    @Column(length = 10)
    private String unidadMedida = "KG"; // KG por defecto
    
    @Builder.Default
    @DecimalMin(value = "0.0", inclusive = true, message = "El stock mínimo no puede ser negativo")
    @Column(precision = 10, scale = 3)
    private BigDecimal stockMinimo = BigDecimal.ZERO;
    
    @Column(length = 500)
    private String observaciones;
    
    @CreatedDate
    @Column(name = "fecha_creacion")
    private LocalDateTime fechaCreacion;
    
    @LastModifiedDate
    @Column(name = "fecha_actualizacion") 
    private LocalDateTime fechaActualizacion;
    
    /**
     * Validar si hay suficiente stock para consumir
     */
    public boolean tieneSuficienteStock(BigDecimal cantidadRequerida) {
        return cantidadStock.compareTo(cantidadRequerida) >= 0;
    }
    
    /**
     * Descontar del stock
     */
    public void descontarStock(BigDecimal cantidad) {
        if (!tieneSuficienteStock(cantidad)) {
            throw new IllegalArgumentException("Stock insuficiente. Disponible: " + cantidadStock + ", Requerido: " + cantidad);
        }
        this.cantidadStock = this.cantidadStock.subtract(cantidad);
    }
    
    /**
     * Agregar al stock
     */
    public void agregarStock(BigDecimal cantidad) {
        this.cantidadStock = this.cantidadStock.add(cantidad);
    }
    
    /**
     * Verificar si está por debajo del stock mínimo
     */
    public boolean estaEnStockMinimo() {
        return cantidadStock.compareTo(stockMinimo) <= 0;
    }
}
