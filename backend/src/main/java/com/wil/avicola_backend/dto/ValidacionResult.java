package com.wil.avicola_backend.dto;

import java.math.BigDecimal;

public class ValidacionResult {
    
    private boolean valido;
    private String mensaje;
    private String tipoAlerta; // 'warning', 'error', 'info'
    private BigDecimal cantidadRecomendada;
    private BigDecimal cantidadMinima;
    private BigDecimal cantidadMaxima;
    private boolean requiereConfirmacion;
    
    // Constructores
    public ValidacionResult() {}
    
    public ValidacionResult(boolean valido, String mensaje) {
        this.valido = valido;
        this.mensaje = mensaje;
        this.tipoAlerta = valido ? "info" : "error";
    }
    
    public ValidacionResult(boolean valido, String mensaje, String tipoAlerta) {
        this.valido = valido;
        this.mensaje = mensaje;
        this.tipoAlerta = tipoAlerta;
    }
    
    // Métodos estáticos para crear resultados comunes
    public static ValidacionResult exito(String mensaje) {
        return new ValidacionResult(true, mensaje, "info");
    }
    
    public static ValidacionResult error(String mensaje) {
        return new ValidacionResult(false, mensaje, "error");
    }
    
    public static ValidacionResult advertencia(String mensaje) {
        ValidacionResult result = new ValidacionResult(true, mensaje, "warning");
        result.setRequiereConfirmacion(true);
        return result;
    }
    
    // Getters y Setters
    public boolean isValido() { return valido; }
    public void setValido(boolean valido) { this.valido = valido; }
    
    public String getMensaje() { return mensaje; }
    public void setMensaje(String mensaje) { this.mensaje = mensaje; }
    
    public String getTipoAlerta() { return tipoAlerta; }
    public void setTipoAlerta(String tipoAlerta) { this.tipoAlerta = tipoAlerta; }
    
    public BigDecimal getCantidadRecomendada() { return cantidadRecomendada; }
    public void setCantidadRecomendada(BigDecimal cantidadRecomendada) { this.cantidadRecomendada = cantidadRecomendada; }
    
    public BigDecimal getCantidadMinima() { return cantidadMinima; }
    public void setCantidadMinima(BigDecimal cantidadMinima) { this.cantidadMinima = cantidadMinima; }
    
    public BigDecimal getCantidadMaxima() { return cantidadMaxima; }
    public void setCantidadMaxima(BigDecimal cantidadMaxima) { this.cantidadMaxima = cantidadMaxima; }
    
    public boolean isRequiereConfirmacion() { return requiereConfirmacion; }
    public void setRequiereConfirmacion(boolean requiereConfirmacion) { this.requiereConfirmacion = requiereConfirmacion; }
}
