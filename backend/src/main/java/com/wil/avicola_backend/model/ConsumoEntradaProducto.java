package com.wil.avicola_backend.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.springframework.data.annotation.CreatedDate;
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
@Table(name = "consumo_entrada_producto")
@EntityListeners(AuditingEntityListener.class)
public class ConsumoEntradaProducto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne
    @JoinColumn(name = "movimiento_id")
    private MovimientoInventarioProducto movimiento;

    @NotNull
    @ManyToOne
    @JoinColumn(name = "entrada_id")
    private InventarioEntradaProducto entrada;

    @DecimalMin("0.000")
    @Column(name = "cantidad_base_consumida", precision = 12, scale = 3)
    private BigDecimal cantidadBaseConsumida;

    @DecimalMin("0.000")
    @Column(name = "cantidad_unidades_consumidas", precision = 12, scale = 3)
    private BigDecimal cantidadUnidadesConsumidas;

    @Column(length = 300)
    private String observaciones;

    @CreatedDate
    @Column(name = "create_date")
    private LocalDateTime createDate;
}
