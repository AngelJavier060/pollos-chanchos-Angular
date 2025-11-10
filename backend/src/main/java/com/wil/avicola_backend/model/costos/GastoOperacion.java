package com.wil.avicola_backend.model.costos;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.wil.avicola_backend.model.Lote;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.validation.constraints.Min;
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
@EntityListeners(AuditingEntityListener.class)
public class GastoOperacion {
    @Id
    private String id;

    @NotBlank
    private String nombreGasto;
    private String detalle;
    private String unidad;

    @NotNull
    @Min(0)
    private Double cantidadConsumida;

    @NotNull
    @Min(0)
    private Double costoUnitario;

    @NotNull
    private LocalDate fecha;

    private String observaciones;

    @ManyToOne
    @JoinColumn(name = "lote_id")
    private Lote lote;

    @Column(name = "total")
    private Double total;

    @CreatedDate
    private LocalDateTime create_date;

    @LastModifiedDate
    private LocalDateTime update_date;

    @PrePersist
    public void prePersist() {
        if (this.id == null || this.id.isEmpty()) {
            this.id = UUID.randomUUID().toString();
        }
        calcularTotal();
    }

    @PreUpdate
    public void preUpdate() {
        calcularTotal();
    }

    private void calcularTotal() {
        double c = this.cantidadConsumida != null ? this.cantidadConsumida : 0d;
        double u = this.costoUnitario != null ? this.costoUnitario : 0d;
        this.total = Math.round((c * u) * 100.0) / 100.0;
    }
}
