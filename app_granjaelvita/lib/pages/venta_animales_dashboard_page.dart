import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';

import '../models/venta_animal_model.dart';
import '../services/ventas_service.dart';
import '../services/lote_service.dart';
import 'venta_animal_form_page.dart';

class VentaAnimalesDashboardPage extends StatefulWidget {
  const VentaAnimalesDashboardPage({super.key});

  @override
  State<VentaAnimalesDashboardPage> createState() => _VentaAnimalesDashboardPageState();
}

class _VentaAnimalesDashboardPageState extends State<VentaAnimalesDashboardPage> {
  final _loteSrv = LoteServiceMobile();
  List<VentaAnimalModel> _ventas = [];
  List<LoteDto> _lotes = [];
  bool _cargando = true;
  String? _error;
  DateTimeRange? _rangoFiltro;
  
  // Filtro por tipo de animal: null = todos, 'pollo' = pollos, 'chancho' = chanchos
  String? _filtroAnimal;
  
  // Paginación
  static const int _registrosPorPagina = 10;
  int _paginaActual = 1;

  @override
  void initState() {
    super.initState();
    _cargarVentas();
    _cargarLotes();
  }

  Future<void> _cargarVentas({String? from, String? to}) async {
    setState(() {
      _cargando = true;
      _error = null;
    });
    try {
      final list = await VentasServiceMobile.listarVentasAnimales(from: from, to: to);
      if (!mounted) return;
      setState(() {
        _ventas = list;
        _cargando = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _cargando = false;
      });
    }
  }

  Future<void> _cargarLotes() async {
    try {
      final list = await _loteSrv.getAll();
      if (!mounted) return;
      setState(() {
        _lotes = list;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _lotes = [];
      });
    }
  }

  // Cálculos de estadísticas
  int get _pollosVendidos => _ventas
      .where((v) => (v.animalName ?? '').toLowerCase().contains('pollo'))
      .fold<int>(0, (sum, v) => sum + v.cantidad.toInt());

  int get _chanchosVendidos => _ventas
      .where((v) => (v.animalName ?? '').toLowerCase().contains('chancho') ||
                    (v.animalName ?? '').toLowerCase().contains('cerdo'))
      .fold<int>(0, (sum, v) => sum + v.cantidad.toInt());

  bool _esPollo(VentaAnimalModel v) {
    final name = (v.animalName ?? '').toLowerCase();
    return name.contains('pollo') || name.contains('ave') || name.contains('gallina');
  }

  bool _esChancho(VentaAnimalModel v) {
    final name = (v.animalName ?? '').toLowerCase();
    return name.contains('chancho') || name.contains('cerdo') || name.contains('puerco');
  }

  // Suma directa de v.total por especie (lo que el usuario vendió)
  double get _totalPollos => _ventas
      .where((v) => _esPollo(v))
      .fold<double>(0, (sum, v) => sum + v.total);

  double get _totalChanchos => _ventas
      .where((v) => _esChancho(v))
      .fold<double>(0, (sum, v) => sum + v.total);

  double get _montoTotal => _totalPollos + _totalChanchos;

  int get _totalAnimales => _pollosVendidos + _chanchosVendidos;

  // Ventas filtradas por tipo de animal seleccionado
  List<VentaAnimalModel> get _ventasFiltradas {
    if (_filtroAnimal == null) return _ventas;
    if (_filtroAnimal == 'pollo') {
      return _ventas.where((v) => _esPollo(v)).toList();
    }
    if (_filtroAnimal == 'chancho') {
      return _ventas.where((v) => _esChancho(v)).toList();
    }
    return _ventas;
  }

  // Ventas para la sección de "Ventas Recientes" con paginación
  List<VentaAnimalModel> get _ventasRecientesPaginadas {
    final filtradas = _ventasFiltradas;
    final inicio = (_paginaActual - 1) * _registrosPorPagina;
    final fin = inicio + _registrosPorPagina;
    if (inicio >= filtradas.length) return [];
    return filtradas.sublist(inicio, fin.clamp(0, filtradas.length));
  }

  int get _totalPaginas {
    final total = _ventasFiltradas.length;
    return (total / _registrosPorPagina).ceil().clamp(1, 999);
  }

  // Datos para gráfica de barras por fecha
  Map<String, Map<String, double>> get _ventasPorFecha {
    final Map<String, Map<String, double>> result = {};
    for (final v in _ventas) {
      final fecha = v.fecha;
      if (!result.containsKey(fecha)) {
        result[fecha] = {'Pollos': 0, 'Chanchos': 0};
      }
      final animal = (v.animalName ?? '').toLowerCase();
      if (animal.contains('pollo')) {
        result[fecha]!['Pollos'] = (result[fecha]!['Pollos'] ?? 0) + v.total;
      } else if (animal.contains('chancho') || animal.contains('cerdo')) {
        result[fecha]!['Chanchos'] = (result[fecha]!['Chanchos'] ?? 0) + v.total;
      }
    }
    return result;
  }

  String _formatoIso(DateTime d) {
    final y = d.year.toString().padLeft(4, '0');
    final m = d.month.toString().padLeft(2, '0');
    final day = d.day.toString().padLeft(2, '0');
    return '$y-$m-$day';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFFFFFBEB), Color(0xFFFFEDD5)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              _buildAppBar(),
              Expanded(
                child: _cargando
                    ? const Center(child: CircularProgressIndicator())
                    : _error != null
                        ? _buildError()
                        : RefreshIndicator(
                            onRefresh: () => _cargarVentas(),
                            child: SingleChildScrollView(
                              physics: const AlwaysScrollableScrollPhysics(),
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  _buildActionButton(),
                                  const SizedBox(height: 20),
                                  _buildKpiCards(),
                                  const SizedBox(height: 16),
                                  _buildAnimalCards(),
                                  const SizedBox(height: 20),
                                  _buildChartsSection(),
                                  const SizedBox(height: 20),
                                  _buildRecentSalesSection(),
                                  const SizedBox(height: 40),
                                ],
                              ),
                            ),
                          ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAppBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          IconButton(
            onPressed: () => Navigator.pop(context),
            icon: const Icon(Icons.arrow_back_ios, color: Color(0xFF374151)),
          ),
          const Expanded(
            child: Text(
              'Venta de Animales',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: Color(0xFF111827),
              ),
            ),
          ),
          IconButton(
            onPressed: () => _cargarVentas(),
            icon: const Icon(Icons.refresh, color: Color(0xFF2563EB)),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButton() {
    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF2563EB).withOpacity(0.4),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: _navigateToForm,
          borderRadius: BorderRadius.circular(20),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(
                    Icons.add_shopping_cart,
                    color: Colors.white,
                    size: 28,
                  ),
                ),
                const SizedBox(width: 16),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Ingreso de Venta de Animal',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Registrar nueva venta',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.white70,
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(
                  Icons.arrow_forward_ios,
                  color: Colors.white70,
                  size: 20,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _navigateToForm() async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const VentaAnimalFormPage()),
    );
    if (result == true) {
      _cargarVentas();
    }
  }

  Widget _buildKpiCards() {
    return Row(
      children: [
        Expanded(
          child: _buildKpiCard(
            title: 'TOTAL VENTAS',
            value: _ventas.length.toString(),
            subtitle: 'Registros',
            icon: Icons.receipt_long,
            gradient: const [Color(0xFF8B5CF6), Color(0xFF7C3AED)],
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildKpiCard(
            title: 'ANIMALES',
            value: _totalAnimales.toString(),
            subtitle: 'Vendidos',
            icon: Icons.pets,
            gradient: const [Color(0xFF10B981), Color(0xFF059669)],
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildKpiCard(
            title: 'INGRESOS',
            value: 'S/${_montoTotal.toStringAsFixed(0)}',
            subtitle: 'Total',
            icon: Icons.attach_money,
            gradient: const [Color(0xFFF59E0B), Color(0xFFD97706)],
          ),
        ),
      ],
    );
  }

  Widget _buildKpiCard({
    required String title,
    required String value,
    required String subtitle,
    required IconData icon,
    required List<Color> gradient,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: gradient),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: gradient[0].withOpacity(0.3),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: Colors.white.withOpacity(0.8), size: 22),
          const SizedBox(height: 10),
          Text(
            value,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            subtitle,
            style: TextStyle(
              fontSize: 12,
              color: Colors.white.withOpacity(0.8),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAnimalCards() {
    return Row(
      children: [
        Expanded(
          child: _buildAnimalCard(
            animal: 'Pollos',
            emoji: '🐔',
            cantidad: _pollosVendidos,
            monto: _totalPollos,
            color: const Color(0xFF3B82F6),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildAnimalCard(
            animal: 'Chanchos',
            emoji: '🐷',
            cantidad: _chanchosVendidos,
            monto: _totalChanchos,
            color: const Color(0xFFEC4899),
          ),
        ),
      ],
    );
  }

  Widget _buildAnimalCard({
    required String animal,
    required String emoji,
    required int cantidad,
    required double monto,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(emoji, style: const TextStyle(fontSize: 32)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  animal,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    cantidad.toString(),
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      color: color,
                    ),
                  ),
                  const Text(
                    'Vendidos',
                    style: TextStyle(
                      fontSize: 12,
                      color: Color(0xFF6B7280),
                    ),
                  ),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    'S/ ${monto.toStringAsFixed(2)}',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF111827),
                    ),
                  ),
                  const Text(
                    'Ingresos',
                    style: TextStyle(
                      fontSize: 12,
                      color: Color(0xFF6B7280),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildChartsSection() {
    return Column(
      children: [
        _buildBarChart(),
        const SizedBox(height: 16),
        _buildPieChart(),
      ],
    );
  }

  Widget _buildBarChart() {
    final data = _ventasPorFecha;
    if (data.isEmpty) {
      return _buildEmptyChart('Ventas por Fecha', 'No hay datos para mostrar');
    }

    final sortedDates = data.keys.toList()..sort();
    final lastDates = sortedDates.length > 7 
        ? sortedDates.sublist(sortedDates.length - 7) 
        : sortedDates;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.bar_chart, color: Color(0xFF2563EB), size: 22),
              SizedBox(width: 8),
              Text(
                'Ventas por Fecha',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF111827),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          SizedBox(
            height: 200,
            child: BarChart(
              BarChartData(
                alignment: BarChartAlignment.spaceAround,
                maxY: _getMaxY(data, lastDates),
                barTouchData: BarTouchData(
                  enabled: true,
                  touchTooltipData: BarTouchTooltipData(
                    getTooltipColor: (group) => Colors.blueGrey.shade800,
                    getTooltipItem: (group, groupIndex, rod, rodIndex) {
                      final fecha = lastDates[group.x.toInt()];
                      final tipo = rodIndex == 0 ? 'Pollos' : 'Chanchos';
                      return BarTooltipItem(
                        '$fecha\n$tipo: S/ ${rod.toY.toStringAsFixed(2)}',
                        const TextStyle(color: Colors.white, fontSize: 12),
                      );
                    },
                  ),
                ),
                titlesData: FlTitlesData(
                  show: true,
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      getTitlesWidget: (value, meta) {
                        if (value.toInt() >= lastDates.length) return const SizedBox();
                        final fecha = lastDates[value.toInt()];
                        final parts = fecha.split('-');
                        return Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(
                            '${parts[2]}/${parts[1]}',
                            style: const TextStyle(fontSize: 10, color: Color(0xFF6B7280)),
                          ),
                        );
                      },
                      reservedSize: 30,
                    ),
                  ),
                  leftTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 40,
                      getTitlesWidget: (value, meta) {
                        return Text(
                          'S/${value.toInt()}',
                          style: const TextStyle(fontSize: 10, color: Color(0xFF6B7280)),
                        );
                      },
                    ),
                  ),
                  topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                ),
                gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  horizontalInterval: _getMaxY(data, lastDates) / 4,
                  getDrawingHorizontalLine: (value) => FlLine(
                    color: Colors.grey.shade200,
                    strokeWidth: 1,
                  ),
                ),
                borderData: FlBorderData(show: false),
                barGroups: List.generate(lastDates.length, (index) {
                  final fecha = lastDates[index];
                  final pollos = data[fecha]?['Pollos'] ?? 0;
                  final chanchos = data[fecha]?['Chanchos'] ?? 0;
                  return BarChartGroupData(
                    x: index,
                    barRods: [
                      BarChartRodData(
                        toY: pollos,
                        color: const Color(0xFF3B82F6),
                        width: 12,
                        borderRadius: const BorderRadius.only(
                          topLeft: Radius.circular(4),
                          topRight: Radius.circular(4),
                        ),
                      ),
                      BarChartRodData(
                        toY: chanchos,
                        color: const Color(0xFFEC4899),
                        width: 12,
                        borderRadius: const BorderRadius.only(
                          topLeft: Radius.circular(4),
                          topRight: Radius.circular(4),
                        ),
                      ),
                    ],
                  );
                }),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _buildLegendItem('Pollos', const Color(0xFF3B82F6)),
              const SizedBox(width: 24),
              _buildLegendItem('Chanchos', const Color(0xFFEC4899)),
            ],
          ),
        ],
      ),
    );
  }

  double _getMaxY(Map<String, Map<String, double>> data, List<String> dates) {
    double max = 0;
    for (final fecha in dates) {
      final pollos = data[fecha]?['Pollos'] ?? 0;
      final chanchos = data[fecha]?['Chanchos'] ?? 0;
      if (pollos > max) max = pollos;
      if (chanchos > max) max = chanchos;
    }
    return max == 0 ? 100 : max * 1.2;
  }

  Widget _buildPieChart() {
    if (_totalPollos == 0 && _totalChanchos == 0) {
      return _buildEmptyChart('Distribución de Ventas', 'No hay datos para mostrar');
    }

    final total = _totalPollos + _totalChanchos;
    final pollosPct = total > 0 ? (_totalPollos / total * 100) : 0;
    final chanchosPct = total > 0 ? (_totalChanchos / total * 100) : 0;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.pie_chart, color: Color(0xFF10B981), size: 22),
              SizedBox(width: 8),
              Text(
                'Distribución de Ventas',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF111827),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          SizedBox(
            height: 200,
            child: Row(
              children: [
                Expanded(
                  flex: 3,
                  child: PieChart(
                    PieChartData(
                      sectionsSpace: 3,
                      centerSpaceRadius: 40,
                      sections: [
                        PieChartSectionData(
                          value: _totalPollos,
                          title: '${pollosPct.toStringAsFixed(0)}%',
                          color: const Color(0xFF3B82F6),
                          radius: 60,
                          titleStyle: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        PieChartSectionData(
                          value: _totalChanchos,
                          title: '${chanchosPct.toStringAsFixed(0)}%',
                          color: const Color(0xFFEC4899),
                          radius: 60,
                          titleStyle: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                Expanded(
                  flex: 2,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildPieLegendItem(
                        'Pollos',
                        const Color(0xFF3B82F6),
                        'S/ ${_totalPollos.toStringAsFixed(2)}',
                      ),
                      const SizedBox(height: 16),
                      _buildPieLegendItem(
                        'Chanchos',
                        const Color(0xFFEC4899),
                        'S/ ${_totalChanchos.toStringAsFixed(2)}',
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLegendItem(String label, Color color) {
    return Row(
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(3),
          ),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            color: Color(0xFF6B7280),
          ),
        ),
      ],
    );
  }

  Widget _buildPieLegendItem(String label, Color color, String value) {
    return Row(
      children: [
        Container(
          width: 14,
          height: 14,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(4),
          ),
        ),
        const SizedBox(width: 8),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: Color(0xFF374151),
              ),
            ),
            Text(
              value,
              style: const TextStyle(
                fontSize: 12,
                color: Color(0xFF6B7280),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildEmptyChart(String title, String message) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Color(0xFF111827),
            ),
          ),
          const SizedBox(height: 40),
          Icon(Icons.insert_chart_outlined, size: 48, color: Colors.grey.shade300),
          const SizedBox(height: 12),
          Text(
            message,
            style: TextStyle(color: Colors.grey.shade500),
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildRecentSalesSection() {
    final recentSales = _ventasRecientesPaginadas;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Título y contador
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: const [
                  Icon(Icons.history, color: Color(0xFF2563EB), size: 22),
                  SizedBox(width: 8),
                  Text(
                    'Ventas Recientes',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF111827),
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFDBEAFE),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '${_ventasFiltradas.length} registros',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1D4ED8),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Filtros por tipo de animal - DEBAJO del título
          Row(
            children: [
              _buildAnimalFilterButton(
                emoji: '🐔',
                label: 'Pollos',
                value: 'pollo',
                color: const Color(0xFF3B82F6),
              ),
              const SizedBox(width: 8),
              _buildAnimalFilterButton(
                emoji: '🐷',
                label: 'Chanchos',
                value: 'chancho',
                color: const Color(0xFFEC4899),
              ),
              const SizedBox(width: 8),
              _buildAnimalFilterButton(
                emoji: '📋',
                label: 'Todos',
                value: null,
                color: const Color(0xFF6B7280),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (recentSales.isEmpty)
            Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    Icon(Icons.inbox_outlined, size: 48, color: Colors.grey.shade300),
                    const SizedBox(height: 12),
                    Text(
                      _filtroAnimal != null 
                          ? 'No hay ventas de ${_filtroAnimal == 'pollo' ? 'pollos' : 'chanchos'}'
                          : 'No hay ventas registradas',
                      style: TextStyle(color: Colors.grey.shade500),
                    ),
                  ],
                ),
              ),
            )
          else ...[
            // Lista con scroll para máximo 10 elementos visibles
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 600), // ~10 items
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: recentSales.length,
                itemBuilder: (context, index) => _buildSaleItem(recentSales[index]),
              ),
            ),
            // Paginación
            if (_totalPaginas > 1) ...[
              const SizedBox(height: 16),
              _buildPaginationControls(),
            ],
          ],
        ],
      ),
    );
  }

  Widget _buildAnimalFilterButton({
    required String emoji,
    required String label,
    required String? value,
    required Color color,
  }) {
    final isSelected = _filtroAnimal == value;
    return GestureDetector(
      onTap: () {
        setState(() {
          _filtroAnimal = value;
          _paginaActual = 1; // Reset página al cambiar filtro
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: isSelected ? color.withOpacity(0.15) : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? color : Colors.grey.shade300,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(emoji, style: const TextStyle(fontSize: 14)),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                color: isSelected ? color : Colors.grey.shade600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPaginationControls() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        // Botón anterior
        IconButton(
          onPressed: _paginaActual > 1
              ? () => setState(() => _paginaActual--)
              : null,
          icon: Icon(
            Icons.chevron_left,
            color: _paginaActual > 1 ? const Color(0xFF2563EB) : Colors.grey.shade300,
          ),
        ),
        // Indicador de página
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: const Color(0xFFEFF6FF),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            'Página $_paginaActual de $_totalPaginas',
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: Color(0xFF1D4ED8),
            ),
          ),
        ),
        // Botón siguiente
        IconButton(
          onPressed: _paginaActual < _totalPaginas
              ? () => setState(() => _paginaActual++)
              : null,
          icon: Icon(
            Icons.chevron_right,
            color: _paginaActual < _totalPaginas ? const Color(0xFF2563EB) : Colors.grey.shade300,
          ),
        ),
      ],
    );
  }

  Widget _buildSaleItem(VentaAnimalModel venta) {
    final isPollo = (venta.animalName ?? '').toLowerCase().contains('pollo');
    final color = isPollo ? const Color(0xFF3B82F6) : const Color(0xFFEC4899);
    final emoji = isPollo ? '🐔' : '🐷';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(emoji, style: const TextStyle(fontSize: 24)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${venta.cantidad.toInt()} ${venta.animalName ?? "Animal"}',
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF111827),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${venta.loteCodigo ?? venta.loteId ?? "Sin lote"} • ${venta.fecha}',
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF6B7280),
                  ),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                'S/ ${venta.total.toStringAsFixed(2)}',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
              Text(
                'S/ ${venta.precioUnit.toStringAsFixed(2)} c/u',
                style: const TextStyle(
                  fontSize: 11,
                  color: Color(0xFF9CA3AF),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Color(0xFFDC2626)),
            const SizedBox(height: 16),
            const Text(
              'Error al cargar datos',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Color(0xFF111827),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _error ?? 'Error desconocido',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Color(0xFF6B7280)),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => _cargarVentas(),
              icon: const Icon(Icons.refresh),
              label: const Text('Reintentar'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2563EB),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
