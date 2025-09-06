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
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
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
@Table(name = "venta_animal")
@EntityListeners(AuditingEntityListener.class)
public class VentaAnimal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    private LocalDate fecha;

    // Lote vendido (UUID como String)
    @NotNull
    @Column(name = "lote_id", length = 36)
    private String loteId;

    @Column(name = "lote_codigo")
    private String loteCodigo;

    @Column(name = "animal_id")
    private Long animalId;

    @Column(name = "animal_name")
    private String animalName;

    @NotNull
    @DecimalMin(value = "0.01")
    private BigDecimal cantidad; // número de animales

    @NotNull
    @DecimalMin(value = "0.00")
    @Column(name = "precio_unit", precision = 12, scale = 2)
    private BigDecimal precioUnit;

    @NotNull
    @DecimalMin(value = "0.00")
    @Column(precision = 12, scale = 2)
    private BigDecimal total;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vendedor_id")
    private Usuario vendedor;

    public enum Estado { EMITIDA, ANULADA }

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Estado estado = Estado.EMITIDA;

    @CreatedDate
    private LocalDateTime createDate;

    @LastModifiedDate
    private LocalDateTime updateDate;
}
