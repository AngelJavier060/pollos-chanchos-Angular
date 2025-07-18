package com.wil.avicola_backend.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;
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
}
