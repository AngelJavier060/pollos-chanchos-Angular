package com.wil.avicola_backend.dto;

public class CorreccionRequest {
    
    private Long registroId;
    private String motivoCorreccion;
    private Long usuarioId;
    
    // Campos que se pueden corregir
    private Double nuevaCantidad;
    private Long nuevoProductoId;
    private String nuevasObservaciones;
    
    // Metadatos de la corrección
    private String ipAddress;
    private String userAgent;
    
    // Constructores
    public CorreccionRequest() {}
    
    // Getters y Setters
    public Long getRegistroId() { return registroId; }
    public void setRegistroId(Long registroId) { this.registroId = registroId; }
    
    public String getMotivoCorreccion() { return motivoCorreccion; }
    public void setMotivoCorreccion(String motivoCorreccion) { this.motivoCorreccion = motivoCorreccion; }
    
    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }
    
    public Double getNuevaCantidad() { return nuevaCantidad; }
    public void setNuevaCantidad(Double nuevaCantidad) { this.nuevaCantidad = nuevaCantidad; }
    
    public Long getNuevoProductoId() { return nuevoProductoId; }
    public void setNuevoProductoId(Long nuevoProductoId) { this.nuevoProductoId = nuevoProductoId; }
    
    public String getNuevasObservaciones() { return nuevasObservaciones; }
    public void setNuevasObservaciones(String nuevasObservaciones) { this.nuevasObservaciones = nuevasObservaciones; }
    
    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
    
    public String getUserAgent() { return userAgent; }
    public void setUserAgent(String userAgent) { this.userAgent = userAgent; }
}
