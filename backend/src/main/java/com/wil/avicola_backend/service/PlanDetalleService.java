package com.wil.avicola_backend.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.wil.avicola_backend.dto.PlanDetalleResponseDto;
import com.wil.avicola_backend.error.RequestException;
import com.wil.avicola_backend.mapper.PlanDetalleMapper;
import com.wil.avicola_backend.model.PlanAlimentacion;
import com.wil.avicola_backend.model.PlanDetalle;
import com.wil.avicola_backend.model.Product;
import com.wil.avicola_backend.repository.PlanAlimentacionRepository;
import com.wil.avicola_backend.repository.PlanDetalleRepository;
import com.wil.avicola_backend.repository.ProductRepository;

@Service
@Transactional
public class PlanDetalleService {
    
    private static final Logger logger = LoggerFactory.getLogger(PlanDetalleService.class);
    
    @Autowired
    private PlanAlimentacionRepository planAlimentacionRepository;
    
    @Autowired
    private PlanDetalleRepository planDetalleRepository;
    
    @Autowired
    private ProductRepository productRepository;
    
    @Autowired
    private PlanDetalleMapper planDetalleMapper;
    
    /**
     * Agregar detalle a un plan de alimentación
     */
    public ResponseEntity<PlanDetalleResponseDto> addDetalleToPlan(Long planId, PlanDetalle detalleRequest) {
        try {
            // Validar que el plan existe
            PlanAlimentacion plan = planAlimentacionRepository.findById(planId)
                .orElseThrow(() -> new RequestException("No existe el plan de alimentación especificado"));
            
            // Validar que el producto existe
            Product product = productRepository.findById(detalleRequest.getProduct().getId())
                .orElseThrow(() -> new RequestException("No existe el producto especificado"));
            
            // Validar cantidad
            if (detalleRequest.getQuantityPerAnimal() <= 0) {
                throw new RequestException("La cantidad por animal debe ser mayor a 0");
            }

            // Validación básica de rangos
            if (detalleRequest.getDayStart() == null || detalleRequest.getDayEnd() == null
                || detalleRequest.getDayStart() <= 0 || detalleRequest.getDayEnd() < detalleRequest.getDayStart()) {
                throw new RequestException("Los rangos de días no son válidos");
            }
            
            // Validar que el sub-rango esté dentro del rango principal del plan
            validarDentroDelRangoPrincipal(plan, detalleRequest.getDayStart(), detalleRequest.getDayEnd());
            
            // Crear el detalle
            PlanDetalle nuevoDetalle = PlanDetalle.builder()
                .planAlimentacion(plan)
                .dayStart(detalleRequest.getDayStart())
                .dayEnd(detalleRequest.getDayEnd())
                .product(product)
                .quantityPerAnimal(detalleRequest.getQuantityPerAnimal())
                .frequency(detalleRequest.getFrequency() != null ? detalleRequest.getFrequency() : PlanDetalle.Frequency.DIARIA)
                .instructions(detalleRequest.getInstructions())
                .build();
            
            // Agregar a la lista de detalles del plan
            if (plan.getDetalles() == null) {
                plan.setDetalles(List.of(nuevoDetalle));
            } else {
                plan.getDetalles().add(nuevoDetalle);
            }
            
            planAlimentacionRepository.save(plan);
            
            logger.info("Detalle agregado al plan: {} - Días {}-{} (sub-etapa permitida)", plan.getName(), 
                       nuevoDetalle.getDayStart(), nuevoDetalle.getDayEnd());
            
            // Convertir a DTO antes de devolver
            PlanDetalleResponseDto responseDto = planDetalleMapper.toDto(nuevoDetalle);
            return ResponseEntity.status(HttpStatus.CREATED).body(responseDto);
            
        } catch (RequestException e) {
            throw e;
        } catch (Exception e) {
            logger.error("Error al agregar detalle al plan: {}", e.getMessage());
            throw new RequestException("Error al agregar detalle al plan de alimentación");
        }
    }
    
    /**
     * Actualizar un detalle existente
     */
    public ResponseEntity<PlanDetalle> updateDetalle(Long planId, Long detalleId, PlanDetalle detalleRequest) {
        try {
            PlanAlimentacion plan = planAlimentacionRepository.findById(planId)
                .orElseThrow(() -> new RequestException("No existe el plan de alimentación especificado"));
            
            PlanDetalle detalleExistente = plan.getDetalles().stream()
                .filter(d -> d.getId().equals(detalleId))
                .findFirst()
                .orElseThrow(() -> new RequestException("No existe el detalle especificado"));
            
            // Validar producto si cambió
            if (detalleExistente.getProduct().getId() != detalleRequest.getProduct().getId()) {
                Product product = productRepository.findById(detalleRequest.getProduct().getId())
                    .orElseThrow(() -> new RequestException("No existe el producto especificado"));
                detalleExistente.setProduct(product);
            }
            
            // Validar rangos de días
            if (detalleRequest.getDayStart() <= 0 || detalleRequest.getDayEnd() < detalleRequest.getDayStart()) {
                throw new RequestException("Los rangos de días no son válidos");
            }
            
            // Validar que el sub-rango esté dentro del rango principal del plan
            validarDentroDelRangoPrincipal(plan, detalleRequest.getDayStart(), detalleRequest.getDayEnd());
            
            // Actualizar campos
            detalleExistente.setDayStart(detalleRequest.getDayStart());
            detalleExistente.setDayEnd(detalleRequest.getDayEnd());
            detalleExistente.setQuantityPerAnimal(detalleRequest.getQuantityPerAnimal());
            detalleExistente.setFrequency(detalleRequest.getFrequency());
            detalleExistente.setInstructions(detalleRequest.getInstructions());
            
            planAlimentacionRepository.save(plan);
            
            logger.info("Detalle actualizado en plan: {} (sub-etapa permitida)", plan.getName());
            return ResponseEntity.ok(detalleExistente);
            
        } catch (RequestException e) {
            throw e;
        } catch (Exception e) {
            logger.error("Error al actualizar detalle: {}", e.getMessage());
            throw new RequestException("Error al actualizar el detalle del plan");
        }
    }
    
    /**
     * Eliminar un detalle del plan
     */
    public ResponseEntity<Void> removeDetalleFromPlan(Long planId, Long detalleId) {
        try {
            System.out.println("🗑️ Eliminando detalle ID: " + detalleId + " del plan ID: " + planId);
            
            // Verificar que el plan existe
            PlanAlimentacion plan = planAlimentacionRepository.findById(planId)
                .orElseThrow(() -> new RequestException("No existe el plan de alimentación especificado"));
            
            // Verificar que el detalle existe
            PlanDetalle detalle = planDetalleRepository.findById(detalleId)
                .orElseThrow(() -> new RequestException("No existe el detalle especificado"));
            
            // Verificar que el detalle pertenece al plan
            if (!detalle.getPlanAlimentacion().getId().equals(planId)) {
                throw new RequestException("El detalle no pertenece al plan especificado");
            }
            
            System.out.println("✅ Detalle encontrado: " + detalle.getDayStart() + "-" + detalle.getDayEnd() + " días");
            
            // Eliminar directamente del repositorio
            planDetalleRepository.deleteById(detalleId);
            
            System.out.println("✅ Detalle eliminado exitosamente");
            
            logger.info("Detalle eliminado del plan: {} - Detalle: {}-{} días", 
                       plan.getName(), detalle.getDayStart(), detalle.getDayEnd());
            return ResponseEntity.ok().build();
            
        } catch (RequestException e) {
            System.out.println("❌ Error de validación: " + e.getMessage());
            throw e;
        } catch (Exception e) {
            System.out.println("❌ Error inesperado: " + e.getMessage());
            logger.error("Error al eliminar detalle: {}", e.getMessage());
            throw new RequestException("Error al eliminar el detalle del plan");
        }
    }
    
    /**
     * Obtener todos los detalles de un plan - MÉTODO CORREGIDO PARA EVITAR PROXIES
     */
    public ResponseEntity<List<PlanDetalleResponseDto>> getDetallesByPlan(Long planId) {
        try {
            if (!planAlimentacionRepository.existsById(planId)) {
                throw new RequestException("No existe el plan de alimentación especificado");
            }
            
            // Obtener entidades con joins optimizados
            List<PlanDetalle> detalles = planDetalleRepository.findByPlanIdWithProductInfo(planId);
            
            // Convertir a DTOs seguros para serialización
            List<PlanDetalleResponseDto> detallesDto = planDetalleMapper.toDtoList(detalles);
            
            logger.info("✅ Detalles convertidos a DTOs exitosamente. Plan: {}, Cantidad: {}", 
                       planId, detallesDto.size());
            
            return ResponseEntity.ok(detallesDto);
            
        } catch (RequestException e) {
            logger.error("❌ Error de validación en getDetallesByPlan: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            logger.error("❌ Error interno en getDetallesByPlan: {}", e.getMessage(), e);
            throw new RequestException("Error al obtener los detalles del plan");
        }
    }
    
    /**
     * Obtener un detalle específico
     */
    public ResponseEntity<PlanDetalleResponseDto> getDetalle(Long detalleId) {
        try {
            PlanDetalle detalle = planDetalleRepository.findById(detalleId)
                .orElseThrow(() -> new RequestException("No existe el detalle especificado"));
            
            // Convertir a DTO antes de devolver
            PlanDetalleResponseDto responseDto = planDetalleMapper.toDto(detalle);
            return ResponseEntity.ok(responseDto);
            
        } catch (RequestException e) {
            throw e;
        } catch (Exception e) {
            logger.error("Error al obtener detalle: {}", e.getMessage());
            throw new RequestException("Error al obtener el detalle");
        }
    }
    
    /**
     * Actualizar un detalle existente (sobrecarga para controller)
     */
    public ResponseEntity<PlanDetalleResponseDto> updateDetalle(Long detalleId, PlanDetalle detalleRequest) {
        try {
            PlanDetalle detalleExistente = planDetalleRepository.findById(detalleId)
                .orElseThrow(() -> new RequestException("No existe el detalle especificado"));
            
            // Validar el producto si se está cambiando
            if (detalleRequest.getProduct() != null) {
                Product product = productRepository.findById(detalleRequest.getProduct().getId())
                    .orElseThrow(() -> new RequestException("No existe el producto especificado"));
                detalleExistente.setProduct(product);
            }
            
            // Validar rangos
            if (detalleRequest.getDayStart() != null && detalleRequest.getDayEnd() != null) {
                if (detalleRequest.getDayStart() <= 0 || detalleRequest.getDayEnd() < detalleRequest.getDayStart()) {
                    throw new RequestException("Los rangos de días no son válidos");
                }
                
                // Validar que el sub-rango esté dentro del rango principal del plan
                validarDentroDelRangoPrincipal(
                    detalleExistente.getPlanAlimentacion(),
                    detalleRequest.getDayStart(),
                    detalleRequest.getDayEnd()
                );
                
                detalleExistente.setDayStart(detalleRequest.getDayStart());
                detalleExistente.setDayEnd(detalleRequest.getDayEnd());
            }
            
            // Actualizar otros campos
            if (detalleRequest.getQuantityPerAnimal() != null) {
                if (detalleRequest.getQuantityPerAnimal() <= 0) {
                    throw new RequestException("La cantidad por animal debe ser mayor a cero");
                }
                detalleExistente.setQuantityPerAnimal(detalleRequest.getQuantityPerAnimal());
            }
            
            if (detalleRequest.getFrequency() != null) {
                detalleExistente.setFrequency(detalleRequest.getFrequency());
            }
            
            if (detalleRequest.getInstructions() != null) {
                detalleExistente.setInstructions(detalleRequest.getInstructions());
            }
            
            PlanDetalle detalleActualizado = planDetalleRepository.save(detalleExistente);
            logger.info("Detalle actualizado: {}", detalleId);
            
            // Convertir a DTO antes de devolver
            PlanDetalleResponseDto responseDto = planDetalleMapper.toDto(detalleActualizado);
            return ResponseEntity.ok(responseDto);
            
        } catch (RequestException e) {
            throw e;
        } catch (Exception e) {
            logger.error("Error al actualizar detalle: {}", e.getMessage());
            throw new RequestException("Error al actualizar el detalle");
        }
    }
    
    /**
     * Eliminar un detalle
     */
    public ResponseEntity<Void> deleteDetalle(Long detalleId) {
        try {
            if (!planDetalleRepository.existsById(detalleId)) {
                throw new RequestException("No existe el detalle especificado");
            }
            
            planDetalleRepository.deleteById(detalleId);
            logger.info("Detalle eliminado: {}", detalleId);
            
            return ResponseEntity.noContent().build();
            
        } catch (RequestException e) {
            throw e;
        } catch (Exception e) {
            logger.error("Error al eliminar detalle: {}", e.getMessage());
            throw new RequestException("Error al eliminar el detalle");
        }
    }
    
    /**
     * Validar si hay solapamiento de rangos
     */
    public ResponseEntity<Boolean> validarRangos(Long planId, Integer dayStart, Integer dayEnd, Long excludeId) {
        try {
            boolean hayOverlap = planDetalleRepository.existsOverlappingRanges(planId, dayStart, dayEnd, excludeId);
            return ResponseEntity.ok(!hayOverlap); // Retorna true si NO hay overlap (es válido)
            
        } catch (Exception e) {
            logger.error("Error al validar rangos: {}", e.getMessage());
            throw new RequestException("Error al validar los rangos de días");
        }
    }
    
    /**
     * Obtener el rango máximo de días de un plan
     */
    public ResponseEntity<Integer> getRangoMaximo(Long planId) {
        try {
            if (!planAlimentacionRepository.existsById(planId)) {
                throw new RequestException("No existe el plan de alimentación especificado");
            }
            
            Integer rangoMaximo = planDetalleRepository.findMaxDayByPlanId(planId);
            return ResponseEntity.ok(rangoMaximo != null ? rangoMaximo : 0);
            
        } catch (RequestException e) {
            throw e;
        } catch (Exception e) {
            logger.error("Error al obtener rango máximo: {}", e.getMessage());
            throw new RequestException("Error al obtener el rango máximo de días");
        }
    }

    /**
     * Verificar que no haya solapamiento de días entre detalles
     * MEJORADO: Permite múltiples etapas para diferentes animales en el mismo rango
     */
    private void verificarSolapamientoDias(PlanAlimentacion plan, PlanDetalle nuevoDetalle, Long excludeDetalleId) {
        // ⚠️ REGLA NUEVA: Se permiten sub-etapas solapadas dentro del rango principal del plan.
        // Mantener este método para compatibilidad, pero ahora solo valida rango principal.
        validarDentroDelRangoPrincipal(plan, nuevoDetalle.getDayStart(), nuevoDetalle.getDayEnd());
    }

    /**
     * Valida que el sub-rango (dayStart-dayEnd) esté dentro del rango principal del plan.
     * El rango principal se detecta del nombre del plan si contiene "min-max".
     * Ej.: "31-60", "1 - 30 días".
     * Si no se puede detectar, no se aplica restricción adicional (solo reglas básicas >0 y fin>=inicio).
     */
    private void validarDentroDelRangoPrincipal(PlanAlimentacion plan, Integer dayStart, Integer dayEnd) {
        if (plan == null || plan.getName() == null) return;
        int[] rango = extraerRangoDesdeNombre(plan.getName());
        if (rango == null) {
            logger.info("ℹ️ No se detectó rango principal en el nombre del plan '{}'. Se omite validación de contención.", plan.getName());
            return;
        }
        int min = rango[0];
        int max = rango[1];
        if (dayStart < min || dayEnd > max) {
            throw new RequestException(String.format(
                "Fuera de rango principal (%d-%d): los días deben estar dentro del rango del plan.", min, max));
        }
    }

    /**
     * Extrae el rango "min-max" de un nombre de plan. Retorna {min, max} o null si no se encuentra.
     */
    private int[] extraerRangoDesdeNombre(String nombrePlan) {
        if (nombrePlan == null) return null;
        Pattern p = Pattern.compile("(\\d+)\\s*-\\s*(\\d+)");
        Matcher m = p.matcher(nombrePlan);
        if (m.find()) {
            try {
                int min = Integer.parseInt(m.group(1));
                int max = Integer.parseInt(m.group(2));
                if (min > 0 && max >= min) return new int[]{min, max};
            } catch (NumberFormatException ignored) {}
        }
        return null;
    }

    /**
     * ✅ NUEVO: Obtener TODAS las etapas de TODOS los planes del sistema
     * Para vista general sin necesidad de seleccionar un plan específico
     */
    public ResponseEntity<List<PlanDetalleResponseDto>> getAllEtapasFromAllPlanes() {
        try {
            logger.info("🔍 Obteniendo TODAS las etapas de TODOS los planes para vista general");
            
            // Obtener todas las etapas existentes
            List<PlanDetalle> todasLasEtapas = planDetalleRepository.findAll();
            
            // Convertir a DTOs seguros para serialización
            List<PlanDetalleResponseDto> etapasDto = planDetalleMapper.toDtoList(todasLasEtapas);
            
            logger.info("✅ Vista general: {} etapas obtenidas del sistema", etapasDto.size());
            
            return ResponseEntity.ok(etapasDto);
            
        } catch (Exception e) {
            logger.error("❌ Error al obtener vista general de etapas: {}", e.getMessage(), e);
            throw new RequestException("Error al obtener la vista general de etapas de crecimiento");
        }
    }
    
    /**
     * ✅ NUEVO: Obtener estadísticas generales de etapas
     */
    public ResponseEntity<Map<String, Object>> getEtapasEstadisticas() {
        try {
            Map<String, Object> estadisticas = new HashMap<>();
            
            // Contar total de etapas
            long totalEtapas = planDetalleRepository.count();
            
            // Estadísticas básicas por ahora
            estadisticas.put("totalEtapas", totalEtapas);
            estadisticas.put("timestamp", java.time.LocalDateTime.now().toString());
            
            logger.info("📊 Estadísticas generadas: {} etapas totales", totalEtapas);
            
            return ResponseEntity.ok(estadisticas);
            
        } catch (Exception e) {
            logger.error("❌ Error al obtener estadísticas: {}", e.getMessage());
            throw new RequestException("Error al obtener estadísticas de etapas");
        }
    }
}