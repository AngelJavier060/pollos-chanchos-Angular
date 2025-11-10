package com.wil.avicola_backend.service.costos;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.wil.avicola_backend.dto.costos.CostoFijoDTO;
import com.wil.avicola_backend.error.RequestException;
import com.wil.avicola_backend.model.Lote;
import com.wil.avicola_backend.model.costos.CostoFijo;
import com.wil.avicola_backend.repository.costos.CostoFijoRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CostoFijoService {

    private final CostoFijoRepository repo;
    private final BaseCostosService base;

    @Transactional
    public CostoFijo crear(CostoFijoDTO dto) {
        Lote lote = base.resolveLote(dto.getLoteId(), dto.getLoteCodigo());
        CostoFijo c = CostoFijo.builder()
                .nombreCosto(dto.getNombreCosto())
                .montoTotal(dto.getMontoTotal())
                .periodoProrrateo(dto.getPeriodoProrrateo())
                .metodoProrrateo(dto.getMetodoProrrateo())
                .observaciones(dto.getObservaciones())
                .fecha(dto.getFecha())
                .lote(lote)
                .build();
        return repo.save(c);
    }

    @Transactional(readOnly = true)
    public List<CostoFijo> listar(LocalDate desde, LocalDate hasta, String loteId, String loteCodigo) {
        if (loteId != null && !loteId.isBlank()) return repo.findByLote_Id(loteId);
        if (loteCodigo != null && !loteCodigo.isBlank()) return repo.findByLote_Codigo(loteCodigo);
        if (desde != null && hasta != null) return repo.findByFechaBetween(desde, hasta);
        return repo.findAll();
    }

    @Transactional(readOnly = true)
    public CostoFijo obtener(String id) {
        return repo.findById(id).orElseThrow(() -> new RequestException("costo_fijo no encontrado: id=" + id));
    }

    @Transactional
    public CostoFijo actualizar(String id, CostoFijoDTO dto) {
        CostoFijo c = obtener(id);
        if (dto.getNombreCosto() != null) c.setNombreCosto(dto.getNombreCosto());
        if (dto.getMontoTotal() != null) c.setMontoTotal(dto.getMontoTotal());
        if (dto.getPeriodoProrrateo() != null) c.setPeriodoProrrateo(dto.getPeriodoProrrateo());
        if (dto.getMetodoProrrateo() != null) c.setMetodoProrrateo(dto.getMetodoProrrateo());
        if (dto.getObservaciones() != null) c.setObservaciones(dto.getObservaciones());
        if (dto.getFecha() != null) c.setFecha(dto.getFecha());
        if (dto.getLoteId() != null || dto.getLoteCodigo() != null) {
            Lote lote = base.resolveLote(dto.getLoteId(), dto.getLoteCodigo());
            c.setLote(lote);
        }
        return repo.saveAndFlush(c);
    }

    @Transactional
    public void eliminar(String id) {
        if (!repo.existsById(id)) throw new RequestException("costo_fijo no encontrado: id=" + id);
        repo.deleteById(id);
    }
}
