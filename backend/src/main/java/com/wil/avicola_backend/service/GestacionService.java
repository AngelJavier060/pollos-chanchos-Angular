package com.wil.avicola_backend.service;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.wil.avicola_backend.dto.GestacionChanchaRequestDto;
import com.wil.avicola_backend.dto.GestacionChanchaResponseDto;
import com.wil.avicola_backend.dto.GestacionPartoRequestDto;
import com.wil.avicola_backend.dto.GestacionPartoResponseDto;
import com.wil.avicola_backend.model.Lote;
import com.wil.avicola_backend.model.RegistroGestacion;
import com.wil.avicola_backend.model.RegistroPartoGestacion;
import com.wil.avicola_backend.repository.LoteRepository;
import com.wil.avicola_backend.repository.RegistroGestacionRepository;
import com.wil.avicola_backend.repository.RegistroPartoGestacionRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GestacionService {

    public static final int DIAS_GESTACION = 114;

    private final RegistroGestacionRepository gestacionRepository;
    private final RegistroPartoGestacionRepository partoRepository;
    private final LoteRepository loteRepository;

    public List<GestacionChanchaResponseDto> listarTodos() {
        return gestacionRepository.findAllByOrderByFechaInseminacionDesc().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public GestacionChanchaResponseDto obtenerPorId(Long id) {
        RegistroGestacion reg = gestacionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Registro de gestación no encontrado."));
        return toDto(reg);
    }

    @Transactional
    public GestacionChanchaResponseDto crear(GestacionChanchaRequestDto dto, String usuario) {
        validarRequest(dto);
        Lote lote = cargarLoteValido(dto.getLoteId());
        validarCupoDisponible(lote, dto.getNumeroEnLote(), null);

        boolean activa = dto.getActiva() == null || dto.getActiva();
        if (dto.getNumeroParto() == null || dto.getNumeroParto() <= 0) {
            dto.setNumeroParto(siguienteNumeroParto(lote.getId(), dto.getNumeroEnLote()));
        }
        RegistroGestacion reg = construirEntidad(dto, lote, activa, usuario);
        return toDto(gestacionRepository.save(reg));
    }

    @Transactional
    public GestacionChanchaResponseDto actualizar(Long id, GestacionChanchaRequestDto dto, String usuario) {
        validarRequest(dto);
        RegistroGestacion reg = gestacionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Registro de gestación no encontrado."));
        Lote lote = cargarLoteValido(dto.getLoteId());

        boolean activa = dto.getActiva() == null || dto.getActiva();
        if (activa) {
            validarCupoDisponible(lote, dto.getNumeroEnLote(), id);
        }

        reg.setLoteId(lote.getId());
        reg.setNumeroEnLote(dto.getNumeroEnLote());
        reg.setNombre(nombreChancha(dto.getNumeroEnLote()));
        reg.setRaza(razaDesdeLote(lote));
        reg.setFechaInseminacion(LocalDate.parse(dto.getFechaInseminacion()));
        reg.setNumeroParto(dto.getNumeroParto() != null && dto.getNumeroParto() > 0 ? dto.getNumeroParto() : 1);
        reg.setObservaciones(dto.getObservaciones());
        if (dto.getFotoUrl() != null) {
            reg.setFotoUrl(dto.getFotoUrl().isBlank() ? null : dto.getFotoUrl().trim());
        }
        reg.setActiva(activa);
        reg.setLoteCodigo(lote.getCodigo());
        reg.setLoteNombre(lote.getName());
        if (usuario != null && !usuario.isBlank()) {
            reg.setUsuarioRegistro(usuario);
        }

        return toDto(gestacionRepository.save(reg));
    }

    @Transactional
    public void eliminar(Long id) {
        if (!gestacionRepository.existsById(id)) {
            throw new IllegalArgumentException("Registro de gestación no encontrado.");
        }
        gestacionRepository.deleteById(id);
    }

    /**
     * Registra el parto, guarda lechones en historial y cierra el ciclo
     * (activa=false) para liberar el cupo de la chancha.
     */
    @Transactional
    public GestacionPartoResponseDto registrarParto(Long gestacionId, GestacionPartoRequestDto dto, String usuario) {
        RegistroGestacion gestacion = gestacionRepository.findById(gestacionId)
                .orElseThrow(() -> new IllegalArgumentException("Registro de gestación no encontrado."));
        if (Boolean.FALSE.equals(gestacion.getActiva())) {
            throw new IllegalArgumentException(
                    "Esta gestación ya está cerrada. No se puede registrar otro parto sobre ella.");
        }
        validarPartoRequest(dto);

        LocalDate fechaParto = LocalDate.parse(dto.getFechaParto());
        if (fechaParto.isBefore(gestacion.getFechaInseminacion())) {
            throw new IllegalArgumentException(
                    "La fecha de parto no puede ser anterior a la fecha de inseminación.");
        }

        int numeroParto = gestacion.getNumeroParto() != null && gestacion.getNumeroParto() > 0
                ? gestacion.getNumeroParto()
                : siguienteNumeroParto(gestacion.getLoteId(), gestacion.getNumeroEnLote());

        RegistroPartoGestacion parto = RegistroPartoGestacion.builder()
                .gestacionId(gestacion.getId())
                .loteId(gestacion.getLoteId())
                .numeroEnLote(gestacion.getNumeroEnLote())
                .nombreChancha(gestacion.getNombre())
                .numeroParto(numeroParto)
                .fechaParto(fechaParto)
                .lechonesNacidos(dto.getLechonesNacidos())
                .lechonesVivos(dto.getLechonesVivos())
                .lechonesMuertos(dto.getLechonesMuertos() != null ? dto.getLechonesMuertos() : 0)
                .observaciones(dto.getObservaciones())
                .fotoUrl(dto.getFotoUrl() != null && !dto.getFotoUrl().isBlank() ? dto.getFotoUrl().trim() : null)
                .usuarioRegistro(usuario)
                .build();

        RegistroPartoGestacion guardado = partoRepository.save(parto);

        gestacion.setActiva(false);
        gestacionRepository.save(gestacion);

        return toPartoDto(guardado, gestacion.getLoteNombre(), gestacion.getFotoUrl());
    }

    public List<GestacionPartoResponseDto> listarPartos() {
        return partoRepository.findAllByOrderByFechaPartoDesc().stream()
                .map(this::toPartoDtoConLote)
                .collect(Collectors.toList());
    }

    public List<GestacionPartoResponseDto> listarPartosPorChancha(String loteId, Integer numeroEnLote) {
        if (loteId == null || loteId.isBlank() || numeroEnLote == null || numeroEnLote <= 0) {
            throw new IllegalArgumentException("Lote y número de chancha son obligatorios.");
        }
        return partoRepository.findByLoteIdAndNumeroEnLoteOrderByNumeroPartoAsc(loteId, numeroEnLote).stream()
                .map(this::toPartoDtoConLote)
                .collect(Collectors.toList());
    }

    private GestacionPartoResponseDto toPartoDtoConLote(RegistroPartoGestacion p) {
        return gestacionRepository.findById(p.getGestacionId())
                .map(g -> toPartoDto(p, g.getLoteNombre(), g.getFotoUrl()))
                .orElseGet(() -> toPartoDto(p, null, null));
    }

    public int siguienteNumeroParto(String loteId, Integer numeroEnLote) {
        return partoRepository.maxNumeroParto(loteId, numeroEnLote) + 1;
    }

    public GestacionPartoResponseDto obtenerParto(Long partoId) {
        RegistroPartoGestacion parto = partoRepository.findById(partoId)
                .orElseThrow(() -> new IllegalArgumentException("Registro de parto no encontrado."));
        return toPartoDtoConLote(parto);
    }

    /**
     * Corrige datos de un parto ya registrado (solo admin vía frontend).
     * No reabre el ciclo de gestación.
     */
    @Transactional
    public GestacionPartoResponseDto actualizarParto(Long partoId, GestacionPartoRequestDto dto) {
        RegistroPartoGestacion parto = partoRepository.findById(partoId)
                .orElseThrow(() -> new IllegalArgumentException("Registro de parto no encontrado."));
        validarPartoRequest(dto);

        LocalDate fechaParto = LocalDate.parse(dto.getFechaParto());
        parto.setFechaParto(fechaParto);
        parto.setLechonesNacidos(dto.getLechonesNacidos());
        parto.setLechonesVivos(dto.getLechonesVivos());
        parto.setLechonesMuertos(dto.getLechonesMuertos() != null ? dto.getLechonesMuertos() : 0);
        parto.setObservaciones(dto.getObservaciones());
        if (dto.getFotoUrl() != null) {
            parto.setFotoUrl(dto.getFotoUrl().isBlank() ? null : dto.getFotoUrl().trim());
        }

        return toPartoDtoConLote(partoRepository.save(parto));
    }

    public static String nombreChancha(int numero) {
        return String.format("Chancha-%02d", numero);
    }

    private void validarPartoRequest(GestacionPartoRequestDto dto) {
        if (dto == null) {
            throw new IllegalArgumentException("Datos de parto requeridos.");
        }
        if (dto.getFechaParto() == null || dto.getFechaParto().isBlank()) {
            throw new IllegalArgumentException("La fecha de parto es obligatoria.");
        }
        try {
            LocalDate.parse(dto.getFechaParto());
        } catch (Exception e) {
            throw new IllegalArgumentException("Fecha de parto inválida. Use formato yyyy-MM-dd.");
        }
        int nacidos = dto.getLechonesNacidos() != null ? dto.getLechonesNacidos() : -1;
        int vivos = dto.getLechonesVivos() != null ? dto.getLechonesVivos() : -1;
        int muertos = dto.getLechonesMuertos() != null ? dto.getLechonesMuertos() : 0;
        if (nacidos < 0) {
            throw new IllegalArgumentException("Lechones nacidos debe ser 0 o mayor.");
        }
        if (vivos < 0) {
            throw new IllegalArgumentException("Lechones vivos debe ser 0 o mayor.");
        }
        if (muertos < 0) {
            throw new IllegalArgumentException("Lechones muertos debe ser 0 o mayor.");
        }
        if (vivos > nacidos) {
            throw new IllegalArgumentException("Lechones vivos no puede superar a nacidos.");
        }
        if (muertos > nacidos) {
            throw new IllegalArgumentException("Lechones muertos no puede superar a nacidos.");
        }
        if (vivos + muertos > nacidos) {
            throw new IllegalArgumentException(
                    "La suma de vivos y muertos no puede superar a nacidos.");
        }
    }

    private GestacionPartoResponseDto toPartoDto(
            RegistroPartoGestacion p,
            String loteNombre,
            String fotoChanchaUrl) {
        return GestacionPartoResponseDto.builder()
                .id(String.valueOf(p.getId()))
                .gestacionId(String.valueOf(p.getGestacionId()))
                .loteId(p.getLoteId())
                .numeroEnLote(p.getNumeroEnLote())
                .nombreChancha(p.getNombreChancha())
                .numeroParto(p.getNumeroParto())
                .fechaParto(p.getFechaParto() != null ? p.getFechaParto().toString() : null)
                .lechonesNacidos(p.getLechonesNacidos())
                .lechonesVivos(p.getLechonesVivos())
                .lechonesMuertos(p.getLechonesMuertos())
                .observaciones(p.getObservaciones())
                .fotoUrl(p.getFotoUrl())
                .fotoChanchaUrl(fotoChanchaUrl)
                .loteNombre(loteNombre)
                .build();
    }

    private void validarRequest(GestacionChanchaRequestDto dto) {
        if (dto == null) {
            throw new IllegalArgumentException("Datos de gestación requeridos.");
        }
        if (dto.getLoteId() == null || dto.getLoteId().isBlank()) {
            throw new IllegalArgumentException("El lote es obligatorio.");
        }
        if (dto.getNumeroEnLote() == null || dto.getNumeroEnLote() <= 0) {
            throw new IllegalArgumentException("El número de chancha en el lote es obligatorio.");
        }
        if (dto.getFechaInseminacion() == null || dto.getFechaInseminacion().isBlank()) {
            throw new IllegalArgumentException("La fecha de inseminación es obligatoria.");
        }
        try {
            LocalDate.parse(dto.getFechaInseminacion());
        } catch (Exception e) {
            throw new IllegalArgumentException("Fecha de inseminación inválida. Use formato yyyy-MM-dd.");
        }
    }

    private Lote cargarLoteValido(String loteId) {
        Lote lote = loteRepository.findById(loteId)
                .orElseThrow(() -> new IllegalArgumentException("Lote no encontrado."));
        if (lote.getQuantity() <= 0) {
            throw new IllegalArgumentException("El lote no tiene animales vivos.");
        }
        if (lote.getFechaCierre() != null) {
            throw new IllegalArgumentException("El lote está cerrado.");
        }
        if (!esLoteChancho(lote)) {
            throw new IllegalArgumentException("El lote no corresponde a chanchos/cerdos.");
        }
        return lote;
    }

    private void validarCupoDisponible(Lote lote, int numeroEnLote, Long excluirId) {
        int cupos = cuposHembras(lote);
        int vivas = hembrasVivas(lote);
        if (numeroEnLote > cupos) {
            throw new IllegalArgumentException(
                    "Número de chancha fuera del rango del lote (máximo " + cupos + ").");
        }
        if (numeroEnLote > vivas) {
            throw new IllegalArgumentException(
                    "Chancha no disponible: el lote solo tiene " + vivas + " hembra(s) viva(s).");
        }
        boolean ocupado = excluirId == null
                ? gestacionRepository.existsByLoteIdAndNumeroEnLoteAndActivaTrue(lote.getId(), numeroEnLote)
                : gestacionRepository.existsByLoteIdAndNumeroEnLoteAndActivaTrueAndIdNot(
                        lote.getId(), numeroEnLote, excluirId);
        if (ocupado) {
            throw new IllegalArgumentException("Ya existe una gestación activa para esta chancha en el lote.");
        }
    }

    private RegistroGestacion construirEntidad(
            GestacionChanchaRequestDto dto,
            Lote lote,
            boolean activa,
            String usuario) {
        return RegistroGestacion.builder()
                .loteId(lote.getId())
                .numeroEnLote(dto.getNumeroEnLote())
                .nombre(nombreChancha(dto.getNumeroEnLote()))
                .raza(razaDesdeLote(lote))
                .fechaInseminacion(LocalDate.parse(dto.getFechaInseminacion()))
                .numeroParto(dto.getNumeroParto() != null && dto.getNumeroParto() > 0 ? dto.getNumeroParto() : 1)
                .observaciones(dto.getObservaciones())
                .fotoUrl(dto.getFotoUrl() != null && !dto.getFotoUrl().isBlank() ? dto.getFotoUrl().trim() : null)
                .activa(activa)
                .loteCodigo(lote.getCodigo())
                .loteNombre(lote.getName())
                .usuarioRegistro(usuario)
                .build();
    }

    private boolean esLoteChancho(Lote lote) {
        if (lote.getRace() == null || lote.getRace().getAnimal() == null) {
            return false;
        }
        String n = lote.getRace().getAnimal().getName();
        if (n == null) {
            return lote.getRace().getAnimal().getId() == 2L;
        }
        n = n.toLowerCase();
        return n.contains("chancho") || n.contains("cerdo") || n.contains("porc")
                || lote.getRace().getAnimal().getId() == 2L;
    }

    private int cuposHembras(Lote lote) {
        int hembras = lote.getFemaleCount() != null ? Math.max(0, lote.getFemaleCount()) : 0;
        if (hembras > 0) {
            return hembras;
        }
        return hembrasVivas(lote);
    }

    private int hembrasVivas(Lote lote) {
        int cantidadViva = Math.max(0, lote.getQuantity());
        int hembras = lote.getFemaleCount() != null ? Math.max(0, lote.getFemaleCount()) : 0;
        if (hembras > 0) {
            return Math.min(hembras, cantidadViva);
        }
        return cantidadViva;
    }

    private String razaDesdeLote(Lote lote) {
        if (lote.getRace() != null && lote.getRace().getName() != null) {
            return lote.getRace().getName();
        }
        return null;
    }

    private GestacionChanchaResponseDto toDto(RegistroGestacion reg) {
        return GestacionChanchaResponseDto.builder()
                .id(String.valueOf(reg.getId()))
                .nombre(reg.getNombre())
                .raza(reg.getRaza())
                .fechaInseminacion(reg.getFechaInseminacion().toString())
                .numeroParto(reg.getNumeroParto())
                .observaciones(reg.getObservaciones())
                .fotoUrl(reg.getFotoUrl())
                .loteId(reg.getLoteId())
                .loteCodigo(reg.getLoteCodigo())
                .loteNombre(reg.getLoteNombre())
                .numeroEnLote(reg.getNumeroEnLote())
                .activa(reg.getActiva())
                .build();
    }
}
