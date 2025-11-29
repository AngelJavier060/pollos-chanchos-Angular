import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

import '../services/logistica_service.dart';
import 'logistica_form_page.dart';

class LogisticaDashboardPage extends StatefulWidget {
  const LogisticaDashboardPage({super.key});

  @override
  State<LogisticaDashboardPage> createState() => _LogisticaDashboardPageState();
}

class _LogisticaDashboardPageState extends State<LogisticaDashboardPage> {
  List<RegistroLogistica> _registros = [];
  bool _cargando = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _cargarDatos();
  }

  Future<void> _cargarDatos() async {
    setState(() {
      _cargando = true;
      _error = null;
    });
    try {
      final list = await LogisticaServiceMobile.listar();
      if (!mounted) return;
      setState(() {
        _registros = list;
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

  Future<void> _abrirFormulario() async {
    final result = await Navigator.push<bool>(
      context,
      MaterialPageRoute(builder: (_) => const LogisticaFormPage()),
    );
    if (result == true) {
      _cargarDatos();
    }
  }

  @override
  Widget build(BuildContext context) {
    final registros = _registros;

    final totalGasto =
        registros.fold<double>(0, (sum, r) => sum + r.total);
    final totalUnidades =
        registros.fold<double>(0, (sum, r) => sum + r.cantidadTransportada);
    final totalRegistros = registros.length;
    final costoPromedio =
        totalRegistros == 0 ? 0.0 : totalGasto / totalRegistros;

    final costoPorLote = registros
        .map((r) => _CostoPorLote(lote: r.loteCodigo ?? 'Sin lote', costo: r.total))
        .toList();

    final distribucionTransporte = <_DistribucionTransporte>[];
    for (final r in registros) {
      final index = distribucionTransporte
          .indexWhere((e) => e.nombre == r.tipoTransporte);
      if (index >= 0) {
        final actual = distribucionTransporte[index];
        distribucionTransporte[index] = _DistribucionTransporte(
          nombre: actual.nombre,
          valor: actual.valor + r.total,
        );
      } else {
        distribucionTransporte.add(
          _DistribucionTransporte(nombre: r.tipoTransporte, valor: r.total),
        );
      }
    }

    final cantidadesPorLote = registros
        .map((r) => _CantidadPorLote(lote: r.loteCodigo ?? 'Sin lote', cantidad: r.cantidadTransportada))
        .toList();

    if (_cargando) {
      return Scaffold(
        appBar: AppBar(title: const Text('Movilización y Logística')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Movilización y Logística'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Actualizar',
            onPressed: _cargarDatos,
          ),
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: 'Ingresar datos',
            onPressed: _abrirFormulario,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _abrirFormulario,
        icon: const Icon(Icons.add),
        label: const Text('Ingresar datos'),
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFFFEF3C7), Color(0xFFFFFBEB)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildHeader(),
              const SizedBox(height: 16),
              _buildKpis(totalGasto, totalUnidades, costoPromedio,
                  totalRegistros),
              const SizedBox(height: 16),
              _buildChartsRow1(costoPorLote, distribucionTransporte),
              const SizedBox(height: 16),
              _buildLineChart(cantidadesPorLote),
              const SizedBox(height: 16),
              _buildTabla(registros, totalUnidades, totalGasto),
              const SizedBox(height: 80),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: const [
          Icon(Icons.local_shipping,
              size: 40, color: Color(0xFFF59E0B)),
          SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Movilización y Logística',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF111827),
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  'Control de transporte y movimiento de animales',
                  style: TextStyle(
                    fontSize: 13,
                    color: Color(0xFF6B7280),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildKpis(double totalGasto, double totalUnidades,
      double costoPromedio, int totalRegistros) {
    final kpis = [
      _KpiInfo(
        titulo: 'TOTAL',
        valor: 'S/ ${totalGasto.toStringAsFixed(2)}',
        subtitulo: 'Gasto total',
        color1: const Color(0xFFF59E0B),
        color2: const Color(0xFFEA580C),
        icono: Icons.attach_money,
      ),
      _KpiInfo(
        titulo: 'UNIDADES',
        valor: totalUnidades.toStringAsFixed(0),
        subtitulo: 'Especies transportadas',
        color1: const Color(0xFFF97316),
        color2: const Color(0xFFEA580C),
        icono: Icons.inventory_2,
      ),
      _KpiInfo(
        titulo: 'PROMEDIO',
        valor: 'S/ ${costoPromedio.toStringAsFixed(2)}',
        subtitulo: 'Por transporte',
        color1: const Color(0xFFEAB308),
        color2: const Color(0xFFFACC15),
        icono: Icons.trending_up,
      ),
      _KpiInfo(
        titulo: 'VIAJES',
        valor: totalRegistros.toString(),
        subtitulo: 'Realizados',
        color1: const Color(0xFFEF4444),
        color2: const Color(0xFFDC2626),
        icono: Icons.local_shipping,
      ),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        final isSmall = constraints.maxWidth < 700;
        if (isSmall) {
          return Column(
            children: [
              for (final k in kpis) ...[
                _KpiCard(info: k),
                const SizedBox(height: 10),
              ],
            ],
          );
        }
        return Row(
          children: [
            for (final k in kpis)
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: _KpiCard(info: k),
                ),
              ),
          ],
        );
      },
    );
  }

  Widget _buildChartsRow1(
    List<_CostoPorLote> costoPorLote,
    List<_DistribucionTransporte> distribucionTransporte,
  ) {
    if (costoPorLote.isEmpty) return const SizedBox.shrink();

    final barGroups = <BarChartGroupData>[];
    double maxCosto = 0;
    for (var i = 0; i < costoPorLote.length; i++) {
      final r = costoPorLote[i];
      if (r.costo > maxCosto) maxCosto = r.costo;
      barGroups.add(
        BarChartGroupData(
          x: i,
          barRods: [
            BarChartRodData(
              toY: r.costo,
              color: const Color(0xFFF59E0B),
              width: 18,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(8),
                topRight: Radius.circular(8),
              ),
            ),
          ],
        ),
      );
    }
    final maxCostoY = maxCosto == 0 ? 1.0 : maxCosto * 1.2;

    final total = distribucionTransporte
        .fold<double>(0, (sum, e) => sum + e.valor);
    const colors = [
      Color(0xFFF59E0B),
      Color(0xFF10B981),
      Color(0xFF3B82F6),
      Color(0xFFEF4444),
      Color(0xFF8B5CF6),
    ];
    final pieSections = <PieChartSectionData>[];
    for (var i = 0; i < distribucionTransporte.length; i++) {
      final d = distribucionTransporte[i];
      final percent = total == 0 ? 0 : d.valor / total * 100;
      pieSections.add(
        PieChartSectionData(
          color: colors[i % colors.length],
          value: d.valor,
          radius: 60,
          title: '${d.nombre}\n${percent.toStringAsFixed(0)}%',
          titleStyle: const TextStyle(
            color: Colors.white,
            fontSize: 11,
            fontWeight: FontWeight.bold,
          ),
        ),
      );
    }

    final barCard = _CardDashboard(
      titulo: 'Costo por Lote',
      accentColor: const Color(0xFFF59E0B),
      icon: Icons.bar_chart_rounded,
      child: SizedBox(
        height: 260,
        child: BarChart(
          BarChartData(
            minY: 0,
            maxY: maxCostoY,
            barGroups: barGroups,
            gridData: FlGridData(
              show: true,
              drawVerticalLine: false,
              getDrawingHorizontalLine: (value) => FlLine(
                color: const Color(0xFFE5E7EB),
                strokeWidth: 1,
              ),
            ),
            borderData: FlBorderData(
              show: true,
              border: const Border(
                left: BorderSide(color: Color(0xFFE5E7EB)),
                bottom: BorderSide(color: Color(0xFFE5E7EB)),
              ),
            ),
            titlesData: FlTitlesData(
              rightTitles: const AxisTitles(
                sideTitles: SideTitles(showTitles: false),
              ),
              topTitles: const AxisTitles(
                sideTitles: SideTitles(showTitles: false),
              ),
              leftTitles: AxisTitles(
                sideTitles: SideTitles(
                  showTitles: true,
                  reservedSize: 38,
                  getTitlesWidget: (value, meta) => Text(
                    value.toStringAsFixed(0),
                    style: const TextStyle(fontSize: 10),
                  ),
                ),
              ),
              bottomTitles: AxisTitles(
                sideTitles: SideTitles(
                  showTitles: true,
                  getTitlesWidget: (value, meta) {
                    final index = value.toInt();
                    if (index < 0 || index >= costoPorLote.length) {
                      return const SizedBox.shrink();
                    }
                    return Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        costoPorLote[index].lote,
                        style: const TextStyle(fontSize: 11),
                      ),
                    );
                  },
                ),
              ),
            ),
          ),
        ),
      ),
    );

    final pieCard = _CardDashboard(
      titulo: 'Distribución por Tipo de Transporte',
      accentColor: const Color(0xFF3B82F6),
      icon: Icons.pie_chart_rounded,
      child: SizedBox(
        height: 260,
        child: PieChart(
          PieChartData(
            sections: pieSections,
            sectionsSpace: 2,
            centerSpaceRadius: 40,
          ),
        ),
      ),
    );

    return LayoutBuilder(
      builder: (context, constraints) {
        final isSmall = constraints.maxWidth < 800;
        if (isSmall) {
          return Column(
            children: [
              barCard,
              const SizedBox(height: 16),
              pieCard,
            ],
          );
        }
        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: barCard),
            const SizedBox(width: 16),
            Expanded(child: pieCard),
          ],
        );
      },
    );
  }

  Widget _buildLineChart(List<_CantidadPorLote> cantidadesPorLote) {
    if (cantidadesPorLote.isEmpty) return const SizedBox.shrink();

    final spots = <FlSpot>[];
    double maxCantidad = 0;
    for (var i = 0; i < cantidadesPorLote.length; i++) {
      final r = cantidadesPorLote[i];
      if (r.cantidad > maxCantidad) maxCantidad = r.cantidad;
      spots.add(FlSpot(i.toDouble(), r.cantidad));
    }
    final maxCantidadY = maxCantidad == 0 ? 1.0 : maxCantidad * 1.2;

    return _CardDashboard(
      titulo: 'Cantidad Transportada por Lote',
      accentColor: const Color(0xFF10B981),
      icon: Icons.show_chart_rounded,
      child: SizedBox(
        height: 260,
        child: LineChart(
          LineChartData(
            minY: 0,
            maxY: maxCantidadY,
            gridData: FlGridData(
              show: true,
              drawVerticalLine: false,
              getDrawingHorizontalLine: (value) => FlLine(
                color: const Color(0xFFE5E7EB),
                strokeWidth: 1,
              ),
            ),
            borderData: FlBorderData(
              show: true,
              border: const Border(
                left: BorderSide(color: Color(0xFFE5E7EB)),
                bottom: BorderSide(color: Color(0xFFE5E7EB)),
              ),
            ),
            titlesData: FlTitlesData(
              rightTitles: const AxisTitles(
                sideTitles: SideTitles(showTitles: false),
              ),
              topTitles: const AxisTitles(
                sideTitles: SideTitles(showTitles: false),
              ),
              leftTitles: AxisTitles(
                sideTitles: SideTitles(
                  showTitles: true,
                  reservedSize: 38,
                  getTitlesWidget: (value, meta) => Text(
                    value.toStringAsFixed(0),
                    style: const TextStyle(fontSize: 10),
                  ),
                ),
              ),
              bottomTitles: AxisTitles(
                sideTitles: SideTitles(
                  showTitles: true,
                  getTitlesWidget: (value, meta) {
                    final index = value.toInt();
                    if (index < 0 || index >= cantidadesPorLote.length) {
                      return const SizedBox.shrink();
                    }
                    return Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        cantidadesPorLote[index].lote,
                        style: const TextStyle(fontSize: 11),
                      ),
                    );
                  },
                ),
              ),
            ),
            lineBarsData: [
              LineChartBarData(
                spots: spots,
                isCurved: true,
                color: const Color(0xFFF97316),
                barWidth: 3,
                dotData: FlDotData(show: true),
                belowBarData: BarAreaData(
                  show: true,
                  color: const Color(0xFFF97316).withValues(alpha: 0.15),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTabla(List<RegistroLogistica> registros,
      double totalUnidades, double totalGasto) {
    if (registros.isEmpty) {
      return _CardDashboard(
        titulo: 'Registros de Transporte',
        accentColor: const Color(0xFF8B5CF6),
        icon: Icons.table_chart_rounded,
        child: const Center(
          child: Padding(
            padding: EdgeInsets.all(32),
            child: Column(
              children: [
                Icon(Icons.local_shipping_outlined, size: 48, color: Colors.grey),
                SizedBox(height: 16),
                Text('No hay registros de logística', style: TextStyle(color: Colors.grey)),
                Text('Presiona + para agregar uno', style: TextStyle(color: Colors.grey, fontSize: 12)),
              ],
            ),
          ),
        ),
      );
    }
    return _CardDashboard(
      titulo: 'Registros de Transporte',
      accentColor: const Color(0xFF8B5CF6),
      icon: Icons.table_chart_rounded,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: DataTable(
          columns: const [
            DataColumn(label: Text('Fecha')),
            DataColumn(label: Text('Lote')),
            DataColumn(label: Text('Transporte')),
            DataColumn(label: Text('Concepto')),
            DataColumn(label: Text('Unidad')),
            DataColumn(label: Text('Cantidad'), numeric: true),
            DataColumn(label: Text('Costo Unit.'), numeric: true),
            DataColumn(label: Text('Total'), numeric: true),
          ],
          rows: [
            for (final r in registros)
              DataRow(
                cells: [
                  DataCell(Text(r.fecha)),
                  DataCell(Text(r.loteCodigo ?? '-')),
                  DataCell(Text(r.tipoTransporte)),
                  DataCell(Text(r.concepto)),
                  DataCell(Text(r.unidad)),
                  DataCell(Text(r.cantidadTransportada.toStringAsFixed(0))),
                  DataCell(Text('S/ ${r.costoUnitario.toStringAsFixed(2)}')),
                  DataCell(Text('S/ ${r.total.toStringAsFixed(2)}')),
                ],
              ),
            DataRow(
              cells: [
                const DataCell(Text('TOTAL',
                    style: TextStyle(fontWeight: FontWeight.bold))),
                const DataCell(Text('')),
                const DataCell(Text('')),
                const DataCell(Text('')),
                const DataCell(Text('')),
                DataCell(Text(totalUnidades.toStringAsFixed(0),
                    style: const TextStyle(fontWeight: FontWeight.bold))),
                const DataCell(Text('')),
                DataCell(Text('S/ ${totalGasto.toStringAsFixed(2)}',
                    style: const TextStyle(fontWeight: FontWeight.bold))),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _CostoPorLote {
  final String lote;
  final double costo;

  const _CostoPorLote({
    required this.lote,
    required this.costo,
  });
}

class _DistribucionTransporte {
  final String nombre;
  final double valor;

  const _DistribucionTransporte({
    required this.nombre,
    required this.valor,
  });
}

class _CantidadPorLote {
  final String lote;
  final double cantidad;

  const _CantidadPorLote({
    required this.lote,
    required this.cantidad,
  });
}

class _KpiInfo {
  final String titulo;
  final String valor;
  final String subtitulo;
  final Color color1;
  final Color color2;
  final IconData icono;

  const _KpiInfo({
    required this.titulo,
    required this.valor,
    required this.subtitulo,
    required this.color1,
    required this.color2,
    required this.icono,
  });
}

class _KpiCard extends StatelessWidget {
  final _KpiInfo info;

  const _KpiCard({required this.info});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: [info.color1, info.color2]),
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.12),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Icon(info.icono, color: Colors.white, size: 26),
              Text(
                info.titulo,
                style: const TextStyle(
                  color: Colors.white70,
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            info.valor,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            info.subtitulo,
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}

class _CardDashboard extends StatelessWidget {
  final String titulo;
  final Widget child;
  final Color? accentColor;
  final IconData? icon;

  const _CardDashboard({
    required this.titulo,
    required this.child,
    this.accentColor,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final color = accentColor ?? const Color(0xFFF97316);
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 15,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header con gradiente
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [color.withValues(alpha: 0.1), Colors.white],
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
              ),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(20),
                topRight: Radius.circular(20),
              ),
              border: Border(
                bottom: BorderSide(color: color.withValues(alpha: 0.2), width: 1),
              ),
            ),
            child: Row(
              children: [
                if (icon != null) ...[
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(icon, color: color, size: 22),
                  ),
                  const SizedBox(width: 12),
                ],
                Expanded(
                  child: Text(
                    titulo,
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.bold,
                      color: color.withValues(alpha: 0.9) == color ? const Color(0xFF111827) : color,
                    ),
                  ),
                ),
              ],
            ),
          ),
          // Contenido
          Padding(
            padding: const EdgeInsets.all(16),
            child: child,
          ),
        ],
      ),
    );
  }
}
