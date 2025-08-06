package com.wil.avicola_backend.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.wil.avicola_backend.dto.PlanAlimentacionRequestDto;
import com.wil.avicola_backend.dto.PlanAlimentacionUpdateDto;
import com.wil.avicola_backend.dto.PlanAlimentacionResponseDto;
import com.wil.avicola_backend.model.Animal;
import com.wil.avicola_backend.model.PlanAlimentacion;
import com.wil.avicola_backend.model.PlanDetalle;
import com.wil.avicola_backend.model.Usuario;
import com.wil.avicola_backend.repository.AnimalRepository;
import com.wil.avicola_backend.repository.PlanAlimentacionRepository;
import com.wil.avicola_backend.repository.UsuarioRepository;

/**
 * Servicio SIMPLIFICADO para la gestión de Planes de Alimentación
 * 
 * ENFOQUE: Resolver el problema 403 primero, luego mejorar funcionalidad
 */
@Service
@Transactional
public class PlanAlimentacionService {

    @Autowired
    private PlanAlimentacionRepository planAlimentacionRepository;
    
    @Autowired
    private AnimalRepository animalRepository;
    
    @Autowired
    private UsuarioRepository usuarioRepository;
    
    @Autowired
    private InventarioAlimentoService inventarioAlimentoService;

    /**
     * Obtener todos los planes (implementación real)
     */
    public ResponseEntity<List<PlanAlimentacionResponseDto>> getAllPlanes() {
        System.out.println("🔍 Service: getAllPlanes() - IMPLEMENTACIÓN REAL");
        try {
            // Usar el método correcto del repositorio
            List<PlanAlimentacion> planes = planAlimentacionRepository.findByActiveTrueWithAnimalAndUserOrderByCreateDateDesc();
            List<PlanAlimentacionResponseDto> dtos = new ArrayList<>();
            
            for (PlanAlimentacion plan : planes) {
                PlanAlimentacionResponseDto dto = new PlanAlimentacionResponseDto();
                dto.setId(plan.getId());
                dto.setName(plan.getName());
                dto.setDescription(plan.getDescription());
                dto.setActive(plan.getActive());
                dto.setCreateDate(plan.getCreateDate());
                dto.setUpdateDate(plan.getUpdateDate());
                
                if (plan.getAnimal() != null) {
                    dto.setAnimalId(plan.getAnimal().getId());
                    dto.setAnimalName(plan.getAnimal().getName());
                    // animalType no está disponible en el modelo actual
                }
                
                if (plan.getCreatedByUser() != null) {
                    dto.setCreatedByUserId(plan.getCreatedByUser().getId());
                    dto.setCreatedByUserName(plan.getCreatedByUser().getUsername());
                    dto.setCreatedByUserEmail(plan.getCreatedByUser().getEmail());
                }
                
                dtos.add(dto);
            }
            
            System.out.println("✅ Service: Devolviendo " + dtos.size() + " planes activos");
            return ResponseEntity.ok(dtos);
        } catch (Exception e) {
            System.err.println("❌ Service: Error obteniendo planes: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Obtener todos los planes incluyendo inactivos (implementación real)
     */
    public ResponseEntity<List<PlanAlimentacionResponseDto>> getAllPlanesIncludingInactive() {
        System.out.println("🔍 Service: getAllPlanesIncludingInactive() - IMPLEMENTACIÓN REAL");
        try {
            // Obtener TODOS los planes (activos e inactivos) con animales y usuarios
            List<PlanAlimentacion> planes = planAlimentacionRepository.findAllWithAnimalAndUserOrderByCreateDateDesc();
            List<PlanAlimentacionResponseDto> dtos = new ArrayList<>();
            
            for (PlanAlimentacion plan : planes) {
                PlanAlimentacionResponseDto dto = new PlanAlimentacionResponseDto();
                dto.setId(plan.getId());
                dto.setName(plan.getName());
                dto.setDescription(plan.getDescription());
                dto.setActive(plan.getActive());
                dto.setCreateDate(plan.getCreateDate());
                dto.setUpdateDate(plan.getUpdateDate());
                
                if (plan.getAnimal() != null) {
                    dto.setAnimalId(plan.getAnimal().getId());
                    dto.setAnimalName(plan.getAnimal().getName());
                    dto.setAnimalType(plan.getAnimal().getDescription());
                }
                
                if (plan.getCreatedByUser() != null) {
                    dto.setCreatedByUserId(plan.getCreatedByUser().getId());
                    dto.setCreatedByUserName(plan.getCreatedByUser().getUsername());
                    dto.setCreatedByUserEmail(plan.getCreatedByUser().getEmail());
                }
                
                dtos.add(dto);
            }
            
            System.out.println("✅ Service: Devolviendo " + dtos.size() + " planes (incluyendo inactivos)");
            return ResponseEntity.ok(dtos);
        } catch (Exception e) {
            System.err.println("❌ Service: Error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Obtener planes por animal (simplificado)
     */
    public ResponseEntity<List<PlanAlimentacion>> getPlanesByAnimal(Long animalId) {
        System.out.println("🔍 Service: getPlanesByAnimal(" + animalId + ") - SIMPLIFICADO");
        try {
            List<PlanAlimentacion> planes = new ArrayList<>();
            System.out.println("✅ Service: Devolviendo lista vacía temporal");
            return ResponseEntity.ok(planes);
        } catch (Exception e) {
            System.err.println("❌ Service: Error: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Obtener plan con detalles (simplificado)
     */
    public ResponseEntity<PlanAlimentacion> getPlanWithDetails(Long planId) {
        System.out.println("🔍 Service: getPlanWithDetails(" + planId + ") - SIMPLIFICADO");
        try {
            Optional<PlanAlimentacion> planOpt = planAlimentacionRepository.findById(planId);
            if (planOpt.isPresent()) {
                System.out.println("✅ Service: Plan encontrado ID: " + planId);
                return ResponseEntity.ok(planOpt.get());
            } else {
                System.out.println("❌ Service: Plan no encontrado ID: " + planId);
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            System.err.println("❌ Service: Error: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Crear plan (simplificado)
     */
    public ResponseEntity<PlanAlimentacion> createPlanFromDto(PlanAlimentacionRequestDto dto, Long userId) {
        System.out.println("➕ Service: createPlanFromDto() - SIMPLIFICADO");
        System.out.println("📝 DTO: " + dto);
        
        try {
            PlanAlimentacion plan = new PlanAlimentacion();
            plan.setName(dto.getName());
            plan.setDescription(dto.getDescription());
            plan.setActive(true);
            plan.setCreateDate(LocalDateTime.now());
            plan.setUpdateDate(LocalDateTime.now());
            
            // Buscar y asignar usuario creador
            if (userId != null) {
                Optional<Usuario> userOpt = usuarioRepository.findById(userId);
                if (userOpt.isPresent()) {
                    plan.setCreatedByUser(userOpt.get());
                    System.out.println("✅ Usuario creador asignado: " + userOpt.get().getUsername());
                } else {
                    System.err.println("❌ Usuario no encontrado con ID: " + userId);
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
                }
            } else {
                System.err.println("❌ userId es null, no se puede asignar usuario creador");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
            }
            
            // Buscar animal si se especifica
            if (dto.getAnimalId() != null) {
                Optional<Animal> animalOpt = animalRepository.findById(dto.getAnimalId());
                if (animalOpt.isPresent()) {
                    plan.setAnimal(animalOpt.get());
                }
            }
            
            PlanAlimentacion savedPlan = planAlimentacionRepository.save(plan);
            System.out.println("✅ Service: Plan creado ID: " + savedPlan.getId());
            
            return ResponseEntity.status(HttpStatus.CREATED).body(savedPlan);
        } catch (Exception e) {
            System.err.println("❌ Service: Error creando plan: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Actualizar plan (simplificado) - MÉTODO PRINCIPAL QUE ESTÁ FALLANDO
     */
    public ResponseEntity<PlanAlimentacionResponseDto> updatePlanFromDto(Long planId, PlanAlimentacionUpdateDto dto) {
        System.out.println("🔄 Service: updatePlanFromDto(" + planId + ") - SIMPLIFICADO");
        System.out.println("📝 DTO: " + dto);
        
        try {
            Optional<PlanAlimentacion> planOpt = planAlimentacionRepository.findById(planId);
            
            if (!planOpt.isPresent()) {
                System.out.println("❌ Service: Plan no encontrado ID: " + planId);
                return ResponseEntity.notFound().build();
            }
            
            PlanAlimentacion plan = planOpt.get();
            System.out.println("📝 Plan encontrado: " + plan.getName());
            
            // Actualizar campos básicos
            if (dto.getName() != null && !dto.getName().trim().isEmpty()) {
                plan.setName(dto.getName().trim());
                System.out.println("📝 Nuevo nombre: " + plan.getName());
            }
            
            if (dto.getDescription() != null) {
                plan.setDescription(dto.getDescription().trim());
                System.out.println("📝 Nueva descripción: " + plan.getDescription());
            }
            
            // Actualizar animal si se especifica
            if (dto.getAnimalId() != null) {
                Optional<Animal> animalOpt = animalRepository.findById(dto.getAnimalId());
                if (animalOpt.isPresent()) {
                    plan.setAnimal(animalOpt.get());
                    System.out.println("📝 Nuevo animal ID: " + dto.getAnimalId());
                }
            }
            
            plan.setUpdateDate(LocalDateTime.now());
            
            // Guardar cambios
            PlanAlimentacion updatedPlan = planAlimentacionRepository.save(plan);
            System.out.println("✅ Service: Plan actualizado exitosamente ID: " + updatedPlan.getId());
            
            // Convertir a DTO para evitar problemas de serialización
            PlanAlimentacionResponseDto responseDto = new PlanAlimentacionResponseDto();
            responseDto.setId(updatedPlan.getId());
            responseDto.setName(updatedPlan.getName());
            responseDto.setDescription(updatedPlan.getDescription());
            responseDto.setActive(updatedPlan.getActive());
            responseDto.setCreateDate(updatedPlan.getCreateDate());
            responseDto.setUpdateDate(updatedPlan.getUpdateDate());
            
            // Datos del animal (evitando lazy loading)
            if (updatedPlan.getAnimal() != null) {
                responseDto.setAnimalId(updatedPlan.getAnimal().getId());
                responseDto.setAnimalName(updatedPlan.getAnimal().getName());
            }
            
            return ResponseEntity.ok(responseDto);
        } catch (Exception e) {
            System.err.println("❌ Service: Error actualizando plan: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Desactivar plan (simplificado)
     */
    public ResponseEntity<Void> deactivatePlan(Long planId) {
        System.out.println("🗑️ Service: deactivatePlan(" + planId + ") - SIMPLIFICADO");
        
        try {
            Optional<PlanAlimentacion> planOpt = planAlimentacionRepository.findById(planId);
            
            if (!planOpt.isPresent()) {
                System.out.println("❌ Service: Plan no encontrado ID: " + planId);
                return ResponseEntity.notFound().build();
            }
            
            PlanAlimentacion plan = planOpt.get();
            plan.setActive(false);
            plan.setUpdateDate(LocalDateTime.now());
            planAlimentacionRepository.save(plan);
            
            System.out.println("✅ Service: Plan desactivado ID: " + planId);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            System.err.println("❌ Service: Error desactivando plan: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Eliminar permanentemente (simplificado)
     */
    public ResponseEntity<Void> hardDeletePlan(Long planId) {
        System.out.println("🗑️ Service: hardDeletePlan(" + planId + ") - SIMPLIFICADO");
        
        try {
            if (!planAlimentacionRepository.existsById(planId)) {
                System.out.println("❌ Service: Plan no encontrado ID: " + planId);
                return ResponseEntity.notFound().build();
            }
            
            planAlimentacionRepository.deleteById(planId);
            System.out.println("✅ Service: Plan eliminado permanentemente ID: " + planId);
            
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            System.err.println("❌ Service: Error eliminando plan: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Obtener productos para día (simplificado)
     */
    public List<PlanDetalle> getProductosParaDia(Long asignacionId, LocalDate fecha) {
        System.out.println("📅 Service: getProductosParaDia(" + asignacionId + ", " + fecha + ") - SIMPLIFICADO");
        
        try {
            // Por ahora devolvemos lista vacía
            List<PlanDetalle> productos = new ArrayList<>();
            System.out.println("✅ Service: Devolviendo lista vacía temporal");
            return productos;
        } catch (Exception e) {
            System.err.println("❌ Service: Error: " + e.getMessage());
            return new ArrayList<>();
        }
    }
    
    /**
     * Registrar consumo de alimento con deducción automática de inventario
     * 
     * @param loteId ID del lote (UUID)
     * @param tipoAlimentoId ID del tipo de alimento
     * @param cantidadKg Cantidad en kilogramos
     * @param usuarioRegistro Usuario que registra
     * @param observaciones Observaciones adicionales
     * @return ResponseEntity con resultado
     */
    @Transactional
    public ResponseEntity<?> registrarConsumoAlimento(
            String loteId, 
            Long tipoAlimentoId, 
            BigDecimal cantidadKg, 
            String usuarioRegistro, 
            String observaciones) {
        
        System.out.println("🍽️ Registrando consumo de alimento:");
        System.out.println("   - Lote ID: " + loteId);
        System.out.println("   - Tipo Alimento ID: " + tipoAlimentoId);
        System.out.println("   - Cantidad: " + cantidadKg + " kg");
        System.out.println("   - Usuario: " + usuarioRegistro);
        
        try {
            // Validaciones básicas
            if (loteId == null || tipoAlimentoId == null || cantidadKg == null) {
                return ResponseEntity.badRequest()
                    .body("Faltan parámetros obligatorios: loteId, tipoAlimentoId, cantidadKg");
            }
            
            if (cantidadKg.compareTo(BigDecimal.ZERO) <= 0) {
                return ResponseEntity.badRequest()
                    .body("La cantidad debe ser mayor a cero");
            }
            
            // Registrar consumo y deducir inventario automáticamente
            var movimiento = inventarioAlimentoService.registrarConsumoLote(
                tipoAlimentoId, 
                cantidadKg, 
                loteId, 
                usuarioRegistro != null ? usuarioRegistro : "Usuario desconocido",
                observaciones != null ? observaciones : "Consumo registrado desde aplicación"
            );
            
            System.out.println("✅ Consumo registrado exitosamente - Movimiento ID: " + movimiento.getId());
            
            // Retornar información del movimiento
            return ResponseEntity.ok().body(Map.of(
                "success", true,
                "message", "Consumo registrado exitosamente",
                "movimientoId", movimiento.getId(),
                "stockAnterior", movimiento.getStockAnterior(),
                "stockNuevo", movimiento.getStockNuevo(),
                "cantidadConsumida", movimiento.getCantidad()
            ));
            
        } catch (RuntimeException e) {
            System.err.println("❌ Error registrando consumo: " + e.getMessage());
            return ResponseEntity.badRequest()
                .body(Map.of(
                    "success", false,
                    "error", e.getMessage()
                ));
            
        } catch (Exception e) {
            System.err.println("❌ Error interno: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of(
                    "success", false,
                    "error", "Error interno del servidor"
                ));
        }
    }
    
    // ============================================================================
    // MÉTODOS DE INVENTARIO - DELEGACIÓN A InventarioAlimentoService  
    // ============================================================================
    
    /**
     * Obtener todos los inventarios con cálculos completos
     */
    public List<com.wil.avicola_backend.dto.InventarioResponseDto> obtenerTodosLosInventarios() {
        return inventarioAlimentoService.obtenerTodosLosInventariosConCalculos();
    }
    
    /**
     * Obtener todos los movimientos de inventario
     */
    public List<com.wil.avicola_backend.model.MovimientoInventario> obtenerTodosLosMovimientos() {
        return inventarioAlimentoService.obtenerTodosLosMovimientos();
    }
    
    /**
     * Obtener movimientos de inventario por lote
     */
    public List<com.wil.avicola_backend.model.MovimientoInventario> obtenerMovimientosPorLote(String loteId) {
        return inventarioAlimentoService.obtenerMovimientosPorLote(loteId);
    }
    
    /**
     * Obtener total consumido por lote y tipo de alimento
     */
    public Double obtenerTotalConsumidoPorLote(String loteId, Long tipoAlimentoId) {
        return inventarioAlimentoService.obtenerTotalConsumidoPorLote(loteId, tipoAlimentoId);
    }
    
    /**
     * Obtener inventarios con stock bajo
     */
    public List<com.wil.avicola_backend.model.InventarioAlimento> obtenerInventariosStockBajo() {
        return inventarioAlimentoService.obtenerInventariosStockBajo();
    }

    /**
     * Calcular total consumido por tipo de alimento
     */
    public java.math.BigDecimal calcularTotalConsumido(Long tipoAlimentoId) {
        return inventarioAlimentoService.calcularTotalConsumido(tipoAlimentoId);
    }
    
    /**
     * Sincronizar inventario con productos reales
     */
    public int sincronizarInventarioConProductos() {
        return inventarioAlimentoService.sincronizarInventarioConProductos();
    }
    
    /**
     * Limpiar inventarios genéricos obsoletos
     */
    public int limpiarInventariosGenericos() {
        return inventarioAlimentoService.limpiarInventariosGenericos();
    }
}
