package com.wil.avicola_backend.controller;

import java.math.BigDecimal;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.wil.avicola_backend.error.RequestException;
import com.wil.avicola_backend.model.Animal;
import com.wil.avicola_backend.model.Product;
import com.wil.avicola_backend.model.Subcategory;
import com.wil.avicola_backend.model.TypeFood;
import com.wil.avicola_backend.model.UnitMeasurement;
import com.wil.avicola_backend.repository.AnimalRepository;
import com.wil.avicola_backend.repository.CategoryRepository;
import com.wil.avicola_backend.repository.ProductRepository;
import com.wil.avicola_backend.repository.ProviderRepository;
import com.wil.avicola_backend.repository.StageRepository;
import com.wil.avicola_backend.repository.SubcategoryRepository;
import com.wil.avicola_backend.repository.TypeFoodRepository;
import com.wil.avicola_backend.repository.UnitMeasurementRepository;
import com.wil.avicola_backend.service.InventarioEntradaProductoService;
import com.wil.avicola_backend.service.InventarioProductoService;
import com.wil.avicola_backend.service.ProductService;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Controlador de apoyo para la APP móvil (Flutter) del módulo de Inventario.
 *
 * Expone el endpoint /api/inventario/productos con el mismo contrato JSON que
 * espera ProductoModel en Flutter, mapeando internamente contra la entidad
 * Product y los servicios de inventario (FEFO estricto).
 */
@Slf4j
@RestController
@RequestMapping("/api/inventario/productos")
@RequiredArgsConstructor
public class InventarioProductosMobileController {

    private final ProductRepository productRepository;
    private final InventarioEntradaProductoService inventarioEntradaProductoService;
    private final InventarioProductoService inventarioProductoService;
    private final ProductService productService;
    private final AnimalRepository animalRepository;
    private final ProviderRepository providerRepository;
    private final TypeFoodRepository typeFoodRepository;
    private final UnitMeasurementRepository unitMeasurementRepository;
    private final StageRepository stageRepository;
    private final SubcategoryRepository subcategoryRepository;
    private final CategoryRepository categoryRepository;

    private static final String DATE_PATTERN = "yyyy-MM-dd";

    // =============================
    // DTO para la APP móvil
    // =============================

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ProductoInventarioDto {
        private String id;
        private String nombre;
        private String descripcion;
        private String animalTipo;        // 'pollos', 'chanchos', 'ambos'
        private Long animalId;
        private Long providerId;
        private Long typeFoodId;
        private Long unitMeasurementId;
        private Long stageId;
        private Long subcategoryId;
        private String categoriaPrincipal;
        private String subcategoria;
        private String etapaAplicacion;
        private String unidadMedida;
        private Double cantidadActual;
        private Double nivelMinimo;
        private Double nivelMaximo;
        private String usoPrincipal;
        private String dosisRecomendada;
        private String viaAplicacion;
        private Double precioUnitario;
        private String fechaCompra;       // yyyy-MM-dd
        private String proveedor;         // nombre del proveedor (si aplica)
        private String numeroFactura;
        private String fechaVencimiento;  // yyyy-MM-dd
        private String loteFabricante;
        private Boolean incluirEnBotiquin;
        private Integer tiempoRetiro;
        private String observacionesMedicas;
        private String presentacion;
        private String infoNutricional;
    }

    // =============================
    // Endpoints principales
    // =============================

    @GetMapping
    public ResponseEntity<List<ProductoInventarioDto>> listar() {
        Iterable<Product> productos = productRepository.findByActiveTrue();
        Map<Long, BigDecimal> stockValido = inventarioEntradaProductoService.obtenerStockValidoAgrupado();

        List<ProductoInventarioDto> lista = new ArrayList<>();
        for (Product p : productos) {
            if (p == null) continue;
            Long pid = p.getId();
            BigDecimal stock = stockValido != null && pid != null ? stockValido.get(pid) : null;
            lista.add(toDto(p, stock));
        }
        return ResponseEntity.ok(lista);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductoInventarioDto> obtener(@PathVariable("id") Long id) {
        Product p = productRepository.findById(id)
                .orElseThrow(() -> new RequestException("Producto no encontrado"));
        Map<Long, BigDecimal> stockValido = inventarioEntradaProductoService.obtenerStockValidoAgrupado();
        BigDecimal stock = stockValido != null ? stockValido.get(id) : null;
        return ResponseEntity.ok(toDto(p, stock));
    }

    @PostMapping
    public ResponseEntity<ProductoInventarioDto> crear(@RequestBody ProductoInventarioDto dto) {
        log.info("========== CREAR PRODUCTO DESDE APP MÓVIL ==========");
        log.info("DTO recibido: nombre={}, animalId={}, providerId={}, typeFoodId={}, unitMeasurementId={}, stageId={}, infoNutricional={}",
                dto.getNombre(), dto.getAnimalId(), dto.getProviderId(), dto.getTypeFoodId(),
                dto.getUnitMeasurementId(), dto.getStageId(), dto.getInfoNutricional());
        
        if (dto == null || dto.getNombre() == null || dto.getNombre().trim().isEmpty()) {
            throw new RequestException("El nombre del producto es obligatorio");
        }
        String nombre = dto.getNombre().trim();
        if (productRepository.existsByName(nombre)) {
            throw new RequestException("Ya existe un producto con el nombre: " + nombre);
        }

        Product p = new Product();
        p.setName(nombre);
        p.setDescription(trimOrNull(dto.getDescripcion()));

        // Cantidad inicial y niveles
        double cantidad = dto.getCantidadActual() != null ? dto.getCantidadActual() : 0d;
        p.setQuantity((int) Math.max(0, Math.round(cantidad)));
        double nivelMin = dto.getNivelMinimo() != null ? dto.getNivelMinimo() : 0d;
        p.setLevel_min(nivelMin);
        double nivelMax = dto.getNivelMaximo() != null ? dto.getNivelMaximo() : 0d;
        p.setLevel_max(nivelMax);

        // Precio y factura
        if (dto.getPrecioUnitario() != null) {
            p.setPrice_unit(dto.getPrecioUnitario());
        }
        if (dto.getNumeroFactura() != null && !dto.getNumeroFactura().trim().isEmpty()) {
            try {
                p.setNumber_facture(Integer.parseInt(dto.getNumeroFactura().trim()));
            } catch (NumberFormatException ex) {
                p.setNumber_facture(0);
            }
        }

        // Fechas
        p.setDate_compra(parseDate(dto.getFechaCompra()));
        p.setFechaVencimiento(parseDate(dto.getFechaVencimiento()));

        // Etapa / uso médico
        p.setName_stage(trimOrNull(dto.getEtapaAplicacion()));
        p.setUsoPrincipal(trimOrNull(dto.getUsoPrincipal()));
        p.setDosisRecomendada(trimOrNull(dto.getDosisRecomendada()));
        p.setViaAdministracion(trimOrNull(dto.getViaAplicacion()));

        if (dto.getIncluirEnBotiquin() != null) {
            p.setIncluirEnBotiquin(dto.getIncluirEnBotiquin());
        }
        if (dto.getTiempoRetiro() != null) {
            p.setTiempoRetiro(dto.getTiempoRetiro());
        }
        p.setObservacionesMedicas(trimOrNull(dto.getObservacionesMedicas()));
        p.setPresentacion(trimOrNull(dto.getPresentacion()));
        p.setInfoNutricional(trimOrNull(dto.getInfoNutricional()));

        // Estado
        p.setActive(Boolean.TRUE);

        // Si el cliente envía IDs válidos de relaciones, delegar en ProductService
        // para asignar correctamente provider, typeFood, unitMeasurement, animal,
        // stage y category. En caso contrario, mantener el comportamiento simple
        // actual como fallback.

        Product guardado;
        Long providerId = dto.getProviderId();
        Long typeFoodId = dto.getTypeFoodId();
        Long unitMeasurementId = dto.getUnitMeasurementId();
        Long animalId = dto.getAnimalId();
        Long stageId = dto.getStageId();

        log.info("Asignando relaciones: providerId={}, typeFoodId={}, unitMeasurementId={}, animalId={}, stageId={}",
                providerId, typeFoodId, unitMeasurementId, animalId, stageId);

        // Asignar individualmente las relaciones que vengan en el DTO
        if (providerId != null) {
            log.info("Asignando provider con ID: {}", providerId);
            if (!providerRepository.existsById(providerId)) {
                throw new RequestException("No existe proveedor con ID: " + providerId);
            }
            p.setProvider(providerRepository.findById(providerId).orElse(null));
        }
        if (typeFoodId != null) {
            log.info("Asignando typeFood con ID: {}", typeFoodId);
            if (!typeFoodRepository.existsById(typeFoodId)) {
                throw new RequestException("No existe tipo de producto con ID: " + typeFoodId);
            }
            p.setTypeFood(typeFoodRepository.findById(typeFoodId).orElse(null));
            
            // También asignar category usando el mismo typeFoodId
            // (en el sistema, typeFood y category suelen ser el mismo)
            log.info("Asignando category con ID: {}", typeFoodId);
            if (categoryRepository.existsById(typeFoodId)) {
                p.setCategory(categoryRepository.findById(typeFoodId).orElse(null));
            } else {
                log.warn("No se encontró category con ID: {}, pero typeFood sí existe", typeFoodId);
            }
        }
        if (unitMeasurementId != null) {
            log.info("Asignando unitMeasurement con ID: {}", unitMeasurementId);
            if (!unitMeasurementRepository.existsById(unitMeasurementId)) {
                throw new RequestException("No existe unidad de medida con ID: " + unitMeasurementId);
            }
            p.setUnitMeasurement(unitMeasurementRepository.findById(unitMeasurementId).orElse(null));
        }
        if (animalId != null) {
            log.info("Asignando animal con ID: {}", animalId);
            if (!animalRepository.existsById(animalId)) {
                throw new RequestException("No existe animal con ID: " + animalId);
            }
            p.setAnimal(animalRepository.findById(animalId).orElse(null));
        }
        if (stageId != null) {
            log.info("Asignando stage con ID: {}", stageId);
            if (!stageRepository.existsById(stageId)) {
                throw new RequestException("No existe etapa con ID: " + stageId);
            }
            p.setStage(stageRepository.findById(stageId).orElse(null));
        }
        if (dto.getSubcategoryId() != null && dto.getSubcategoryId() > 0) {
            Long sid = dto.getSubcategoryId();
            log.info("Asignando subcategory con ID: {}", sid);
            if (subcategoryRepository.existsById(sid)) {
                p.setSubcategory(subcategoryRepository.findById(sid).orElse(null));
            }
        }

        log.info("Guardando producto en BD...");
        guardado = productRepository.save(p);
        log.info("Producto guardado con ID: {}", guardado.getId());

        // Sincronizar inventario consolidado + FEFO basado en Product.quantity
        inventarioProductoService.sincronizarDesdeProduct(
                guardado.getId(),
                "MobileApp",
                "Sincronización automática al crear producto desde app móvil");

        // Recalcular stock válido vigente
        Map<Long, BigDecimal> stockValido = inventarioEntradaProductoService.obtenerStockValidoAgrupado();
        BigDecimal stock = stockValido != null ? stockValido.get(guardado.getId()) : null;

        ProductoInventarioDto respuesta = toDto(guardado, stock);
        return ResponseEntity.status(HttpStatus.CREATED).body(respuesta);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductoInventarioDto> actualizar(@PathVariable("id") Long id,
                                                            @RequestBody ProductoInventarioDto dto) {
        Product p = productRepository.findById(id)
                .orElseThrow(() -> new RequestException("Producto no encontrado"));

        if (dto.getNombre() != null && !dto.getNombre().trim().isEmpty()) {
            String nuevoNombre = dto.getNombre().trim();
            if (!nuevoNombre.equalsIgnoreCase(p.getName()) && productRepository.existsByName(nuevoNombre)) {
                throw new RequestException("Ya existe un producto con el nombre: " + nuevoNombre);
            }
            p.setName(nuevoNombre);
        }

        if (dto.getDescripcion() != null) {
            p.setDescription(trimOrNull(dto.getDescripcion()));
        }

        // Niveles mínimos/máximos (cantidadActual se gestiona vía inventario FEFO)
        if (dto.getNivelMinimo() != null) {
            p.setLevel_min(dto.getNivelMinimo());
        }
        if (dto.getNivelMaximo() != null) {
            p.setLevel_max(dto.getNivelMaximo());
        }

        if (dto.getPrecioUnitario() != null) {
            p.setPrice_unit(dto.getPrecioUnitario());
        }

        if (dto.getNumeroFactura() != null) {
            try {
                p.setNumber_facture(Integer.parseInt(dto.getNumeroFactura().trim()));
            } catch (NumberFormatException ex) {
                // mantener valor previo si el nuevo no es válido
            }
        }

        if (dto.getFechaCompra() != null) {
            p.setDate_compra(parseDate(dto.getFechaCompra()));
        }
        if (dto.getFechaVencimiento() != null) {
            p.setFechaVencimiento(parseDate(dto.getFechaVencimiento()));
        }

        if (dto.getEtapaAplicacion() != null) {
            p.setName_stage(trimOrNull(dto.getEtapaAplicacion()));
        }
        if (dto.getUsoPrincipal() != null) {
            p.setUsoPrincipal(trimOrNull(dto.getUsoPrincipal()));
        }
        if (dto.getDosisRecomendada() != null) {
            p.setDosisRecomendada(trimOrNull(dto.getDosisRecomendada()));
        }
        if (dto.getViaAplicacion() != null) {
            p.setViaAdministracion(trimOrNull(dto.getViaAplicacion()));
        }

        if (dto.getIncluirEnBotiquin() != null) {
            p.setIncluirEnBotiquin(dto.getIncluirEnBotiquin());
        }
        if (dto.getTiempoRetiro() != null) {
            p.setTiempoRetiro(dto.getTiempoRetiro());
        }
        if (dto.getObservacionesMedicas() != null) {
            p.setObservacionesMedicas(trimOrNull(dto.getObservacionesMedicas()));
        }
        if (dto.getPresentacion() != null) {
            p.setPresentacion(trimOrNull(dto.getPresentacion()));
        }
        if (dto.getInfoNutricional() != null) {
            p.setInfoNutricional(trimOrNull(dto.getInfoNutricional()));
        }

        Product actualizado = productRepository.save(p);

        Map<Long, BigDecimal> stockValido = inventarioEntradaProductoService.obtenerStockValidoAgrupado();
        BigDecimal stock = stockValido != null ? stockValido.get(actualizado.getId()) : null;
        return ResponseEntity.ok(toDto(actualizado, stock));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable("id") Long id) {
        // Reutiliza la lógica de borrado suave de ProductService
        productService.deleteProduct(id);
        return ResponseEntity.noContent().build();
    }

    // =============================
    // Helpers de mapeo
    // =============================

    private ProductoInventarioDto toDto(Product p, BigDecimal stockValidoBase) {
        if (p == null) return null;

        double cantidadActual = stockValidoBase != null ? stockValidoBase.doubleValue() : 0d;

        String unidadMedida = null;
        UnitMeasurement um = p.getUnitMeasurement();
        Long unitMeasurementId = null;
        if (um != null) {
            unitMeasurementId = um.getId();
            if (um.getName_short() != null && !um.getName_short().isBlank()) {
                unidadMedida = um.getName_short();
            } else if (um.getName() != null) {
                unidadMedida = um.getName();
            }
        }
        if (unidadMedida == null || unidadMedida.isBlank()) {
            unidadMedida = "unidad";
        }

        Animal animal = p.getAnimal();
        String animalTipo = mapAnimalTipo(animal);
        Long animalId = animal != null ? animal.getId() : null;

        String categoriaPrincipal = null;
        TypeFood tf = p.getTypeFood();
        Long typeFoodId = null;
        if (tf != null && tf.getName() != null) {
            typeFoodId = tf.getId();
            categoriaPrincipal = tf.getName();
        }

        String subcategoria = null;
        Subcategory sc = p.getSubcategory();
        Long subcategoryId = null;
        if (sc != null && sc.getName() != null) {
            subcategoryId = sc.getId();
            subcategoria = sc.getName();
        }

        String proveedor = p.getProvider() != null ? p.getProvider().getName() : null;
        Long providerId = p.getProvider() != null ? p.getProvider().getId() : null;

        Long stageId = p.getStage() != null ? p.getStage().getId() : null;

        String numeroFactura = null;
        if (p.getNumber_facture() != 0) {
            numeroFactura = Integer.toString(p.getNumber_facture());
        }

        return ProductoInventarioDto.builder()
                .id(p.getId() != 0 ? Long.toString(p.getId()) : null)
                .nombre(p.getName())
                .descripcion(p.getDescription())
                .animalTipo(animalTipo)
                .animalId(animalId)
                .providerId(providerId)
                .typeFoodId(typeFoodId)
                .unitMeasurementId(unitMeasurementId)
                .stageId(stageId)
                .subcategoryId(subcategoryId)
                .categoriaPrincipal(categoriaPrincipal)
                .subcategoria(subcategoria)
                .etapaAplicacion(p.getName_stage())
                .unidadMedida(unidadMedida)
                .cantidadActual(cantidadActual)
                .nivelMinimo(p.getLevel_min())
                .nivelMaximo(p.getLevel_max())
                .usoPrincipal(p.getUsoPrincipal())
                .dosisRecomendada(p.getDosisRecomendada())
                .viaAplicacion(p.getViaAdministracion())
                .precioUnitario(p.getPrice_unit())
                .fechaCompra(formatDate(p.getDate_compra()))
                .proveedor(proveedor)
                .numeroFactura(numeroFactura)
                .fechaVencimiento(formatDate(p.getFechaVencimiento()))
                .loteFabricante(null)
                .incluirEnBotiquin(p.getIncluirEnBotiquin())
                .tiempoRetiro(p.getTiempoRetiro())
                .observacionesMedicas(p.getObservacionesMedicas())
                .presentacion(p.getPresentacion())
                .infoNutricional(p.getInfoNutricional())
                .build();
    }

    private String mapAnimalTipo(Animal animal) {
        if (animal == null || animal.getName() == null) return "ambos";
        String n = animal.getName().toLowerCase();
        if (n.contains("pollo") || n.contains("ave") || n.contains("broiler")) {
            return "pollos";
        }
        if (n.contains("chancho") || n.contains("cerdo") || n.contains("porcino")) {
            return "chanchos";
        }
        return "ambos";
    }

    private String trimOrNull(String value) {
        if (value == null) return null;
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }

    private String formatDate(Date d) {
        if (d == null) return null;
        try {
            return new SimpleDateFormat(DATE_PATTERN).format(d);
        } catch (Exception ex) {
            return null;
        }
    }

    private Date parseDate(String value) {
        if (value == null || value.trim().isEmpty()) return null;
        try {
            return new SimpleDateFormat(DATE_PATTERN).parse(value.trim());
        } catch (ParseException ex) {
            return null;
        }
    }
}
