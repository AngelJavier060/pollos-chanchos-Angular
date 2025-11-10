package com.wil.avicola_backend.service;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.wil.avicola_backend.error.RequestException;
import com.wil.avicola_backend.dto.AlertaRapidaDto;
import com.wil.avicola_backend.model.PlanAsignacion;
import com.wil.avicola_backend.model.PlanDetalle;
import com.wil.avicola_backend.model.PlanEjecucion;
import com.wil.avicola_backend.model.Usuario;
import com.wil.avicola_backend.model.MovimientoInventario;
import com.wil.avicola_backend.repository.PlanAsignacionRepository;
import com.wil.avicola_backend.repository.PlanDetalleRepository;
import com.wil.avicola_backend.repository.PlanEjecucionRepository;
import com.wil.avicola_backend.repository.UsuarioRepository;
import com.wil.avicola_backend.repository.TypeFoodRepository;
import com.wil.avicola_backend.model.TypeFood;

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
    
    @Autowired
    private TypeFoodRepository typeFoodRepository;
    
    @Autowired
    private InventarioAlimentoService inventarioAlimentoService;
    
    @Autowired
    private PlanAlimentacionServiceSimplificado planAlimentacionServiceSimplificado;
    
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
            // Calcular día de vida del lote (preferido) o días desde startDate como fallback
            long diasDesdeInicio;
            if (asignacion.getLote() != null && asignacion.getLote().getBirthdate() != null) {
                java.time.LocalDate nacimiento = asignacion.getLote().getBirthdate().toInstant()
                    .atZone(java.time.ZoneId.systemDefault()).toLocalDate();
                diasDesdeInicio = ChronoUnit.DAYS.between(nacimiento, fecha) + 1;
            } else {
                diasDesdeInicio = ChronoUnit.DAYS.between(asignacion.getStartDate(), fecha) + 1;
            }
            
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
     * Registrar ejecución completa de alimentación (consumo + registro atómico)
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

            // Calcular el día de vida del lote (preferido) con fallback a startDate
            long diaDeVida;
            if (asignacion.getLote() != null && asignacion.getLote().getBirthdate() != null) {
                java.time.LocalDate nacimiento = asignacion.getLote().getBirthdate().toInstant()
                    .atZone(java.time.ZoneId.systemDefault()).toLocalDate();
                diaDeVida = ChronoUnit.DAYS.between(nacimiento, fechaEjecucion) + 1;
            } else {
                diaDeVida = ChronoUnit.DAYS.between(asignacion.getStartDate(), fechaEjecucion) + 1;
            }

            // Buscar detalle correspondiente al día actual
            PlanDetalle detalle = buscarDetalleParaDia(asignacion.getPlanAlimentacion().getId(), (int) diaDeVida);
            if (detalle == null) {
                logger.warn("⚠️ No se encontró configuración para el día {} del plan", diaDeVida);
                return crearEjecucionSimple(loteId, fechaEjecucion, cantidadAplicada, observaciones, userId);
            }

            // ✅ Resolver SIEMPRE un usuario ejecutor existente (no crear nuevos)
            Usuario usuario = resolverUsuarioEjecutor(userId);
            String usuarioRegistroNombre = (usuario.getUsername() != null)
                ? usuario.getUsername()
                : (usuario.getEmail() != null ? usuario.getEmail() : "SISTEMA");

            // Calcular cantidad total a consumir: cantidadPorAnimal * animalesVivos (o del lote)
            int vivosParaCalculo = (animalesVivos != null && animalesVivos > 0)
                ? animalesVivos
                : (asignacion.getLote() != null ? asignacion.getLote().getQuantity() : 0);

            double cantidadCalculada = (detalle.getQuantityPerAnimal() != null ? detalle.getQuantityPerAnimal() : 0.0)
                * vivosParaCalculo;
            double totalAConsumir = (cantidadAplicada != null && cantidadAplicada > 0)
                ? cantidadAplicada
                : cantidadCalculada;

            if (totalAConsumir <= 0) {
                throw new RequestException("La cantidad a consumir calculada es inválida (<= 0)");
            }

            // Mapear Product -> TypeFood para el inventario actual con fallback por nombre de producto
            if (detalle.getProduct() == null) {
                throw new RequestException("El detalle del plan no tiene Product asociado para descuento de inventario");
            }
            Long tipoAlimentoId = null;
            if (detalle.getProduct().getTypeFood() != null) {
                tipoAlimentoId = detalle.getProduct().getTypeFood().getId();
            } else {
                // Fallback por nombre del producto (case/acento-insensible)
                String nombreProd = detalle.getProduct().getName() != null ? detalle.getProduct().getName().trim() : "";
                if (nombreProd.isEmpty()) {
                    throw new RequestException("El producto del detalle no tiene nombre válido para mapear inventario");
                }
                java.util.Optional<TypeFood> tipoOpt = typeFoodRepository.findByNameIgnoreCase(nombreProd);
                if (tipoOpt.isEmpty()) {
                    String normProd = normalizar(nombreProd);
                    for (TypeFood tf : typeFoodRepository.findAll()) {
                        if (tf != null && tf.getName() != null) {
                            if (normalizar(tf.getName()).equalsIgnoreCase(normProd)) {
                                tipoOpt = java.util.Optional.of(tf);
                                break;
                            }
                        }
                    }
                }
                if (tipoOpt.isEmpty()) {
                    throw new RequestException("No se encontró un TypeFood para el nombre de producto: " + nombreProd + ". Configure el tipo de alimento correspondiente.");
                }
                tipoAlimentoId = tipoOpt.get().getId();
            }

            // Registrar consumo en inventario ANTES de guardar la ejecución (atómico)
            String obsMovimiento = String.format(
                "Consumo automático | Producto: %s | porAnimal: %.3f | vivos: %d | total: %.3f",
                detalle.getProduct().getName(),
                detalle.getQuantityPerAnimal(),
                vivosParaCalculo,
                totalAConsumir
            );

            ResponseEntity<?> rcons = planAlimentacionServiceSimplificado.registrarConsumoAlimentoPorProducto(
                loteId,
                tipoAlimentoId,
                detalle.getProduct().getId(),
                BigDecimal.valueOf(totalAConsumir),
                usuarioRegistroNombre,
                obsMovimiento
            );

            Object body = rcons != null ? rcons.getBody() : null;
            boolean okConsumo = true;
            Long movimientoId = null;
            if (body instanceof Map) {
                Map<?, ?> m = (Map<?, ?>) body;
                Object s = m.get("success");
                if (s instanceof Boolean) okConsumo = (Boolean) s; 
                Object mid = m.get("movimientoId");
                if (mid instanceof Number) movimientoId = ((Number) mid).longValue();
            }
            if (!okConsumo) {
                throw new RequestException("No se pudo registrar el consumo en inventario del producto seleccionado");
            }

            String obsEjecucion = construirObservacionesCompletas(observaciones, animalesVivos, animalesMuertos);
            if (obsEjecucion == null || obsEjecucion.trim().isEmpty()) {
                obsEjecucion = "";
            }
            obsEjecucion = (obsEjecucion + " | MovimientoInvId: " + (movimientoId != null ? movimientoId : "N/A")).trim();

            PlanEjecucion ejecucion = PlanEjecucion.builder()
                .planAsignacion(asignacion)
                .planDetalle(detalle)
                .executedByUser(usuario)
                .executionDate(fechaEjecucion)
                .dayNumber((int) diaDeVida)
                .quantityApplied(totalAConsumir)
                .observations(obsEjecucion)
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
     * Alertas rápidas de eventos puntuales (dayStart == dayEnd) para próximos N días.
     */
    public ResponseEntity<List<AlertaRapidaDto>> getAlertasRapidas(Long userId, LocalDate fechaBase, Integer dias) {
        try {
            if (!usuarioRepository.existsById(userId)) {
                throw new RequestException("No existe el usuario especificado");
            }

            LocalDate base = (fechaBase != null) ? fechaBase : LocalDate.now();
            int horizonte = (dias != null && dias > 0) ? Math.min(dias, 30) : 7;

            List<PlanAsignacion> asignaciones = planAsignacionRepository
                .findByAssignedUserIdAndStatusOrderByCreateDateDesc(userId, PlanAsignacion.Status.ACTIVO);

            List<AlertaRapidaDto> alertas = new ArrayList<>();

            for (PlanAsignacion asignacion : asignaciones) {
                Long planId = asignacion.getPlanAlimentacion() != null ? asignacion.getPlanAlimentacion().getId() : null;
                if (planId == null) continue;

                for (int offset = 0; offset < horizonte; offset++) {
                    LocalDate fechaObjetivo = base.plusDays(offset);

                    long diaDeVida;
                    if (asignacion.getLote() != null && asignacion.getLote().getBirthdate() != null) {
                        java.time.LocalDate nacimiento = asignacion.getLote().getBirthdate().toInstant()
                            .atZone(java.time.ZoneId.systemDefault()).toLocalDate();
                        diaDeVida = ChronoUnit.DAYS.between(nacimiento, fechaObjetivo) + 1;
                    } else {
                        diaDeVida = ChronoUnit.DAYS.between(asignacion.getStartDate(), fechaObjetivo) + 1;
                    }

                    if (diaDeVida <= 0) continue;

                    List<PlanDetalle> detalles = planDetalleRepository.findByPlanIdAndDayNumber(planId, (int) diaDeVida);
                    for (PlanDetalle d : detalles) {
                        if (d.getDayStart() != null && d.getDayEnd() != null && d.getDayStart().intValue() == d.getDayEnd().intValue()) {
                            alertas.add(AlertaRapidaDto.builder()
                                .fechaObjetivo(fechaObjetivo)
                                .diaDeVida((int) diaDeVida)
                                .asignacionId(asignacion.getId())
                                .loteId(asignacion.getLote() != null ? asignacion.getLote().getId() : null)
                                .loteCodigo(asignacion.getLote() != null ? asignacion.getLote().getCodigo() : null)
                                .planDetalleId(d.getId())
                                .productId(d.getProduct() != null ? d.getProduct().getId() : null)
                                .productName(d.getProduct() != null ? d.getProduct().getName() : null)
                                .tipo("evento_unico")
                                .mensaje("Evento puntual del plan para el día de vida " + diaDeVida)
                                .build());
                        }
                    }
                }
            }

            return ResponseEntity.ok(alertas);
        } catch (RequestException e) {
            throw e;
        } catch (Exception e) {
            logger.error("Error al obtener alertas rápidas: {}", e.getMessage());
            throw new RequestException("Error al obtener alertas rápidas");
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
            // ✅ Resolver usuario ejecutor existente
            Usuario usuario = resolverUsuarioEjecutor(userId);
            
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

    /**
     * Normaliza un texto eliminando acentos/diacríticos y convirtiendo a minúsculas
     */
    private String normalizar(String texto) {
        if (texto == null) return "";
        String n = Normalizer.normalize(texto, Normalizer.Form.NFD);
        return n.replaceAll("\\p{InCombiningDiacriticalMarks}+", "").toLowerCase();
    }

    /**
     * Resolver un usuario ejecutor válido sin crear usuarios nuevos.
     * Estrategia: por id -> por usernames conocidos -> primer usuario activo.
     */
    private Usuario resolverUsuarioEjecutor(Long userId) {
        java.util.Optional<Usuario> u = java.util.Optional.empty();
        if (userId != null) {
            u = usuarioRepository.findById(userId);
        }
        if (u.isEmpty()) {
            // Intentar por usernames conocidos (insensible a mayúsculas)
            String[] candidatos = {"Javier", "Alexandra", "Elvia"};
            for (String name : candidatos) {
                java.util.Optional<Usuario> byName = usuarioRepository.findByUsernameIgnoreCase(name);
                if (byName.isPresent()) { u = byName; break; }
            }
        }
        if (u.isEmpty()) {
            // Tomar el primer usuario activo
            u = usuarioRepository.findFirstByActiveTrueOrderByIdAsc();
        }
        return u.orElseThrow(() -> new RequestException("No hay un usuario activo para registrar la alimentación. Verifique usuarios activos."));
    }
}
