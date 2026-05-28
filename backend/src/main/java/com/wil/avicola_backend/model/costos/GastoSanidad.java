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
public class GastoSanidad {
    @Id
    private String id;

    @NotBlank
    private String nombreGasto;

    private String detalle;

    @NotNull
    @Min(0)
    private Double cantidad;

    @NotNull
    @Min(0)
    private Double costoUnitario;

    @NotNull
    private LocalDate fecha;

    private String observaciones;

    @Column(name = "product_id")
    private Long productId;

    @Column(name = "tipo_aplicacion", length = 30)
    private String tipoAplicacion;

    @Column(name = "via", length = 30)
    private String via;

    @Column(name = "aplicado_por_tipo", length = 20)
    private String aplicadoPorTipo;

    @Column(name = "responsable", length = 120)
    private String responsable;

    @Column(name = "costo_aplicacion")
    private Double costoAplicacion;

    @Column(name = "proxima_fecha")
    private LocalDate proximaFecha;

    @Column(name = "fecha_hora_aplicacion")
    private LocalDateTime fechaHoraAplicacion;

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
        double c = this.cantidad != null ? this.cantidad : 0d;
        double u = this.costoUnitario != null ? this.costoUnitario : 0d;
        double ca = this.costoAplicacion != null ? this.costoAplicacion : 0d;
        this.total = Math.round(((c * u) + ca) * 100.0) / 100.0;
    }
}
