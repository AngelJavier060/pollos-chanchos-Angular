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
@Table(name = "gestacion_parto")
public class RegistroPartoGestacion {

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

    @Column(name = "numero_parto", nullable = false)
    private Integer numeroParto;

    @Column(name = "fecha_parto", nullable = false)
    private LocalDate fechaParto;

    @Column(name = "lechones_nacidos", nullable = false)
    private Integer lechonesNacidos = 0;

    @Column(name = "lechones_vivos", nullable = false)
    private Integer lechonesVivos = 0;

    @Column(name = "lechones_muertos", nullable = false)
    private Integer lechonesMuertos = 0;

    @Column(columnDefinition = "TEXT")
    private String observaciones;

    /** Foto post-parto / camada (URL relativa /uploads/...) */
    @Column(name = "foto_url", length = 500)
    private String fotoUrl;

    @Column(name = "usuario_registro", length = 255)
    private String usuarioRegistro;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
