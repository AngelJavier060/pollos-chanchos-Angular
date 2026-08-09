import 'package:flutter/material.dart';
import '../services/lote_service.dart';
import '../services/plan_nutricional_service.dart';
import '../services/auth_service.dart';

/// Página de Alimentación - Detecta automáticamente el tipo de animal del usuario
class AlimentacionPage extends StatefulWidget {
  /// Si se conoce el tipo (chanchos/pollos), evita leer secure storage al abrir.
  final String? tipoAnimalInicial;

  const AlimentacionPage({super.key, this.tipoAnimalInicial});
  @override
  State<AlimentacionPage> createState() => _AlimentacionPageState();
}

class _AlimentacionPageState extends State<AlimentacionPage> {
  final _loteSrv = LoteServiceMobile();
  final _planSrv = PlanNutricionalService();

  bool _cargando = true;
  bool _cargandoStats = false;
  String? _error;
  List<LoteDto> _lotes = [];
  String _tipoAnimal = 'pollos'; // Se detecta automáticamente
  final DateTime _fechaSeleccionada = DateTime.now();

  // Cache de estadísticas por lote
  final Map<String, int> _mortalidadPorLote = {};
  final Map<String, int> _morbilidadPorLote = {};

  @override
  void initState() {
    super.initState();
    _inicializar();
  }

  Future<void> _inicializar() async {
    // Usar tipo pasado desde el menú (rápido) o detectar desde sesión
    String tipo = widget.tipoAnimalInicial ?? '';
    if (tipo.isEmpty) {
      tipo = await AuthService.getTipoAnimal();
    }
    if (!mounted) return;
    setState(() {
      _tipoAnimal = tipo == 'admin' ? 'pollos' : tipo;
    });
    await _cargarDatos();
  }

  Future<void> _cargarDatos() async {
    setState(() {
      _cargando = true;
      _error = null;
    });
    try {
      // 1) Solo lotes → la pantalla se muestra de inmediato
      final lotes = _tipoAnimal == 'chanchos'
          ? await _loteSrv.getActivosChanchos()
          : await _loteSrv.getActivosPollos();

      if (!mounted) return;
      setState(() {
        _lotes = lotes;
        _cargando = false;
        // Valores iniciales: mortalidad del lote; morbilidad 0 hasta que llegue la API
        for (final l in lotes) {
          _mortalidadPorLote[l.id] = l.muertos;
          _morbilidadPorLote.putIfAbsent(l.id, () => 0);
        }
      });

      // Prefetch plan+stock para que el modal abra casi al instante
      _planSrv.prefetch(_tipoAnimal);

      // Stats en segundo plano, por lotes (sin saturar la red)
      _cargarEstadisticasEnParalelo(lotes);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _cargando = false;
      });
    }
  }

  /// Mortalidad + morbilidad por lotes en tandas (evita saturar la red al abrir).
  Future<void> _cargarEstadisticasEnParalelo(List<LoteDto> lotes) async {
    if (lotes.isEmpty) return;
    if (!mounted) return;
    setState(() => _cargandoStats = true);

    try {
      const batchSize = 3;
      for (var i = 0; i < lotes.length; i += batchSize) {
        final batch = lotes.skip(i).take(batchSize).toList();
        final resultados = await Future.wait(
          batch.map((lote) async {
            final pair = await Future.wait([
              _planSrv.contarMortalidadPorLote(lote.id),
              _planSrv.contarEnfermosPorLote(lote.id),
            ]);
            return (lote.id, pair[0], pair[1]);
          }),
        );
        if (!mounted) return;
        setState(() {
          for (final r in resultados) {
            _mortalidadPorLote[r.$1] = r.$2;
            _morbilidadPorLote[r.$1] = r.$3;
          }
        });
      }
    } catch (_) {
      // silencioso: ya hay valores iniciales
    } finally {
      if (mounted) setState(() => _cargandoStats = false);
    }
  }

  int _calcularDiasVida(DateTime? birthdate) {
    if (birthdate == null) return 0;
    return DateTime.now().difference(birthdate).inDays;
  }

  String _formatearEdadMeses(DateTime? birthdate) {
    if (birthdate == null) return '0 meses';
    final now = DateTime.now();
    int meses = (now.year - birthdate.year) * 12 + (now.month - birthdate.month);
    if (now.day < birthdate.day) meses--;
    final ref = DateTime(birthdate.year, birthdate.month + meses, birthdate.day);
    final dias = now.difference(ref).inDays;
    final mesesTxt = meses == 1 ? '1 mes' : '$meses meses';
    if (dias <= 0) return mesesTxt;
    final diasTxt = dias == 1 ? '1 día' : '$dias días';
    return '$mesesTxt y $diasTxt';
  }

  String _formatearFecha(DateTime fecha) {
    const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                   'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return '${dias[fecha.weekday - 1]}, ${fecha.day} de ${meses[fecha.month - 1]} de ${fecha.year}';
  }

  String _formatearFechaCorta(DateTime fecha) {
    final d = fecha.day.toString().padLeft(2, '0');
    final m = fecha.month.toString().padLeft(2, '0');
    return '$d/$m/${fecha.year}';
  }

  // Paleta diseño profesional (mockup Alimentación)
  Color get _primary =>
      _tipoAnimal == 'chanchos' ? const Color(0xFF005EB8) : const Color(0xFF2E7D32);
  Color get _primaryDark =>
      _tipoAnimal == 'chanchos' ? const Color(0xFF00478A) : const Color(0xFF1B5E20);
  Color get _primarySoft =>
      _tipoAnimal == 'chanchos' ? const Color(0x0D005EB8) : const Color(0x142E7D32);
  Color get _emojiBg =>
      _tipoAnimal == 'chanchos' ? const Color(0xFFFCE7F3) : const Color(0xFFE8F5E9);
  /// Compatibilidad con modal (misma lógica de color).
  Color get _colorPrimario => _primary;
  String get _emoji => _tipoAnimal == 'chanchos' ? '🐷' : '🐔';
  String get _nombreAnimal => _tipoAnimal == 'chanchos' ? 'Chanchos' : 'Pollos';
  String get _nombreAnimalSingular => _tipoAnimal == 'chanchos' ? 'chancho' : 'pollo';

  void _mostrarSnack(String msg, {bool error = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: error ? Colors.red : _colorPrimario,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _abrirModalAlimentacion(LoteDto lote) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _ModalAlimentacionCompleto(
        lote: lote,
        tipoAnimal: _tipoAnimal,
        planService: _planSrv,
        colorPrimario: _colorPrimario,
        onRegistrado: () {
          Navigator.pop(ctx);
          _cargarDatos();
          _mostrarSnack('✅ Alimentación registrada exitosamente');
        },
        onError: (msg) => _mostrarSnack(msg, error: true),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final totalAnimales = _lotes.fold<int>(0, (sum, l) => sum + l.quantity);

    return Scaffold(
      backgroundColor: const Color(0xFFF7FAFC),
      appBar: AppBar(
        title: Text(
          'Alimentación $_nombreAnimal',
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 20),
        ),
        backgroundColor: _primary,
        foregroundColor: Colors.white,
        elevation: 2,
        shadowColor: Colors.black26,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _cargarDatos,
            tooltip: 'Actualizar',
          ),
        ],
      ),
      body: _cargando
          ? Center(child: CircularProgressIndicator(color: _primary))
          : RefreshIndicator(
              color: _primary,
              onRefresh: _cargarDatos,
              child: CustomScrollView(
                slivers: [
                  if (_cargandoStats)
                    SliverToBoxAdapter(
                      child: LinearProgressIndicator(minHeight: 2, color: _primary),
                    ),

                  // Summary card
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
                      child: Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: _primaryDark,
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(
                              color: _primaryDark.withValues(alpha: 0.35),
                              blurRadius: 16,
                              offset: const Offset(0, 6),
                            ),
                          ],
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(Icons.calendar_today, color: Colors.white, size: 28),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _formatearFecha(_fechaSeleccionada),
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 17,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '${_lotes.length} lotes activos • $totalAnimales $_nombreAnimalSingular${totalAnimales != 1 ? 's' : ''} total',
                                    style: TextStyle(
                                      color: Colors.white.withValues(alpha: 0.8),
                                      fontSize: 13,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),

                  if (_error != null)
                    SliverToBoxAdapter(
                      child: Container(
                        margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFF5F5),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFFECACA)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.error_outline, color: Color(0xFFE53E3E)),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(_error!, style: const TextStyle(color: Color(0xFFC53030))),
                            ),
                          ],
                        ),
                      ),
                    ),

                  if (_lotes.isEmpty)
                    SliverFillRemaining(
                      child: Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(_emoji, style: const TextStyle(fontSize: 72)),
                            const SizedBox(height: 16),
                            Text(
                              'No hay lotes activos de $_nombreAnimalSingular${_lotes.length != 1 ? 's' : ''}',
                              style: const TextStyle(fontSize: 18, color: Color(0xFF4A5568)),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 16),
                            FilledButton.icon(
                              onPressed: _cargarDatos,
                              icon: const Icon(Icons.refresh),
                              label: const Text('Actualizar'),
                              style: FilledButton.styleFrom(backgroundColor: _primary),
                            ),
                          ],
                        ),
                      ),
                    )
                  else
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                      sliver: SliverList(
                        delegate: SliverChildBuilderDelegate(
                          (context, index) => _buildLoteCard(_lotes[index]),
                          childCount: _lotes.length,
                        ),
                      ),
                    ),
                ],
              ),
            ),
    );
  }

  Widget _buildLoteCard(LoteDto lote) {
    final diasVida = _calcularDiasVida(lote.birthdate);
    final registrados = lote.quantityOriginal ?? lote.quantity;
    final mortalidad = _mortalidadPorLote[lote.id] ?? lote.muertos;
    final morbilidad = _morbilidadPorLote[lote.id] ?? 0;

    return Container(
      margin: const EdgeInsets.only(bottom: 24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFF3F4F6)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          // Header lote
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: _primarySoft,
              border: Border(bottom: BorderSide(color: _primary.withValues(alpha: 0.1))),
            ),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: _emojiBg,
                    shape: BoxShape.circle,
                  ),
                  child: Center(child: Text(_emoji, style: const TextStyle(fontSize: 26))),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        lote.name,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1F2937),
                        ),
                      ),
                      Text(
                        '${lote.animalName.toUpperCase()} • ${lote.raceName}',
                        style: const TextStyle(fontSize: 12, color: Color(0xFF4A5568)),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: _primary,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: const Text(
                    'Activo',
                    style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ),

          // Metrics 2x3
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: _buildInfoItem('Edad', '$diasVida días', Icons.schedule),
                    ),
                    Expanded(
                      child: _buildInfoItem('Meses', _formatearEdadMeses(lote.birthdate), Icons.calendar_month),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: _buildInfoItem(
                        'Nacimiento',
                        lote.birthdate != null ? _formatearFechaCorta(lote.birthdate!) : '—',
                        Icons.cake_outlined,
                      ),
                    ),
                    const Expanded(child: SizedBox()),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: _buildInfoItem('Registrados', '$registrados', Icons.inventory_2_outlined),
                    ),
                    Expanded(
                      child: _buildInfoItem(
                        '$_nombreAnimal Vivos',
                        '${lote.quantity}',
                        Icons.favorite,
                        color: _primary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: _buildInfoItem(
                        'Morbilidad',
                        '$morbilidad',
                        Icons.medical_information_outlined,
                        color: const Color(0xFFDD6B20),
                      ),
                    ),
                    Expanded(
                      child: _buildInfoItem(
                        'Mortalidad',
                        '$mortalidad',
                        Icons.warning_amber_outlined,
                        color: mortalidad > 0 ? const Color(0xFFE53E3E) : const Color(0xFF4A5568),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // CTA
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: SizedBox(
              width: double.infinity,
              height: 48,
              child: FilledButton.icon(
                onPressed: () => _abrirModalAlimentacion(lote),
                icon: const Icon(Icons.restaurant, size: 20),
                label: const Text(
                  'Ingresar Alimentos Diarios',
                  style: TextStyle(fontWeight: FontWeight.w500, fontSize: 15),
                ),
                style: FilledButton.styleFrom(
                  backgroundColor: _primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoItem(String label, String value, IconData icon, {Color? color}) {
    final iconColor = color ?? const Color(0xFF4A5568);
    final valueColor = color ?? const Color(0xFF1F2937);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 20, color: iconColor),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(fontSize: 12, color: Color(0xFF4A5568)),
              ),
              Text(
                value,
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: valueColor),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Modal de alimentación completo con interfaz como la web
class _ModalAlimentacionCompleto extends StatefulWidget {
  final LoteDto lote;
  final String tipoAnimal;
  final PlanNutricionalService planService;
  final Color colorPrimario;
  final VoidCallback onRegistrado;
  final void Function(String) onError;

  const _ModalAlimentacionCompleto({
    required this.lote,
    required this.tipoAnimal,
    required this.planService,
    required this.colorPrimario,
    required this.onRegistrado,
    required this.onError,
  });

  @override
  State<_ModalAlimentacionCompleto> createState() => _ModalAlimentacionCompletoState();
}

class _ModalAlimentacionCompletoState extends State<_ModalAlimentacionCompleto> {
  bool _cargando = true;
  bool _registrando = false;
  PlanNutricionalActivo? _plan;
  List<EtapaNutricional> _etapasDisponibles = [];
  Map<int, double> _stockDisponible = {};

  /// Cuando la edad del lote no cae en ningún rango del plan (igual que Angular)
  bool _alertaSinRango = false;
  String _rangoConfigurado = 'sin rangos';

  final _obsCtrl = TextEditingController();
  final _vivosCtrl = TextEditingController();
  final _muertosCtrl = TextEditingController(text: '0');
  final _enfermosCtrl = TextEditingController(text: '0');
  final _pesoCtrl = TextEditingController(); // Solo para chanchos
  String? _causaMortalidad;
  String? _errorStock;

  @override
  void initState() {
    super.initState();
    _vivosCtrl.text = widget.lote.quantity.toString();
    _cargarPlan();
  }

  @override
  void dispose() {
    _obsCtrl.dispose();
    _vivosCtrl.dispose();
    _muertosCtrl.dispose();
    _enfermosCtrl.dispose();
    _pesoCtrl.dispose();
    super.dispose();
  }

  int get _diasVida {
    if (widget.lote.birthdate == null) return 0;
    return DateTime.now().difference(widget.lote.birthdate!).inDays;
  }

  String _formatearFechaNacimiento(DateTime fecha) {
    final d = fecha.day.toString().padLeft(2, '0');
    final m = fecha.month.toString().padLeft(2, '0');
    return '$d/$m/${fecha.year}';
  }

  String get _nombreAnimal => widget.tipoAnimal == 'chanchos' ? 'Chanchos' : 'Pollos';

  Future<void> _cargarPlan() async {
    setState(() {
      _cargando = true;
      _alertaSinRango = false;
    });
    try {
      // Plan y stock en paralelo (y suelen venir de caché por prefetch)
      final results = await Future.wait([
        widget.planService.obtenerPlanActivo(widget.tipoAnimal),
        widget.planService.obtenerStockValido(),
      ]);
      final plan = results[0] as PlanNutricionalActivo?;
      final stock = results[1] as Map<int, double>;

      if (plan != null && plan.etapas.isNotEmpty) {
        final etapas = plan.etapasDelRangoPrincipal(_diasVida);
        etapas.sort((a, b) {
          if (a.diasMin != b.diasMin) return a.diasMin.compareTo(b.diasMin);
          return a.diasMax.compareTo(b.diasMax);
        });

        if (etapas.isEmpty) {
          final mins = plan.etapas.map((e) => e.diasMin);
          final maxs = plan.etapas.map((e) => e.diasMax);
          final rangoMin = mins.reduce((a, b) => a < b ? a : b);
          final rangoMax = maxs.reduce((a, b) => a > b ? a : b);
          setState(() {
            _plan = plan;
            _etapasDisponibles = [];
            _stockDisponible = stock;
            _alertaSinRango = true;
            _rangoConfigurado = '$rangoMin–$rangoMax';
          });
          return;
        }

        for (var etapa in etapas) {
          etapa.seleccionado = true;
        }

        setState(() {
          _plan = plan;
          _etapasDisponibles = etapas;
          _stockDisponible = stock;
          _alertaSinRango = false;
        });
      } else {
        setState(() {
          _plan = plan;
          _etapasDisponibles = [];
          _stockDisponible = stock;
          _alertaSinRango = true;
          _rangoConfigurado = 'sin rangos';
        });
      }
    } catch (e) {
      widget.onError('Error al cargar plan: $e');
    } finally {
      if (mounted) setState(() { _cargando = false; });
    }
  }

  List<EtapaNutricional> get _alimentosSeleccionados =>
      _etapasDisponibles.where((e) => e.seleccionado).toList();

  double get _cantidadTotalCalculada {
    double total = 0;
    final vivos = int.tryParse(_vivosCtrl.text) ?? widget.lote.quantity;
    for (var etapa in _alimentosSeleccionados) {
      total += etapa.cantidadPorAnimal * vivos;
    }
    return total;
  }

  Future<void> _validarStock() async {
    _errorStock = null;
    final faltantes = <String>[];

    for (var etapa in _alimentosSeleccionados) {
      final vivos = int.tryParse(_vivosCtrl.text) ?? widget.lote.quantity;
      final requerido = etapa.cantidadPorAnimal * vivos;
      final disponible = etapa.productoId != null ? (_stockDisponible[etapa.productoId!] ?? 0) : 0.0;

      if (requerido > disponible + 0.001) {
        faltantes.add('• ${etapa.alimentoRecomendado}: req. ${requerido.toStringAsFixed(2)} kg, disp. ${disponible.toStringAsFixed(2)} kg');
      }
    }

    if (faltantes.isNotEmpty) {
      setState(() { _errorStock = 'Stock insuficiente:\n${faltantes.join('\n')}'; });
    }
  }

  Future<void> _registrar() async {
    await _validarStock();
    if (_errorStock != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_errorStock!), backgroundColor: Colors.red, duration: const Duration(seconds: 5)),
      );
      return;
    }

    if (_alimentosSeleccionados.isEmpty) {
      widget.onError('Seleccione al menos un alimento');
      return;
    }

    setState(() { _registrando = true; });

    try {
      // Registrar consumo por cada alimento seleccionado
      final vivos = int.tryParse(_vivosCtrl.text) ?? widget.lote.quantity;
      for (var etapa in _alimentosSeleccionados) {
        final cantidadEtapa = etapa.cantidadPorAnimal * vivos;
        await widget.planService.registrarConsumo(
          loteId: widget.lote.id,
          cantidadKg: cantidadEtapa,
          nombreProducto: etapa.alimentoRecomendado,
          productoId: etapa.productoId,
          observaciones: _obsCtrl.text.isNotEmpty ? _obsCtrl.text : null,
        );
      }
      // Stock cambió: invalidar caché para el próximo registro
      widget.planService.invalidarCache();

      // Registrar mortalidad
      final muertos = int.tryParse(_muertosCtrl.text) ?? 0;
      if (muertos > 0) {
        await widget.planService.registrarMortalidad(
          loteId: widget.lote.id,
          cantidad: muertos,
          causa: _causaMortalidad,
          observaciones: _obsCtrl.text.isNotEmpty ? _obsCtrl.text : null,
        );
        // Actualizar UI de vivos inmediatamente
        final baseVivos = int.tryParse(_vivosCtrl.text) ?? widget.lote.quantity;
        final nuevoVivos = (baseVivos - muertos) < 0 ? 0 : (baseVivos - muertos);
        setState(() { _vivosCtrl.text = nuevoVivos.toString(); });
      }

      // Registrar morbilidad
      final enfermos = int.tryParse(_enfermosCtrl.text) ?? 0;
      if (enfermos > 0) {
        await widget.planService.registrarMorbilidad(
          loteId: widget.lote.id,
          cantidad: enfermos,
          observaciones: _obsCtrl.text.isNotEmpty ? _obsCtrl.text : null,
        );
      }

      // Registrar en historial de alimentación (como en la web)
      try {
        final vivos = int.tryParse(_vivosCtrl.text) ?? widget.lote.quantity;
        final muertosHist = muertos; // ya parseado arriba
        final total = _cantidadTotalCalculada;
        final peso = double.tryParse(_pesoCtrl.text.replaceAll(',', '.')) ?? 0.0;
        final obs = [
          if (peso > 0) 'Peso animal promedio: ${peso.toStringAsFixed(2)} kg',
          if (_obsCtrl.text.trim().isNotEmpty) _obsCtrl.text.trim(),
        ].join('. ');
        await widget.planService.registrarAlimentacionHistorial(
          loteId: widget.lote.id,
          cantidadAplicada: total,
          animalesVivos: vivos,
          animalesMuertos: muertosHist,
          observaciones: obs.isNotEmpty ? obs : null,
          fecha: DateTime.now(),
        );
      } catch (_) {}

      widget.onRegistrado();
    } catch (e) {
      widget.onError('Error: $e');
    } finally {
      setState(() { _registrando = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.92,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: _cargando
          ? const Center(child: CircularProgressIndicator())
          : _alertaSinRango
              ? _buildAlertaPlanSinRango()
              : Column(
                  children: [
                    _buildHeader(),
                    Expanded(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (_plan != null) _buildEtapaActual(),
                            const SizedBox(height: 16),
                            _buildCantidadTotalInput(),
                            _buildAlimentosPlan(),
                            if (_alimentosSeleccionados.isNotEmpty) _buildResumenSeleccionados(),
                            if (_errorStock != null) _buildErrorStock(),
                            const SizedBox(height: 16),
                            _buildSeccionSalud(),
                            const SizedBox(height: 16),
                            _buildObservaciones(),
                            const SizedBox(height: 16),
                            _buildInfoInventario(),
                            const SizedBox(height: 80),
                          ],
                        ),
                      ),
                    ),
                    _buildBotonesAccion(),
                  ],
                ),
    );
  }

  /// Alerta profesional (misma idea que Angular) cuando no hay etapa para la edad
  Widget _buildAlertaPlanSinRango() {
    const errorRed = Color(0xFFBA1A1A);
    const primaryDark = Color(0xFF121721);
    // Preferir nombre visible (Lote001 / Lote002), no el código interno (03001)
    final loteLabel = _etiquetaLoteVisible(widget.lote);

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(8, 10, 8, 0),
          child: Row(
            children: [
              const Spacer(),
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close_rounded),
                color: Colors.grey.shade700,
              ),
            ],
          ),
        ),
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
            child: Column(
              children: [
                // Ilustración original nítida (sin recortar ni distorsionar)
                Center(
                  child: SizedBox(
                    width: 280,
                    height: 280,
                    child: Image.asset(
                      'assets/images/alerta_plan_nutricional.png',
                      fit: BoxFit.contain,
                      filterQuality: FilterQuality.high,
                      isAntiAlias: true,
                      errorBuilder: (_, __, ___) => Container(
                        decoration: const BoxDecoration(
                          color: Color(0xFFFFDAD6),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.error_rounded, size: 72, color: errorRed),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.error_rounded, color: errorRed, size: 28),
                    SizedBox(width: 8),
                    Text(
                      'ALERTA DE SISTEMA',
                      style: TextStyle(
                        color: errorRed,
                        fontWeight: FontWeight.w700,
                        fontSize: 12,
                        letterSpacing: 1.2,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  'Error de Plan Nutricional — Día $_diasVida',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: primaryDark,
                    height: 1.2,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'No hay etapas del plan nutricional para $_diasVida días de edad. '
                  'Rangos configurados en admin: $_rangoConfigurado días.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 15,
                    height: 1.4,
                    color: Colors.grey.shade700,
                  ),
                ),
                const SizedBox(height: 20),
                _buildCajaAlerta(
                  color: const Color(0xFFFFDAD6),
                  border: errorRed.withValues(alpha: 0.25),
                  iconBg: errorRed,
                  icon: Icons.build_rounded,
                  titulo: 'ACCIÓN REQUERIDA',
                  tituloColor: const Color(0xFF93000A),
                  cuerpo:
                      'Revise Plan Nutricional y agregue una etapa que cubra el día $_diasVida.',
                  cuerpoColor: const Color(0xFF93000A),
                ),
                const SizedBox(height: 12),
                _buildCajaAlerta(
                  color: const Color(0xFFFFF3CD),
                  border: const Color(0xFFE0A800).withValues(alpha: 0.4),
                  iconBg: const Color(0xFFB45309),
                  icon: Icons.support_agent_rounded,
                  titulo: 'SOPORTE',
                  tituloColor: const Color(0xFF78350F),
                  cuerpo:
                      'Contáctese con el administrador para actualizar el plan nutricional.',
                  cuerpoColor: const Color(0xFF78350F),
                ),
                const SizedBox(height: 20),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  alignment: WrapAlignment.center,
                  children: [
                    _chipMeta(Icons.tag_rounded, 'LOTE', loteLabel),
                    _chipMeta(Icons.calendar_today_rounded, 'EDAD', '$_diasVida días'),
                    _chipMeta(
                      Icons.pets_rounded,
                      'POBLACIÓN',
                      '${widget.lote.quantity} $_nombreAnimal',
                    ),
                  ],
                ),
                const SizedBox(height: 28),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: () => Navigator.pop(context),
                    style: FilledButton.styleFrom(
                      backgroundColor: primaryDark,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text(
                      'Entendido',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCajaAlerta({
    required Color color,
    required Color border,
    required Color iconBg,
    required IconData icon,
    required String titulo,
    required Color tituloColor,
    required String cuerpo,
    required Color cuerpoColor,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: iconBg,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: Colors.white, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  titulo,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.8,
                    color: tituloColor,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  cuerpo,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    height: 1.35,
                    color: cuerpoColor,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Etiqueta amigable del lote: "Lote001", "Lote002"...
  String _etiquetaLoteVisible(LoteDto lote) {
    final name = lote.name.trim();
    if (name.isNotEmpty) return name;
    final codigo = lote.codigo.trim();
    if (codigo.isEmpty) return '—';
    final lower = codigo.toLowerCase();
    if (lower.contains('lote')) return codigo;
    final digits = RegExp(r'\d+').allMatches(codigo).map((m) => m.group(0)!).join();
    if (digits.isEmpty) return codigo;
    final last3 = digits.length > 3 ? digits.substring(digits.length - 3) : digits;
    final n = int.tryParse(last3) ?? 1;
    return 'Lote${n.toString().padLeft(3, '0')}';
  }

  Widget _chipMeta(IconData icon, String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 18, color: Colors.grey.shade600),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.6,
                  color: Colors.grey.shade600,
                ),
              ),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF191C1B),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: [widget.colorPrimario.shade600, widget.colorPrimario.shade800]),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          Container(
            width: 40, height: 4,
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(color: Colors.white.withOpacity(0.5), borderRadius: BorderRadius.circular(2)),
          ),
          Row(
            children: [
              const Icon(Icons.restaurant, color: Colors.white, size: 28),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Registro de Alimentación', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                    Text('Lote: ${widget.lote.name} • Con Inventario Automático', style: TextStyle(color: Colors.white.withOpacity(0.9), fontSize: 13)),
                  ],
                ),
              ),
              IconButton(icon: const Icon(Icons.close, color: Colors.white), onPressed: () => Navigator.pop(context)),
            ],
          ),
          const SizedBox(height: 12),
          // Info cards
          Row(
            children: [
              _buildInfoCard('Edad', '$_diasVida días', Colors.green.shade100),
              const SizedBox(width: 8),
              _buildInfoCard(
                'Nacimiento',
                widget.lote.birthdate != null
                    ? _formatearFechaNacimiento(widget.lote.birthdate!)
                    : '—',
                Colors.teal.shade100,
              ),
              const SizedBox(width: 8),
              _buildInfoCard('Raza', widget.lote.raceName, Colors.orange.shade100),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildInfoCard(String label, String value, Color bgColor) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(color: bgColor, borderRadius: BorderRadius.circular(8)),
        child: Column(
          children: [
            Text(label, style: TextStyle(fontSize: 10, color: Colors.grey.shade700)),
            Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold), maxLines: 1, overflow: TextOverflow.ellipsis),
          ],
        ),
      ),
    );
  }

  Widget _buildEtapaActual() {
    final etapaActual = _etapasDisponibles.isNotEmpty ? _etapasDisponibles.first : null;
    
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.blue.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.blue.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.auto_graph, color: Colors.blue.shade700, size: 20),
              const SizedBox(width: 8),
              Text('Etapa Actual del Plan Nutricional', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue.shade900)),
            ],
          ),
          if (etapaActual != null) ...[
            const SizedBox(height: 8),
            Text('Etapa: ${etapaActual.rangoTexto}', style: TextStyle(color: Colors.blue.shade800)),
            Text('Días actuales: $_diasVida días', style: TextStyle(color: Colors.green.shade700, fontWeight: FontWeight.w600)),
          ] else
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text('Sin etapa definida para $_diasVida días', style: TextStyle(color: Colors.orange.shade700)),
            ),
        ],
      ),
    );
  }

  Widget _buildCantidadTotalInput() {
    final total = _cantidadTotalCalculada;
    final etapaRef = _alimentosSeleccionados.isNotEmpty
        ? _alimentosSeleccionados.first
        : (_etapasDisponibles.isNotEmpty ? _etapasDisponibles.first : null);
    final kgAnimal = etapaRef?.cantidadPorAnimal ?? 0.0;
    final animales = widget.lote.quantity;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Cantidad Total (kg)', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          TextField(
            controller: TextEditingController(text: total.toStringAsFixed(2)),
            readOnly: true,
            decoration: InputDecoration(
              hintText: '0.00',
              prefixIcon: const Icon(Icons.scale),
              filled: true,
              fillColor: Colors.grey.shade50,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.grey.shade300),
              ),
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            ),
          ),
          if (etapaRef != null) ...[
            const SizedBox(height: 6),
            Text(
              '${kgAnimal.toStringAsFixed(2)} kg/animal × $animales animales = ${total.toStringAsFixed(2)} kg total',
              style: TextStyle(color: Colors.green.shade700, fontSize: 12, fontWeight: FontWeight.w600),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildAlimentosPlan() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(Icons.restaurant_menu, color: Colors.blue.shade700, size: 18),
            const SizedBox(width: 8),
            Text('Alimentos del Plan (${_etapasDisponibles.length} opciones)', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            const Spacer(),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(color: Colors.green.shade100, borderRadius: BorderRadius.circular(12)),
              child: Text('Selección múltiple', style: TextStyle(fontSize: 10, color: Colors.green.shade800, fontWeight: FontWeight.w600)),
            ),
          ],
        ),
        const SizedBox(height: 12),

        if (_etapasDisponibles.isEmpty)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.yellow.shade50, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.yellow.shade300)),
            child: Row(
              children: [
                Icon(Icons.warning_amber, color: Colors.orange.shade700),
                const SizedBox(width: 12),
                Expanded(child: Text('No hay alimentos definidos para $_diasVida días', style: TextStyle(color: Colors.orange.shade800))),
              ],
            ),
          )
        else
          ..._etapasDisponibles.map((etapa) {
            final vivos = int.tryParse(_vivosCtrl.text) ?? widget.lote.quantity;
            final cantidadTotal = etapa.cantidadPorAnimal * vivos;
            final stockDisp = etapa.productoId != null ? (_stockDisponible[etapa.productoId!] ?? 0) : 0.0;
            final hayStock = stockDisp >= cantidadTotal - 0.001;

            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              decoration: BoxDecoration(
                color: etapa.seleccionado ? Colors.blue.shade50 : Colors.grey.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: etapa.seleccionado ? Colors.blue.shade400 : Colors.grey.shade300),
              ),
              child: CheckboxListTile(
                value: etapa.seleccionado,
                onChanged: (v) => setState(() { etapa.seleccionado = v ?? false; }),
                activeColor: widget.colorPrimario,
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                title: Row(
                  children: [
                    Expanded(child: Text(etapa.alimentoRecomendado, style: const TextStyle(fontWeight: FontWeight.w600))),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(color: Colors.indigo.shade100, borderRadius: BorderRadius.circular(12)),
                      child: Text(etapa.rangoTexto, style: TextStyle(fontSize: 10, color: Colors.indigo.shade800)),
                    ),
                  ],
                ),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 4),
                    Text('${etapa.cantidadPorAnimal.toStringAsFixed(2)} kg/animal/día', style: TextStyle(color: Colors.grey.shade700, fontSize: 12)),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        Icon(hayStock ? Icons.check_circle : Icons.warning, size: 14, color: hayStock ? Colors.green : Colors.orange),
                        const SizedBox(width: 4),
                        Text('Stock: ${stockDisp.toStringAsFixed(2)} kg', style: TextStyle(fontSize: 11, color: hayStock ? Colors.green.shade700 : Colors.orange.shade700)),
                      ],
                    ),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }

  Widget _buildResumenSeleccionados() {
    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: [Colors.green.shade50, Colors.green.shade100]),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.green.shade300),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.check_circle, color: Colors.green.shade700, size: 18),
              const SizedBox(width: 8),
              Text('Alimentos Seleccionados', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.green.shade800)),
            ],
          ),
          const SizedBox(height: 8),
          ..._alimentosSeleccionados.map((alimento) {
            final vivos = int.tryParse(_vivosCtrl.text) ?? widget.lote.quantity;
            final cantidad = alimento.cantidadPorAnimal * vivos;
            return Container(
              margin: const EdgeInsets.only(bottom: 4),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.green.shade200)),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Text(alimento.alimentoRecomendado, style: TextStyle(fontSize: 12, color: Colors.green.shade800, fontWeight: FontWeight.w500)),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(color: Colors.green.shade100, borderRadius: BorderRadius.circular(8)),
                        child: Text(alimento.rangoTexto, style: TextStyle(fontSize: 9, color: Colors.green.shade700)),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(color: Colors.green.shade100, borderRadius: BorderRadius.circular(8)),
                    child: Text('${cantidad.toStringAsFixed(2)} kg', style: TextStyle(fontSize: 12, color: Colors.green.shade800, fontWeight: FontWeight.w600)),
                  ),
                ],
              ),
            );
          }),
          const Divider(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Total:', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.green.shade800)),
              Text('${_cantidadTotalCalculada.toStringAsFixed(2)} kg', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.green.shade900)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildErrorStock() {
    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.red.shade300),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.error, color: Colors.red.shade700),
          const SizedBox(width: 12),
          Expanded(child: Text(_errorStock!, style: TextStyle(color: Colors.red.shade800))),
        ],
      ),
    );
  }

  Widget _buildSeccionSalud() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.monitor_heart, color: Colors.blue.shade700, size: 18),
              const SizedBox(width: 8),
              const Text('Información de Animales', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            ],
          ),
          const SizedBox(height: 12),

          // Animales vivos (readonly input)
          TextField(
            controller: _vivosCtrl,
            readOnly: true,
            decoration: InputDecoration(
              labelText: '$_nombreAnimal Vivos Actuales',
              prefixIcon: Icon(Icons.favorite, color: Colors.green.shade700, size: 20),
              helperText: 'Este valor se actualiza automáticamente al registrar mortalidad',
              helperStyle: TextStyle(color: Colors.green.shade700, fontSize: 11),
              filled: true,
              fillColor: Colors.green.shade50,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            ),
          ),
          const SizedBox(height: 12),

          // Muertos y enfermos
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _muertosCtrl,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    labelText: 'Animales Muertos Hoy',
                    prefixIcon: Icon(Icons.warning, color: Colors.red.shade400, size: 20),
                    filled: true,
                    fillColor: Colors.red.shade50,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                  ),
                  onChanged: (_) => setState(() {}),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextField(
                  controller: _enfermosCtrl,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    labelText: 'Animales Enfermos',
                    prefixIcon: Icon(Icons.medical_services, color: Colors.orange.shade400, size: 20),
                    filled: true,
                    fillColor: Colors.orange.shade50,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                  ),
                ),
              ),
            ],
          ),

          // Causa de mortalidad
          if ((int.tryParse(_muertosCtrl.text) ?? 0) > 0) ...[
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _causaMortalidad,
              decoration: InputDecoration(
                labelText: 'Causa de Mortalidad',
                prefixIcon: const Icon(Icons.help_outline),
                filled: true,
                fillColor: Colors.grey.shade50,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
              ),
              items: const [
                DropdownMenuItem(value: 'Enfermedad', child: Text('Enfermedad')),
                DropdownMenuItem(value: 'Ahogamiento', child: Text('Ahogamiento')),
                DropdownMenuItem(value: 'Aplastamiento', child: Text('Aplastamiento')),
                DropdownMenuItem(value: 'Estrés', child: Text('Estrés')),
                DropdownMenuItem(value: 'Desconocida', child: Text('Desconocida')),
                DropdownMenuItem(value: 'Otro', child: Text('Otro')),
              ],
              onChanged: (v) => setState(() { _causaMortalidad = v; }),
            ),
          ],

          // Peso (solo para chanchos)
          if (widget.tipoAnimal == 'chanchos') ...[
            const SizedBox(height: 12),
            TextField(
              controller: _pesoCtrl,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: InputDecoration(
                labelText: 'Peso Promedio (kg)',
                prefixIcon: const Icon(Icons.monitor_weight, size: 20),
                filled: true,
                fillColor: Colors.purple.shade50,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildObservaciones() {
    return TextField(
      controller: _obsCtrl,
      maxLines: 3,
      decoration: InputDecoration(
        labelText: 'Observaciones',
        hintText: 'Observaciones opcionales...',
        filled: true,
        fillColor: Colors.grey.shade50,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  Widget _buildInfoInventario() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.blue.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.blue.shade200),
      ),
      child: Row(
        children: [
          Icon(Icons.auto_awesome, color: Colors.blue.shade700),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('🤖 Gestión Automática de Inventario', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue.shade800)),
                const SizedBox(height: 4),
                Text('El sistema deducirá ${_cantidadTotalCalculada.toStringAsFixed(2)} kg del inventario automáticamente', style: TextStyle(fontSize: 12, color: Colors.blue.shade700)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBotonesAccion() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 10, offset: const Offset(0, -4))],
      ),
      child: Row(
        children: [
          Expanded(
            child: OutlinedButton(
              onPressed: () => Navigator.pop(context),
              style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
              child: const Text('Cancelar'),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 2,
            child: ElevatedButton.icon(
              onPressed: _registrando ? null : _registrar,
              icon: _registrando
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.save),
              label: Text(_registrando ? 'Procesando...' : 'Registrar'),
              style: ElevatedButton.styleFrom(
                backgroundColor: widget.colorPrimario,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// Extension para colores
extension ColorShades on Color {
  Color get shade50 => Color.lerp(this, Colors.white, 0.9)!;
  Color get shade100 => Color.lerp(this, Colors.white, 0.8)!;
  Color get shade500 => this;
  Color get shade600 => Color.lerp(this, Colors.black, 0.1)!;
  Color get shade700 => Color.lerp(this, Colors.black, 0.2)!;
  Color get shade800 => Color.lerp(this, Colors.black, 0.3)!;
}
