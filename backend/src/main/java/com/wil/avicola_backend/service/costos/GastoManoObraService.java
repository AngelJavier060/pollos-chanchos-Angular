package com.wil.avicola_backend.service.costos;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.wil.avicola_backend.dto.costos.GastoManoObraDTO;
import com.wil.avicola_backend.error.RequestException;
import com.wil.avicola_backend.model.Lote;
import com.wil.avicola_backend.model.costos.GastoManoObra;
import com.wil.avicola_backend.repository.costos.GastoManoObraRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GastoManoObraService {

    private final GastoManoObraRepository repo;
    private final BaseCostosService base;

    @Transactional
    public GastoManoObra crear(GastoManoObraDTO dto) {
        Lote lote = base.resolveLote(dto.getLoteId(), dto.getLoteCodigo());
        GastoManoObra g = GastoManoObra.builder()
                .nombreTrabajador(dto.getNombreTrabajador())
                .cargo(dto.getCargo())
                .horasTrabajadas(dto.getHorasTrabajadas())
                .costoPorHora(dto.getCostoPorHora())
                .fecha(dto.getFecha())
                .observaciones(dto.getObservaciones())
                .lote(lote)
                .build();
        return repo.save(g);
    }

    @Transactional(readOnly = true)
    public List<GastoManoObra> listar(LocalDate desde, LocalDate hasta, String loteId, String loteCodigo) {
        if (loteId != null && !loteId.isBlank()) return repo.findByLote_Id(loteId);
        if (loteCodigo != null && !loteCodigo.isBlank()) return repo.findByLote_Codigo(loteCodigo);
        if (desde != null && hasta != null) return repo.findByFechaBetween(desde, hasta);
        return repo.findAll();
    }

    @Transactional(readOnly = true)
    public GastoManoObra obtener(String id) {
        return repo.findById(id).orElseThrow(() -> new RequestException("gasto_mano_obra no encontrado: id=" + id));
    }

    @Transactional
    public GastoManoObra actualizar(String id, GastoManoObraDTO dto) {
        GastoManoObra g = obtener(id);
        if (dto.getNombreTrabajador() != null) g.setNombreTrabajador(dto.getNombreTrabajador());
        if (dto.getCargo() != null) g.setCargo(dto.getCargo());
        if (dto.getHorasTrabajadas() != null) g.setHorasTrabajadas(dto.getHorasTrabajadas());
        if (dto.getCostoPorHora() != null) g.setCostoPorHora(dto.getCostoPorHora());
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
        if (!repo.existsById(id)) throw new RequestException("gasto_mano_obra no encontrado: id=" + id);
        repo.deleteById(id);
    }
}
