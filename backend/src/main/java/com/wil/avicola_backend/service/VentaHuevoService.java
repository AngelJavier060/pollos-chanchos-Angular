package com.wil.avicola_backend.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.wil.avicola_backend.dto.VentaHuevoDTO;
import com.wil.avicola_backend.model.Usuario;
import com.wil.avicola_backend.model.VentaHuevo;
import com.wil.avicola_backend.repository.VentaHuevoRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class VentaHuevoService {

    private final VentaHuevoRepository ventaHuevoRepository;

    @Transactional
    public VentaHuevo crearVenta(VentaHuevoDTO dto, Usuario vendedor) {
        log.info("[VentaHuevoService] Crear venta: fecha={}, loteId={}, loteCodigo={}, cantidad={}, precioUnit={}",
                dto.getFecha(), dto.getLoteId(), dto.getLoteCodigo(), dto.getCantidad(), dto.getPrecioUnit());
        BigDecimal total = dto.getTotal();
        if (total == null) {
            total = dto.getPrecioUnit().multiply(dto.getCantidad());
        }

        VentaHuevo venta = VentaHuevo.builder()
                .fecha(dto.getFecha())
                .loteId(dto.getLoteId())
                .loteCodigo(dto.getLoteCodigo())
                .animalId(dto.getAnimalId())
                .animalName(dto.getAnimalName())
                .cantidad(dto.getCantidad())
                .precioUnit(dto.getPrecioUnit())
                .total(total)
                .vendedor(vendedor)
                .build();
        VentaHuevo saved = ventaHuevoRepository.saveAndFlush(venta);
        log.info("[VentaHuevoService] Guardada venta_huevo id={}, total={}", saved.getId(), saved.getTotal());
        return saved;
    }

    @Transactional(readOnly = true)
    public List<VentaHuevo> listarPorRango(LocalDate from, LocalDate to) {
        if (from != null && to != null) {
            return ventaHuevoRepository.findByFechaBetween(from, to);
        }
        if (from != null) {
            return ventaHuevoRepository.findByFecha(from);
        }
        if (to != null) {
            return ventaHuevoRepository.findByFecha(to);
        }
        return ventaHuevoRepository.findAll();
    }

    @Transactional
    public VentaHuevo actualizarVenta(Long id, VentaHuevoDTO dto) {
        Optional<VentaHuevo> opt = ventaHuevoRepository.findById(id);
        VentaHuevo v = opt.orElseThrow(() -> new IllegalArgumentException("venta_huevo no encontrada: id=" + id));
        log.info("[VentaHuevoService] Actualizar venta id={}", id);
        if (dto.getFecha() != null) v.setFecha(dto.getFecha());
        if (dto.getLoteId() != null) v.setLoteId(dto.getLoteId());
        if (dto.getLoteCodigo() != null) v.setLoteCodigo(dto.getLoteCodigo());
        if (dto.getAnimalId() != null) v.setAnimalId(dto.getAnimalId());
        if (dto.getAnimalName() != null) v.setAnimalName(dto.getAnimalName());
        if (dto.getCantidad() != null) v.setCantidad(dto.getCantidad());
        if (dto.getPrecioUnit() != null) v.setPrecioUnit(dto.getPrecioUnit());

        // Recalcular total si no viene o si cambió cantidad/precio
        BigDecimal total = dto.getTotal();
        if (total == null && v.getPrecioUnit() != null && v.getCantidad() != null) {
            total = v.getPrecioUnit().multiply(v.getCantidad());
        }
        if (total != null) v.setTotal(total);

        return ventaHuevoRepository.saveAndFlush(v);
    }

    @Transactional
    public void eliminarVenta(Long id) {
        boolean exists = ventaHuevoRepository.existsById(id);
        if (!exists) {
            throw new IllegalArgumentException("venta_huevo no encontrada: id=" + id);
        }
        ventaHuevoRepository.deleteById(id);
        log.info("[VentaHuevoService] Eliminada venta_huevo id={}", id);
    }
}
