import 'package:flutter/material.dart';

import '../models/gestacion_chancha_model.dart';
import '../models/gestacion_parto_model.dart';
import '../services/gestacion_service.dart';
import '../utils/gestacion_calculo.dart';
import '../utils/gestacion_image_picker.dart';
import '../utils/gestacion_media.dart';
import 'gestacion_parto_sheets.dart';

/// Paleta AgriManager Pro (diseño ficha).
abstract final class _FichaTheme {
  static const primary = Color(0xFF003527);
  static const secondary = Color(0xFF006A61);
  static const surface = Color(0xFFF8F9FF);
  static const surfaceLowest = Color(0xFFFFFFFF);
  static const surfaceContainer = Color(0xFFE5EEFF);
  static const surfaceVariant = Color(0xFFD3E4FE);
  static const tertiaryFixed = Color(0xFFD8E5E2);
  static const tertiary = Color(0xFF25312F);
  static const outline = Color(0xFFBFC9C3);
  static const onSurface = Color(0xFF0B1C30);
  static const onVariant = Color(0xFF404944);
  static const countdownBg = Color(0xFFE6F4EA);
}

class GestacionFichaPage extends StatefulWidget {
  final GestacionChancha chancha;
  final bool modoEdicion;
  final List<GestacionParto> partosIniciales;

  const GestacionFichaPage({
    super.key,
    required this.chancha,
    required this.modoEdicion,
    this.partosIniciales = const [],
  });

  @override
  State<GestacionFichaPage> createState() => _GestacionFichaPageState();
}

class _GestacionFichaPageState extends State<GestacionFichaPage> {
  final GestacionService _service = GestacionService();
  late GestacionChancha _chancha;
  List<GestacionParto> _partos = [];
  bool _subiendoFoto = false;
  bool _huboCambios = false;

  @override
  void initState() {
    super.initState();
    _chancha = widget.chancha;
    _partos = widget.partosIniciales
        .where((p) =>
            p.loteId == _chancha.loteId && p.numeroEnLote == _chancha.numeroEnLote)
        .toList();
  }

  List<GestacionParto> get _partosDeChancha => _partos
      .where((p) => p.loteId == _chancha.loteId && p.numeroEnLote == _chancha.numeroEnLote)
      .toList();

  Future<void> _cambiarFoto() async {
    final file = await pickGestacionImage(context);
    if (file == null) return;
    setState(() => _subiendoFoto = true);
    try {
      final url = await _service.uploadFoto(file);
      final body = _chancha.toRequestBody()..['fotoUrl'] = url;
      final actualizada = await _service.actualizar(_chancha.id, body);
      if (!mounted) return;
      setState(() {
        _chancha = actualizada;
        _huboCambios = true;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Foto guardada en el servidor')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => _subiendoFoto = false);
    }
  }

  void _cerrar() => Navigator.pop(context, _huboCambios);

  Future<void> _registrarParto() async {
    final ok = await showRegistrarPartoSheet(
      context: context,
      service: _service,
      chancha: _chancha,
    );
    if (ok == true && mounted) {
      Navigator.pop(context, true);
    }
  }

  Future<void> _registrarNoPrenada() async {
    final ok = await showNoPrenadaSheet(
      context: context,
      service: _service,
      chancha: _chancha,
    );
    if (ok == true && mounted) {
      Navigator.pop(context, true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final dias = diasTranscurridos(_chancha.fechaInseminacion);
    final rest = diasRestantes(_chancha.fechaInseminacion);
    final etapaIdx = etapaIdxFicha(_chancha.fechaInseminacion);
    final fotoUrl = resolveGestacionMediaUrl(_chancha.fotoUrl);
    final listo = dias > diasGestacionTotal;

    return Scaffold(
      backgroundColor: _FichaTheme.surface,
      appBar: AppBar(
        backgroundColor: _FichaTheme.surface,
        foregroundColor: _FichaTheme.primary,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: _cerrar,
        ),
        title: Text(
          _chancha.nombre,
          style: const TextStyle(fontWeight: FontWeight.bold, color: _FichaTheme.primary),
        ),
        actions: [
          if (widget.modoEdicion && _chancha.activa)
            TextButton(
              onPressed: _registrarParto,
              child: const Text(
                'Parto',
                style: TextStyle(fontWeight: FontWeight.w700, color: _FichaTheme.primary),
              ),
            ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
        children: [
          // Hero foto
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: AspectRatio(
              aspectRatio: 4 / 3,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  if (fotoUrl.isNotEmpty)
                    Image.network(
                      fotoUrl,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => _placeholderFoto(),
                    )
                  else
                    _placeholderFoto(),
                  Positioned(
                    left: 12,
                    bottom: 12,
                    child: Material(
                      color: _FichaTheme.primary.withValues(alpha: 0.92),
                      borderRadius: BorderRadius.circular(8),
                      child: InkWell(
                        onTap: _subiendoFoto ? null : _cambiarFoto,
                        borderRadius: BorderRadius.circular(8),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.photo_camera, color: Colors.white, size: 18),
                              const SizedBox(width: 6),
                              Text(
                                _subiendoFoto
                                    ? 'Subiendo…'
                                    : (fotoUrl.isEmpty ? 'Tomar / subir foto' : 'Cambiar foto'),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 6,
            children: [
              if (_chancha.raza.trim().isNotEmpty)
                _pill(_chancha.raza.toUpperCase(), _FichaTheme.surfaceVariant, _FichaTheme.onSurface),
              _pill(
                'PARTO #${_chancha.numeroParto}',
                _FichaTheme.tertiaryFixed,
                _FichaTheme.tertiary,
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Key dates
          Row(
            children: [
              Expanded(
                child: _infoCard('Fecha inseminación', formatFechaEs(_chancha.fechaInseminacion)),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _infoCard(
                  'Días transcurridos',
                  '${dias < 0 ? 0 : dias} de $diasGestacionTotal',
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          _infoCard(
            'Parto estimado',
            formatFechaDesdeDate(fechaPartoEstimada(_chancha.fechaInseminacion)),
          ),
          const SizedBox(height: 16),
          // Countdown
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: _FichaTheme.countdownBg,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: _FichaTheme.secondary, width: 2),
            ),
            child: Column(
              children: [
                const Text(
                  'FALTAN PARA EL PARTO',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.8,
                    color: _FichaTheme.secondary,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text(
                      listo ? 'LISTO' : '$rest',
                      style: const TextStyle(
                        fontSize: 48,
                        fontWeight: FontWeight.w900,
                        color: _FichaTheme.primary,
                        height: 1,
                      ),
                    ),
                    if (!listo) ...[
                      const SizedBox(width: 8),
                      const Text(
                        'DÍAS',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                          color: _FichaTheme.secondary,
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          const Text(
            'ETAPAS DE GESTACIÓN',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.8,
              color: Color(0xFF707974),
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              for (var i = 0; i < etapasGestacion.length; i++)
                _etapaChip(etapasGestacion[i], i, etapaIdx),
            ],
          ),
          const SizedBox(height: 20),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: _FichaTheme.surfaceLowest,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: _FichaTheme.outline),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'OBSERVACIONES',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.8,
                    color: Color(0xFF707974),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  _chancha.observaciones.trim().isEmpty
                      ? 'Sin observaciones registradas.'
                      : _chancha.observaciones,
                  style: const TextStyle(fontSize: 14, color: _FichaTheme.onSurface),
                ),
              ],
            ),
          ),
          if (_partosDeChancha.isNotEmpty) ...[
            const SizedBox(height: 20),
            const Text(
              'HISTORIAL DE PARTOS',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.8,
                color: Color(0xFF707974),
              ),
            ),
            const SizedBox(height: 8),
            ..._partosDeChancha.map((p) => _partoMini(p)),
          ],
          const SizedBox(height: 24),
          if (widget.modoEdicion && _chancha.activa) ...[
            FilledButton(
              onPressed: _registrarParto,
              style: FilledButton.styleFrom(
                backgroundColor: _FichaTheme.primary,
                foregroundColor: Colors.white,
                minimumSize: const Size.fromHeight(48),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Registrar parto', style: TextStyle(fontWeight: FontWeight.w700)),
            ),
            const SizedBox(height: 8),
            FilledButton(
              onPressed: _registrarNoPrenada,
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFB45309),
                foregroundColor: Colors.white,
                minimumSize: const Size.fromHeight(48),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('No gestante (reiniciar)', style: TextStyle(fontWeight: FontWeight.w700)),
            ),
            const SizedBox(height: 8),
          ],
          OutlinedButton(
            onPressed: _cerrar,
            style: OutlinedButton.styleFrom(
              foregroundColor: _FichaTheme.onVariant,
              minimumSize: const Size.fromHeight(48),
              side: const BorderSide(color: _FichaTheme.outline),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text('Cerrar'),
          ),
        ],
      ),
    );
  }

  Widget _placeholderFoto() {
    return Container(
      color: _FichaTheme.surfaceContainer,
      child: const Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.pets_rounded, size: 56, color: _FichaTheme.onVariant),
          SizedBox(height: 8),
          Text('Sin fotografía', style: TextStyle(color: _FichaTheme.onVariant)),
        ],
      ),
    );
  }

  Widget _pill(String text, Color bg, Color fg) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.5, color: fg),
      ),
    );
  }

  Widget _infoCard(String label, String value) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _FichaTheme.surfaceLowest,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: _FichaTheme.outline),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
              color: Color(0xFF707974),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: _FichaTheme.onSurface),
          ),
        ],
      ),
    );
  }

  Widget _etapaChip(EtapaGestacion e, int i, int activeIdx) {
    final active = i == activeIdx;
    final done = i < activeIdx;
    final highlight = active || done;
    return Container(
      width: (MediaQuery.of(context).size.width - 40) / 2 - 4,
      constraints: const BoxConstraints(minHeight: 72),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: highlight ? _FichaTheme.tertiary : _FichaTheme.surfaceLowest,
        borderRadius: BorderRadius.circular(8),
        border: highlight
            ? const Border(bottom: BorderSide(color: _FichaTheme.secondary, width: 4))
            : Border.all(color: _FichaTheme.outline),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            e.nombreCorto,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: highlight ? Colors.white : _FichaTheme.onVariant,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            e.diasLabel,
            style: TextStyle(
              fontSize: 10,
              color: highlight ? Colors.white70 : const Color(0xFF707974),
            ),
          ),
        ],
      ),
    );
  }

  Widget _partoMini(GestacionParto p) {
    final foto = resolveGestacionMediaUrl(p.fotoUrl.isNotEmpty ? p.fotoUrl : p.fotoChanchaUrl);
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: _FichaTheme.surfaceLowest,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: _FichaTheme.outline),
      ),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: SizedBox(
              width: 56,
              height: 56,
              child: foto.isNotEmpty
                  ? Image.network(foto, fit: BoxFit.cover, errorBuilder: (_, __, ___) => _miniPh())
                  : _miniPh(),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Parto #${p.numeroParto}', style: const TextStyle(fontWeight: FontWeight.w700)),
                Text(formatFechaEs(p.fechaParto), style: const TextStyle(fontSize: 12, color: _FichaTheme.onVariant)),
                Text(
                  '${p.lechonesVivos}/${p.lechonesNacidos} vivos',
                  style: const TextStyle(fontSize: 12, color: _FichaTheme.onVariant),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.visibility_outlined),
            onPressed: () => showVerPartoSheet(
              context: context,
              parto: p,
              modoEdicion: widget.modoEdicion,
              service: _service,
              onUpdated: (u) {
                setState(() {
                  final i = _partos.indexWhere((x) => x.id == u.id);
                  if (i >= 0) _partos[i] = u;
                });
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _miniPh() => Container(
        color: _FichaTheme.surfaceContainer,
        child: const Icon(Icons.pets, color: _FichaTheme.onVariant),
      );
}
