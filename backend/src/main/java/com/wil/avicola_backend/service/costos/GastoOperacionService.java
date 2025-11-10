package com.wil.avicola_backend.service.costos;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.wil.avicola_backend.dto.costos.GastoOperacionDTO;
import com.wil.avicola_backend.error.RequestException;
import com.wil.avicola_backend.model.Lote;
import com.wil.avicola_backend.model.costos.GastoOperacion;
import com.wil.avicola_backend.repository.costos.GastoOperacionRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GastoOperacionService {

    private final GastoOperacionRepository repo;
    private final BaseCostosService base;

    @Transactional
    public GastoOperacion crear(GastoOperacionDTO dto) {
        Lote lote = base.resolveLote(dto.getLoteId(), dto.getLoteCodigo());
        GastoOperacion g = GastoOperacion.builder()
                .nombreGasto(dto.getNombreGasto())
                .detalle(dto.getDetalle())
                .unidad(dto.getUnidad())
                .cantidadConsumida(dto.getCantidadConsumida())
                .costoUnitario(dto.getCostoUnitario())
                .fecha(dto.getFecha())
                .observaciones(dto.getObservaciones())
                .lote(lote)
                .build();
        return repo.save(g);
    }

    @Transactional(readOnly = true)
    public List<GastoOperacion> listar(LocalDate desde, LocalDate hasta, String loteId, String loteCodigo) {
        if (loteId != null && !loteId.isBlank()) return repo.findByLote_Id(loteId);
        if (loteCodigo != null && !loteCodigo.isBlank()) return repo.findByLote_Codigo(loteCodigo);
        if (desde != null && hasta != null) return repo.findByFechaBetween(desde, hasta);
        return repo.findAll();
    }

    @Transactional(readOnly = true)
    public GastoOperacion obtener(String id) {
        return repo.findById(id).orElseThrow(() -> new RequestException("gasto_operacion no encontrado: id=" + id));
    }

    @Transactional
    public GastoOperacion actualizar(String id, GastoOperacionDTO dto) {
        GastoOperacion g = obtener(id);
        if (dto.getNombreGasto() != null) g.setNombreGasto(dto.getNombreGasto());
        if (dto.getDetalle() != null) g.setDetalle(dto.getDetalle());
        if (dto.getUnidad() != null) g.setUnidad(dto.getUnidad());
        if (dto.getCantidadConsumida() != null) g.setCantidadConsumida(dto.getCantidadConsumida());
        if (dto.getCostoUnitario() != null) g.setCostoUnitario(dto.getCostoUnitario());
        if (dto.getFecha() != null) g.setFecha(dto.getFecha());
        if (dto.getObservaciones() != null) g.setObservaciones(dto.getObservaciones());
        if (dto.getLoteId() != null || dto.getLoteCodigo() != null) {
            Lote lote = base.resolveLote(dto.getLoteId(), dto.getLoteCodigo());
            g.setLote(lote);
        }
        return repo.saveAndFlush(g);
    }

    @Transactional
    public void eliminar(String id) {
        if (!repo.existsById(id)) throw new RequestException("gasto_operacion no encontrado: id=" + id);
        repo.deleteById(id);
    }
}
