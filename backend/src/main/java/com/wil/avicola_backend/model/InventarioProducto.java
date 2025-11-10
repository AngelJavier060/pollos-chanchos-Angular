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

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "inventario_producto")
@EntityListeners(AuditingEntityListener.class)
public class InventarioProducto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne
    @JoinColumn(name = "product_id")
    private Product product;

    @NotNull
    @DecimalMin(value = "0.000")
    @Column(name = "cantidad_stock", precision = 12, scale = 3)
    private BigDecimal cantidadStock;

    @Column(name = "unidad_medida", length = 50)
    private String unidadMedida; // fallback si el producto no tiene unidad definida

    @Column(name = "stock_minimo", precision = 12, scale = 3)
    private BigDecimal stockMinimo;

    @Column(name = "costo_unitario_promedio", precision = 12, scale = 4)
    private BigDecimal costoUnitarioPromedio;

    @Column(name = "activo")
    private Boolean activo;

    @CreatedDate
    @Column(name = "create_date")
    private LocalDateTime createDate;

    @LastModifiedDate
    @Column(name = "update_date")
    private LocalDateTime updateDate;

    public boolean tieneStockSuficiente(BigDecimal cantidad) {
        if (cantidad == null) return false;
        BigDecimal disponible = cantidadStock != null ? cantidadStock : BigDecimal.ZERO;
        return disponible.compareTo(cantidad) >= 0;
    }

    public void agregarStock(BigDecimal cantidad) {
        if (cantidad == null) return;
        if (this.cantidadStock == null) this.cantidadStock = BigDecimal.ZERO;
        this.cantidadStock = this.cantidadStock.add(cantidad);
    }

    public void descontarStock(BigDecimal cantidad) {
        if (cantidad == null) return;
        if (!tieneStockSuficiente(cantidad)) {
            throw new IllegalArgumentException("Stock insuficiente para descontar: " + cantidad);
        }
        this.cantidadStock = this.cantidadStock.subtract(cantidad);
    }
}
