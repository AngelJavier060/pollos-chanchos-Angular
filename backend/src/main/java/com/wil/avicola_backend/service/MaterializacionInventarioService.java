package com.wil.avicola_backend.service;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.wil.avicola_backend.error.RequestException;
import com.wil.avicola_backend.model.NombreProducto;
import com.wil.avicola_backend.model.Product;
import com.wil.avicola_backend.repository.NombreProductoRepository;
import com.wil.avicola_backend.repository.ProductRepository;

import lombok.RequiredArgsConstructor;

/**
 * Servicio puente para trabajar SOLO con nombre_producto desde el front
 * y materializar automáticamente Product + Inventario cuando sea necesario.
 */
@Service
@RequiredArgsConstructor
public class MaterializacionInventarioService {

    private final NombreProductoRepository nombreProductoRepository;
    private final ProductRepository productRepository;
    private final InventarioProductoService inventarioProductoService;

    // ==========================================================
    // Helpers de normalización y búsqueda
    // ==========================================================
    private String normalizar(String s) {
        if (s == null) return null;
        String t = Normalizer.normalize(s, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", ""); // quitar acentos
        t = t.toLowerCase();
        t = t.replaceAll("[^a-z0-9\\s]", " "); // quitar signos raros
        t = t.replaceAll("\\s+", " ").trim();
        return t;
    }

    private Optional<Product> buscarProductoPorNombreNormalizado(String nombrePlano) {
        String objetivo = normalizar(nombrePlano);
        if (objetivo == null || objetivo.isEmpty()) return Optional.empty();
        Iterable<Product> todos = productRepository.findAll();
        Product candidato = null;
        int mejorDiferencia = Integer.MAX_VALUE;
        for (Product p : todos) {
            String pn = p != null ? p.getName() : null;
            if (pn == null) continue;
            String norm = normalizar(pn);
            if (norm.equals(objetivo)) {
                return Optional.of(p);
            }
            if (norm.contains(objetivo) || objetivo.contains(norm)) {
                int diff = Math.abs(norm.length() - objetivo.length());
                if (diff < mejorDiferencia) {
                    mejorDiferencia = diff;
                    candidato = p;
                }
            }
        }
        return Optional.ofNullable(candidato);
    }

    private Optional<NombreProducto> buscarNombreProductoCanonico(String nombrePlano) {
        String objetivo = normalizar(nombrePlano);
        if (objetivo == null || objetivo.isEmpty()) return Optional.empty();
        NombreProducto candidato = null;
        int mejorDiferencia = Integer.MAX_VALUE;
        for (NombreProducto np : nombreProductoRepository.findAll()) {
            if (np == null) continue;
            String norm = normalizar(np.getNombre());
            if (norm.equals(objetivo)) {
                return Optional.of(np);
            }
            if (norm.contains(objetivo) || objetivo.contains(norm)) {
                int diff = Math.abs(norm.length() - objetivo.length());
                if (diff < mejorDiferencia) {
                    mejorDiferencia = diff;
                    candidato = np;
                }
            }
        }
        if (candidato != null) return Optional.of(candidato);
        // fallback rápido por ignoreCase (puede fallar con acentos pero suma)
        return nombreProductoRepository.findByNombreIgnoreCase(nombrePlano);
    }

    /**
     * Resolver un Product por nombre (ignorando acentos y mayúsculas/minúsculas).
     * Política actual:
     * 1) Buscar directamente en Product por nombre normalizado.
     * 2) Si no se encuentra, buscar en nombre_producto para obtener un nombre canónico
     *    y volver a intentar en Product por ese nombre canónico normalizado.
     * 3) Si aún no existe Product, NO crear automáticamente. Lanzar RequestException
     *    pidiendo registrar primero en Configuración > Productos.
     */
    @Transactional
    public Product asegurarProductoDesdeNombre(String nombrePlano) {
        if (nombrePlano == null || nombrePlano.trim().isEmpty()) {
            throw new IllegalArgumentException("El nombre de producto es obligatorio");
        }

        String nombreEntrada = nombrePlano.trim();

        // 1) Buscar en Product por nombre normalizado (evita duplicados Maiz/Maíz)
        Optional<Product> porProducto = buscarProductoPorNombreNormalizado(nombreEntrada);
        if (porProducto.isPresent()) return porProducto.get();

        // 2) Buscar nombre canónico en nombre_producto y reintentar en Product
        Optional<NombreProducto> npOpt = buscarNombreProductoCanonico(nombreEntrada);
        if (npOpt.isPresent()) {
            String nombreCanonico = npOpt.get().getNombre().trim();
            Optional<Product> porCanonico = buscarProductoPorNombreNormalizado(nombreCanonico);
            if (porCanonico.isPresent()) return porCanonico.get();
        }

        // 3) No crear automáticamente. Requerir registro en Configuración > Productos
        throw new RequestException(
            "Producto no encontrado: '" + nombreEntrada + "'. Regístrelo primero en Configuración > Productos y vuelva a intentar."
        );
    }

    /**
     * Variante que recibe ID de nombre_producto y resuelve el nombre.
     */
    @Transactional(readOnly = true)
    public String obtenerNombreDesdeId(Long nombreProductoId) {
        if (nombreProductoId == null) return null;
        NombreProducto np = nombreProductoRepository.findById(nombreProductoId).orElse(null);
        return np != null ? np.getNombre() : null;
    }

    /**
     * Asegura que exista inventario para el productId. Si no existe, lo crea con stock=0.
     * Si cantidadInicial>0, registra una ENTRADA.
     */
    @Transactional
    public void asegurarInventario(Long productId, BigDecimal cantidadInicial, String usuario, String observaciones) {
        if (productId == null) throw new IllegalArgumentException("productId requerido");
        inventarioProductoService.crearSiNoExiste(productId, null);
        if (cantidadInicial != null && cantidadInicial.compareTo(BigDecimal.ZERO) > 0) {
            inventarioProductoService.registrarMovimiento(
                productId,
                com.wil.avicola_backend.model.MovimientoInventarioProducto.TipoMovimiento.ENTRADA,
                cantidadInicial,
                null,
                null,
                usuario != null ? usuario : "Sistema",
                observaciones != null ? observaciones : "Inicialización automática desde materializador"
            );
        }
    }

    /**
     * Flujo completo: desde nombre (o id) asegurar Product e Inventario y devolver el productId.
     */
    @Transactional
    public Long asegurarProductoEInventarioDesdeNombre(Long nombreProductoId,
                                                       String nombreProducto,
                                                       BigDecimal cantidadInicial,
                                                       String usuario,
                                                       String observaciones) {
        String nombre = nombreProducto != null ? nombreProducto : obtenerNombreDesdeId(nombreProductoId);
        if (nombre == null || nombre.trim().isEmpty()) {
            throw new IllegalArgumentException("Debe proporcionar nombreProductoId o nombreProducto válido");
        }
        Product p = asegurarProductoDesdeNombre(nombre);
        asegurarInventario(p.getId(), cantidadInicial, usuario, observaciones);
        return p.getId();
    }
}
