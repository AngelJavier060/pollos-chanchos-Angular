package com.wil.avicola_backend.service.costos;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.wil.avicola_backend.dto.costos.GastoLogisticaDTO;
import com.wil.avicola_backend.error.RequestException;
import com.wil.avicola_backend.model.Lote;
import com.wil.avicola_backend.model.costos.GastoLogistica;
import com.wil.avicola_backend.repository.costos.GastoLogisticaRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GastoLogisticaService {

    private final GastoLogisticaRepository repo;
    private final BaseCostosService base;

    @Transactional
    public GastoLogistica crear(GastoLogisticaDTO dto) {
        Lote lote = base.resolveLote(dto.getLoteId(), dto.getLoteCodigo());
        GastoLogistica g = GastoLogistica.builder()
                .tipoTransporte(dto.getTipoTransporte())
                .concepto(dto.getConcepto())
                .unidad(dto.getUnidad())
                .cantidadTransportada(dto.getCantidadTransportada())
                .costoUnitario(dto.getCostoUnitario())
                .fecha(dto.getFecha())
                .observaciones(dto.getObservaciones())
                .lote(lote)
                .build();
        return repo.save(g);
    }

    @Transactional(readOnly = true)
    public List<GastoLogistica> listar(LocalDate desde, LocalDate hasta, String loteId, String loteCodigo) {
        if (loteId != null && !loteId.isBlank()) return repo.findByLote_Id(loteId);
        if (loteCodigo != null && !loteCodigo.isBlank()) return repo.findByLote_Codigo(loteCodigo);
        if (desde != null && hasta != null) return repo.findByFechaBetween(desde, hasta);
        return repo.findAll();
    }

    @Transactional(readOnly = true)
    public GastoLogistica obtener(String id) {
        return repo.findById(id).orElseThrow(() -> new RequestException("gasto_logistica no encontrado: id=" + id));
    }

    @Transactional
    public GastoLogistica actualizar(String id, GastoLogisticaDTO dto) {
        GastoLogistica g = obtener(id);
        if (dto.getTipoTransporte() != null) g.setTipoTransporte(dto.getTipoTransporte());
        if (dto.getConcepto() != null) g.setConcepto(dto.getConcepto());
        if (dto.getUnidad() != null) g.setUnidad(dto.getUnidad());
        if (dto.getCantidadTransportada() != null) g.setCantidadTransportada(dto.getCantidadTransportada());
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
        if (!repo.existsById(id)) throw new RequestException("gasto_logistica no encontrado: id=" + id);
        repo.deleteById(id);
    }
}
