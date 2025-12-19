package com.wil.avicola_backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.*;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/consumos-lote")
@CrossOrigin(origins = "http://localhost:4200")
public class ConsumosLoteController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @GetMapping
    public List<ConsumosPorLote> getConsumosPorLote(@RequestParam(defaultValue = "chanchos") String especie) {
        List<ConsumosPorLote> consumos = new ArrayList<>();
        
        try {
            // Determinar el tipo de animal basado en la especie
            String tipoAnimal = "chanchos".equals(especie) ? "Chanchos" : "Pollos";
            
            System.out.println("[ConsumosLote] ========== DIAGNÓSTICO ==========");
            System.out.println("[ConsumosLote] Especie solicitada: " + especie);
            System.out.println("[ConsumosLote] Buscando animal: " + tipoAnimal);
            
            // Patrones de búsqueda por especie (sinónimos y variantes)
            List<String> patrones = new ArrayList<>();
            if ("chanchos".equalsIgnoreCase(especie)) {
                Collections.addAll(patrones, "%chancho%", "%cerdo%", "%porc%", "%porcino%", "%puerco%");
            } else {
                Collections.addAll(patrones, "%pollo%", "%gallin%", "%ave%", "%avicola%", "%broiler%");
            }
            // Asegurar tamaño fijo de 5 parámetros para SQL (completar con el último patrón)
            while (patrones.size() < 5) {
                patrones.add(patrones.get(patrones.size() - 1));
            }
            
            // Diagnóstico: Ver qué animales existen
            try {
                List<Map<String, Object>> animales = jdbcTemplate.queryForList("SELECT id, name FROM animals");
                System.out.println("[ConsumosLote] Animales en BD: " + animales);
            } catch (Exception e) {
                System.out.println("[ConsumosLote] Error consultando animales: " + e.getMessage());
            }
            
            // Diagnóstico: Ver cuántos registros hay en plan_ejecucion
            try {
                List<Map<String, Object>> ejecuciones = jdbcTemplate.queryForList(
                    "SELECT status, COUNT(*) as cantidad FROM plan_ejecucion GROUP BY status");
                System.out.println("[ConsumosLote] Ejecuciones por status: " + ejecuciones);
            } catch (Exception e) {
                System.out.println("[ConsumosLote] Error consultando ejecuciones: " + e.getMessage());
            }
            
            // Diagnóstico: Ver lotes de chanchos
            try {
                List<Map<String, Object>> lotesChanchos = jdbcTemplate.queryForList(
                    "SELECT l.id, l.codigo, a.name as animal FROM lotes l " +
                    "LEFT JOIN races r ON l.race_id = r.id " +
                    "LEFT JOIN animals a ON r.animal_id = a.id " +
                    "WHERE a.name LIKE '%Chancho%' OR a.name LIKE '%Cerdo%' OR a.name LIKE '%Porcino%'");
                System.out.println("[ConsumosLote] Lotes de chanchos encontrados: " + lotesChanchos.size());
            } catch (Exception e) {
                System.out.println("[ConsumosLote] Error consultando lotes: " + e.getMessage());
            }
            
            // Consulta SQL principal: flexible por sinónimos y status EJECUTADO (case-insensitive)
            String sql = """
                SELECT 
                    l.id as lote_id,
                    l.codigo as lote_codigo,
                    pe.id as ejecucion_id,
                    pe.quantity_applied as cantidad,
                    pe.execution_date as fecha,
                    pe.create_date as fecha_hora,
                    pe.observations as observaciones,
                    p.name as producto_nombre,
                    p.id as producto_id,
                    u.username as usuario_nombre,
                    u.name as usuario_nombre_completo
                FROM plan_ejecucion pe
                LEFT JOIN plan_asignacion pa ON pe.asignacion_id = pa.id
                LEFT JOIN lotes l ON pa.lote_id = l.id
                LEFT JOIN plan_detalle pd ON pe.detalle_id = pd.id
                LEFT JOIN product p ON pd.product_id = p.id
                LEFT JOIN usuarios u ON pe.executed_by_user_id = u.id
                LEFT JOIN races r ON l.race_id = r.id
                LEFT JOIN animals a ON r.animal_id = a.id
                WHERE (
                    LOWER(a.name) LIKE ? OR LOWER(a.name) LIKE ? OR LOWER(a.name) LIKE ? OR LOWER(a.name) LIKE ? OR LOWER(a.name) LIKE ?
                )
                AND UPPER(pe.status) = 'EJECUTADO'
                ORDER BY l.codigo, pe.create_date DESC
            """;
            
            List<Map<String, Object>> results = jdbcTemplate.queryForList(
                sql,
                patrones.get(0), patrones.get(1), patrones.get(2), patrones.get(3), patrones.get(4)
            );
            System.out.println("[ConsumosLote] Registros (EJECUTADO) con patrones " + patrones + ": " + results.size());
            
            // Fallback 1: ampliar estatus si no hay resultados
            if (results.isEmpty()) {
                String sqlFallbackStatus = """
                    SELECT 
                        l.id as lote_id,
                        l.codigo as lote_codigo,
                        pe.id as ejecucion_id,
                        pe.quantity_applied as cantidad,
                        pe.execution_date as fecha,
                        pe.create_date as fecha_hora,
                        pe.observations as observaciones,
                        p.name as producto_nombre,
                        p.id as producto_id,
                        u.username as usuario_nombre,
                        u.name as usuario_nombre_completo
                    FROM plan_ejecucion pe
                    LEFT JOIN plan_asignacion pa ON pe.asignacion_id = pa.id
                    LEFT JOIN lotes l ON pa.lote_id = l.id
                    LEFT JOIN plan_detalle pd ON pe.detalle_id = pd.id
                    LEFT JOIN product p ON pd.product_id = p.id
                    LEFT JOIN usuarios u ON pe.executed_by_user_id = u.id
                    LEFT JOIN races r ON l.race_id = r.id
                    LEFT JOIN animals a ON r.animal_id = a.id
                    WHERE (
                        LOWER(a.name) LIKE ? OR LOWER(a.name) LIKE ? OR LOWER(a.name) LIKE ? OR LOWER(a.name) LIKE ? OR LOWER(a.name) LIKE ?
                    )
                    AND UPPER(pe.status) IN ('EJECUTADO','REGISTRADO','REALIZADO')
                    ORDER BY l.codigo, pe.create_date DESC
                """;
                results = jdbcTemplate.queryForList(
                    sqlFallbackStatus,
                    patrones.get(0), patrones.get(1), patrones.get(2), patrones.get(3), patrones.get(4)
                );
                System.out.println("[ConsumosLote] Fallback estatus (EJECUTADO/REGISTRADO/REALIZADO), registros: " + results.size());
            }
            
            // Agrupar por lote
            Map<String, ConsumosPorLote> lotesMap = new LinkedHashMap<>();
            Map<String, Map<String, Double>> productosMap = new HashMap<>();
            Map<String, List<RegistroConsumoLote>> historialMap = new HashMap<>();
            
            for (Map<String, Object> row : results) {
                String loteId = row.get("lote_id") != null ? row.get("lote_id").toString() : "0";
                String loteCodigo = row.get("lote_codigo") != null ? row.get("lote_codigo").toString() : "SIN_CODIGO";
                
                // Crear o actualizar lote
                if (!lotesMap.containsKey(loteId)) {
                    ConsumosPorLote lote = new ConsumosPorLote();
                    lote.setLoteId(loteId);
                    lote.setLoteCodigo(loteCodigo);
                    lote.setTotalConsumo(0.0);
                    lotesMap.put(loteId, lote);
                    productosMap.put(loteId, new HashMap<>());
                    historialMap.put(loteId, new ArrayList<>());
                }
                
                // Cantidad
                Double cantidad = 0.0;
                if (row.get("cantidad") != null) {
                    cantidad = ((Number) row.get("cantidad")).doubleValue();
                }
                
                // Actualizar total del lote
                ConsumosPorLote lote = lotesMap.get(loteId);
                lote.setTotalConsumo(lote.getTotalConsumo() + cantidad);
                
                // Nombre del producto
                String productoNombre = row.get("producto_nombre") != null ? 
                    row.get("producto_nombre").toString() : "Alimento";
                
                // Agregar al mapa de productos
                Map<String, Double> productosLote = productosMap.get(loteId);
                productosLote.merge(productoNombre, cantidad, Double::sum);
                
                // Nombre del usuario REAL desde la base de datos
                String usuarioNombre = "Sistema";
                if (row.get("usuario_nombre_completo") != null && !row.get("usuario_nombre_completo").toString().isEmpty()) {
                    usuarioNombre = row.get("usuario_nombre_completo").toString();
                } else if (row.get("usuario_nombre") != null) {
                    usuarioNombre = row.get("usuario_nombre").toString();
                }
                
                // Fecha/hora
                String fecha = "";
                if (row.get("fecha_hora") != null) {
                    fecha = row.get("fecha_hora").toString();
                } else if (row.get("fecha") != null) {
                    fecha = row.get("fecha").toString();
                }
                
                // Agregar registro al historial
                RegistroConsumoLote registro = new RegistroConsumoLote(
                    row.get("ejecucion_id") != null ? ((Number) row.get("ejecucion_id")).intValue() : 0,
                    fecha,
                    productoNombre,
                    cantidad,
                    loteId,
                    loteCodigo,
                    usuarioNombre,
                    row.get("observaciones") != null ? row.get("observaciones").toString() : ""
                );
                historialMap.get(loteId).add(registro);
            }
            
            // Convertir mapas a listas de DTOs
            for (String loteId : lotesMap.keySet()) {
                ConsumosPorLote lote = lotesMap.get(loteId);
                
                // Productos
                List<ConsumoProductoLote> productos = new ArrayList<>();
                Map<String, Double> productosLote = productosMap.get(loteId);
                int prodId = 1;
                for (Map.Entry<String, Double> entry : productosLote.entrySet()) {
                    productos.add(new ConsumoProductoLote(
                        prodId++,
                        entry.getKey(),
                        loteId,
                        lote.getLoteCodigo(),
                        entry.getValue(),
                        1,
                        LocalDateTime.now().toString()
                    ));
                }
                lote.setProductos(productos);
                
                // Historial
                lote.setHistorial(historialMap.get(loteId));
                
                consumos.add(lote);
            }
            
            System.out.println("[ConsumosLote] Especie: " + especie + ", Lotes encontrados: " + consumos.size());
            
        } catch (Exception e) {
            System.err.println("[ConsumosLote] Error consultando base de datos: " + e.getMessage());
            e.printStackTrace();
        }
        
        return consumos;
    }
    
    @GetMapping("/{loteId}")
    public ConsumosPorLote getConsumosLoteEspecifico(@PathVariable String loteId) {
        List<ConsumosPorLote> todos = getConsumosPorLote("chanchos");
        return todos.stream().filter(c -> c.getLoteId().equals(loteId)).findFirst().orElse(null);
    }
}

// Clases DTO
class ConsumosPorLote {
    private String loteId;
    private String loteCodigo;
    private double totalConsumo;
    private List<ConsumoProductoLote> productos;
    private List<RegistroConsumoLote> historial;
    
    // Getters y setters
    public String getLoteId() { return loteId; }
    public void setLoteId(String loteId) { this.loteId = loteId; }
    
    public String getLoteCodigo() { return loteCodigo; }
    public void setLoteCodigo(String loteCodigo) { this.loteCodigo = loteCodigo; }
    
    public double getTotalConsumo() { return totalConsumo; }
    public void setTotalConsumo(double totalConsumo) { this.totalConsumo = totalConsumo; }
    
    public List<ConsumoProductoLote> getProductos() { return productos; }
    public void setProductos(List<ConsumoProductoLote> productos) { this.productos = productos; }
    
    public List<RegistroConsumoLote> getHistorial() { return historial; }
    public void setHistorial(List<RegistroConsumoLote> historial) { this.historial = historial; }
}

class ConsumoProductoLote {
    private int productoId;
    private String productoNombre;
    private String loteId;
    private String loteCodigo;
    private double totalConsumo;
    private int registros;
    private String ultimaFecha;
    
    public ConsumoProductoLote() {}
    
    public ConsumoProductoLote(int productoId, String productoNombre, String loteId, String loteCodigo, 
                              double totalConsumo, int registros, String ultimaFecha) {
        this.productoId = productoId;
        this.productoNombre = productoNombre;
        this.loteId = loteId;
        this.loteCodigo = loteCodigo;
        this.totalConsumo = totalConsumo;
        this.registros = registros;
        this.ultimaFecha = ultimaFecha;
    }
    
    // Getters y setters
    public int getProductoId() { return productoId; }
    public void setProductoId(int productoId) { this.productoId = productoId; }
    
    public String getProductoNombre() { return productoNombre; }
    public void setProductoNombre(String productoNombre) { this.productoNombre = productoNombre; }
    
    public String getLoteId() { return loteId; }
    public void setLoteId(String loteId) { this.loteId = loteId; }
    
    public String getLoteCodigo() { return loteCodigo; }
    public void setLoteCodigo(String loteCodigo) { this.loteCodigo = loteCodigo; }
    
    public double getTotalConsumo() { return totalConsumo; }
    public void setTotalConsumo(double totalConsumo) { this.totalConsumo = totalConsumo; }
    
    public int getRegistros() { return registros; }
    public void setRegistros(int registros) { this.registros = registros; }
    
    public String getUltimaFecha() { return ultimaFecha; }
    public void setUltimaFecha(String ultimaFecha) { this.ultimaFecha = ultimaFecha; }
}

class RegistroConsumoLote {
    private int id;
    private String fecha;
    private String productoNombre;
    private double cantidad;
    private String loteId;
    private String loteCodigo;
    private String usuarioNombre;
    private String observaciones;
    
    public RegistroConsumoLote() {}
    
    public RegistroConsumoLote(int id, String fecha, String productoNombre, double cantidad, 
                              String loteId, String loteCodigo, String usuarioNombre, String observaciones) {
        this.id = id;
        this.fecha = fecha;
        this.productoNombre = productoNombre;
        this.cantidad = cantidad;
        this.loteId = loteId;
        this.loteCodigo = loteCodigo;
        this.usuarioNombre = usuarioNombre;
        this.observaciones = observaciones;
    }
    
    // Getters y setters
    public int getId() { return id; }
    public void setId(int id) { this.id = id; }
    
    public String getFecha() { return fecha; }
    public void setFecha(String fecha) { this.fecha = fecha; }
    
    public String getProductoNombre() { return productoNombre; }
    public void setProductoNombre(String productoNombre) { this.productoNombre = productoNombre; }
    
    public double getCantidad() { return cantidad; }
    public void setCantidad(double cantidad) { this.cantidad = cantidad; }
    
    public String getLoteId() { return loteId; }
    public void setLoteId(String loteId) { this.loteId = loteId; }
    
    public String getLoteCodigo() { return loteCodigo; }
    public void setLoteCodigo(String loteCodigo) { this.loteCodigo = loteCodigo; }
    
    public String getUsuarioNombre() { return usuarioNombre; }
    public void setUsuarioNombre(String usuarioNombre) { this.usuarioNombre = usuarioNombre; }
    
    public String getObservaciones() { return observaciones; }
    public void setObservaciones(String observaciones) { this.observaciones = observaciones; }
}
