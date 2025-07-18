package com.wil.avicola_backend.service;

import com.wil.avicola_backend.dto.CorreccionRequest;
import com.wil.avicola_backend.dto.ValidacionResult;
import com.wil.avicola_backend.entity.PlanEjecucionHistorial;
import com.wil.avicola_backend.entity.ValidacionAlimentacion;
import com.wil.avicola_backend.model.PlanEjecucion;
import com.wil.avicola_backend.repository.PlanEjecucionHistorialRepository;
import com.wil.avicola_backend.repository.PlanEjecucionRepository;
import com.wil.avicola_backend.repository.ValidacionAlimentacionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class CorreccionService {
    
    @Autowired
    private PlanEjecucionRepository planEjecucionRepository;
    
    @Autowired
    private PlanEjecucionHistorialRepository historialRepository;
    
    @Autowired
    private ValidacionAlimentacionRepository validacionRepository;
    
    /**
     * Valida una cantidad antes de registrarla
     */
    public ValidacionResult validarCantidad(String tipoAnimal, String etapa, 
                                          Double cantidadPorAnimal, Integer numeroAnimales) {
        
        // Buscar las validaciones para este tipo y etapa
        Optional<ValidacionAlimentacion> validacionOpt = 
            validacionRepository.findByTipoAnimalAndEtapaAndActivo(tipoAnimal, etapa, true);
        
        if (validacionOpt.isEmpty()) {
            return ValidacionResult.advertencia(
                "No hay validaciones configuradas para " + tipoAnimal + " en etapa " + etapa
            );
        }
        
        ValidacionAlimentacion validacion = validacionOpt.get();
        BigDecimal cantidad = new BigDecimal(cantidadPorAnimal.toString());
        
        // Validar límites absolutos
        if (cantidad.compareTo(validacion.getCantidadMinimaPorAnimal()) < 0) {
            return ValidacionResult.error(
                String.format("Cantidad muy baja. Mínimo recomendado: %.3f kg/animal", 
                             validacion.getCantidadMinimaPorAnimal())
            );
        }
        
        if (cantidad.compareTo(validacion.getCantidadMaximaPorAnimal()) > 0) {
            return ValidacionResult.error(
                String.format("Cantidad muy alta. Máximo recomendado: %.3f kg/animal", 
                             validacion.getCantidadMaximaPorAnimal())
            );
        }
        
        // Calcular cantidad total y porcentajes para alertas
        BigDecimal cantidadTotal = cantidad.multiply(new BigDecimal(numeroAnimales));
        BigDecimal cantidadRecomendada = validacion.getCantidadMinimaPorAnimal()
            .add(validacion.getCantidadMaximaPorAnimal())
            .divide(new BigDecimal("2"));
        
        BigDecimal porcentajeVsRecomendado = cantidad
            .multiply(new BigDecimal("100"))
            .divide(cantidadRecomendada, 2, RoundingMode.HALF_UP);
        
        ValidacionResult result = new ValidacionResult();
        result.setValido(true);
        result.setCantidadRecomendada(cantidadRecomendada);
        result.setCantidadMinima(validacion.getCantidadMinimaPorAnimal());
        result.setCantidadMaxima(validacion.getCantidadMaximaPorAnimal());
        
        // Determinar tipo de alerta basado en porcentajes
        if (porcentajeVsRecomendado.compareTo(validacion.getPorcentajeAlertaMinimo()) < 0) {
            result.setTipoAlerta("warning");
            result.setMensaje(
                String.format("Cantidad baja (%.1f%% de lo recomendado). Total: %.2f kg para %d animales. ¿Continuar?", 
                             porcentajeVsRecomendado, cantidadTotal, numeroAnimales)
            );
            result.setRequiereConfirmacion(true);
        } else if (porcentajeVsRecomendado.compareTo(validacion.getPorcentajeAlertaMaximo()) > 0) {
            result.setTipoAlerta("warning");
            result.setMensaje(
                String.format("Cantidad alta (%.1f%% de lo recomendado). Total: %.2f kg para %d animales. ¿Continuar?", 
                             porcentajeVsRecomendado, cantidadTotal, numeroAnimales)
            );
            result.setRequiereConfirmacion(true);
        } else {
            result.setTipoAlerta("info");
            result.setMensaje(
                String.format("Cantidad correcta. Total: %.2f kg para %d animales", 
                             cantidadTotal, numeroAnimales)
            );
        }
        
        return result;
    }
    
    /**
     * Corrige un registro existente
     */
    @Transactional
    public PlanEjecucion corregirRegistro(CorreccionRequest request) {
        
        Optional<PlanEjecucion> registroOpt = planEjecucionRepository.findById(request.getRegistroId());
        if (registroOpt.isEmpty()) {
            throw new RuntimeException("Registro no encontrado");
        }
        
        PlanEjecucion registro = registroOpt.get();
        
        // Verificar que no haya sido editado ya
        if (Boolean.TRUE.equals(registro.getEditado())) {
            throw new RuntimeException("Este registro ya fue editado anteriormente");
        }
        
        // Verificar límite de tiempo (ejemplo: 48 horas)
        LocalDateTime limite = registro.getCreateDate().plusHours(48);
        if (LocalDateTime.now().isAfter(limite)) {
            throw new RuntimeException("No se puede corregir: han pasado más de 48 horas");
        }
        
        // Guardar valores originales si es la primera corrección
        if (registro.getCantidadOriginal() == null) {
            registro.setCantidadOriginal(registro.getQuantityApplied());
        }
        
        // Aplicar correcciones y crear historial
        if (request.getNuevaCantidad() != null && 
            !request.getNuevaCantidad().equals(registro.getQuantityApplied())) {
            
            crearEntradaHistorial(registro.getId(), "cantidad", 
                                registro.getQuantityApplied().toString(), 
                                request.getNuevaCantidad().toString(),
                                request.getUsuarioId(), request.getMotivoCorreccion(),
                                request.getIpAddress(), request.getUserAgent());
            
            registro.setQuantityApplied(request.getNuevaCantidad());
        }
        
        if (request.getNuevasObservaciones() != null && 
            !request.getNuevasObservaciones().equals(registro.getObservations())) {
            
            crearEntradaHistorial(registro.getId(), "observaciones", 
                                registro.getObservations(), 
                                request.getNuevasObservaciones(),
                                request.getUsuarioId(), request.getMotivoCorreccion(),
                                request.getIpAddress(), request.getUserAgent());
            
            registro.setObservations(request.getNuevasObservaciones());
        }
        
        // Marcar como editado
        registro.setEditado(true);
        registro.setMotivoEdicion(request.getMotivoCorreccion());
        registro.setFechaEdicion(LocalDateTime.now());
        
        return planEjecucionRepository.save(registro);
    }
    
    /**
     * Obtiene el historial de cambios de un registro
     */
    public List<PlanEjecucionHistorial> obtenerHistorial(Long registroId) {
        return historialRepository.findByPlanEjecucionIdOrderByFechaCambioDesc(registroId);
    }
    
    /**
     * Verifica si un usuario puede corregir un registro
     */
    public boolean puedeCorregir(Long registroId, Long usuarioId) {
        Optional<PlanEjecucion> registroOpt = planEjecucionRepository.findById(registroId);
        if (registroOpt.isEmpty()) {
            return false;
        }
        
        PlanEjecucion registro = registroOpt.get();
        
        // No se puede corregir si ya fue editado
        if (Boolean.TRUE.equals(registro.getEditado())) {
            return false;
        }
        
        // Verificar límite de tiempo (48 horas)
        LocalDateTime limite = registro.getCreateDate().plusHours(48);
        if (LocalDateTime.now().isAfter(limite)) {
            return false;
        }
        
        // Aquí podrías agregar más validaciones de permisos
        // Por ejemplo, solo el mismo usuario o supervisores
        
        return true;
    }
    
    /**
     * Crea una entrada en el historial
     */
    private void crearEntradaHistorial(Long registroId, String campo, String valorAnterior, 
                                     String valorNuevo, Long usuarioId, String motivo,
                                     String ipAddress, String userAgent) {
        
        PlanEjecucionHistorial historial = new PlanEjecucionHistorial(
            registroId, campo, valorAnterior, valorNuevo, usuarioId, motivo
        );
        historial.setIpAddress(ipAddress);
        historial.setUserAgent(userAgent);
        
        historialRepository.save(historial);
    }
    
    /**
     * Obtiene todas las validaciones activas
     */
    public List<ValidacionAlimentacion> obtenerValidaciones() {
        return validacionRepository.findByActivoOrderByTipoAnimalAscEtapaAsc(true);
    }
}
