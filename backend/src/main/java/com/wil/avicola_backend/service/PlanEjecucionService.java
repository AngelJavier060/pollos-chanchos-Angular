package com.wil.avicola_backend.service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.wil.avicola_backend.error.RequestException;
import com.wil.avicola_backend.model.PlanAsignacion;
import com.wil.avicola_backend.model.PlanDetalle;
import com.wil.avicola_backend.model.PlanEjecucion;
import com.wil.avicola_backend.model.Usuario;
import com.wil.avicola_backend.repository.PlanAsignacionRepository;
import com.wil.avicola_backend.repository.PlanDetalleRepository;
import com.wil.avicola_backend.repository.PlanEjecucionRepository;
import com.wil.avicola_backend.repository.UsuarioRepository;

@Service
@Transactional
public class PlanEjecucionService {
    
    private static final Logger logger = LoggerFactory.getLogger(PlanEjecucionService.class);
    
    @Autowired
    private PlanEjecucionRepository planEjecucionRepository;
    
    @Autowired
    private PlanAsignacionRepository planAsignacionRepository;
    
    @Autowired
    private PlanDetalleRepository planDetalleRepository;
    
    @Autowired
    private UsuarioRepository usuarioRepository;
    
    /**
     * Obtener programación diaria para un usuario específico
     * Esta es la función clave que calcula qué debe alimentar cada usuario según la fecha de registro de los animales
     */
    public ResponseEntity<List<PlanEjecucion>> getProgramacionDiariaUsuario(Long userId, LocalDate fecha) {
        try {
            // Validar que el usuario existe
            if (!usuarioRepository.existsById(userId)) {
                throw new RequestException("No existe el usuario especificado");
            }
            
            // Obtener asignaciones activas del usuario
            List<PlanAsignacion> asignacionesActivas = planAsignacionRepository.findByAssignedUserIdAndStatusOrderByCreateDateDesc(userId, PlanAsignacion.Status.ACTIVO);
            
            List<PlanEjecucion> programacionDiaria = new ArrayList<>();
            
            for (PlanAsignacion asignacion : asignacionesActivas) {
                // Calcular programación para esta asignación
                List<PlanEjecucion> ejecucionesAsignacion = calcularProgramacionParaAsignacion(asignacion, fecha, userId);
                programacionDiaria.addAll(ejecucionesAsignacion);
            }
            
            return ResponseEntity.ok(programacionDiaria);
            
        } catch (RequestException e) {
            throw e;
        } catch (Exception e) {
            logger.error("Error al obtener programación diaria: {}", e.getMessage());
            throw new RequestException("Error al obtener la programación diaria del usuario");
        }
    }
    
    /**
     * Calcular qué debe ejecutar el usuario para una asignación específica en una fecha
     */
    private List<PlanEjecucion> calcularProgramacionParaAsignacion(PlanAsignacion asignacion, LocalDate fecha, Long userId) {
        List<PlanEjecucion> ejecuciones = new ArrayList<>();
        
        // Obtener los animales del lote (necesitamos la fecha de registro de cada animal)
        // Por ahora asumimos que el lote tiene una fecha de registro
        // En tu caso específico, necesitarás ajustar esto según tu modelo de Animal
        
        // Obtener todos los detalles del plan
        List<PlanDetalle> detalles = planDetalleRepository.findByPlanAlimentacionIdOrderByDayStartAsc(asignacion.getPlanAlimentacion().getId());
        
        for (PlanDetalle detalle : detalles) {
            // Calcular cuántos días han pasado desde el inicio de la asignación
            long diasDesdeInicio = ChronoUnit.DAYS.between(asignacion.getStartDate(), fecha) + 1;
            
            // Verificar si este detalle aplica para el día actual
            if (diasDesdeInicio >= detalle.getDayStart() && diasDesdeInicio <= detalle.getDayEnd()) {
                
                // Verificar si ya existe una ejecución para este día
                boolean yaEjecutado = planEjecucionRepository.existsByAsignacionAndDetalleAndDay(
                    asignacion.getId(), detalle.getId(), (int) diasDesdeInicio);
                
                if (!yaEjecutado) {
                    // Crear ejecución pendiente
                    PlanEjecucion ejecucion = PlanEjecucion.builder()
                        .planAsignacion(asignacion)
                        .planDetalle(detalle)
                        .executedByUser(usuarioRepository.findById(userId).orElse(null))
                        .executionDate(fecha)
                        .dayNumber((int) diasDesdeInicio)
                        .quantityApplied(0.0) // Inicialmente 0, se actualiza al ejecutar
                        .status(PlanEjecucion.Status.PENDIENTE)
                        .build();
                    
                    ejecuciones.add(ejecucion);
                }
            }
        }
        
        return ejecuciones;
    }
    
    /**
     * Registrar ejecución de alimentación
     */
    public ResponseEntity<PlanEjecucion> registrarEjecucion(Long asignacionId, Long detalleId, Integer dayNumber, 
                                                          Double cantidadAplicada, String observaciones, Long userId) {
        try {
            // Validar que la asignación existe
            PlanAsignacion asignacion = planAsignacionRepository.findById(asignacionId)
                .orElseThrow(() -> new RequestException("No existe la asignación especificada"));
            
            // Validar que el detalle existe
            PlanDetalle detalle = planDetalleRepository.findById(detalleId)
                .orElseThrow(() -> new RequestException("No existe el detalle especificado"));
            
            // Validar que el usuario existe
            Usuario usuario = usuarioRepository.findById(userId)
                .orElseThrow(() -> new RequestException("No existe el usuario especificado"));
            
            // Verificar si ya existe una ejecución
            PlanEjecucion ejecucionExistente = planEjecucionRepository
                .findByPlanAsignacionIdAndPlanDetalleIdAndDayNumber(asignacionId, detalleId, dayNumber)
                .orElse(null);
            
            PlanEjecucion ejecucion;
            
            if (ejecucionExistente != null) {
                // Actualizar ejecución existente
                ejecucionExistente.setQuantityApplied(cantidadAplicada);
                ejecucionExistente.setObservations(observaciones);
                ejecucionExistente.setStatus(PlanEjecucion.Status.EJECUTADO);
                ejecucion = planEjecucionRepository.save(ejecucionExistente);
            } else {
                // Crear nueva ejecución
                ejecucion = PlanEjecucion.builder()
                    .planAsignacion(asignacion)
                    .planDetalle(detalle)
                    .executedByUser(usuario)
                    .executionDate(LocalDate.now())
                    .dayNumber(dayNumber)
                    .quantityApplied(cantidadAplicada)
                    .observations(observaciones)
                    .status(PlanEjecucion.Status.EJECUTADO)
                    .build();
                
                ejecucion = planEjecucionRepository.save(ejecucion);
            }
            
            logger.info("Ejecución registrada exitosamente para día {}", dayNumber);
            return ResponseEntity.status(HttpStatus.CREATED).body(ejecucion);
            
        } catch (RequestException e) {
            throw e;
        } catch (Exception e) {
            logger.error("Error al registrar ejecución: {}", e.getMessage());
            throw new RequestException("Error al registrar la ejecución de alimentación");
        }
    }
    
    /**
     * Obtener historial de ejecuciones de un usuario
     */
    public ResponseEntity<List<PlanEjecucion>> getHistorialEjecuciones(Long userId, LocalDate fechaInicio, LocalDate fechaFin) {
        try {
            if (!usuarioRepository.existsById(userId)) {
                throw new RequestException("No existe el usuario especificado");
            }
            
            List<PlanEjecucion> historial = planEjecucionRepository.findByUserAndDateRange(userId, fechaInicio, fechaFin);
            return ResponseEntity.ok(historial);
            
        } catch (RequestException e) {
            throw e;
        } catch (Exception e) {
            logger.error("Error al obtener historial de ejecuciones: {}", e.getMessage());
            throw new RequestException("Error al obtener el historial de ejecuciones");
        }
    }
    
    /**
     * Obtener ejecuciones pendientes de un usuario
     */
    public ResponseEntity<List<PlanEjecucion>> getEjecucionesPendientes(Long userId) {
        try {
            if (!usuarioRepository.existsById(userId)) {
                throw new RequestException("No existe el usuario especificado");
            }
            
            List<PlanEjecucion> pendientes = planEjecucionRepository.findPendingExecutionsByUser(userId, LocalDate.now());
            return ResponseEntity.ok(pendientes);
            
        } catch (RequestException e) {
            throw e;
        } catch (Exception e) {
            logger.error("Error al obtener ejecuciones pendientes: {}", e.getMessage());
            throw new RequestException("Error al obtener las ejecuciones pendientes");
        }
    }
    
    /**
     * Marcar ejecución como omitida
     */
    public ResponseEntity<PlanEjecucion> marcarComoOmitida(Long ejecucionId, String razon, Long userId) {
        try {
            PlanEjecucion ejecucion = planEjecucionRepository.findById(ejecucionId)
                .orElseThrow(() -> new RequestException("No existe la ejecución especificada"));
            
            // Verificar que el usuario tiene permisos
            if (!ejecucion.getExecutedByUser().getId().equals(userId)) {
                throw new RequestException("No tiene permisos para modificar esta ejecución");
            }
            
            ejecucion.setStatus(PlanEjecucion.Status.OMITIDO);
            ejecucion.setObservations(razon);
            
            PlanEjecucion ejecucionActualizada = planEjecucionRepository.save(ejecucion);
            logger.info("Ejecución marcada como omitida: {}", ejecucionId);
            
            return ResponseEntity.ok(ejecucionActualizada);
            
        } catch (RequestException e) {
            throw e;
        } catch (Exception e) {
            logger.error("Error al marcar ejecución como omitida: {}", e.getMessage());
            throw new RequestException("Error al marcar la ejecución como omitida");
        }
    }
    
    /**
     * Obtener estadísticas de ejecución para una asignación
     */
    public ResponseEntity<Object> getEstadisticasEjecucion(Long asignacionId) {
        try {
            if (!planAsignacionRepository.existsById(asignacionId)) {
                throw new RequestException("No existe la asignación especificada");
            }
            
            List<Object[]> estadisticas = planEjecucionRepository.getExecutionStatsByAssignment(asignacionId);
            
            // Convertir a un formato más amigable
            // Puedes personalizar esto según tus necesidades de frontend
            return ResponseEntity.ok(estadisticas);
            
        } catch (RequestException e) {
            throw e;
        } catch (Exception e) {
            logger.error("Error al obtener estadísticas: {}", e.getMessage());
            throw new RequestException("Error al obtener las estadísticas de ejecución");
        }
    }
    
    /**
     * Registrar ejecución completa de alimentación (adaptado para el frontend)
     */
    public ResponseEntity<PlanEjecucion> registrarEjecucionCompleta(
            String loteId, 
            String fecha, 
            Double cantidadAplicada, 
            Integer animalesVivos, 
            Integer animalesMuertos, 
            String observaciones, 
            Long userId) {
        
        try {
            logger.info("🍽️ Registrando alimentación completa - Lote: {}, Fecha: {}, Usuario: {}", 
                loteId, fecha, userId);
            
            LocalDate fechaEjecucion = LocalDate.parse(fecha);
            
            // Buscar asignación activa para el lote
            List<PlanAsignacion> asignaciones = planAsignacionRepository.findByLoteIdAndStatus(
                loteId, PlanAsignacion.Status.ACTIVO);
            
            if (asignaciones.isEmpty()) {
                logger.warn("⚠️ No se encontró asignación activa para el lote: {}", loteId);
                // Crear una ejecución simple sin asignación específica
                return crearEjecucionSimple(loteId, fechaEjecucion, cantidadAplicada, observaciones, userId);
            }
            
            PlanAsignacion asignacion = asignaciones.get(0);
            
            // Calcular días desde inicio del lote
            long diasDesdeInicio = ChronoUnit.DAYS.between(asignacion.getStartDate(), fechaEjecucion) + 1;
            
            // Buscar detalle correspondiente al día actual
            PlanDetalle detalle = buscarDetalleParaDia(asignacion.getPlanAlimentacion().getId(), (int) diasDesdeInicio);
            
            if (detalle == null) {
                logger.warn("⚠️ No se encontró configuración para el día {} del plan", diasDesdeInicio);
                // Crear ejecución sin detalle específico
                return crearEjecucionSimple(loteId, fechaEjecucion, cantidadAplicada, observaciones, userId);
            }
            
            // Verificar usuario
            Usuario usuario = usuarioRepository.findById(userId)
                .orElseThrow(() -> new RequestException("Usuario no encontrado"));
            
            // Crear registro de ejecución
            PlanEjecucion ejecucion = PlanEjecucion.builder()
                .planAsignacion(asignacion)
                .planDetalle(detalle)
                .executedByUser(usuario)
                .executionDate(fechaEjecucion)
                .dayNumber((int) diasDesdeInicio)
                .quantityApplied(cantidadAplicada)
                .observations(construirObservacionesCompletas(observaciones, animalesVivos, animalesMuertos))
                .status(PlanEjecucion.Status.EJECUTADO)
                .build();
            
            PlanEjecucion ejecucionGuardada = planEjecucionRepository.save(ejecucion);
            
            logger.info("✅ Alimentación registrada exitosamente - ID: {}", ejecucionGuardada.getId());
            
            return ResponseEntity.ok(ejecucionGuardada);
            
        } catch (Exception e) {
            logger.error("❌ Error al registrar alimentación completa", e);
            throw new RequestException("Error al registrar la alimentación: " + e.getMessage());
        }
    }
    
    /**
     * Crear ejecución simple sin asignación específica (para casos edge)
     */
    private ResponseEntity<PlanEjecucion> crearEjecucionSimple(
            String loteId, 
            LocalDate fecha, 
            Double cantidad, 
            String observaciones, 
            Long userId) {
        
        logger.info("📝 Creando ejecución simple para lote sin asignación: {}", loteId);
        
        try {
            Usuario usuario = usuarioRepository.findById(userId)
                .orElseThrow(() -> new RequestException("Usuario no encontrado con ID: " + userId));
            
            // Construir observaciones más informativas
            String observacionesCompletas = String.format(
                "REGISTRO MANUAL SIN ASIGNACIÓN - Lote: %s | Fecha: %s | Cantidad: %.2f kg | Observaciones: %s", 
                loteId, fecha, cantidad, (observaciones != null ? observaciones : "Sin observaciones")
            );
            
            // Crear un registro básico sin asignación específica
            // Ahora planAsignacion y planDetalle son nullable
            PlanEjecucion ejecucion = PlanEjecucion.builder()
                .planAsignacion(null) // ✅ Permitido ahora que es nullable
                .planDetalle(null)    // ✅ Permitido ahora que es nullable
                .executedByUser(usuario)
                .executionDate(fecha)
                .dayNumber(1) // Día por defecto para registros manuales
                .quantityApplied(cantidad)
                .observations(observacionesCompletas)
                .status(PlanEjecucion.Status.EJECUTADO)
                .editado(false) // Registro original, no editado
                .build();
            
            PlanEjecucion ejecucionGuardada = planEjecucionRepository.save(ejecucion);
            
            logger.info("✅ Ejecución simple guardada exitosamente - ID: {}, Lote: {}, Cantidad: {} kg", 
                ejecucionGuardada.getId(), loteId, cantidad);
            
            return ResponseEntity.ok(ejecucionGuardada);
            
        } catch (Exception e) {
            logger.error("❌ Error al crear ejecución simple para lote {}: {}", loteId, e.getMessage());
            throw new RequestException("Error al crear registro de alimentación: " + e.getMessage());
        }
    }
    
    /**
     * Construir observaciones completas con toda la información
     */
    private String construirObservacionesCompletas(String observaciones, Integer animalesVivos, Integer animalesMuertos) {
        StringBuilder obs = new StringBuilder();
        
        if (animalesVivos != null && animalesVivos > 0) {
            obs.append("Animales vivos: ").append(animalesVivos).append("; ");
        }
        
        if (animalesMuertos != null && animalesMuertos > 0) {
            obs.append("Mortalidad registrada: ").append(animalesMuertos).append("; ");
        }
        
        if (observaciones != null && !observaciones.trim().isEmpty()) {
            obs.append("Observaciones: ").append(observaciones.trim());
        }
        
        return obs.toString();
    }
    
    /**
     * Buscar detalle del plan para un día específico
     */
    private PlanDetalle buscarDetalleParaDia(Long planId, int dia) {
        List<PlanDetalle> detalles = planDetalleRepository.findByPlanAlimentacionIdOrderByDayStartAsc(planId);
        
        return detalles.stream()
            .filter(detalle -> dia >= detalle.getDayStart() && dia <= detalle.getDayEnd())
            .findFirst()
            .orElse(null);
    }
}
