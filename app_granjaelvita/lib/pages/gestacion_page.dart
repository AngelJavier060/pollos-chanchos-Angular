import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/gestacion_chancha_model.dart';
import '../models/gestacion_no_prenada_model.dart';
import '../models/gestacion_parto_model.dart';
import '../services/gestacion_service.dart';
import '../services/lote_service.dart';
import '../utils/gestacion_calculo.dart';
import '../utils/gestacion_image_picker.dart';
import '../utils/gestacion_lote_helper.dart';
import '../utils/gestacion_media.dart';
import 'gestacion_ficha_page.dart';
import 'gestacion_parto_sheets.dart';

/// Paleta alineada al mockup AgroPig / Granja Elvita.
abstract final class _GTheme {
  static const bg = Color(0xFFF8FAF8);
  static const primary = Color(0xFF00450D);
  static const primaryContainer = Color(0xFF1B5E20);
  static const onPrimary = Color(0xFFFFFFFF);
  static const onPrimaryContainer = Color(0xFF90D689);
  static const surfaceLowest = Color(0xFFFFFFFF);
  static const surfaceLow = Color(0xFFF2F4F2);
  static const surfaceHigh = Color(0xFFE6E9E7);
  static const surfaceVariant = Color(0xFFE1E3E1);
  static const outline = Color(0xFF717A6D);
  static const outlineVariant = Color(0xFFC0C9BB);
  static const onSurface = Color(0xFF191C1B);
  static const onSurfaceVariant = Color(0xFF41493E);
  static const slate900 = Color(0xFF191C1B);
  static const slate800 = Color(0xFF1E293B);
  static const slate700 = Color(0xFF334155);
  static const slate500 = Color(0xFF64748B);
  static const slate100 = Color(0xFFF1F5F9);
  static const emerald600 = Color(0xFF1B5E20);
  static const emerald700 = Color(0xFF00450D);
  static const emerald50 = Color(0xFFECFDF5);
  static const emerald300 = Color(0xFF91D78A);
  static const orange50 = Color(0xFFFFF7ED);
  static const orange100 = Color(0xFFFFEDD5);
  static const orange600 = Color(0xFFEA580C);
  static const blue50 = Color(0xFFEFF6FF);
  static const blue100 = Color(0xFFDBEAFE);
  static const blue600 = Color(0xFF2563EB);
  static const amber50 = Color(0xFFFFFBEB);
  static const amber100 = Color(0xFFFEF3C7);
  static const amber200 = Color(0xFFFDE68A);
  static const amber600 = Color(0xFFD97706);
  static const amber900 = Color(0xFF78350F);
  static const rose500 = Color(0xFFBA1A1A);
  static const rose50 = Color(0xFFFFDAD6);

  static List<BoxShadow> get softShadow => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.05),
          blurRadius: 6,
          offset: const Offset(0, 4),
        ),
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.03),
          blurRadius: 4,
          offset: const Offset(0, 2),
        ),
      ];

  static List<BoxShadow> get fabShadow => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.1),
          blurRadius: 15,
          offset: const Offset(0, 10),
        ),
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.05),
          blurRadius: 6,
          offset: const Offset(0, 4),
        ),
      ];
}

class GestacionPage extends StatefulWidget {
  final bool modoEdicion;

  const GestacionPage({super.key, this.modoEdicion = false});

  @override
  State<GestacionPage> createState() => _GestacionPageState();
}

class _GestacionPageState extends State<GestacionPage> {
  final GestacionService _service = GestacionService();
  final LoteServiceMobile _loteService = LoteServiceMobile();

  bool _loading = true;
  String? _error;
  List<GestacionChancha> _chanchas = [];
  List<GestacionParto> _partos = [];
  List<GestacionNoPrenada> _noPrenadas = [];

  List<GestacionChancha> get _activas => _chanchas.where((c) => c.activa).toList();

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      // Una sola ronda HTTP en paralelo (headers compartidos + timeout)
      final data = await _service.cargarResumenInicial();
      if (!mounted) return;
      setState(() {
        _chanchas = data.chanchas;
        _partos = data.partos;
        _noPrenadas = data.noPrenadas;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _abrirFicha(GestacionChancha c) async {
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => GestacionFichaPage(
          chancha: c,
          modoEdicion: widget.modoEdicion,
          partosIniciales: _partos,
        ),
      ),
    );
    if (changed == true) _cargar();
  }

  /// Usuario y admin pueden tomar/subir foto en vivo y guardarla en el servidor.
  Future<void> _actualizarFotoChancha(GestacionChancha c) async {
    final file = await pickGestacionImage(context);
    if (file == null) return;
    try {
      final url = await _service.uploadFoto(file);
      final body = c.toRequestBody()..['fotoUrl'] = url;
      await _service.actualizar(c.id, body);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Foto de la chancha guardada')),
      );
      _cargar();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final activas = _activas;
    // Paridas = historial real de partos (no por días vencidos en activas)
    final stats = calcularStats(
      activas.map((c) => c.fechaInseminacion).toList(),
      paridasHistorial: _partos.length,
    );
    final alertas = calcularAlertas(
      activas.map((c) => (nombre: c.nombre, fechaInseminacion: c.fechaInseminacion)).toList(),
    );

    return Scaffold(
      backgroundColor: _GTheme.bg,
      appBar: AppBar(
        backgroundColor: _GTheme.primary,
        foregroundColor: _GTheme.onPrimary,
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: _GTheme.primary,
        title: Row(
          children: [
            const Icon(Icons.pets_rounded, color: _GTheme.onPrimary),
            const SizedBox(width: 8),
            Text(
              widget.modoEdicion ? 'Granja Elvita · Admin' : 'Granja Elvita',
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w600,
                color: _GTheme.onPrimary,
              ),
            ),
          ],
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: _GTheme.onPrimary),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: _GTheme.onPrimary),
            tooltip: 'Refrescar',
            onPressed: _cargar,
          ),
        ],
      ),
      floatingActionButton: widget.modoEdicion ? _buildFab() : null,
      floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: _GTheme.primary))
          : _error != null
              ? _buildError()
              : RefreshIndicator(
                  color: _GTheme.primary,
                  onRefresh: _cargar,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 24, 16, 100),
                    children: [
                      if (!widget.modoEdicion) _buildAvisoConsulta(),
                      const Text(
                        'Resumen de Gestación',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                          color: _GTheme.onSurface,
                          height: 1.25,
                        ),
                      ),
                      const SizedBox(height: 16),
                      _buildStats(stats),
                      if (alertas.isNotEmpty) ...[
                        const SizedBox(height: 20),
                        ...alertas.map(_buildAlerta),
                      ],
                      const SizedBox(height: 24),
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              'Gestaciones activas',
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w600,
                                color: _GTheme.onSurface,
                              ),
                            ),
                          ),
                          Text(
                            '${activas.length}',
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: _GTheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      if (activas.isEmpty)
                        const Padding(
                          padding: EdgeInsets.all(24),
                          child: Center(child: Text('No hay gestaciones activas.')),
                        )
                      else
                        ...activas.map((c) => Padding(
                              padding: const EdgeInsets.only(bottom: 16),
                              child: _buildCard(c),
                            )),
                      const SizedBox(height: 8),
                      Text(
                        'Historial — no gestantes (${_noPrenadas.length})',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: _GTheme.slate800,
                        ),
                      ),
                      const SizedBox(height: 12),
                      if (_noPrenadas.isEmpty)
                        const Padding(
                          padding: EdgeInsets.all(16),
                          child: Text('Sin ciclos fallidos registrados.'),
                        )
                      else
                        ..._noPrenadas.map((n) => Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: _buildNoPrenadaCard(n),
                            )),
                      const SizedBox(height: 16),
                      Text(
                        'Historial de partos (${_partos.length})',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: _GTheme.slate800,
                        ),
                      ),
                      const SizedBox(height: 12),
                      if (_partos.isEmpty)
                        const Padding(
                          padding: EdgeInsets.all(16),
                          child: Text('Aún no hay partos registrados.'),
                        )
                      else
                        ..._partos.map((p) => Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: _buildPartoCard(p),
                            )),
                    ],
                  ),
                ),
    );
  }

  Widget _buildNoPrenadaCard(GestacionNoPrenada n) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _GTheme.orange100),
        boxShadow: _GTheme.softShadow,
      ),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: _GTheme.orange100,
          child: Icon(Icons.restart_alt_rounded, color: _GTheme.orange600),
        ),
        title: Text(n.nombreChancha, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(
          '${n.motivoLabel} · ${formatFechaEs(n.fechaConfirmacion)}\n'
          'Inseminación ${formatFechaEs(n.fechaInseminacion)} · ${n.diasGestacion} días'
          '${n.observaciones.isNotEmpty ? '\n${n.observaciones}' : ''}',
        ),
        isThreeLine: true,
      ),
    );
  }

  Widget _buildPartoCard(GestacionParto p) {
    final thumb = resolveGestacionMediaUrl(
      p.fotoUrl.isNotEmpty ? p.fotoUrl : p.fotoChanchaUrl,
    );
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _GTheme.slate100),
        boxShadow: _GTheme.softShadow,
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        leading: ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: SizedBox(
            width: 52,
            height: 52,
            child: thumb.isNotEmpty
                ? Image.network(
                    thumb,
                    fit: BoxFit.cover,
                    cacheWidth: 160,
                    errorBuilder: (_, __, ___) => _partoPh(),
                  )
                : _partoPh(),
          ),
        ),
        title: Text(p.nombreChancha, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(
          'Parto #${p.numeroParto} · ${formatFechaEs(p.fechaParto)}\n'
          '${p.lechonesVivos}/${p.lechonesNacidos} vivos'
          '${p.loteNombre.isNotEmpty ? ' · ${p.loteNombre}' : ''}',
        ),
        isThreeLine: true,
        trailing: Wrap(
          spacing: 0,
          children: [
            IconButton(
              tooltip: 'Ver',
              icon: const Icon(Icons.visibility_outlined, color: _GTheme.slate700),
              onPressed: () => showVerPartoSheet(
                context: context,
                parto: p,
                modoEdicion: widget.modoEdicion,
                service: _service,
                onUpdated: (_) => _cargar(),
              ),
            ),
            if (widget.modoEdicion)
              IconButton(
                tooltip: 'Editar',
                icon: const Icon(Icons.edit_outlined, color: _GTheme.emerald600),
                onPressed: () async {
                  final u = await showEditarPartoSheet(
                    context: context,
                    service: _service,
                    parto: p,
                  );
                  if (u != null) _cargar();
                },
              ),
          ],
        ),
      ),
    );
  }

  Widget _partoPh() => Container(
        color: _GTheme.slate100,
        child: const Icon(Icons.pets_rounded, color: _GTheme.slate500),
      );

  Widget _buildFab() {
    return Material(
      elevation: 0,
      color: Colors.transparent,
      child: InkWell(
        onTap: () => _abrirFormulario(),
        borderRadius: BorderRadius.circular(16),
        child: Ink(
          decoration: BoxDecoration(
            color: _GTheme.emerald300,
            borderRadius: BorderRadius.circular(16),
            boxShadow: _GTheme.fabShadow,
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: const [
                Icon(Icons.add, color: _GTheme.slate900, size: 28),
                SizedBox(width: 12),
                Text(
                  'Nueva gestación',
                  style: TextStyle(
                    color: _GTheme.slate900,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 12),
            Text(_error!, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton(onPressed: _cargar, child: const Text('Reintentar')),
          ],
        ),
      ),
    );
  }

  Widget _buildAvisoConsulta() {
    return Container(
      margin: const EdgeInsets.only(bottom: 24),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _GTheme.blue50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _GTheme.blue100),
        boxShadow: _GTheme.softShadow,
      ),
      child: const Row(
        children: [
          Icon(Icons.info_outline, color: _GTheme.blue600, size: 22),
          SizedBox(width: 12),
          Expanded(
            child: Text(
              'Consulta: puede ver y tomar/subir foto de la chancha. Registrar parto y editar datos es en administración.',
              style: TextStyle(fontSize: 13, color: _GTheme.slate700, fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStats(StatsGestacion stats) {
    Widget metricCard({
      required String label,
      required int value,
      required bool highlight,
      IconData? icon,
    }) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: highlight ? _GTheme.primaryContainer : _GTheme.surfaceLowest,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: highlight
                ? _GTheme.outlineVariant.withValues(alpha: 0.3)
                : _GTheme.outlineVariant,
          ),
          boxShadow: _GTheme.softShadow,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: highlight ? _GTheme.onPrimaryContainer : _GTheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: Text(
                    '$value',
                    style: TextStyle(
                      fontSize: highlight ? 28 : 24,
                      fontWeight: FontWeight.w700,
                      height: 1.1,
                      letterSpacing: -0.2,
                      color: highlight ? _GTheme.onPrimaryContainer : _GTheme.onSurface,
                    ),
                  ),
                ),
                if (icon != null)
                  Icon(
                    icon,
                    size: 22,
                    color: highlight ? _GTheme.onPrimaryContainer : _GTheme.outline,
                  ),
              ],
            ),
          ],
        ),
      );
    }

    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: metricCard(
                label: 'Gestando',
                value: stats.gestando,
                highlight: true,
                icon: Icons.pets_rounded,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: metricCard(
                label: 'Total',
                value: stats.total,
                highlight: false,
                icon: Icons.list_alt_rounded,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: metricCard(
                label: 'Pre-Parto',
                value: stats.preParto,
                highlight: false,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: metricCard(
                label: 'Paridas',
                value: stats.paridas,
                highlight: false,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildAlerta(AlertaGestacion a) {
    final esDanger = a.tipo == TipoAlertaGestacion.danger;
    final texto = esDanger
        ? '${a.nombre}: parto inminente (días 108–114)'
        : '${a.nombre}: fase pre-parto';
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _GTheme.amber50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _GTheme.amber200),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: _GTheme.amber100,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              Icons.warning_amber_rounded,
              color: esDanger ? _GTheme.rose500 : _GTheme.amber600,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              texto,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: _GTheme.amber900,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCard(GestacionChancha c) {
    final diasRest = diasRestantes(c.fechaInseminacion);
    final progreso = progresoPorcentaje(c.fechaInseminacion);
    final parto = fechaPartoEstimada(c.fechaInseminacion);
    final diasTrans = diasTranscurridos(c.fechaInseminacion).clamp(0, 999);
    final etapa = getEtapaNombre(c.fechaInseminacion);
    final loteLabel = c.loteCodigo.trim().isNotEmpty
        ? c.loteCodigo.trim()
        : (c.loteNombre.trim().isNotEmpty ? c.loteNombre.trim() : 'Sin lote');
    final foto = resolveGestacionMediaUrl(c.fotoUrl);

    return Container(
      decoration: BoxDecoration(
        color: _GTheme.surfaceLowest,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _GTheme.outlineVariant),
        boxShadow: _GTheme.softShadow,
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Cabecera: foto 1/3 + datos
          SizedBox(
            height: 108,
            child: Row(
              children: [
                GestureDetector(
                  onTap: () => _actualizarFotoChancha(c),
                  child: SizedBox(
                    width: MediaQuery.of(context).size.width * 0.28,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        ColoredBox(
                          color: _GTheme.surfaceLow,
                          child: foto.isNotEmpty
                              ? Image.network(
                                  foto,
                                  fit: BoxFit.cover,
                                  cacheWidth: 280,
                                  errorBuilder: (_, __, ___) => _partoPh(),
                                )
                              : _partoPh(),
                        ),
                        Positioned(
                          right: 6,
                          bottom: 6,
                          child: Container(
                            padding: const EdgeInsets.all(4),
                            decoration: BoxDecoration(
                              color: _GTheme.primary.withValues(alpha: 0.9),
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: const Icon(Icons.photo_camera, size: 12, color: Colors.white),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                Expanded(
                  child: InkWell(
                    onTap: () => _abrirFicha(c),
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  c.nombre,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w600,
                                    color: _GTheme.onSurface,
                                    height: 1.15,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  loteLabel,
                                  style: const TextStyle(
                                    fontSize: 14,
                                    color: _GTheme.onSurfaceVariant,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                '$diasTrans',
                                style: const TextStyle(
                                  fontSize: 26,
                                  fontWeight: FontWeight.w700,
                                  color: _GTheme.primary,
                                  height: 1,
                                ),
                              ),
                              const Text(
                                'DÍAS',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  letterSpacing: 0.4,
                                  color: _GTheme.primary,
                                ),
                              ),
                              const SizedBox(height: 4),
                              _chip('GESTANDO', _GTheme.primaryContainer.withValues(alpha: 0.2),
                                  _GTheme.primary, border: _GTheme.primary.withValues(alpha: 0.3)),
                              const SizedBox(height: 3),
                              _chip(
                                etapa.toUpperCase(),
                                _GTheme.surfaceVariant,
                                _GTheme.onSurfaceVariant,
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          // Progreso + fechas + countdown
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: _GTheme.surfaceVariant)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'PROGRESO ($progreso%)',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: _GTheme.onSurfaceVariant,
                    letterSpacing: 0.3,
                  ),
                ),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(999),
                  child: LinearProgressIndicator(
                    value: progreso / 100,
                    minHeight: 8,
                    backgroundColor: _GTheme.surfaceHigh,
                    color: _GTheme.primary,
                  ),
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: _GTheme.bg,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: _GTheme.outlineVariant.withValues(alpha: 0.5)),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: _fechaMini(
                          Icons.calendar_month_outlined,
                          'Inseminación',
                          formatFechaEs(c.fechaInseminacion),
                        ),
                      ),
                      Expanded(
                        child: _fechaMini(
                          Icons.event_available_outlined,
                          'Parto Est.',
                          formatFechaDesdeDate(parto),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: _GTheme.primaryContainer.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: _GTheme.primary.withValues(alpha: 0.2)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.timer_outlined, size: 18, color: _GTheme.primary),
                      const SizedBox(width: 8),
                      Text(
                        'Faltan para parto: $diasRest días',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: _GTheme.primary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Container(
              decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: _GTheme.surfaceVariant)),
              ),
              padding: const EdgeInsets.fromLTRB(8, 0, 8, 4),
              child: Row(
                children: [
                  Expanded(
                    child: _actionButton(
                      label: 'Ver',
                      icon: Icons.visibility_outlined,
                      color: _GTheme.slate700,
                      hoverBg: _GTheme.slate100,
                      onPressed: () => _abrirFicha(c),
                    ),
                  ),
                  if (widget.modoEdicion) ...[
                    Expanded(
                      child: _actionButton(
                        label: 'Parto',
                        icon: Icons.pets_rounded,
                        color: _GTheme.emerald700,
                        hoverBg: _GTheme.emerald50,
                        onPressed: () async {
                          final ok = await showRegistrarPartoSheet(
                            context: context,
                            service: _service,
                            chancha: c,
                          );
                          if (ok == true) _cargar();
                        },
                      ),
                    ),
                    Expanded(
                      child: _actionButton(
                        label: 'No gestante',
                        icon: Icons.restart_alt_rounded,
                        color: _GTheme.orange600,
                        hoverBg: _GTheme.orange50,
                        onPressed: () async {
                          final ok = await showNoPrenadaSheet(
                            context: context,
                            service: _service,
                            chancha: c,
                          );
                          if (ok == true) _cargar();
                        },
                      ),
                    ),
                    Expanded(
                      child: _actionButton(
                        label: 'Editar',
                        icon: Icons.edit_outlined,
                        color: _GTheme.emerald600,
                        hoverBg: _GTheme.emerald50,
                        onPressed: () => _abrirFormulario(existente: c),
                      ),
                    ),
                    Expanded(
                      child: _actionButton(
                        label: 'Eliminar',
                        icon: Icons.delete_outline,
                        color: _GTheme.rose500,
                        hoverBg: _GTheme.rose50,
                        onPressed: () => _confirmarEliminar(c),
                      ),
                    ),
                  ],
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _chip(String text, Color bg, Color fg, {Color? border}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(4),
        border: border != null ? Border.all(color: border) : null,
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.2,
          color: fg,
        ),
      ),
    );
  }

  Widget _fechaMini(IconData icon, String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 14, color: _GTheme.onSurfaceVariant),
            const SizedBox(width: 4),
            Flexible(
              child: Text(
                label,
                style: const TextStyle(fontSize: 11, color: _GTheme.onSurfaceVariant),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: _GTheme.onSurface,
          ),
        ),
      ],
    );
  }

  Widget _actionButton({
    required String label,
    required IconData icon,
    required Color color,
    required Color hoverBg,
    required VoidCallback onPressed,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 16, color: color),
              const SizedBox(width: 8),
              Text(
                label,
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: color),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _confirmarEliminar(GestacionChancha c) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Eliminar registro'),
        content: Text('¿Eliminar gestación de ${c.nombre}?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    try {
      await _service.eliminar(c.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Registro eliminado')));
      _cargar();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _abrirFormulario({GestacionChancha? existente}) async {
    List<LoteDto> lotes = [];
    try {
      final todos = await _loteService.getActivos();
      lotes = todos.where(esLoteElegibleGestacion).toList();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error al cargar lotes: $e')));
      return;
    }
    if (lotes.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No hay lotes de chanchos activos disponibles.')),
      );
      return;
    }

    if (!mounted) return;
    final guardado = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: _FormTheme.background,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => _GestacionFormSheet(
        existente: existente,
        lotes: lotes,
        registros: _chanchas,
        onGuardar: (body, id) async {
          if (id != null) {
            await _service.actualizar(id, body);
          } else {
            await _service.crear(body);
          }
        },
      ),
    );
    if (guardado == true) _cargar();
  }
}

/// Paleta AgroFlow para el formulario nueva/editar gestación.
abstract final class _FormTheme {
  static const background = Color(0xFFF8F9FF);
  static const primary = Color(0xFF0F5238);
  static const primaryContainer = Color(0xFF2D6A4F);
  static const onPrimaryContainer = Color(0xFFA8E7C5);
  static const onSurface = Color(0xFF0B1C30);
  static const onSurfaceVariant = Color(0xFF404943);
  static const surfaceContainerLow = Color(0xFFEFF4FF);
  static const surfaceContainerLowest = Color(0xFFFFFFFF);
  static const outlineVariant = Color(0xFFBFC9C1);

  static InputDecoration fieldDecoration({String? hint}) => InputDecoration(
        filled: true,
        fillColor: surfaceContainerLow,
        hintText: hint,
        hintStyle: const TextStyle(color: onSurfaceVariant, fontSize: 16),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: outlineVariant),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: outlineVariant),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: primaryContainer, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: Color(0xFFBA1A1A)),
        ),
      );
}

class _GestacionFormSheet extends StatefulWidget {
  final GestacionChancha? existente;
  final List<LoteDto> lotes;
  final List<GestacionChancha> registros;
  final Future<void> Function(Map<String, dynamic> body, String? id) onGuardar;

  const _GestacionFormSheet({
    required this.existente,
    required this.lotes,
    required this.registros,
    required this.onGuardar,
  });

  @override
  State<_GestacionFormSheet> createState() => _GestacionFormSheetState();
}

class _GestacionFormSheetState extends State<_GestacionFormSheet> {
  final _formKey = GlobalKey<FormState>();
  final _service = GestacionService();
  LoteDto? _lote;
  int? _numeroChancha;
  DateTime _fechaInseminacion = DateTime.now();
  final _obsController = TextEditingController();
  final _partoController = TextEditingController(text: '1');
  bool _activa = true;
  bool _guardando = false;
  bool _subiendoFoto = false;
  String _fotoUrl = '';

  @override
  void initState() {
    super.initState();
    final e = widget.existente;
    if (e != null) {
      try {
        _lote = widget.lotes.firstWhere((l) => l.id == e.loteId);
      } catch (_) {
        _lote = widget.lotes.isNotEmpty ? widget.lotes.first : null;
      }
      _numeroChancha = e.numeroEnLote;
      _fechaInseminacion = parseFechaLocal(e.fechaInseminacion);
      _obsController.text = e.observaciones;
      _partoController.text = e.numeroParto.toString();
      _activa = e.activa;
      _fotoUrl = e.fotoUrl;
    } else if (widget.lotes.isNotEmpty) {
      _lote = widget.lotes.first;
    }
  }

  @override
  void dispose() {
    _obsController.dispose();
    _partoController.dispose();
    super.dispose();
  }

  List<OpcionChanchaLote> get _opciones {
    if (_lote == null) return [];
    return opcionesChanchasLote(
      lote: _lote!,
      registros: widget.registros,
      excluirRegistroId: widget.existente?.id,
    );
  }

  Future<void> _onNumeroChanged(int? v) async {
    setState(() => _numeroChancha = v);
    if (widget.existente != null || _lote == null || v == null) return;
    try {
      final n = await _service.siguienteNumeroParto(_lote!.id, v);
      if (!mounted) return;
      setState(() => _partoController.text = '$n');
    } catch (_) {}
  }

  Future<void> _pickFoto() async {
    final file = await pickGestacionImage(context);
    if (file == null) return;
    setState(() => _subiendoFoto = true);
    try {
      final url = await _service.uploadFoto(file);
      if (!mounted) return;
      setState(() => _fotoUrl = url);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => _subiendoFoto = false);
    }
  }

  Future<void> _guardar() async {
    if (!_formKey.currentState!.validate() || _lote == null || _numeroChancha == null) return;
    setState(() => _guardando = true);
    try {
      final body = {
        'loteId': _lote!.id,
        'numeroEnLote': _numeroChancha,
        'fechaInseminacion': DateFormat('yyyy-MM-dd').format(_fechaInseminacion),
        'numeroParto': int.tryParse(_partoController.text.trim()) ?? 1,
        'observaciones': _obsController.text.trim(),
        'fotoUrl': _fotoUrl.isEmpty ? null : _fotoUrl,
        'activa': _activa,
      };
      await widget.onGuardar(body, widget.existente?.id);
      if (!mounted) return;
      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _guardando = false);
    }
  }

  Widget _formLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 4),
      child: Text(
        text.toUpperCase(),
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.6,
          color: _FormTheme.onSurfaceVariant,
        ),
      ),
    );
  }

  Future<void> _pickFecha() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _fechaInseminacion,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 30)),
      locale: const Locale('es', 'ES'),
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: const ColorScheme.light(
            primary: _FormTheme.primaryContainer,
            onPrimary: Colors.white,
          ),
        ),
        child: child!,
      ),
    );
    if (picked != null) setState(() => _fechaInseminacion = picked);
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    final titulo = widget.existente == null ? 'Nueva gestación' : 'Editar gestación';
    final btnLabel = widget.existente == null ? 'Guardar' : 'Actualizar';

    return SizedBox(
      height: MediaQuery.of(context).size.height * 0.92,
      child: Column(
        children: [
          // TopAppBar
          Container(
            height: 64,
            padding: const EdgeInsets.symmetric(horizontal: 8),
            color: _FormTheme.background,
            child: Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.arrow_back, color: _FormTheme.primary),
                  onPressed: () => Navigator.pop(context),
                ),
                Text(
                  titulo,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: _FormTheme.primary,
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: Form(
              key: _formKey,
              child: ListView(
                padding: EdgeInsets.fromLTRB(16, 0, 16, bottom + 24),
                children: [
                  // Card formulario
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: _FormTheme.surfaceContainerLowest,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: _FormTheme.outlineVariant.withValues(alpha: 0.3)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.04),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        _formLabel('Lote'),
                        DropdownButtonFormField<LoteDto>(
                          value: _lote,
                          isExpanded: true,
                          decoration: _FormTheme.fieldDecoration(),
                          icon: const Icon(Icons.arrow_drop_down, color: _FormTheme.onSurfaceVariant),
                          style: const TextStyle(fontSize: 16, color: _FormTheme.onSurface),
                          items: widget.lotes
                              .map((l) => DropdownMenuItem(value: l, child: Text(etiquetaLote(l))))
                              .toList(),
                          onChanged: widget.existente != null
                              ? null
                              : (v) => setState(() {
                                    _lote = v;
                                    _numeroChancha = null;
                                  }),
                        ),
                        const SizedBox(height: 24),
                        _formLabel('Chancha'),
                        DropdownButtonFormField<int>(
                          value: _numeroChancha,
                          isExpanded: true,
                          decoration: _FormTheme.fieldDecoration(hint: 'Seleccionar chancha'),
                          icon: const Icon(Icons.arrow_drop_down, color: _FormTheme.onSurfaceVariant),
                          style: const TextStyle(fontSize: 16, color: _FormTheme.onSurface),
                          items: _opciones
                              .map((o) => DropdownMenuItem(
                                    value: o.numero,
                                    enabled: o.disponible || o.numero == _numeroChancha,
                                    child: Text(
                                      o.disponible || o.numero == _numeroChancha
                                          ? o.etiqueta
                                          : '${o.etiqueta} (${o.motivoNoDisponible})',
                                      style: TextStyle(
                                        color: (o.disponible || o.numero == _numeroChancha)
                                            ? _FormTheme.onSurface
                                            : _FormTheme.onSurfaceVariant,
                                      ),
                                    ),
                                  ))
                              .toList(),
                          onChanged: widget.existente != null ? null : _onNumeroChanged,
                          validator: (v) => v == null ? 'Seleccione la chancha' : null,
                        ),
                        const SizedBox(height: 24),
                        _formLabel('Foto de la chancha'),
                        Row(
                          children: [
                            if (_fotoUrl.isNotEmpty)
                              ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: Image.network(
                                  resolveGestacionMediaUrl(_fotoUrl),
                                  width: 64,
                                  height: 64,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => const SizedBox(width: 64, height: 64),
                                ),
                              ),
                            if (_fotoUrl.isNotEmpty) const SizedBox(width: 10),
                            OutlinedButton.icon(
                              onPressed: _subiendoFoto ? null : _pickFoto,
                              icon: const Icon(Icons.pets_rounded, size: 18),
                              label: Text(
                                _subiendoFoto
                                    ? 'Subiendo…'
                                    : (_fotoUrl.isEmpty ? 'Tomar / subir' : 'Cambiar'),
                              ),
                            ),
                            if (_fotoUrl.isNotEmpty)
                              IconButton(
                                onPressed: () => setState(() => _fotoUrl = ''),
                                icon: const Icon(Icons.close),
                              ),
                          ],
                        ),
                        const SizedBox(height: 24),
                        _formLabel('Fecha de inseminación'),
                        InkWell(
                          onTap: _pickFecha,
                          borderRadius: BorderRadius.circular(8),
                          child: InputDecorator(
                            decoration: _FormTheme.fieldDecoration(),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    DateFormat('dd/MM/yyyy').format(_fechaInseminacion),
                                    style: const TextStyle(fontSize: 16, color: _FormTheme.onSurface),
                                  ),
                                ),
                                const Icon(Icons.calendar_today_outlined,
                                    size: 20, color: _FormTheme.onSurfaceVariant),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),
                        _formLabel('Número de parto'),
                        TextFormField(
                          controller: _partoController,
                          decoration: _FormTheme.fieldDecoration(hint: 'Ej. 1'),
                          keyboardType: TextInputType.number,
                          style: const TextStyle(fontSize: 16, color: _FormTheme.onSurface),
                        ),
                        const SizedBox(height: 24),
                        _formLabel('Observaciones'),
                        TextFormField(
                          controller: _obsController,
                          decoration: _FormTheme.fieldDecoration(hint: 'Notas adicionales...'),
                          maxLines: 4,
                          style: const TextStyle(fontSize: 16, color: _FormTheme.onSurface),
                        ),
                        const SizedBox(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Registro activo',
                              style: TextStyle(fontSize: 16, color: _FormTheme.onSurface),
                            ),
                            Switch(
                              value: _activa,
                              onChanged: (v) => setState(() => _activa = v),
                              activeTrackColor: _FormTheme.primaryContainer,
                              activeThumbColor: Colors.white,
                              inactiveTrackColor: _FormTheme.outlineVariant,
                              inactiveThumbColor: Colors.white,
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Material(
                          color: _FormTheme.primaryContainer,
                          borderRadius: BorderRadius.circular(12),
                          elevation: 2,
                          shadowColor: Colors.black26,
                          child: InkWell(
                            onTap: _guardando ? null : _guardar,
                            borderRadius: BorderRadius.circular(12),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              child: Center(
                                child: _guardando
                                    ? const SizedBox(
                                        height: 24,
                                        width: 24,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2.5,
                                          color: _FormTheme.onPrimaryContainer,
                                        ),
                                      )
                                    : Text(
                                        btnLabel,
                                        style: const TextStyle(
                                          fontSize: 20,
                                          fontWeight: FontWeight.w600,
                                          color: _FormTheme.onPrimaryContainer,
                                        ),
                                      ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 16),
                    child: Text(
                      'Asegúrese de que todos los datos coincidan con el registro físico del animal para mantener la trazabilidad.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 14, color: _FormTheme.onSurfaceVariant, height: 1.4),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
