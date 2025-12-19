import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/lote_service.dart';
import '../services/plan_nutricional_service.dart';

class LotesDashboardPage extends StatefulWidget {
  const LotesDashboardPage({super.key});

  @override
  State<LotesDashboardPage> createState() => _LotesDashboardPageState();
}

class _LotesDashboardPageState extends State<LotesDashboardPage> {
  final LoteServiceMobile _loteService = LoteServiceMobile();
  final PlanNutricionalService _planService = PlanNutricionalService();
  
  bool _loading = true;
  String? _error;
  List<LoteDto> _lotes = [];
  List<LoteDto> _lotesFiltrados = [];
  List<RazaDto> _razas = [];
  
  // Consumo por lote
  Map<String, double> _consumoPorLote = {};
  
  // Tabs y filtros
  String _activeTab = 'activos'; // 'activos' | 'historico'
  String _filtroAnimal = 'todos'; // 'todos' | 'pollos' | 'chanchos'
  
  // Formulario
  bool _showForm = false;
  String? _tipoAnimalForm;
  final _formKey = GlobalKey<FormState>();
  final _nombreController = TextEditingController();
  final _cantidadController = TextEditingController();
  final _costoController = TextEditingController();
  DateTime? _fechaNacimiento;
  RazaDto? _razaSeleccionada;
  bool _guardando = false;
  
  // Campos para composición de chanchos
  final _cantidadMachosController = TextEditingController();
  final _cantidadHembrasController = TextEditingController();
  String? _propositoMachos;
  String? _propositoHembras;

  @override
  void initState() {
    super.initState();
    _cargarDatos();
  }

  @override
  void dispose() {
    _nombreController.dispose();
    _cantidadController.dispose();
    _costoController.dispose();
    _cantidadMachosController.dispose();
    _cantidadHembrasController.dispose();
    super.dispose();
  }

  Future<void> _cargarDatos() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final lotes = _activeTab == 'activos'
          ? await _loteService.getActivos()
          : await _loteService.getHistorico();
      final razas = await _loteService.getRazas();
      
      // Cargar consumos por lote
      await _cargarConsumosPorLote(lotes);
      
      setState(() {
        _lotes = lotes;
        _razas = razas;
        _aplicarFiltro();
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  /// Cargar consumos por lote desde el historial de alimentación
  Future<void> _cargarConsumosPorLote(List<LoteDto> lotes) async {
    try {
      final fechaFin = DateTime.now();
      final fechaInicio = DateTime.now().subtract(const Duration(days: 365));
      final fechaInicioStr = DateFormat('yyyy-MM-dd').format(fechaInicio);
      final fechaFinStr = DateFormat('yyyy-MM-dd').format(fechaFin);
      
      final datos = await _planService.obtenerHistorialAlimentacion(fechaInicioStr, fechaFinStr);
      
      // Agrupar consumos por loteId
      final consumos = <String, double>{};
      for (final item in datos) {
        if (item is Map<String, dynamic>) {
          final loteId = item['loteId']?.toString() ?? '';
          final cantidad = (item['cantidad'] ?? 0).toDouble();
          if (loteId.isNotEmpty) {
            consumos[loteId] = (consumos[loteId] ?? 0) + cantidad;
          }
        }
      }
      
      _consumoPorLote = consumos;
    } catch (e) {
      print('Error cargando consumos: $e');
    }
  }

  /// Obtener consumo total de un lote
  double getConsumoLote(String? loteId) {
    if (loteId == null) return 0;
    return _consumoPorLote[loteId] ?? 0;
  }

  void _aplicarFiltro() {
    if (_filtroAnimal == 'todos') {
      _lotesFiltrados = List.from(_lotes);
    } else if (_filtroAnimal == 'pollos') {
      _lotesFiltrados = _lotes.where((l) => l.esPollo).toList();
    } else {
      _lotesFiltrados = _lotes.where((l) => l.esChancho).toList();
    }
  }

  // Métricas
  int get _totalLotes => _lotes.length;
  int get _totalAnimales => _lotes.fold(0, (sum, l) => sum + l.quantity);
  double get _inversionTotal => _lotes.fold(0.0, (sum, l) => sum + l.cost);

  Map<String, dynamic> get _metricasPollos {
    final pollos = _lotes.where((l) => l.esPollo).toList();
    return {
      'lotes': pollos.length,
      'animales': pollos.fold(0, (sum, l) => sum + l.quantity),
      'inversion': pollos.fold(0.0, (sum, l) => sum + l.cost),
      'registrados': pollos.fold<int>(0, (sum, l) => sum + (l.quantityOriginal ?? l.quantity)),
    };
  }

  Map<String, dynamic> get _metricasChanchos {
    final chanchos = _lotes.where((l) => l.esChancho).toList();
    return {
      'lotes': chanchos.length,
      'animales': chanchos.fold(0, (sum, l) => sum + l.quantity),
      'inversion': chanchos.fold(0.0, (sum, l) => sum + l.cost),
      'registrados': chanchos.fold<int>(0, (sum, l) => sum + (l.quantityOriginal ?? l.quantity)),
    };
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Gestión de Lotes'),
        backgroundColor: const Color(0xFF2563EB),
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _cargarDatos,
          ),
        ],
      ),
      body: _showForm ? _buildFormulario() : _buildDashboard(),
      floatingActionButton: !_showForm
          ? FloatingActionButton.extended(
              onPressed: () => setState(() => _showForm = true),
              backgroundColor: const Color(0xFF2563EB),
              icon: const Icon(Icons.add),
              label: const Text('Nuevo Lote'),
            )
          : null,
    );
  }

  Widget _buildDashboard() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 16),
            Text(_error!, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            ElevatedButton(onPressed: _cargarDatos, child: const Text('Reintentar')),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _cargarDatos,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Título
            const Text(
              'Resumen de Lotes',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF1F2937)),
            ),
            const SizedBox(height: 16),

            // KPIs generales
            _buildKPIsGenerales(),
            const SizedBox(height: 16),

            // Tarjetas por tipo de animal
            _buildTarjetasAnimales(),
            const SizedBox(height: 24),

            // Tabs Activos/Histórico
            _buildTabs(),
            const SizedBox(height: 16),

            // Filtros por tipo
            _buildFiltros(),
            const SizedBox(height: 16),

            // Tabla de lotes
            _buildTablaLotes(),
          ],
        ),
      ),
    );
  }

  Widget _buildKPIsGenerales() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final cardWidth = (constraints.maxWidth - 24) / 3; // 24 = 2 espacios de 12px
        const cardHeight = 90.0;
        return Row(
          children: [
            SizedBox(
              width: cardWidth,
              height: cardHeight,
              child: _buildKPICard('Total de\nLotes', _totalLotes.toString(), const Color(0xFF2563EB)),
            ),
            const SizedBox(width: 12),
            SizedBox(
              width: cardWidth,
              height: cardHeight,
              child: _buildKPICard('Total de\nAnimales', _totalAnimales.toString(), const Color(0xFF2563EB)),
            ),
            const SizedBox(width: 12),
            SizedBox(
              width: cardWidth,
              height: cardHeight,
              child: _buildKPICard('Inversión\nTotal', '\$${_inversionTotal.toStringAsFixed(0)}', const Color(0xFF2563EB)),
            ),
          ],
        );
      },
    );
  }

  Widget _buildKPICard(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 8, offset: const Offset(0, 2)),
        ],
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280), height: 1.2),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 6),
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              value,
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: color),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTarjetasAnimales() {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Pollos
        Expanded(
          child: _buildTarjetaAnimal(
            emoji: '🐔',
            nombre: 'Pollos',
            colorFondo: const Color(0xFFFEF3C7),
            colorBorde: const Color(0xFFF59E0B),
            colorTexto: const Color(0xFF92400E),
            colorValor: const Color(0xFFD97706),
            lotes: _metricasPollos['lotes'] as int,
            animales: _metricasPollos['animales'] as int,
            inversion: _metricasPollos['inversion'] as double,
            registrados: _metricasPollos['registrados'] as int,
          ),
        ),
        const SizedBox(width: 12),
        // Chanchos
        Expanded(
          child: _buildTarjetaAnimal(
            emoji: '🐷',
            nombre: 'Chanchos',
            colorFondo: const Color(0xFFFCE7F3),
            colorBorde: const Color(0xFFEC4899),
            colorTexto: const Color(0xFF9D174D),
            colorValor: const Color(0xFFDB2777),
            lotes: _metricasChanchos['lotes'] as int,
            animales: _metricasChanchos['animales'] as int,
            inversion: _metricasChanchos['inversion'] as double,
            registrados: _metricasChanchos['registrados'] as int,
          ),
        ),
      ],
    );
  }

  Widget _buildTarjetaAnimal({
    required String emoji,
    required String nombre,
    required Color colorFondo,
    required Color colorBorde,
    required Color colorTexto,
    required Color colorValor,
    required int lotes,
    required int animales,
    required double inversion,
    required int registrados,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colorFondo,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: colorBorde, width: 2),
      ),
      child: Column(
        children: [
          // Header con emoji y nombre
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(emoji, style: const TextStyle(fontSize: 22)),
              const SizedBox(width: 6),
              Text(nombre, style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: colorTexto)),
            ],
          ),
          const SizedBox(height: 10),
          // Métricas en columnas con dimensiones iguales
          Row(
            children: [
              Expanded(child: _buildMiniMetricaColumna('Lotes', '$lotes', colorValor)),
              Container(width: 1, height: 40, color: colorBorde.withValues(alpha: 0.3)),
              Expanded(child: _buildMiniMetricaColumna('Animales', '$animales', colorValor)),
              Container(width: 1, height: 40, color: colorBorde.withValues(alpha: 0.3)),
              Expanded(child: _buildMiniMetricaColumna('Inversión', '\$${inversion.toStringAsFixed(0)}', colorValor)),
            ],
          ),
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerRight,
            child: Text(
              'Registrados: $registrados',
              style: TextStyle(fontSize: 10, color: colorTexto.withOpacity(0.9), fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMiniMetricaColumna(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 2),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              label,
              style: const TextStyle(fontSize: 9, color: Color(0xFF6B7280)),
              maxLines: 1,
            ),
          ),
          const SizedBox(height: 4),
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              value,
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: color),
              maxLines: 1,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabs() {
    return Row(
      children: [
        _buildTabButton('Activos', 'activos'),
        const SizedBox(width: 8),
        _buildTabButton('Histórico', 'historico'),
      ],
    );
  }

  Widget _buildTabButton(String label, String tab) {
    final isActive = _activeTab == tab;
    return GestureDetector(
      onTap: () {
        setState(() => _activeTab = tab);
        _cargarDatos();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        decoration: BoxDecoration(
          color: isActive ? const Color(0xFF2563EB) : Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: const Color(0xFF2563EB)),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isActive ? Colors.white : const Color(0xFF2563EB),
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }

  Widget _buildFiltros() {
    return Row(
      children: [
        const Text('Lotes Activos', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        const Spacer(),
        _buildFiltroChip('Todos', 'todos'),
        const SizedBox(width: 8),
        _buildFiltroChip('Pollos', 'pollos'),
        const SizedBox(width: 8),
        _buildFiltroChip('Chanchos', 'chanchos'),
      ],
    );
  }

  Widget _buildFiltroChip(String label, String filtro) {
    final isActive = _filtroAnimal == filtro;
    return GestureDetector(
      onTap: () {
        setState(() {
          _filtroAnimal = filtro;
          _aplicarFiltro();
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isActive ? const Color(0xFF2563EB) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFFE5E7EB)),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: isActive ? Colors.white : const Color(0xFF374151),
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    );
  }

  Widget _buildTablaLotes() {
    if (_lotesFiltrados.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(32),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Center(
          child: Text('No hay lotes para mostrar', style: TextStyle(color: Color(0xFF6B7280))),
        ),
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 8),
        ],
      ),
      child: Column(
        children: [
          // Header simplificado (sin Raza, sin Orig.)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: const BoxDecoration(
              color: Color(0xFFF3F4F6),
              borderRadius: BorderRadius.vertical(top: Radius.circular(12)),
            ),
            child: const Row(
              children: [
                Expanded(flex: 3, child: Text('Nombre', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF6B7280)))),
                Expanded(flex: 2, child: Text('Animal', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF6B7280)))),
                Expanded(flex: 2, child: Text('Vivos', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF6B7280)), textAlign: TextAlign.center)),
                Expanded(flex: 2, child: Text('Consumo', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFFF97316)), textAlign: TextAlign.center)),
                Expanded(flex: 2, child: Text('Costo', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF6B7280)), textAlign: TextAlign.right)),
              ],
            ),
          ),
          // Filas
          ...List.generate(_lotesFiltrados.length, (i) => _buildFilaLote(_lotesFiltrados[i])),
        ],
      ),
    );
  }

  Widget _buildFilaLote(LoteDto lote) {
    final esPollo = lote.esPollo;
    final consumo = getConsumoLote(lote.id);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
      ),
      child: Row(
        children: [
          // Nombre
          Expanded(flex: 3, child: Text(lote.name, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600))),
          // Animal (badge)
          Expanded(
            flex: 2,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
              decoration: BoxDecoration(
                color: esPollo ? const Color(0xFFFEF3C7) : const Color(0xFFFCE7F3),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                esPollo ? '🐔' : '🐷',
                style: const TextStyle(fontSize: 14),
                textAlign: TextAlign.center,
              ),
            ),
          ),
          // Vivos (con indicador de muertos si hay)
          Expanded(
            flex: 2,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: lote.quantity > 0 ? const Color(0xFFDCFCE7) : const Color(0xFFFEE2E2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '${lote.quantity}',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: lote.quantity > 0 ? const Color(0xFF16A34A) : const Color(0xFFDC2626),
                    ),
                  ),
                ),
                if (lote.muertos > 0) ...[
                  const SizedBox(width: 4),
                  Text(
                    '(-${lote.muertos})',
                    style: const TextStyle(fontSize: 10, color: Color(0xFFDC2626)),
                  ),
                ],
              ],
            ),
          ),
          // Consumo
          Expanded(
            flex: 2,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
              decoration: BoxDecoration(
                color: consumo > 0 ? const Color(0xFFFFF7ED) : Colors.grey.shade100,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                consumo > 0 ? '${consumo.toStringAsFixed(1)} kg' : '-',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: consumo > 0 ? FontWeight.w600 : FontWeight.normal,
                  color: consumo > 0 ? const Color(0xFFF97316) : Colors.grey,
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ),
          // Costo
          Expanded(
            flex: 2,
            child: Text(
              '\$${lote.cost.toStringAsFixed(0)}',
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
              textAlign: TextAlign.right,
            ),
          ),
        ],
      ),
    );
  }

  // ==================== FORMULARIO ====================
  Widget _buildFormulario() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFEFF6FF), Color(0xFFFCE7F3)],
        ),
      ),
      child: Column(
        children: [
          // Header del formulario
          Container(
            padding: const EdgeInsets.all(20),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF2563EB), Color(0xFFEC4899)],
              ),
            ),
            child: Row(
              children: [
                const Icon(Icons.add_circle, color: Colors.white, size: 28),
                const SizedBox(width: 12),
                const Text('Crear Nuevo Lote', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white)),
                const Spacer(),
                IconButton(
                  onPressed: _cerrarFormulario,
                  icon: const Icon(Icons.close, color: Colors.white, size: 28),
                ),
              ],
            ),
          ),

          // Contenido del formulario
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  // Selector de tipo de animal
                  if (_tipoAnimalForm == null) ...[
                    const Text(
                      '¿Qué tipo de animal vas a registrar?',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: Color(0xFF374151)),
                    ),
                    const SizedBox(height: 24),
                    Row(
                      children: [
                        Expanded(child: _buildSelectorAnimal('pollos', '🐔', 'Pollos', const Color(0xFFEC4899))),
                        const SizedBox(width: 16),
                        Expanded(child: _buildSelectorAnimal('chanchos', '🐷', 'Chanchos', const Color(0xFF2563EB))),
                      ],
                    ),
                  ] else ...[
                    _buildFormularioCompleto(),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSelectorAnimal(String tipo, String emoji, String label, Color color) {
    return GestureDetector(
      onTap: () => setState(() => _tipoAnimalForm = tipo),
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 8),
          ],
        ),
        child: Column(
          children: [
            Text(emoji, style: const TextStyle(fontSize: 48)),
            const SizedBox(height: 12),
            Text(label, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
          ],
        ),
      ),
    );
  }

  Widget _buildFormularioCompleto() {
    final esPollo = _tipoAnimalForm == 'pollos';
    final colorPrimario = esPollo ? const Color(0xFFEC4899) : const Color(0xFF2563EB);
    final razasFiltradas = _razas.where((r) => esPollo ? r.esPollo : r.esChancho).toList();

    return Form(
      key: _formKey,
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 8),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Nombre del lote
            _buildCampoTexto('Nombre del Lote*', _nombreController, 'Ej: Lote Verano 2025'),
            const SizedBox(height: 16),

            // Raza
            const Text('Raza*', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF374151))),
            const SizedBox(height: 8),
            DropdownButtonFormField<RazaDto>(
              value: _razaSeleccionada,
              decoration: InputDecoration(
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              ),
              hint: const Text('Selecciona una raza'),
              items: razasFiltradas.map((r) => DropdownMenuItem(value: r, child: Text(r.name))).toList(),
              onChanged: (v) => setState(() => _razaSeleccionada = v),
              validator: (v) => v == null ? 'Selecciona una raza' : null,
            ),
            const SizedBox(height: 16),

            // Cantidad y Fecha
            Row(
              children: [
                Expanded(child: _buildCampoNumero('Cantidad*', _cantidadController, 'Ej: 100')),
                const SizedBox(width: 16),
                Expanded(child: _buildCampoFecha()),
              ],
            ),
            const SizedBox(height: 16),

            // Costo
            _buildCampoCosto(),
            
            // Sección de composición de chanchos (solo para chanchos)
            if (!esPollo) ...[
              const SizedBox(height: 24),
              _buildSeccionComposicionChanchos(),
            ],
            
            const SizedBox(height: 24),

            // Botones
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _cerrarFormulario,
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Cancelar', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _guardando ? null : _guardarLote,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: colorPrimario,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: _guardando
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: const [
                              Icon(Icons.save, color: Colors.white),
                              SizedBox(width: 8),
                              Text('Guardar Lote', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                            ],
                          ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCampoTexto(String label, TextEditingController controller, String hint) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF374151))),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          decoration: InputDecoration(
            hintText: hint,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          ),
          validator: (v) => v == null || v.isEmpty ? 'Campo requerido' : null,
        ),
      ],
    );
  }

  Widget _buildCampoNumero(String label, TextEditingController controller, String hint) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF374151))),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          keyboardType: TextInputType.number,
          decoration: InputDecoration(
            hintText: hint,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          ),
          validator: (v) {
            if (v == null || v.isEmpty) return 'Campo requerido';
            if (int.tryParse(v) == null || int.parse(v) <= 0) return 'Debe ser mayor a 0';
            return null;
          },
        ),
      ],
    );
  }

  Widget _buildCampoFecha() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Fecha de Nacimiento*', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF374151))),
        const SizedBox(height: 8),
        InkWell(
          onTap: () async {
            final fecha = await showDatePicker(
              context: context,
              initialDate: _fechaNacimiento ?? DateTime.now(),
              firstDate: DateTime(2020),
              lastDate: DateTime.now(),
            );
            if (fecha != null) setState(() => _fechaNacimiento = fecha);
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              border: Border.all(color: Colors.grey.shade400),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                const Icon(Icons.calendar_today, size: 20, color: Color(0xFF6B7280)),
                const SizedBox(width: 12),
                Text(
                  _fechaNacimiento != null ? DateFormat('dd/MM/yyyy').format(_fechaNacimiento!) : 'Seleccionar fecha',
                  style: TextStyle(color: _fechaNacimiento != null ? Colors.black : Colors.grey),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCampoCosto() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Costo Total*', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF374151))),
        const SizedBox(height: 8),
        TextFormField(
          controller: _costoController,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: InputDecoration(
            prefixText: '\$ ',
            hintText: '0.00',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          ),
          validator: (v) {
            if (v == null || v.isEmpty) return 'Campo requerido';
            if (double.tryParse(v) == null || double.parse(v) < 0) return 'Valor inválido';
            return null;
          },
        ),
      ],
    );
  }

  /// Sección de composición del lote de chanchos (machos y hembras)
  Widget _buildSeccionComposicionChanchos() {
    const colorAzul = Color(0xFF2563EB);
    const colorRosa = Color(0xFFEC4899);
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFFCE7F3).withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colorRosa.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Título de la sección
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('🐷', style: TextStyle(fontSize: 20)),
              const SizedBox(width: 8),
              Expanded(
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Text(
                    'COMPOSICIÓN DEL LOTE DE CHANCHOS',
                    maxLines: 1,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF374151),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          
          // Fila con Machos y Hembras
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // MACHOS
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: colorAzul.withValues(alpha: 0.3)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Text('🐗', style: TextStyle(fontSize: 16)),
                          const SizedBox(width: 6),
                          Text(
                            'MACHOS',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: colorAzul),
                          ),
                        ],
                      ),
                      const Text('(Verracos/Castrados)', style: TextStyle(fontSize: 9, color: Color(0xFF6B7280))),
                      const SizedBox(height: 10),
                      
                      // Cantidad de machos
                      const Text('Cantidad', style: TextStyle(fontSize: 11, color: Color(0xFF6B7280))),
                      const SizedBox(height: 4),
                      TextFormField(
                        controller: _cantidadMachosController,
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(
                          hintText: '0',
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                          isDense: true,
                        ),
                      ),
                      const SizedBox(height: 10),
                      
                      // Propósito machos
                      const Text('Propósito', style: TextStyle(fontSize: 11, color: Color(0xFF6B7280))),
                      const SizedBox(height: 4),
                      DropdownButtonFormField<String>(
                        value: _propositoMachos,
                        decoration: InputDecoration(
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                          isDense: true,
                        ),
                        hint: const Text('Seleccione', style: TextStyle(fontSize: 12)),
                        items: const [
                          DropdownMenuItem(value: 'Engorde', child: Text('Engorde', style: TextStyle(fontSize: 12))),
                          DropdownMenuItem(value: 'Reproducción', child: Text('Reproducción', style: TextStyle(fontSize: 12))),
                        ],
                        onChanged: (v) => setState(() => _propositoMachos = v),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              
              // HEMBRAS
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: colorRosa.withValues(alpha: 0.3)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Text('🐖', style: TextStyle(fontSize: 16)),
                          const SizedBox(width: 6),
                          Text(
                            'HEMBRAS',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: colorRosa),
                          ),
                        ],
                      ),
                      const Text('(Marranas/Chanchitas)', style: TextStyle(fontSize: 9, color: Color(0xFF6B7280))),
                      const SizedBox(height: 10),
                      
                      // Cantidad de hembras
                      const Text('Cantidad', style: TextStyle(fontSize: 11, color: Color(0xFF6B7280))),
                      const SizedBox(height: 4),
                      TextFormField(
                        controller: _cantidadHembrasController,
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(
                          hintText: '0',
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                          isDense: true,
                        ),
                      ),
                      const SizedBox(height: 10),
                      
                      // Propósito hembras
                      const Text('Propósito', style: TextStyle(fontSize: 11, color: Color(0xFF6B7280))),
                      const SizedBox(height: 4),
                      DropdownButtonFormField<String>(
                        value: _propositoHembras,
                        decoration: InputDecoration(
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                          isDense: true,
                        ),
                        hint: const Text('Seleccione', style: TextStyle(fontSize: 12)),
                        items: const [
                          DropdownMenuItem(value: 'Engorde', child: Text('Engorde', style: TextStyle(fontSize: 12))),
                          DropdownMenuItem(value: 'Reproducción', child: Text('Reproducción', style: TextStyle(fontSize: 12))),
                        ],
                        onChanged: (v) => setState(() => _propositoHembras = v),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          
          // Mensaje informativo
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFFFEE2E2),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFFFCA5A5)),
            ),
            child: Row(
              children: const [
                Icon(Icons.info_outline, size: 16, color: Color(0xFFDC2626)),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Debe ingresar al menos un macho o una hembra.',
                    style: TextStyle(fontSize: 11, color: Color(0xFFDC2626)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _cerrarFormulario() {
    setState(() {
      _showForm = false;
      _tipoAnimalForm = null;
      _nombreController.clear();
      _cantidadController.clear();
      _costoController.clear();
      _cantidadMachosController.clear();
      _cantidadHembrasController.clear();
      _fechaNacimiento = null;
      _razaSeleccionada = null;
      _propositoMachos = null;
      _propositoHembras = null;
    });
  }

  Future<void> _guardarLote() async {
    if (!_formKey.currentState!.validate()) return;
    if (_fechaNacimiento == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Selecciona la fecha de nacimiento'), backgroundColor: Colors.red),
      );
      return;
    }
    
    // Validación especial para chanchos
    final esChangho = _tipoAnimalForm == 'chanchos';
    int? machos;
    int? hembras;
    
    if (esChangho) {
      machos = int.tryParse(_cantidadMachosController.text) ?? 0;
      hembras = int.tryParse(_cantidadHembrasController.text) ?? 0;
      
      if (machos == 0 && hembras == 0) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Debe ingresar al menos un macho o una hembra'),
            backgroundColor: Colors.red,
          ),
        );
        return;
      }
    }

    setState(() => _guardando = true);
    try {
      await _loteService.crearLote(
        name: _nombreController.text,
        quantity: int.parse(_cantidadController.text),
        birthdate: _fechaNacimiento!,
        cost: double.parse(_costoController.text),
        raceId: _razaSeleccionada!.id,
        maleCount: esChangho ? machos : null,
        femaleCount: esChangho ? hembras : null,
        malePurpose: esChangho ? _propositoMachos : null,
        femalePurpose: esChangho ? _propositoHembras : null,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Lote creado exitosamente'), backgroundColor: Colors.green),
        );
      }
      _cerrarFormulario();
      _cargarDatos();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      setState(() => _guardando = false);
    }
  }
}
