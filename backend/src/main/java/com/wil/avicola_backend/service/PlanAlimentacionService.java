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
import com.wil.avicola_backend.error.RequestException;
import com.wil.avicola_backend.model.Animal;
import com.wil.avicola_backend.model.PlanAlimentacion;
import com.wil.avicola_backend.model.PlanDetalle;
import com.wil.avicola_backend.model.Usuario;
import com.wil.avicola_backend.dto.InventarioAlimentoResponse;
import com.wil.avicola_backend.model.PlanAsignacion;
import com.wil.avicola_backend.repository.AnimalRepository;
import com.wil.avicola_backend.repository.PlanAlimentacionRepository;
import com.wil.avicola_backend.repository.UsuarioRepository;
import com.wil.avicola_backend.repository.PlanAsignacionRepository;
import com.wil.avicola_backend.repository.PlanDetalleRepository;
import com.wil.avicola_backend.repository.ProductRepository;
import com.wil.avicola_backend.model.InventarioProducto;
import com.wil.avicola_backend.model.MovimientoInventarioProducto;
import com.wil.avicola_backend.repository.MovimientoInventarioProductoRepository;
import java.util.regex.Pattern;
import java.util.regex.Matcher;

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

    @Autowired
    private PlanAsignacionRepository planAsignacionRepository;

    @Autowired
    private PlanDetalleRepository planDetalleRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private InventarioProductoService inventarioProductoService;

    @Autowired
    private MovimientoInventarioProductoRepository movimientoInventarioProductoRepository;

    /**
     * Obtener todos los planes (implementación real)
     */
    public ResponseEntity<List<PlanAlimentacionResponseDto>> getAllPlanes() {
        System.out.println("🔍 Service: getAllPlanes() - IMPLEMENTACIÓN REAL");
        try {
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
     * Registrar consumo de alimento con deducción automática, priorizando un producto específico
     */
    @Transactional
    public ResponseEntity<?> registrarConsumoAlimentoPorProducto(
            String loteId,
            Long tipoAlimentoId,
            Long productId,
            BigDecimal cantidadKg,
            String usuarioRegistro,
            String observaciones) {
        System.out.println("🍽️ Registrando consumo de alimento POR PRODUCTO:");
        System.out.println("   - Lote ID: " + loteId);
        System.out.println("   - Tipo Alimento ID: " + tipoAlimentoId);
        System.out.println("   - Product ID: " + productId);
        System.out.println("   - Cantidad: " + cantidadKg + " kg");
        System.out.println("   - Usuario: " + usuarioRegistro);

        try {
            if (loteId == null || productId == null || cantidadKg == null) {
                return ResponseEntity.badRequest()
                    .body("Faltan parámetros obligatorios: loteId, productId, cantidadKg");
            }
            if (cantidadKg.compareTo(BigDecimal.ZERO) <= 0) {
                return ResponseEntity.badRequest().body("La cantidad debe ser mayor a cero");
            }

            // Derivar tipoAlimentoId si viene null
            if (tipoAlimentoId == null) {
                var prodOpt = productRepository.findById(productId);
                if (prodOpt.isPresent() && prodOpt.get().getTypeFood() != null) {
                    tipoAlimentoId = prodOpt.get().getTypeFood().getId();
                }
            }

            // Si no se pudo derivar tipoAlimentoId, realizar consumo SOLO en inventario de producto
            if (tipoAlimentoId == null) {
                System.out.println("ℹ️ tipoAlimentoId es null (producto sin tipo). Se descontará solo en inventario de producto.");
                inventarioAlimentoService.registrarConsumoSoloEnInventarioProducto(
                    null,
                    productId,
                    cantidadKg,
                    loteId,
                    (usuarioRegistro != null ? usuarioRegistro : "Usuario desconocido"),
                    (observaciones != null ? observaciones : "Consumo por producto sin tipoAlimentoId")
                );
                return ResponseEntity.ok().body(Map.of(
                    "success", true,
                    "message", "Consumo registrado en inventario de producto (sin tipoAlimentoId)",
                    "movimientoId", -1,
                    "stockAnterior", null,
                    "stockNuevo", null,
                    "cantidadConsumida", cantidadKg
                ));
            }

            try {
                var movimiento = inventarioAlimentoService.registrarConsumoLotePorProducto(
                    tipoAlimentoId,
                    productId,
                    cantidadKg,
                    loteId,
                    (usuarioRegistro != null ? usuarioRegistro : "Usuario desconocido"),
                    (observaciones != null ? observaciones : "Consumo registrado desde aplicación (por producto)")
                );

                System.out.println("✅ Consumo POR PRODUCTO registrado - Movimiento ID: " + movimiento.getId());

                return ResponseEntity.ok().body(Map.of(
                    "success", true,
                    "message", "Consumo registrado exitosamente",
                    "movimientoId", movimiento.getId(),
                    "stockAnterior", movimiento.getStockAnterior(),
                    "stockNuevo", movimiento.getStockNuevo(),
                    "cantidadConsumida", movimiento.getCantidad()
                ));
            } catch (RuntimeException ex) {
                // Fallback: si no hay stock en inventario por tipo, descuenta solo en inventario por producto
                if (ex.getMessage() != null && ex.getMessage().toLowerCase().contains("stock insuficiente")) {
                    System.out.println("⚠️ Fallback: inventario por tipo sin stock. Descontando SOLO en inventario de producto...");
                    inventarioAlimentoService.registrarConsumoSoloEnInventarioProducto(
                        tipoAlimentoId, productId, cantidadKg, loteId,
                        (usuarioRegistro != null ? usuarioRegistro : "Usuario desconocido"),
                        (observaciones != null ? observaciones : "Consumo por producto (fallback)")
                    );
                    return ResponseEntity.ok().body(Map.of(
                        "success", true,
                        "message", "Consumo registrado en inventario de producto (fallback). Inventario por tipo sin stock.",
                        "movimientoId", -1,
                        "stockAnterior", null,
                        "stockNuevo", null,
                        "cantidadConsumida", cantidadKg
                    ));
                }
                throw ex;
            }
        } catch (RuntimeException e) {
            System.err.println("❌ Error registrando consumo por producto: " + e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        } catch (Exception e) {
            System.err.println("❌ Error interno: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "error", "Error interno del servidor"
            ));
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
    public ResponseEntity<?> createPlanFromDto(PlanAlimentacionRequestDto dto, Long userId) {
        System.out.println("➕ Service: createPlanFromDto() - SIMPLIFICADO");
        System.out.println("📝 DTO: " + dto);
        
        try {
            // Validaciones obligatorias básicas
            if (dto == null) {
                throw new RequestException("Solicitud inválida");
            }
            if (dto.getName() == null || dto.getName().trim().isEmpty()) {
                throw new RequestException("El nombre del plan es obligatorio");
            }
            if (dto.getAnimalId() == null) {
                throw new RequestException("El animal es obligatorio");
            }
            PlanAlimentacion plan = new PlanAlimentacion();
            plan.setName(dto.getName());
            plan.setDescription(dto.getDescription());
            plan.setActive(true);
            plan.setCreateDate(LocalDateTime.now());
            plan.setUpdateDate(LocalDateTime.now());
            
            // Buscar y asignar usuario creador (relajado): si no existe, continuar sin asignar
            if (userId != null) {
                Optional<Usuario> userOpt = usuarioRepository.findById(userId);
                if (userOpt.isPresent()) {
                    plan.setCreatedByUser(userOpt.get());
                    System.out.println("✅ Usuario creador asignado: " + userOpt.get().getUsername());
                } else {
                    System.out.println("ℹ️ Usuario creador no encontrado (ID=" + userId + "). Continuando sin asignar createdByUser.");
                }
            } else {
                System.out.println("ℹ️ userId null. Continuando sin asignar createdByUser.");
            }
            // Fallback: asegurar createdByUser asignado
            if (plan.getCreatedByUser() == null) {
                Optional<Usuario> anyUser = usuarioRepository.findFirstByActiveTrueOrderByIdAsc();
                if (anyUser.isPresent()) {
                    plan.setCreatedByUser(anyUser.get());
                    System.out.println("✅ Usuario creador asignado por fallback: " + anyUser.get().getUsername());
                } else {
                    throw new RequestException("No hay usuarios activos para asignar como creador del plan");
                }
            }

            // Buscar y asignar animal (obligatorio)
            Optional<Animal> animalOpt = animalRepository.findById(dto.getAnimalId());
            if (animalOpt.isPresent()) {
                plan.setAnimal(animalOpt.get());
            } else {
                throw new RequestException("El animal especificado no existe");
            }

            // Validar duplicado por nombre+animal con activos
            List<PlanAlimentacion> planesActivosAnimal = planAlimentacionRepository.findByAnimalIdAndActiveTrue(dto.getAnimalId());
            boolean nombreDuplicado = planesActivosAnimal.stream()
                .anyMatch(p -> p.getName() != null && p.getName().trim().equalsIgnoreCase(dto.getName().trim()));
            if (nombreDuplicado) {
                throw new RequestException("Ya existe un plan ACTIVO con ese nombre para este animal");
            }
            // ✅ Validación ANTI-SOLAPAMIENTO a nivel de PLAN por animal (si el nombre contiene rango "min-max")
            if (dto.getAnimalId() != null && dto.getName() != null) {
                int[] nuevoRango = extraerRangoDesdeNombre(dto.getName());
                if (nuevoRango != null) {
                    List<PlanAlimentacion> existentes = planAlimentacionRepository.findByAnimalIdAndActiveTrue(dto.getAnimalId());
                    for (PlanAlimentacion pExist : existentes) {
                        if (pExist.getName() == null) continue;
                        int[] rangoExist = extraerRangoDesdeNombre(pExist.getName());
                        if (rangoExist != null && rangosSeSolapan(nuevoRango[0], nuevoRango[1], rangoExist[0], rangoExist[1])) {
                            throw new RequestException(
                                String.format("El rango %d-%d solapa con el plan existente '%s' (%d-%d) para este animal. Defina un rango que no se cruce.",
                                    nuevoRango[0], nuevoRango[1], pExist.getName(), rangoExist[0], rangoExist[1])
                            );
                        }
                    }
                }
            }
            
            PlanAlimentacion savedPlan = planAlimentacionRepository.save(plan);
            System.out.println("✅ Service: Plan creado ID: " + savedPlan.getId());

            // Construir DTO de respuesta para evitar problemas de lazy serialization
            PlanAlimentacionResponseDto responseDto = new PlanAlimentacionResponseDto();
            responseDto.setId(savedPlan.getId());
            responseDto.setName(savedPlan.getName());
            responseDto.setDescription(savedPlan.getDescription());
            responseDto.setActive(savedPlan.getActive());
            responseDto.setCreateDate(savedPlan.getCreateDate());
            responseDto.setUpdateDate(savedPlan.getUpdateDate());
            if (savedPlan.getAnimal() != null) {
                responseDto.setAnimalId(savedPlan.getAnimal().getId());
                responseDto.setAnimalName(savedPlan.getAnimal().getName());
            }
            if (savedPlan.getCreatedByUser() != null) {
                responseDto.setCreatedByUserId(savedPlan.getCreatedByUser().getId());
                responseDto.setCreatedByUserName(savedPlan.getCreatedByUser().getUsername());
                responseDto.setCreatedByUserEmail(savedPlan.getCreatedByUser().getEmail());
            }

            return ResponseEntity.status(HttpStatus.CREATED).body(responseDto);
        } catch (RequestException e) {
            throw e;
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            System.err.println("❌ Integridad de datos al crear plan: " + (e.getMostSpecificCause() != null ? e.getMostSpecificCause().getMessage() : e.getMessage()));
            return ResponseEntity.badRequest().body(java.util.Map.of(
                "success", false,
                "error", "No se pudo crear el plan por violación de integridad de datos (posible duplicado nombre + animal activo)."
            ));
        } catch (jakarta.validation.ConstraintViolationException e) {
            System.err.println("❌ Violación de constraints al crear plan: " + e.getMessage());
            return ResponseEntity.badRequest().body(java.util.Map.of(
                "success", false,
                "error", "Datos inválidos: " + e.getMessage()
            ));
        } catch (Exception e) {
            System.err.println("❌ Service: Error creando plan: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(java.util.Map.of(
                    "success", false,
                    "error", "Error creando plan: " + (e.getMessage() != null ? e.getMessage() : "ver logs de servidor")
                ));
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
        } catch (RequestException e) {
            throw e;
        } catch (Exception e) {
            System.err.println("❌ Service: Error actualizando plan: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ================== Helpers de rango ==================
    private int[] extraerRangoDesdeNombre(String nombre) {
        if (nombre == null) return null;
        Pattern p = Pattern.compile("(\\d+)\\s*-\\s*(\\d+)");
        Matcher m = p.matcher(nombre);
        if (m.find()) {
            try {
                int min = Integer.parseInt(m.group(1));
                int max = Integer.parseInt(m.group(2));
                if (min > 0 && max >= min) return new int[]{min, max};
            } catch (NumberFormatException ignored) {}
        }
        return null;
    }

    private boolean rangosSeSolapan(int aMin, int aMax, int bMin, int bMax) {
        return !(aMax < bMin || bMax < aMin);
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
     * Obtener productos para día (implementación real)
     */
    public List<PlanDetalle> getProductosParaDia(Long asignacionId, LocalDate fecha) {
        System.out.println("📅 Service: getProductosParaDia(" + asignacionId + ", " + fecha + ") - IMPLEMENTACIÓN REAL");
        try {
            if (asignacionId == null || fecha == null) {
                System.out.println("⚠️ Parámetros inválidos: asignacionId o fecha nulos");
                return new ArrayList<>();
            }

            // 1) Buscar la asignación
            PlanAsignacion asignacion = planAsignacionRepository.findById(asignacionId).orElse(null);
            if (asignacion == null) {
                System.out.println("⚠️ No se encontró la asignación ID: " + asignacionId);
                return new ArrayList<>();
            }

            // 2) Calcular día de vida del lote (preferido), con fallback a startDate de asignación
            long diaDeVida;
            if (asignacion.getLote() != null && asignacion.getLote().getBirthdate() != null) {
                LocalDate nacimiento = asignacion.getLote().getBirthdate().toInstant()
                        .atZone(java.time.ZoneId.systemDefault()).toLocalDate();
                diaDeVida = java.time.temporal.ChronoUnit.DAYS.between(nacimiento, fecha) + 1;
                System.out.println("📆 Día de vida calculado por birthdate: " + diaDeVida);
            } else if (asignacion.getStartDate() != null) {
                diaDeVida = java.time.temporal.ChronoUnit.DAYS.between(asignacion.getStartDate(), fecha) + 1;
                System.out.println("📆 Día calculado por startDate de asignación: " + diaDeVida);
            } else {
                System.out.println("⚠️ Asignación sin birthdate de lote ni startDate, sin productos");
                return new ArrayList<>();
            }

            if (diaDeVida <= 0) {
                System.out.println("ℹ️ Fecha anterior al inicio, no hay productos para consumir");
                return new ArrayList<>();
            }

            // 3) Buscar detalles del plan que apliquen para ese día
            Long planId = asignacion.getPlanAlimentacion() != null ? asignacion.getPlanAlimentacion().getId() : null;
            if (planId == null) {
                System.out.println("⚠️ La asignación no tiene plan asociado");
                return new ArrayList<>();
            }

            List<PlanDetalle> detalles = planDetalleRepository.findByPlanIdAndDayNumber(planId, (int) diaDeVida);
            // Inicializar relaciones para evitar LazyInitialization en la respuesta JSON
            for (PlanDetalle d : detalles) {
                try { if (d.getProduct() != null) d.getProduct().getId(); } catch (Exception ignore) {}
                try { if (d.getPlanAlimentacion() != null) d.getPlanAlimentacion().getId(); } catch (Exception ignore) {}
            }

            System.out.println("✅ Detalles encontrados para día " + diaDeVida + ": " + detalles.size());
            return detalles;
        } catch (Exception e) {
            System.err.println("❌ Service: Error en getProductosParaDia: " + e.getMessage());
            e.printStackTrace();
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
            
            try {
                // Registrar consumo y deducir inventario automáticamente (por tipo)
                var movimiento = inventarioAlimentoService.registrarConsumoLote(
                    tipoAlimentoId, 
                    cantidadKg, 
                    loteId, 
                    usuarioRegistro != null ? usuarioRegistro : "Usuario desconocido",
                    observaciones != null ? observaciones : "Consumo registrado desde aplicación"
                );
                System.out.println("✅ Consumo registrado exitosamente - Movimiento ID: " + movimiento.getId());
                return ResponseEntity.ok().body(Map.of(
                    "success", true,
                    "message", "Consumo registrado exitosamente",
                    "movimientoId", movimiento.getId(),
                    "stockAnterior", movimiento.getStockAnterior(),
                    "stockNuevo", movimiento.getStockNuevo(),
                    "cantidadConsumida", movimiento.getCantidad()
                ));
            } catch (RuntimeException ex) {
                // Fallback: si el inventario por tipo no tiene stock, descontar SOLO en inventario por producto (FIFO por tipo)
                if (ex.getMessage() != null && ex.getMessage().toLowerCase().contains("stock insuficiente")) {
                    System.out.println("⚠️ Fallback (sin productId): inventario por tipo sin stock. Descontando SOLO en inventario de producto...");
                    inventarioAlimentoService.registrarConsumoSoloEnInventarioProducto(
                        tipoAlimentoId, null, cantidadKg, loteId,
                        (usuarioRegistro != null ? usuarioRegistro : "Usuario desconocido"),
                        (observaciones != null ? observaciones : "Consumo por producto (fallback por tipo)")
                    );
                    return ResponseEntity.ok().body(Map.of(
                        "success", true,
                        "message", "Consumo registrado en inventario de producto (fallback). Inventario por tipo sin stock.",
                        "movimientoId", -1,
                        "stockAnterior", null,
                        "stockNuevo", null,
                        "cantidadConsumida", cantidadKg
                    ));
                }
                throw ex;
            }
            
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
     * Obtener todos los inventarios disponibles
     */
    public List<InventarioAlimentoResponse> obtenerTodosLosInventarios() {
        // Migrado a inventario_producto + movimientos_inventario_producto
        List<InventarioProducto> inventarios = inventarioProductoService.listar();
        List<InventarioAlimentoResponse> respuesta = new ArrayList<>();

        for (InventarioProducto inv : inventarios) {
            BigDecimal original = calcularCantidadOriginalPorProducto(inv);

            InventarioAlimentoResponse dto = InventarioAlimentoResponse.builder()
                .id(inv.getId())
                .tipoAlimento(inv.getProduct() != null ? inv.getProduct().getTypeFood() : null)
                .cantidadStock(inv.getCantidadStock())
                .cantidadOriginal(original)
                .unidadMedida(inv.getUnidadMedida())
                .stockMinimo(inv.getStockMinimo())
                .observaciones("Inventario por producto")
                .fechaCreacion(inv.getCreateDate())
                .fechaActualizacion(inv.getUpdateDate())
                .build();

            respuesta.add(dto);
        }
        return respuesta;
    }
    
    /**
     * Obtener movimientos de inventario por lote
     */
    public List<MovimientoInventarioProducto> obtenerMovimientosPorLote(String loteId) {
        // Migrado a movimientos_inventario_producto
        return movimientoInventarioProductoRepository.findByLoteIdOrderByFechaMovimientoDesc(loteId);
    }
    
    /**
     * Obtener total consumido por lote y tipo de alimento
     */
    public Double obtenerTotalConsumidoPorLote(String loteId, Long tipoAlimentoId) {
        // Migrado a movimientos_inventario_producto (solo CONSUMO_LOTE)
        BigDecimal total = movimientoInventarioProductoRepository
            .sumConsumoByLoteAndTipoAlimento(
                loteId,
                tipoAlimentoId,
                MovimientoInventarioProducto.TipoMovimiento.CONSUMO_LOTE
            );
        return total != null ? total.doubleValue() : 0.0;
    }
    
    /**
     * Obtener inventarios con stock bajo
     */
    public List<InventarioAlimentoResponse> obtenerInventariosStockBajo() {
        // Migrado a inventario_producto
        List<InventarioAlimentoResponse> stockBajo = new ArrayList<>();
        for (InventarioProducto inv : inventarioProductoService.listar()) {
            BigDecimal stock = inv.getCantidadStock() != null ? inv.getCantidadStock() : BigDecimal.ZERO;
            BigDecimal minimo = inv.getStockMinimo() != null ? inv.getStockMinimo() : BigDecimal.ZERO;
            if (stock.compareTo(minimo) <= 0) {
                BigDecimal original = calcularCantidadOriginalPorProducto(inv);
                stockBajo.add(
                    InventarioAlimentoResponse.builder()
                        .id(inv.getId())
                        .tipoAlimento(inv.getProduct() != null ? inv.getProduct().getTypeFood() : null)
                        .cantidadStock(inv.getCantidadStock())
                        .cantidadOriginal(original)
                        .unidadMedida(inv.getUnidadMedida())
                        .stockMinimo(inv.getStockMinimo())
                        .observaciones("Inventario por producto - stock bajo")
                        .fechaCreacion(inv.getCreateDate())
                        .fechaActualizacion(inv.getUpdateDate())
                        .build()
                );
            }
        }
        return stockBajo;
    }
    
    /**
     * Crear datos de ejemplo para inventario (TEMPORAL)
     */
    public int crearDatosEjemploInventario() {
        // Migrado: inicializar inventario_producto en base a Product.quantity (si > 0)
        int entradas = 0;
        try {
            Iterable<com.wil.avicola_backend.model.Product> productos = productRepository.findByActiveTrue();
            for (com.wil.avicola_backend.model.Product p : productos) {
                // Asegurar existencia de inventario del producto
                inventarioProductoService.crearSiNoExiste(p.getId(), null);
                // Si no hay stock y el producto tiene quantity > 0, registrar ENTRADA inicial
                BigDecimal stockActual = inventarioProductoService.obtenerStockActual(p.getId());
                if ((stockActual == null || stockActual.compareTo(BigDecimal.ZERO) == 0) && p.getQuantity() > 0) {
                    inventarioProductoService.registrarMovimiento(
                        p.getId(),
                        MovimientoInventarioProducto.TipoMovimiento.ENTRADA,
                        BigDecimal.valueOf(p.getQuantity()),
                        null,
                        null,
                        "SISTEMA",
                        "Inicialización de ejemplo desde Product.quantity"
                    );
                    entradas++;
                }
            }
            return entradas;
        } catch (Exception e) {
            System.err.println("❌ Error creando datos de ejemplo en inventario_producto: " + e.getMessage());
            return entradas;
        }
    }

    // ============================
    // Helpers
    // ============================
    private BigDecimal calcularCantidadOriginalPorProducto(InventarioProducto inv) {
        try {
            if (inv == null || inv.getProduct() == null) return inv != null ? inv.getCantidadStock() : BigDecimal.ZERO;
            List<MovimientoInventarioProducto> movimientosDesc = movimientoInventarioProductoRepository.findByProductId(inv.getProduct().getId());
            if (movimientosDesc == null || movimientosDesc.isEmpty()) {
                return inv.getCantidadStock();
            }
            MovimientoInventarioProducto primero = movimientosDesc.get(movimientosDesc.size() - 1); // el más antiguo
            BigDecimal a = primero.getStockAnterior() != null ? primero.getStockAnterior() : BigDecimal.ZERO;
            BigDecimal b = primero.getStockNuevo() != null ? primero.getStockNuevo() : BigDecimal.ZERO;
            return a.max(b);
        } catch (Exception e) {
            return inv != null ? inv.getCantidadStock() : BigDecimal.ZERO;
        }
    }
}
