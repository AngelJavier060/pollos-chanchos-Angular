package com.wil.avicola_backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "plan_ejecucion_historial")
public class PlanEjecucionHistorial {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "plan_ejecucion_id", nullable = false)
    private Long planEjecucionId;
    
    @Column(name = "campo_modificado", nullable = false, length = 50)
    private String campoModificado;
    
    @Column(name = "valor_anterior", columnDefinition = "TEXT")
    private String valorAnterior;
    
    @Column(name = "valor_nuevo", columnDefinition = "TEXT")
    private String valorNuevo;
    
    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;
    
    @Column(name = "fecha_cambio")
    private LocalDateTime fechaCambio;
    
    @Column(name = "motivo", columnDefinition = "TEXT")
    private String motivo;
    
    @Column(name = "ip_address", length = 45)
    private String ipAddress;
    
    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent;
    
    // Constructores
    public PlanEjecucionHistorial() {
        this.fechaCambio = LocalDateTime.now();
    }
    
    public PlanEjecucionHistorial(Long planEjecucionId, String campoModificado, 
                                 String valorAnterior, String valorNuevo, 
                                 Long usuarioId, String motivo) {
        this();
        this.planEjecucionId = planEjecucionId;
        this.campoModificado = campoModificado;
        this.valorAnterior = valorAnterior;
        this.valorNuevo = valorNuevo;
        this.usuarioId = usuarioId;
        this.motivo = motivo;
    }
    
    // Getters y Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public Long getPlanEjecucionId() { return planEjecucionId; }
    public void setPlanEjecucionId(Long planEjecucionId) { this.planEjecucionId = planEjecucionId; }
    
    public String getCampoModificado() { return campoModificado; }
    public void setCampoModificado(String campoModificado) { this.campoModificado = campoModificado; }
    
    public String getValorAnterior() { return valorAnterior; }
    public void setValorAnterior(String valorAnterior) { this.valorAnterior = valorAnterior; }
    
    public String getValorNuevo() { return valorNuevo; }
    public void setValorNuevo(String valorNuevo) { this.valorNuevo = valorNuevo; }
    
    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }
    
    public LocalDateTime getFechaCambio() { return fechaCambio; }
    public void setFechaCambio(LocalDateTime fechaCambio) { this.fechaCambio = fechaCambio; }
    
    public String getMotivo() { return motivo; }
    public void setMotivo(String motivo) { this.motivo = motivo; }
    
    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
    
    public String getUserAgent() { return userAgent; }
    public void setUserAgent(String userAgent) { this.userAgent = userAgent; }
}
