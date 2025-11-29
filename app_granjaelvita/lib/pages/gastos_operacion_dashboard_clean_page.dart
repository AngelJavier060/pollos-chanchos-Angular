import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

import 'gasto_operacion_form_page.dart';

class GastosOperacionDashboardPage extends StatelessWidget {
  const GastosOperacionDashboardPage({super.key});

  List<_GastoRegistro> get _registrosDemo => const [
        _GastoRegistro(
          fecha: '2025-11-09',
          lote: '00003',
          gasto: 'Energía eléctrica',
          unidad: 'kWh',
          cantidad: 130,
          costoUnit: 0.16,
          total: 20.8,
        ),
        _GastoRegistro(
          fecha: '2025-11-09',
          lote: '00002',
          gasto: 'Energía eléctrica',
          unidad: 'kWh',
          cantidad: 110,
          costoUnit: 0.15,
          total: 16.5,
        ),
        _GastoRegistro(
          fecha: '2025-11-09',
          lote: '03001',
          gasto: 'Energía eléctrica',
          unidad: 'kWh',
          cantidad: 150,
          costoUnit: 0.15,
          total: 22.5,
        ),
        _GastoRegistro(
          fecha: '2025-11-09',
          lote: '00001',
          gasto: 'Energía eléctrica',
          unidad: 'kWh',
          cantidad: 95,
          costoUnit: 0.14,
          total: 13.3,
        ),
      ];

  @override
  Widget build(BuildContext context) {
    final registros = _registrosDemo;
    final totalGasto = registros.fold<double>(0, (s, r) => s + r.total);
    final totalConsumo = registros.fold<double>(0, (s, r) => s + r.cantidad);
    final promedioGasto =
        registros.isEmpty ? 0.0 : totalGasto / registros.length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Gastos de Operación'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: 'Nuevo registro',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const GastoOperacionFormPage(),
                ),
              );
            },
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => const GastoOperacionFormPage(),
            ),
          );
        },
        icon: const Icon(Icons.add),
        label: const Text('Ingresar nuevo gasto'),
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFFF9FAFB), Color(0xFFE5E7EB)],
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
              _buildKpis(totalGasto, totalConsumo, promedioGasto, registros.length),
              const SizedBox(height: 16),
              _buildCharts(registros),
              const SizedBox(height: 16),
              _buildTabla(registros, totalGasto, totalConsumo),
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
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          Text(
            'Dashboard de Registros',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
          ),
          SizedBox(height: 4),
          Text(
            'Análisis de gastos de energía eléctrica por lote',
            style: TextStyle(color: Colors.grey),
          ),
        ],
      ),
    );
  }

  Widget _buildKpis(double totalGasto, double totalConsumo,
      double promedioGasto, int lotes) {
    final kpis = [
      _KpiInfo(
        titulo: 'TOTAL',
        valor: 'S/ ${totalGasto.toStringAsFixed(2)}',
        subtitulo: 'Gasto total',
        color1: const Color(0xFF10B981),
        color2: const Color(0xFF059669),
        icono: Icons.attach_money,
      ),
      _KpiInfo(
        titulo: 'CONSUMO',
        valor: totalConsumo.toStringAsFixed(0),
        subtitulo: 'kWh totales',
        color1: const Color(0xFF06B6D4),
        color2: const Color(0xFF0EA5E9),
        icono: Icons.bolt,
      ),
      _KpiInfo(
        titulo: 'PROMEDIO',
        valor: 'S/ ${promedioGasto.toStringAsFixed(2)}',
        subtitulo: 'Por lote',
        color1: const Color(0xFF8B5CF6),
        color2: const Color(0xFF6366F1),
        icono: Icons.trending_up,
      ),
      _KpiInfo(
        titulo: 'LOTES',
        valor: lotes.toString(),
        subtitulo: 'Registrados',
        color1: const Color(0xFFF59E0B),
        color2: const Color(0xFFD97706),
        icono: Icons.calendar_today,
      ),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        final isSmall = constraints.maxWidth < 600;
        if (isSmall) {
          return Column(
            children: [
              for (final k in kpis) ...[
                _KpiCard(info: k),
                const SizedBox(height: 12),
              ],
            ],
          );
        }
        return Row(
          children: [
            for (final k in kpis)
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 6),
                  child: _KpiCard(info: k),
                ),
              ),
          ],
        );
      },
    );
  }

  Widget _buildCharts(List<_GastoRegistro> registros) {
    if (registros.isEmpty) {
      return const SizedBox.shrink();
    }

    final barGroups = <BarChartGroupData>[];
    double maxTotal = 0;
    double maxCantidad = 0;

    for (var i = 0; i < registros.length; i++) {
      final r = registros[i];
      if (r.total > maxTotal) maxTotal = r.total;
      if (r.cantidad > maxCantidad) maxCantidad = r.cantidad;
      barGroups.add(
        BarChartGroupData(
          x: i,
          barRods: [
            BarChartRodData(
              toY: r.total,
              color: const Color(0xFF10B981),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(8),
                topRight: Radius.circular(8),
              ),
              width: 18,
            ),
          ],
        ),
      );
    }

    final lineSpots = <FlSpot>[];
    for (var i = 0; i < registros.length; i++) {
      final r = registros[i];
      lineSpots.add(FlSpot(i.toDouble(), r.cantidad));
    }

    final maxTotalY = maxTotal == 0 ? 1.0 : maxTotal * 1.2;
    final maxCantidadY = maxCantidad == 0 ? 1.0 : maxCantidad * 1.2;

    final barCard = _CardDashboard(
      titulo: 'Gasto Total por Lote',
      child: SizedBox(
        height: 260,
        child: BarChart(
          BarChartData(
            minY: 0,
            maxY: maxTotalY,
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
                  reservedSize: 32,
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
                    if (index < 0 || index >= registros.length) {
                      return const SizedBox.shrink();
                    }
                    return Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        registros[index].lote,
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

    final lineCard = _CardDashboard(
      titulo: 'Consumo de Energía por Lote',
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
                  reservedSize: 32,
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
                    if (index < 0 || index >= registros.length) {
                      return const SizedBox.shrink();
                    }
                    return Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        registros[index].lote,
                        style: const TextStyle(fontSize: 11),
                      ),
                    );
                  },
                ),
              ),
            ),
            lineBarsData: [
              LineChartBarData(
                spots: lineSpots,
                isCurved: true,
                color: const Color(0xFF8B5CF6),
                barWidth: 3,
                dotData: FlDotData(show: true),
                belowBarData: BarAreaData(
                  show: true,
                  color: const Color(0xFF8B5CF6).withOpacity(0.15),
                ),
              ),
            ],
          ),
        ),
      ),
    );

    final total = registros.fold<double>(0, (s, r) => s + r.total);
    final colors = [
      const Color(0xFF10B981),
      const Color(0xFF06B6D4),
      const Color(0xFF8B5CF6),
      const Color(0xFFF59E0B),
    ];
    final pieSections = <PieChartSectionData>[];
    for (var i = 0; i < registros.length; i++) {
      final r = registros[i];
      final value = r.total;
      final percent = total == 0 ? 0 : (value / total * 100);
      pieSections.add(
        PieChartSectionData(
          color: colors[i % colors.length],
          value: value,
          radius: 60,
          title: '${r.lote}\n${percent.toStringAsFixed(0)}%',
          titleStyle: const TextStyle(
            color: Colors.white,
            fontSize: 12,
            fontWeight: FontWeight.bold,
          ),
        ),
      );
    }

    final pieCard = _CardDashboard(
      titulo: 'Distribución del Costo por Lote',
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

    return Column(
      children: [
        barCard,
        const SizedBox(height: 16),
        lineCard,
        const SizedBox(height: 16),
        pieCard,
      ],
    );
  }

  Widget _buildTabla(
      List<_GastoRegistro> registros, double totalGasto, double totalConsumo) {
    return _CardDashboard(
      titulo: 'Registros Detallados',
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: DataTable(
          columns: const [
            DataColumn(label: Text('Fecha')),
            DataColumn(label: Text('Lote')),
            DataColumn(label: Text('Gasto')),
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
                  DataCell(Text(r.lote)),
                  DataCell(Text(r.gasto)),
                  DataCell(Text(r.unidad)),
                  DataCell(Text(r.cantidad.toStringAsFixed(0))),
                  DataCell(Text('S/ ${r.costoUnit.toStringAsFixed(2)}')),
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
                DataCell(Text(totalConsumo.toStringAsFixed(0),
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

class _GastoRegistro {
  final String fecha;
  final String lote;
  final String gasto;
  final String unidad;
  final double cantidad;
  final double costoUnit;
  final double total;

  const _GastoRegistro({
    required this.fecha,
    required this.lote,
    required this.gasto,
    required this.unidad,
    required this.cantidad,
    required this.costoUnit,
    required this.total,
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
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.12),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Icon(info.icono, color: Colors.white, size: 28),
              Text(
                info.titulo,
                style: const TextStyle(
                  color: Colors.white70,
                  fontSize: 12,
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

  const _CardDashboard({required this.titulo, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            titulo,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}
