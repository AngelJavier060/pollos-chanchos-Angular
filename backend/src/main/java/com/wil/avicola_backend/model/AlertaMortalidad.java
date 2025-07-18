package com.wil.avicola_backend.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "alertas_mortalidad")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AlertaMortalidad {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoAlerta tipo;
    
    @Column(nullable = false)
    private String titulo;
    
    @Column(columnDefinition = "TEXT", nullable = false)
    private String mensaje;
    
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now();
    
    @Column(nullable = false)
    private Boolean leida = false;
    
    @Column(name = "lote_id")
    private Long loteId;
    
    @Column(name = "usuario_id")
    private Long usuarioId;
    
    @CreationTimestamp
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // Enum
    public enum TipoAlerta {
        CRITICA("critica"),
        ADVERTENCIA("advertencia"),
        INFORMATIVA("informativa");
        
        private final String value;
        
        TipoAlerta(String value) {
            this.value = value;
        }
        
        public String getValue() {
            return value;
        }
    }
} 