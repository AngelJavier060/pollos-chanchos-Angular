import 'package:flutter/material.dart';
import '../services/lote_service.dart';
import '../services/plan_nutricional_service.dart';
import '../services/auth_service.dart';

/// Página de Alimentación - Detecta automáticamente el tipo de animal del usuario
class AlimentacionPage extends StatefulWidget {
  const AlimentacionPage({super.key});
  @override
  State<AlimentacionPage> createState() => _AlimentacionPageState();
}

class _AlimentacionPageState extends State<AlimentacionPage> {
  final _loteSrv = LoteServiceMobile();
  final _planSrv = PlanNutricionalService();

  bool _cargando = true;
  String? _error;
  List<LoteDto> _lotes = [];
  String _tipoAnimal = 'pollos'; // Se detecta automáticamente
  DateTime _fechaSeleccionada = DateTime.now();

  // Cache de estadísticas por lote
  final Map<String, int> _mortalidadPorLote = {};
  final Map<String, int> _morbilidadPorLote = {};

  @override
  void initState() {
    super.initState();
    _inicializar();
  }

  
  Future<void> _inicializar() async {
    // Detectar tipo de animal del usuario
    final tipo = await AuthService.getTipoAnimal();
    setState(() {
      _tipoAnimal = tipo == 'admin' ? 'pollos' : tipo; // Admin ve pollos por defecto
    });
    await _cargarDatos();
  }

  Future<void> _cargarDatos() async {
    setState(() { _cargando = true; _error = null; });
    try {
      final lotes = _tipoAnimal == 'chanchos'
          ? await _loteSrv.getActivosChanchos()
          : await _loteSrv.getActivosPollos();

      // Cargar estadísticas de mortalidad/morbilidad
      for (final lote in lotes) {
        try {
          final mortalidad = await _planSrv.contarMortalidadPorLote(lote.id);
          final morbilidad = await _planSrv.contarEnfermosPorLote(lote.id);
          _mortalidadPorLote[lote.id] = mortalidad;
          _morbilidadPorLote[lote.id] = morbilidad;
        } catch (_) {}
      }

      setState(() { _lotes = lotes; });
    } catch (e) {
      setState(() { _error = e.toString(); });
    } finally {
      setState(() { _cargando = false; });
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

  Color get _colorPrimario => _tipoAnimal == 'chanchos' ? Colors.pink : Colors.green;
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
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        title: Text('Alimentación $_nombreAnimal'),
        backgroundColor: _colorPrimario.shade700,
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _cargarDatos,
            tooltip: 'Actualizar',
          ),
        ],
      ),
      body: _cargando
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _cargarDatos,
              child: CustomScrollView(
                slivers: [
                  // Header con fecha e información
                  SliverToBoxAdapter(
                    child: Container(
                      margin: const EdgeInsets.all(16),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [_colorPrimario.shade500, _colorPrimario.shade800],
                        ),
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: _colorPrimario.withOpacity(0.3),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: Colors.white.withOpacity(0.2),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Icon(Icons.calendar_today, color: Colors.white, size: 24),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      _formatearFecha(_fechaSeleccionada),
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      '${_lotes.length} lotes activos • $totalAnimales $_nombreAnimalSingular${totalAnimales != 1 ? 's' : ''} total',
                                      style: TextStyle(
                                        color: Colors.white.withOpacity(0.9),
                                        fontSize: 13,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Error message
                  if (_error != null)
                    SliverToBoxAdapter(
                      child: Container(
                        margin: const EdgeInsets.symmetric(horizontal: 16),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.red.shade50,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.red.shade200),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.error_outline, color: Colors.red.shade700),
                            const SizedBox(width: 8),
                            Expanded(child: Text(_error!, style: TextStyle(color: Colors.red.shade700))),
                          ],
                        ),
                      ),
                    ),

                  // Lista de lotes
                  if (_lotes.isEmpty)
                    SliverFillRemaining(
                      child: Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(_emoji, style: const TextStyle(fontSize: 80)),
                            const SizedBox(height: 16),
                            Text(
                              'No hay lotes activos de $_nombreAnimalSingular${_lotes.length != 1 ? 's' : ''}',
                              style: TextStyle(fontSize: 18, color: Colors.grey.shade600),
                            ),
                            const SizedBox(height: 8),
                            ElevatedButton.icon(
                              onPressed: _cargarDatos,
                              icon: const Icon(Icons.refresh),
                              label: const Text('Actualizar'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: _colorPrimario,
                              ),
                            ),
                          ],
                        ),
                      ),
                    )
                  else
                    SliverPadding(
                      padding: const EdgeInsets.all(16),
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
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          // Header del lote
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: _colorPrimario.shade50,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            ),
            child: Row(
              children: [
                Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    color: _colorPrimario.shade100,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(child: Text(_emoji, style: const TextStyle(fontSize: 28))),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        lote.name,
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        '${lote.animalName.toUpperCase()} • ${lote.raceName}',
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade600, letterSpacing: 0.5),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: _colorPrimario,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Text('Activo', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),

          // Información del lote
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(child: _buildInfoItem('Edad', '$diasVida días', Icons.access_time)),
                    Expanded(child: _buildInfoItem('Meses', _formatearEdadMeses(lote.birthdate), Icons.calendar_month)),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(child: _buildInfoItem('Registrados', '$registrados', Icons.inventory)),
                    Expanded(child: _buildInfoItem('$_nombreAnimal Vivos', '${lote.quantity}', Icons.favorite, color: Colors.blue)),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(child: _buildInfoItem('Morbilidad', '$morbilidad', Icons.medical_services, color: Colors.orange)),
                    Expanded(child: _buildInfoItem('Mortalidad', '$mortalidad', Icons.warning, color: mortalidad > 0 ? Colors.red : Colors.grey)),
                  ],
                ),
              ],
            ),
          ),

          // Botón de acción
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => _abrirModalAlimentacion(lote),
                icon: const Icon(Icons.restaurant),
                label: const Text('Ingresar Alimentos Diarios'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _colorPrimario,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
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
    return Row(
      children: [
        Icon(icon, size: 18, color: color ?? Colors.grey.shade600),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
              Text(value, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: color ?? Colors.black87)),
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

  String get _nombreAnimal => widget.tipoAnimal == 'chanchos' ? 'Chanchos' : 'Pollos';

  Future<void> _cargarPlan() async {
    setState(() { _cargando = true; });
    try {
      final plan = await widget.planService.obtenerPlanActivo(widget.tipoAnimal);
      final stock = await widget.planService.obtenerStockValido();

      if (plan != null) {
        final etapas = plan.etapasDelRangoPrincipal(_diasVida);
        etapas.sort((a, b) {
          if (a.diasMin != b.diasMin) return a.diasMin.compareTo(b.diasMin);
          return a.diasMax.compareTo(b.diasMax);
        });

        // Seleccionar todas por defecto
        for (var etapa in etapas) {
          etapa.seleccionado = true;
        }

        setState(() {
          _plan = plan;
          _etapasDisponibles = etapas;
          _stockDisponible = stock;
        });
      }
    } catch (e) {
      widget.onError('Error al cargar plan: $e');
    } finally {
      setState(() { _cargando = false; });
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
      child: Column(
        children: [
          // Header
          _buildHeader(),

          // Contenido
          Expanded(
            child: _cargando
                ? const Center(child: CircularProgressIndicator())
                : SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Etapa actual del plan
                        if (_plan != null) _buildEtapaActual(),

                        const SizedBox(height: 16),

                        // Total calculado
                        _buildCantidadTotalInput(),

                        // Alimentos del plan con checkboxes
                        _buildAlimentosPlan(),

                        // Resumen de seleccionados
                        if (_alimentosSeleccionados.isNotEmpty) _buildResumenSeleccionados(),

                        // Error de stock
                        if (_errorStock != null) _buildErrorStock(),

                        const SizedBox(height: 16),

                        // Sección de salud del lote
                        _buildSeccionSalud(),

                        const SizedBox(height: 16),

                        // Observaciones
                        _buildObservaciones(),

                        const SizedBox(height: 16),

                        // Info inventario automático
                        _buildInfoInventario(),

                        const SizedBox(height: 80),
                      ],
                    ),
                  ),
          ),

          // Botones de acción
          _buildBotonesAccion(),
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
