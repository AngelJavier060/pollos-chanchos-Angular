package com.wil.avicola_backend.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "movimientos_inventario_producto")
@EntityListeners(AuditingEntityListener.class)
public class MovimientoInventarioProducto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne
    @JoinColumn(name = "inventario_producto_id")
    private InventarioProducto inventarioProducto;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_movimiento", length = 30)
    private TipoMovimiento tipoMovimiento;

    @NotNull
    @DecimalMin(value = "0.001")
    @Column(precision = 12, scale = 3)
    private BigDecimal cantidad;

    @Column(name = "costo_unitario", precision = 12, scale = 4)
    private BigDecimal costoUnitario;

    @Column(name = "costo_total", precision = 14, scale = 4)
    private BigDecimal costoTotal;

    @Column(name = "stock_anterior", precision = 12, scale = 3)
    private BigDecimal stockAnterior;

    @Column(name = "stock_nuevo", precision = 12, scale = 3)
    private BigDecimal stockNuevo;

    @Column(name = "lote_id", length = 36)
    private String loteId;

    @Column(length = 500)
    private String observaciones;

    @Column(name = "usuario_registro", length = 100)
    private String usuarioRegistro;

    @CreatedDate
    @Column(name = "fecha_movimiento")
    private LocalDateTime fechaMovimiento;

    public enum TipoMovimiento {
        ENTRADA,
        SALIDA,
        CONSUMO_LOTE,
        AJUSTE
    }
}
