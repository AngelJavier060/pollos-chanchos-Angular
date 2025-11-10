package com.wil.avicola_backend.model;

import java.math.BigDecimal;
import java.time.LocalDate;
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
@Table(name = "inventario_entrada_producto")
@EntityListeners(AuditingEntityListener.class)
public class InventarioEntradaProducto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne
    @JoinColumn(name = "product_id")
    private Product product;

    @ManyToOne
    @JoinColumn(name = "provider_id")
    private Provider provider;

    @Column(name = "codigo_lote", length = 50)
    private String codigoLote;

    @Column(name = "fecha_ingreso")
    private LocalDateTime fechaIngreso;

    @Column(name = "fecha_vencimiento")
    private LocalDate fechaVencimiento;

    @Column(name = "unidad_control", length = 30)
    private String unidadControl; // p.ej.: saco, frasco, sobre, unidad

    @DecimalMin("0.000")
    @Column(name = "contenido_por_unidad", precision = 12, scale = 3)
    private BigDecimal contenidoPorUnidad; // en unidad base (kg, g, ml, etc.)

    @DecimalMin("0.000")
    @Column(name = "cantidad_unidades", precision = 12, scale = 3)
    private BigDecimal cantidadUnidades;

    @Column(name = "costo_unitario_base", precision = 12, scale = 4)
    private BigDecimal costoUnitarioBase; // costo por unidad base (kg, g, ml)

    @Column(name = "costo_por_unidad_control", precision = 12, scale = 4)
    private BigDecimal costoPorUnidadControl; // costo por unidad de control (saco, frasco, etc.)

    @DecimalMin("0.000")
    @Column(name = "stock_unidades_restantes", precision = 12, scale = 3)
    private BigDecimal stockUnidadesRestantes;

    @DecimalMin("0.000")
    @Column(name = "stock_base_restante", precision = 12, scale = 3)
    private BigDecimal stockBaseRestante; // cantidad en unidad base (ej. kg)

    @Column(name = "activo")
    private Boolean activo;

    @Column(length = 500)
    private String observaciones;

    @CreatedDate
    @Column(name = "create_date")
    private LocalDateTime createDate;

    @LastModifiedDate
    @Column(name = "update_date")
    private LocalDateTime updateDate;
}
