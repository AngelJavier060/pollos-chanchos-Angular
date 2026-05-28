package com.wil.avicola_backend.service.costos;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.wil.avicola_backend.dto.costos.GastoSanidadDTO;
import com.wil.avicola_backend.error.RequestException;
import com.wil.avicola_backend.model.Lote;
import com.wil.avicola_backend.model.costos.GastoSanidad;
import com.wil.avicola_backend.repository.costos.GastoSanidadRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GastoSanidadService {

    private final GastoSanidadRepository repo;
    private final BaseCostosService base;

    @Transactional
    public GastoSanidad crear(GastoSanidadDTO dto) {
        Lote lote = base.resolveLote(dto.getLoteId(), dto.getLoteCodigo());
        GastoSanidad g = GastoSanidad.builder()
                .nombreGasto(dto.getNombreGasto())
                .detalle(dto.getDetalle())
                .cantidad(dto.getCantidad())
                .costoUnitario(dto.getCostoUnitario())
                .fecha(dto.getFecha())
                .observaciones(dto.getObservaciones())
                .productId(dto.getProductId())
                .tipoAplicacion(dto.getTipoAplicacion())
                .via(dto.getVia())
                .aplicadoPorTipo(dto.getAplicadoPorTipo())
                .responsable(dto.getResponsable())
                .costoAplicacion(dto.getCostoAplicacion())
                .proximaFecha(dto.getProximaFecha())
                .fechaHoraAplicacion(dto.getFechaHoraAplicacion())
                .lote(lote)
                .build();
        return repo.save(g);
    }

    @Transactional(readOnly = true)
    public List<GastoSanidad> listar(LocalDate desde, LocalDate hasta, String loteId, String loteCodigo) {
        boolean tieneFechas = (desde != null && hasta != null);
        if (loteId != null && !loteId.isBlank()) {
            return tieneFechas ? repo.findByLote_IdAndFechaBetween(loteId, desde, hasta) : repo.findByLote_Id(loteId);
        }
        if (loteCodigo != null && !loteCodigo.isBlank()) {
            return tieneFechas ? repo.findByLote_CodigoAndFechaBetween(loteCodigo, desde, hasta) : repo.findByLote_Codigo(loteCodigo);
        }
        if (tieneFechas) return repo.findByFechaBetween(desde, hasta);
        return repo.findAll();
    }

    @Transactional(readOnly = true)
    public GastoSanidad obtener(String id) {
        return repo.findById(id).orElseThrow(() -> new RequestException("gasto_sanidad no encontrado: id=" + id));
    }

    @Transactional
    public GastoSanidad actualizar(String id, GastoSanidadDTO dto) {
        GastoSanidad g = obtener(id);
        if (dto.getNombreGasto() != null) g.setNombreGasto(dto.getNombreGasto());
        if (dto.getDetalle() != null) g.setDetalle(dto.getDetalle());
        if (dto.getCantidad() != null) g.setCantidad(dto.getCantidad());
        if (dto.getCostoUnitario() != null) g.setCostoUnitario(dto.getCostoUnitario());
        if (dto.getFecha() != null) g.setFecha(dto.getFecha());
        if (dto.getObservaciones() != null) g.setObservaciones(dto.getObservaciones());
        if (dto.getProductId() != null) g.setProductId(dto.getProductId());
        if (dto.getTipoAplicacion() != null) g.setTipoAplicacion(dto.getTipoAplicacion());
        if (dto.getVia() != null) g.setVia(dto.getVia());
        if (dto.getAplicadoPorTipo() != null) g.setAplicadoPorTipo(dto.getAplicadoPorTipo());
        if (dto.getResponsable() != null) g.setResponsable(dto.getResponsable());
        if (dto.getCostoAplicacion() != null) g.setCostoAplicacion(dto.getCostoAplicacion());
        if (dto.getProximaFecha() != null) g.setProximaFecha(dto.getProximaFecha());
        if (dto.getFechaHoraAplicacion() != null) g.setFechaHoraAplicacion(dto.getFechaHoraAplicacion());
        if (dto.getLoteId() != null || dto.getLoteCodigo() != null) {
            Lote lote = base.resolveLote(dto.getLoteId(), dto.getLoteCodigo());
            g.setLote(lote);
        }
        return repo.saveAndFlush(g);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> resumen(LocalDate desde, LocalDate hasta, String loteId, String loteCodigo) {
        if ((loteId == null || loteId.isBlank()) && (loteCodigo == null || loteCodigo.isBlank())) {
            throw new RequestException("Debe especificar loteId o loteCodigo");
        }

        List<GastoSanidad> registros = listar(desde, hasta, loteId, loteCodigo);

        double totalCantidad = 0d;
        double totalCosto = 0d;
        Map<String, Map<String, Object>> porProducto = new LinkedHashMap<>();

        List<GastoSanidad> safeRegistros = (registros != null) ? registros : java.util.Collections.emptyList();
        for (GastoSanidad g : safeRegistros) {
            double c = g.getCantidad() != null ? g.getCantidad() : 0d;
            double t = g.getTotal() != null ? g.getTotal() : (c * (g.getCostoUnitario() != null ? g.getCostoUnitario() : 0d));
            totalCantidad += c;
            totalCosto += t;

            String key = (g.getProductId() != null) ? ("PID:" + g.getProductId()) : ("NOM:" + (g.getNombreGasto() != null ? g.getNombreGasto() : ""));
            Map<String, Object> acc = porProducto.get(key);
            if (acc == null) {
                acc = new HashMap<>();
                acc.put("productId", g.getProductId());
                acc.put("nombre", g.getNombreGasto());
                acc.put("cantidadTotal", 0d);
                acc.put("costoTotal", 0d);
                acc.put("aplicaciones", 0);
                porProducto.put(key, acc);
            }

            acc.put("cantidadTotal", ((Double) acc.get("cantidadTotal")) + c);
            acc.put("costoTotal", ((Double) acc.get("costoTotal")) + t);
            acc.put("aplicaciones", ((Integer) acc.get("aplicaciones")) + 1);
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("totalAplicaciones", registros != null ? registros.size() : 0);
        resp.put("totalCantidad", Math.round(totalCantidad * 1000.0) / 1000.0);
        resp.put("totalCosto", Math.round(totalCosto * 100.0) / 100.0);
        resp.put("porProducto", new ArrayList<>(porProducto.values()));
        return resp;
    }

    @Transactional(readOnly = true)
    public List<GastoSanidad> agenda(LocalDate desde, LocalDate hasta, String loteId, String loteCodigo) {
        LocalDate d = (desde != null) ? desde : LocalDate.now();
        LocalDate h = (hasta != null) ? hasta : LocalDate.now().plusDays(30);
        if (h.isBefore(d)) {
            throw new RequestException("El parámetro 'hasta' no puede ser anterior a 'desde'.");
        }

        if (loteId != null && !loteId.isBlank()) {
            return repo.findByLote_IdAndProximaFechaBetween(loteId, d, h);
        }
        if (loteCodigo != null && !loteCodigo.isBlank()) {
            return repo.findByLote_CodigoAndProximaFechaBetween(loteCodigo, d, h);
        }
        return repo.findByProximaFechaBetween(d, h);
    }

    @Transactional
    public void eliminar(String id) {
        if (!repo.existsById(id)) throw new RequestException("gasto_sanidad no encontrado: id=" + id);
        repo.deleteById(id);
    }
}
