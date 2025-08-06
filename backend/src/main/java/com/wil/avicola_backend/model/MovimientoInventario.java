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

/**
 * Entidad para registrar movimientos de inventario
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "movimientos_inventario")
@EntityListeners(AuditingEntityListener.class)
public class MovimientoInventario {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotNull(message = "El inventario es obligatorio")
    @ManyToOne
    @JoinColumn(name = "inventario_id")
    private InventarioAlimento inventario;
    
    @NotNull(message = "El tipo de movimiento es obligatorio")
    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_movimiento", length = 20)
    private TipoMovimiento tipoMovimiento;
    
    @NotNull(message = "La cantidad es obligatoria")
    @DecimalMin(value = "0.01", message = "La cantidad debe ser mayor a cero")
    @Column(precision = 10, scale = 3)
    private BigDecimal cantidad;
    
    @Column(name = "stock_anterior", precision = 10, scale = 3)
    private BigDecimal stockAnterior;
    
    @Column(name = "stock_nuevo", precision = 10, scale = 3)
    private BigDecimal stockNuevo;
    
    @Column(name = "lote_id", length = 36)
    private String loteId; // Referencia al lote cuando es consumo (UUID)
    
    @Column(length = 500)
    private String observaciones;
    
    @Column(name = "usuario_registro", length = 100)
    private String usuarioRegistro;
    
    @CreatedDate
    @Column(name = "fecha_movimiento")
    private LocalDateTime fechaMovimiento;
    
    /**
     * Enum para tipos de movimiento
     */
    public enum TipoMovimiento {
        ENTRADA("Entrada de alimento al inventario"),
        SALIDA("Salida de alimento del inventario"),
        CONSUMO_LOTE("Consumo de alimento por lote"),
        AJUSTE_INVENTARIO("Ajuste manual de inventario"),
        MERMA("Merma o pérdida de alimento");
        
        private final String descripcion;
        
        TipoMovimiento(String descripcion) {
            this.descripcion = descripcion;
        }
        
        public String getDescripcion() {
            return descripcion;
        }
    }
}
