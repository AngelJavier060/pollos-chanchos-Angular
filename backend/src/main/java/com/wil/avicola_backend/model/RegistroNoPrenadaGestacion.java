package com.wil.avicola_backend.model;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "gestacion_no_prenada")
public class RegistroNoPrenadaGestacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "gestacion_id", nullable = false)
    private Long gestacionId;

    @Column(name = "lote_id", nullable = false, length = 255)
    private String loteId;

    @Column(name = "numero_en_lote", nullable = false)
    private Integer numeroEnLote;

    @Column(name = "nombre_chancha", nullable = false, length = 100)
    private String nombreChancha;

    @Column(name = "fecha_inseminacion", nullable = false)
    private LocalDate fechaInseminacion;

    @Column(name = "fecha_confirmacion", nullable = false)
    private LocalDate fechaConfirmacion;

    @Column(name = "dias_gestacion", nullable = false)
    private Integer diasGestacion = 0;

    /** Ej: retorno_celo, ultrasonido_negativo, otro */
    @Column(length = 80)
    private String motivo;

    @Column(columnDefinition = "TEXT")
    private String observaciones;

    @Column(name = "foto_url", length = 500)
    private String fotoUrl;

    @Column(name = "usuario_registro", length = 255)
    private String usuarioRegistro;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
