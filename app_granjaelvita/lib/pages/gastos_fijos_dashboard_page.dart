import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

import 'costos_fijos_form_page.dart';

class GastosFijosDashboardPage extends StatelessWidget {
  const GastosFijosDashboardPage({super.key});

  List<_RegistroGastoFijo> get _registrosDemo => const [
        _RegistroGastoFijo(
          fecha: '2025.11.9',
          lote: '03001',
          nombre: 'Pintura',
          monto: 2,
          periodo: 'Semestral',
          metodo: 'Por galpones',
        ),
        _RegistroGastoFijo(
          fecha: '2025.11.9',
          lote: '00002',
          nombre: 'Pintura',
          monto: 2,
          periodo: 'Semestral',
          metodo: 'Por galpones',
        ),
        _RegistroGastoFijo(
          fecha: '2025.11.9',
          lote: '00001',
          nombre: 'Pintura',
          monto: 2,
          periodo: 'Semestral',
          metodo: 'Por galpones',
        ),
        _RegistroGastoFijo(
          fecha: '2025.11.9',
          lote: '00003',
          nombre: 'Pintura',
          monto: 2,
          periodo: 'Semestral',
          metodo: 'Por galpones',
        ),
      ];

  @override
  Widget build(BuildContext context) {
    final registros = _registrosDemo;

    final totalGasto =
        registros.fold<double>(0, (sum, r) => sum + r.monto);
    final totalRegistros = registros.length;
    final gastoPromedio =
        totalRegistros == 0 ? 0.0 : totalGasto / totalRegistros;
    final lotesConGasto = registros.map((r) => r.lote).toSet().length;

    final gastoPorLote = registros
        .map((r) => _GastoPorLote(lote: r.lote, monto: r.monto))
        .toList();

    final distribucionPorPeriodo = <_DistribucionValor>[];
    for (final r in registros) {
      final index = distribucionPorPeriodo
          .indexWhere((e) => e.nombre == r.periodo);
      if (index >= 0) {
        final actual = distribucionPorPeriodo[index];
        distribucionPorPeriodo[index] = _DistribucionValor(
          nombre: actual.nombre,
          valor: actual.valor + r.monto,
        );
      } else {
        distribucionPorPeriodo.add(
          _DistribucionValor(nombre: r.periodo, valor: r.monto),
        );
      }
    }

    final distribucionPorMetodo = <_DistribucionValor>[];
    for (final r in registros) {
      final index = distribucionPorMetodo
          .indexWhere((e) => e.nombre == r.metodo);
      if (index >= 0) {
        final actual = distribucionPorMetodo[index];
        distribucionPorMetodo[index] = _DistribucionValor(
          nombre: actual.nombre,
          valor: actual.valor + r.monto,
        );
      } else {
        distribucionPorMetodo.add(
          _DistribucionValor(nombre: r.metodo, valor: r.monto),
        );
      }
    }

    final resumenPorNombre = <_ResumenPorNombre>[];
    for (final r in registros) {
      final index =
          resumenPorNombre.indexWhere((e) => e.nombre == r.nombre);
      if (index >= 0) {
        final actual = resumenPorNombre[index];
        resumenPorNombre[index] = _ResumenPorNombre(
          nombre: actual.nombre,
          total: actual.total + r.monto,
          count: actual.count + 1,
        );
      } else {
        resumenPorNombre.add(
          _ResumenPorNombre(nombre: r.nombre, total: r.monto, count: 1),
        );
      }
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Gastos Fijos'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: 'Ingresar datos',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const CostosFijosFormPage(),
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
              builder: (_) => const CostosFijosFormPage(),
            ),
          );
        },
        icon: const Icon(Icons.add),
        label: const Text('Ingresar datos'),
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFFEEF2FF), Color(0xFFFDF2FF)],
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
              _buildKpis(totalGasto, totalRegistros, gastoPromedio,
                  lotesConGasto),
              const SizedBox(height: 16),
              _buildChartsRow1(gastoPorLote, distribucionPorPeriodo),
              const SizedBox(height: 16),
              _buildChartsRow2(gastoPorLote, distribucionPorMetodo),
              const SizedBox(height: 16),
              _buildResumenPorNombre(resumenPorNombre),
              const SizedBox(height: 16),
              _buildTabla(registros, totalGasto),
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
          Icon(Icons.receipt_long,
              size: 40, color: Color(0xFF4F46E5)),
          SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Gastos Fijos',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF111827),
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  'Control de gastos recurrentes y mantenimiento',
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

  Widget _buildKpis(double totalGasto, int totalRegistros,
      double gastoPromedio, int lotesConGasto) {
    final kpis = [
      _KpiInfo(
        titulo: 'TOTAL',
        valor: 'S/ ${totalGasto.toStringAsFixed(2)}',
        subtitulo: 'Gastos fijos totales',
        color1: const Color(0xFF4F46E5),
        color2: const Color(0xFF4338CA),
        icono: Icons.attach_money,
      ),
      _KpiInfo(
        titulo: 'REGISTROS',
        valor: totalRegistros.toString(),
        subtitulo: 'Total de gastos',
        color1: const Color(0xFF8B5CF6),
        color2: const Color(0xFF7C3AED),
        icono: Icons.receipt_long,
      ),
      _KpiInfo(
        titulo: 'PROMEDIO',
        valor: 'S/ ${gastoPromedio.toStringAsFixed(2)}',
        subtitulo: 'Por registro',
        color1: const Color(0xFFEC4899),
        color2: const Color(0xFFDB2777),
        icono: Icons.trending_up,
      ),
      _KpiInfo(
        titulo: 'LOTES',
        valor: lotesConGasto.toString(),
        subtitulo: 'Con gastos',
        color1: const Color(0xFFF43F5E),
        color2: const Color(0xFFBE123C),
        icono: Icons.description,
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
    List<_GastoPorLote> gastoPorLote,
    List<_DistribucionValor> distribucionPorPeriodo,
  ) {
    if (gastoPorLote.isEmpty) return const SizedBox.shrink();

    final barGroups = <BarChartGroupData>[];
    double maxMonto = 0;
    for (var i = 0; i < gastoPorLote.length; i++) {
      final r = gastoPorLote[i];
      if (r.monto > maxMonto) maxMonto = r.monto;
      barGroups.add(
        BarChartGroupData(
          x: i,
          barRods: [
            BarChartRodData(
              toY: r.monto,
              color: const Color(0xFF6366F1),
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
    final maxMontoY = maxMonto == 0 ? 1.0 : maxMonto * 1.4;

    final totalPeriodo =
        distribucionPorPeriodo.fold<double>(0, (s, e) => s + e.valor);
    const colors = [
      Color(0xFF6366F1),
      Color(0xFF8B5CF6),
      Color(0xFFEC4899),
      Color(0xFFF43F5E),
      Color(0xFFF59E0B),
      Color(0xFF10B981),
    ];
    final pieSections = <PieChartSectionData>[];
    for (var i = 0; i < distribucionPorPeriodo.length; i++) {
      final d = distribucionPorPeriodo[i];
      final percent =
          totalPeriodo == 0 ? 0 : d.valor / totalPeriodo * 100;
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
      titulo: 'Gasto por Lote',
      child: SizedBox(
        height: 260,
        child: BarChart(
          BarChartData(
            minY: 0,
            maxY: maxMontoY,
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
                    if (index < 0 || index >= gastoPorLote.length) {
                      return const SizedBox.shrink();
                    }
                    return Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        gastoPorLote[index].lote,
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
      titulo: 'Distribución por Periodo',
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

  Widget _buildChartsRow2(
    List<_GastoPorLote> gastoPorLote,
    List<_DistribucionValor> distribucionPorMetodo,
  ) {
    if (gastoPorLote.isEmpty) return const SizedBox.shrink();

    final spots = <FlSpot>[];
    double maxMonto = 0;
    for (var i = 0; i < gastoPorLote.length; i++) {
      final r = gastoPorLote[i];
      if (r.monto > maxMonto) maxMonto = r.monto;
      spots.add(FlSpot(i.toDouble(), r.monto));
    }
    final maxMontoY = maxMonto == 0 ? 1.0 : maxMonto * 1.4;

    final totalMetodo =
        distribucionPorMetodo.fold<double>(0, (s, e) => s + e.valor);
    const colors = [
      Color(0xFF6366F1),
      Color(0xFF8B5CF6),
      Color(0xFFEC4899),
      Color(0xFFF43F5E),
      Color(0xFFF59E0B),
      Color(0xFF10B981),
    ];
    final pieSections = <PieChartSectionData>[];
    for (var i = 0; i < distribucionPorMetodo.length; i++) {
      final d = distribucionPorMetodo[i];
      final percent =
          totalMetodo == 0 ? 0 : d.valor / totalMetodo * 100;
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

    final areaCard = _CardDashboard(
      titulo: 'Tendencia de Gastos',
      child: SizedBox(
        height: 260,
        child: LineChart(
          LineChartData(
            minY: 0,
            maxY: maxMontoY,
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
                    if (index < 0 || index >= gastoPorLote.length) {
                      return const SizedBox.shrink();
                    }
                    return Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        gastoPorLote[index].lote,
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
                color: const Color(0xFF8B5CF6),
                barWidth: 3,
                dotData: FlDotData(show: true),
                belowBarData: BarAreaData(
                  show: true,
                  color: const Color(0xFF8B5CF6).withOpacity(0.35),
                ),
              ),
            ],
          ),
        ),
      ),
    );

    final pieCard = _CardDashboard(
      titulo: 'Distribución por Método',
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
              areaCard,
              const SizedBox(height: 16),
              pieCard,
            ],
          );
        }
        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: areaCard),
            const SizedBox(width: 16),
            Expanded(child: pieCard),
          ],
        );
      },
    );
  }

  Widget _buildResumenPorNombre(List<_ResumenPorNombre> resumen) {
    if (resumen.isEmpty) return const SizedBox.shrink();

    return _CardDashboard(
      titulo: 'Resumen por Tipo de Gasto',
      child: LayoutBuilder(
        builder: (context, constraints) {
          final crossAxisCount = constraints.maxWidth > 1000
              ? 4
              : constraints.maxWidth > 700
                  ? 3
                  : constraints.maxWidth > 500
                      ? 2
                      : 1;
          return GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: crossAxisCount,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.4,
            ),
            itemCount: resumen.length,
            itemBuilder: (context, index) {
              final r = resumen[index];
              final promedio = r.count == 0 ? 0.0 : r.total / r.count;
              return Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFEEF2FF), Color(0xFFF5F3FF)],
                  ),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: const Color(0xFFC7D2FE)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      r.nombre,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF111827),
                      ),
                    ),
                    const SizedBox(height: 8),
                    _rowResumen('Total:',
                        'S/ ${r.total.toStringAsFixed(2)}',
                        color: const Color(0xFF4F46E5)),
                    _rowResumen('Registros:', r.count.toString(),
                        color: const Color(0xFF7C3AED)),
                    const Divider(height: 16, color: Color(0xFFC7D2FE)),
                    _rowResumen('Promedio:',
                        'S/ ${promedio.toStringAsFixed(2)}',
                        color: const Color(0xFFDB2777)),
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }

  Widget _rowResumen(String label, String value, {required Color color}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: Color(0xFF4B5563),
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabla(List<_RegistroGastoFijo> registros, double totalGasto) {
    return _CardDashboard(
      titulo: 'Registros de Gastos Fijos',
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: DataTable(
          columns: const [
            DataColumn(label: Text('Fecha')),
            DataColumn(label: Text('Lote')),
            DataColumn(label: Text('Nombre')),
            DataColumn(label: Text('Monto'), numeric: true),
            DataColumn(label: Text('Periodo')),
            DataColumn(label: Text('Método')),
          ],
          rows: [
            for (final r in registros)
              DataRow(
                cells: [
                  DataCell(Text(r.fecha)),
                  DataCell(Text(r.lote)),
                  DataCell(Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE0E7FF),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      r.nombre,
                      style: const TextStyle(
                        fontSize: 11,
                        color: Color(0xFF4338CA),
                      ),
                    ),
                  )),
                  DataCell(Text('S/ ${r.monto.toStringAsFixed(2)}',
                      style: const TextStyle(fontWeight: FontWeight.w600))),
                  DataCell(Text(r.periodo)),
                  DataCell(Text(r.metodo)),
                ],
              ),
            DataRow(
              cells: [
                const DataCell(Text('TOTAL',
                    style: TextStyle(fontWeight: FontWeight.bold))),
                const DataCell(Text('')),
                const DataCell(Text('')),
                DataCell(Text('S/ ${totalGasto.toStringAsFixed(2)}',
                    style: const TextStyle(fontWeight: FontWeight.bold))),
                const DataCell(Text('')),
                const DataCell(Text('')),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _RegistroGastoFijo {
  final String fecha;
  final String lote;
  final String nombre;
  final double monto;
  final String periodo;
  final String metodo;

  const _RegistroGastoFijo({
    required this.fecha,
    required this.lote,
    required this.nombre,
    required this.monto,
    required this.periodo,
    required this.metodo,
  });
}

class _GastoPorLote {
  final String lote;
  final double monto;

  const _GastoPorLote({
    required this.lote,
    required this.monto,
  });
}

class _DistribucionValor {
  final String nombre;
  final double valor;

  const _DistribucionValor({
    required this.nombre,
    required this.valor,
  });
}

class _ResumenPorNombre {
  final String nombre;
  final double total;
  final int count;

  const _ResumenPorNombre({
    required this.nombre,
    required this.total,
    required this.count,
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
            color: Colors.black.withOpacity(0.12),
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

  const _CardDashboard({required this.titulo, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            titulo,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Color(0xFF111827),
            ),
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}
