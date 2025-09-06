package com.wil.avicola_backend.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.wil.avicola_backend.dto.VentaAnimalDTO;
import com.wil.avicola_backend.model.Usuario;
import com.wil.avicola_backend.model.VentaAnimal;
import com.wil.avicola_backend.repository.VentaAnimalRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class VentaAnimalService {

    private final VentaAnimalRepository ventaAnimalRepository;

    @Transactional
    public VentaAnimal crearVenta(VentaAnimalDTO dto, Usuario vendedor) {
        BigDecimal total = dto.getTotal();
        if (total == null) {
            total = dto.getPrecioUnit().multiply(dto.getCantidad());
        }

        VentaAnimal venta = VentaAnimal.builder()
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
        return ventaAnimalRepository.save(venta);
    }

    @Transactional(readOnly = true)
    public List<VentaAnimal> listarPorRango(LocalDate from, LocalDate to) {
        if (from != null && to != null) {
            return ventaAnimalRepository.findByFechaBetween(from, to);
        }
        if (from != null) {
            return ventaAnimalRepository.findByFecha(from);
        }
        if (to != null) {
            return ventaAnimalRepository.findByFecha(to);
        }
        return ventaAnimalRepository.findAll();
    }

    @Transactional
    public VentaAnimal actualizarVenta(Long id, VentaAnimalDTO dto) {
        Optional<VentaAnimal> opt = ventaAnimalRepository.findById(id);
        VentaAnimal v = opt.orElseThrow(() -> new IllegalArgumentException("venta_animal no encontrada: id=" + id));
        if (dto.getFecha() != null) v.setFecha(dto.getFecha());
        if (dto.getLoteId() != null) v.setLoteId(dto.getLoteId());
        if (dto.getLoteCodigo() != null) v.setLoteCodigo(dto.getLoteCodigo());
        if (dto.getAnimalId() != null) v.setAnimalId(dto.getAnimalId());
        if (dto.getAnimalName() != null) v.setAnimalName(dto.getAnimalName());
        if (dto.getCantidad() != null) v.setCantidad(dto.getCantidad());
        if (dto.getPrecioUnit() != null) v.setPrecioUnit(dto.getPrecioUnit());

        BigDecimal total = dto.getTotal();
        if (total == null && v.getPrecioUnit() != null && v.getCantidad() != null) {
            total = v.getPrecioUnit().multiply(v.getCantidad());
        }
        if (total != null) v.setTotal(total);

        return ventaAnimalRepository.saveAndFlush(v);
    }

    @Transactional
    public void eliminarVenta(Long id) {
        boolean exists = ventaAnimalRepository.existsById(id);
        if (!exists) throw new IllegalArgumentException("venta_animal no encontrada: id=" + id);
        ventaAnimalRepository.deleteById(id);
    }
}
