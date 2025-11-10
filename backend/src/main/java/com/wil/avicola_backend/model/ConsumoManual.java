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
import jakarta.validation.constraints.NotBlank;
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
@Table(name = "consumo_manual")
@EntityListeners(AuditingEntityListener.class)
public class ConsumoManual {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(name = "lote_id", length = 36, nullable = false)
    private String loteId;

    @NotNull
    @Column(name = "fecha", nullable = false)
    private LocalDate fecha;

    @ManyToOne
    @JoinColumn(name = "nombre_producto_id")
    private NombreProducto nombreProducto; // opcional

    @Column(name = "nombre_libre", length = 150)
    private String nombreLibre;

    @NotBlank
    @Column(name = "unidad_medida", length = 30, nullable = false)
    private String unidadMedida;

    @NotNull
    @DecimalMin(value = "0.001")
    @Column(name = "cantidad", precision = 12, scale = 3, nullable = false)
    private BigDecimal cantidad;

    @DecimalMin(value = "0.0000")
    @Column(name = "costo_unitario", precision = 12, scale = 4)
    private BigDecimal costoUnitario;

    @DecimalMin(value = "0.0000")
    @Column(name = "costo_total", precision = 14, scale = 4)
    private BigDecimal costoTotal;

    @Column(name = "observaciones", length = 500)
    private String observaciones;

    @Column(name = "usuario_registro", length = 100)
    private String usuarioRegistro;

    @CreatedDate
    @Column(name = "create_date")
    private LocalDateTime createDate;

    @LastModifiedDate
    @Column(name = "update_date")
    private LocalDateTime updateDate;
}
