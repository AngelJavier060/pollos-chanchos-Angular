import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'mano_obra_form_page.dart';

class ManoObraDashboardPage extends StatelessWidget {
  const ManoObraDashboardPage({super.key});

  List<_RegistroManoObra> get _registrosDemo => const [
        _RegistroManoObra(
          fecha: '2025.11.4',
          lote: '00002',
          trabajador: 'Enrique Valle',
          cargo: 'Cuidador',
          horas: 5,
          costoMes: 150,
          total: 750,
        ),
        _RegistroManoObra(
          fecha: '2025.11.4',
          lote: '03001',
          trabajador: 'Enrique Valle',
          cargo: 'Cuidador',
          horas: 5,
          costoMes: 150,
          total: 750,
        ),
        _RegistroManoObra(
          fecha: '2025.11.4',
          lote: '00003',
          trabajador: 'Enrique Valle',
          cargo: 'Cuidador',
          horas: 5,
          costoMes: 150,
          total: 750,
        ),
        _RegistroManoObra(
          fecha: '2025.11.4',
          lote: '00001',
          trabajador: 'Enrique Valle',
          cargo: 'Cuidador',
          horas: 5,
          costoMes: 150,
          total: 750,
        ),
      ];

  @override
  Widget build(BuildContext context) {
    final registros = _registrosDemo;

    final totalGasto =
        registros.fold<double>(0, (sum, r) => sum + r.total);
    final totalHoras =
        registros.fold<double>(0, (sum, r) => sum + r.horas);
    final totalRegistros = registros.length;
    final costoPorHora =
        totalHoras == 0 ? 0.0 : totalGasto / totalHoras;
    final totalTrabajadores =
        registros.map((r) => r.trabajador).toSet().length;

    final costoPorLote = registros
        .map((r) => _CostoPorLote(lote: r.lote, costo: r.total, horas: r.horas))
        .toList();

    final distribucionLotes = registros
        .map((r) => _DistribucionLote(nombre: 'Lote ${r.lote}', valor: r.total))
        .toList();

    final horasPorLote = registros
        .map((r) => _HorasPorLote(lote: r.lote, horas: r.horas))
        .toList();

    final resumenTrabajador = <_ResumenTrabajador>[];
    for (final r in registros) {
      final index =
          resumenTrabajador.indexWhere((e) => e.nombre == r.trabajador);
      if (index >= 0) {
        final actual = resumenTrabajador[index];
        resumenTrabajador[index] = actual.copyWith(
          totalHoras: actual.totalHoras + r.horas,
          totalCosto: actual.totalCosto + r.total,
          registros: actual.registros + 1,
        );
      } else {
        resumenTrabajador.add(
          _ResumenTrabajador(
            nombre: r.trabajador,
            cargo: r.cargo,
            totalHoras: r.horas,
            totalCosto: r.total,
            registros: 1,
          ),
        );
      }
    }

    final eficienciaLotes = registros
        .map((r) => _EficienciaLote(
              lote: r.lote,
              costoPorHora: r.horas == 0 ? 0.0 : r.total / r.horas,
            ))
        .toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mano de Obra'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: 'Nuevo registro',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const ManoObraFormPage(),
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
              builder: (_) => const ManoObraFormPage(),
            ),
          );
        },
        icon: const Icon(Icons.add),
        label: const Text('Ingresar mano de obra'),
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFFEEF2FF), Color(0xFFE0F2FE)],
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
              _buildKpiRow(totalGasto, totalHoras, costoPorHora,
                  totalRegistros, totalTrabajadores),
              const SizedBox(height: 16),
              _buildChartsRow1(costoPorLote, distribucionLotes),
              const SizedBox(height: 16),
              _buildChartsRow2(horasPorLote, eficienciaLotes),
              const SizedBox(height: 16),
              _buildResumenTrabajador(resumenTrabajador),
              const SizedBox(height: 16),
              _buildTablaRegistros(registros, totalHoras, totalGasto),
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
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: const [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Dashboard de Mano de Obra',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF111827),
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  'Análisis de costos y tiempo de trabajo por lote',
                  style: TextStyle(
                    fontSize: 13,
                    color: Color(0xFF6B7280),
                  ),
                ),
              ],
            ),
          ),
          SizedBox(width: 12),
          Icon(
            Icons.groups_rounded,
            size: 40,
            color: Color(0xFF2563EB),
          ),
        ],
      ),
    );
  }

  Widget _buildKpiRow(double totalGasto, double totalHoras, double costoPorHora,
      int totalRegistros, int totalTrabajadores) {
    final kpis = [
      _KpiInfo(
        titulo: 'TOTAL',
        valor: 'S/ ${totalGasto.toStringAsFixed(2)}',
        subtitulo: 'Gasto total',
        color1: const Color(0xFF3B82F6),
        color2: const Color(0xFF2563EB),
        icono: Icons.attach_money,
      ),
      _KpiInfo(
        titulo: 'HORAS',
        valor: totalHoras.toStringAsFixed(0),
        subtitulo: 'Horas trabajadas',
        color1: const Color(0xFF10B981),
        color2: const Color(0xFF059669),
        icono: Icons.schedule,
      ),
      _KpiInfo(
        titulo: 'COSTO/HORA',
        valor: 'S/ ${costoPorHora.toStringAsFixed(2)}',
        subtitulo: 'Por hora',
        color1: const Color(0xFF8B5CF6),
        color2: const Color(0xFF7C3AED),
        icono: Icons.trending_up,
      ),
      _KpiInfo(
        titulo: 'REGISTROS',
        valor: totalRegistros.toString(),
        subtitulo: 'Total de lotes',
        color1: const Color(0xFFF59E0B),
        color2: const Color(0xFFD97706),
        icono: Icons.calendar_today,
      ),
      _KpiInfo(
        titulo: 'TRABAJADORES',
        valor: totalTrabajadores.toString(),
        subtitulo: 'Activos',
        color1: const Color(0xFFEC4899),
        color2: const Color(0xFFDB2777),
        icono: Icons.verified_user,
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
    List<_DistribucionLote> distribucionLotes,
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
              color: const Color(0xFF3B82F6),
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

    final total =
        distribucionLotes.fold<double>(0, (sum, e) => sum + e.valor);
    const colors = [
      Color(0xFF3B82F6),
      Color(0xFF10B981),
      Color(0xFFF59E0B),
      Color(0xFFEF4444),
      Color(0xFF8B5CF6),
      Color(0xFFEC4899),
    ];
    final pieSections = <PieChartSectionData>[];
    for (var i = 0; i < distribucionLotes.length; i++) {
      final d = distribucionLotes[i];
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

    return LayoutBuilder(
      builder: (context, constraints) {
        final isSmall = constraints.maxWidth < 800;
        final barCard = _CardDashboard(
          titulo: 'Costo por Lote',
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
          titulo: 'Distribución de Costos',
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
    List<_HorasPorLote> horasPorLote,
    List<_EficienciaLote> eficienciaLotes,
  ) {
    if (horasPorLote.isEmpty) return const SizedBox.shrink();

    final lineSpots = <FlSpot>[];
    double maxHoras = 0;
    for (var i = 0; i < horasPorLote.length; i++) {
      final r = horasPorLote[i];
      if (r.horas > maxHoras) maxHoras = r.horas;
      lineSpots.add(FlSpot(i.toDouble(), r.horas));
    }
    final maxHorasY = maxHoras == 0 ? 1.0 : maxHoras * 1.4;

    final barGroups = <BarChartGroupData>[];
    double maxCostoHora = 0;
    for (var i = 0; i < eficienciaLotes.length; i++) {
      final e = eficienciaLotes[i];
      if (e.costoPorHora > maxCostoHora) maxCostoHora = e.costoPorHora;
      barGroups.add(
        BarChartGroupData(
          x: i,
          barRods: [
            BarChartRodData(
              toY: e.costoPorHora,
              color: const Color(0xFF8B5CF6),
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
    final maxCostoHoraY = maxCostoHora == 0 ? 1.0 : maxCostoHora * 1.3;

    final lineCard = _CardDashboard(
      titulo: 'Horas Trabajadas por Lote',
      child: SizedBox(
        height: 260,
        child: LineChart(
          LineChartData(
            minY: 0,
            maxY: maxHorasY,
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
                    if (index < 0 || index >= horasPorLote.length) {
                      return const SizedBox.shrink();
                    }
                    return Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        horasPorLote[index].lote,
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
                color: const Color(0xFF10B981),
                barWidth: 3,
                dotData: FlDotData(show: true),
                belowBarData: BarAreaData(
                  show: true,
                  color: const Color(0xFF10B981).withOpacity(0.15),
                ),
              ),
            ],
          ),
        ),
      ),
    );

    final barCard = _CardDashboard(
      titulo: 'Costo por Hora por Lote',
      child: SizedBox(
        height: 260,
        child: BarChart(
          BarChartData(
            minY: 0,
            maxY: maxCostoHoraY,
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
                  reservedSize: 40,
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
                    if (index < 0 || index >= eficienciaLotes.length) {
                      return const SizedBox.shrink();
                    }
                    return Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        eficienciaLotes[index].lote,
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

    return LayoutBuilder(
      builder: (context, constraints) {
        final isSmall = constraints.maxWidth < 800;
        if (isSmall) {
          return Column(
            children: [
              lineCard,
              const SizedBox(height: 16),
              barCard,
            ],
          );
        }
        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: lineCard),
            const SizedBox(width: 16),
            Expanded(child: barCard),
          ],
        );
      },
    );
  }

  Widget _buildResumenTrabajador(List<_ResumenTrabajador> resumen) {
    if (resumen.isEmpty) return const SizedBox.shrink();

    return _CardDashboard(
      titulo: 'Resumen por Trabajador',
      child: LayoutBuilder(
        builder: (context, constraints) {
          final crossAxisCount = constraints.maxWidth > 900
              ? 3
              : constraints.maxWidth > 600
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
              final t = resumen[index];
              final iniciales = t.nombre
                  .split(' ')
                  .where((p) => p.isNotEmpty)
                  .map((p) => p[0])
                  .join();
              final costoHora =
                  t.totalHoras == 0 ? 0.0 : t.totalCosto / t.totalHoras;
              return Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFDBEAFE), Color(0xFFE0E7FF)],
                  ),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: const Color(0xFFBFDBFE)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 22,
                          backgroundColor: const Color(0xFF3B82F6),
                          child: Text(
                            iniciales,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 18,
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                t.nombre,
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF111827),
                                ),
                              ),
                              Text(
                                t.cargo,
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: Color(0xFF4B5563),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    _rowResumen('Total Horas:',
                        '${t.totalHoras.toStringAsFixed(0)} hrs',
                        color: const Color(0xFF059669)),
                    _rowResumen(
                        'Total Costo:',
                        'S/ ${t.totalCosto.toStringAsFixed(2)}',
                        color: const Color(0xFF2563EB)),
                    _rowResumen('Lotes Asignados:',
                        t.registros.toString(),
                        color: const Color(0xFF7C3AED)),
                    const Divider(height: 16, color: Color(0xFFBFDBFE)),
                    _rowResumen(
                        'Costo/Hora:',
                        'S/ ${costoHora.toStringAsFixed(2)}',
                        color: const Color(0xFFF59E0B)),
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

  Widget _buildTablaRegistros(List<_RegistroManoObra> registros,
      double totalHoras, double totalGasto) {
    return _CardDashboard(
      titulo: 'Registros Detallados',
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: DataTable(
          columns: const [
            DataColumn(label: Text('Fecha')),
            DataColumn(label: Text('Lote')),
            DataColumn(label: Text('Trabajador')),
            DataColumn(label: Text('Cargo')),
            DataColumn(label: Text('Horas'), numeric: true),
            DataColumn(label: Text('Costo Mes'), numeric: true),
            DataColumn(label: Text('Total'), numeric: true),
          ],
          rows: [
            for (final r in registros)
              DataRow(
                cells: [
                  DataCell(Text(r.fecha)),
                  DataCell(Text(r.lote)),
                  DataCell(Text(r.trabajador)),
                  DataCell(Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFDBEAFE),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      r.cargo,
                      style: const TextStyle(
                        fontSize: 11,
                        color: Color(0xFF1D4ED8),
                      ),
                    ),
                  )),
                  DataCell(Text(r.horas.toStringAsFixed(0))),
                  DataCell(Text('S/ ${r.costoMes.toStringAsFixed(2)}')),
                  DataCell(Text('S/ ${r.total.toStringAsFixed(2)}')),
                ],
              ),
            DataRow(
              cells: [
                const DataCell(Text('TOTALES',
                    style: TextStyle(fontWeight: FontWeight.bold))),
                const DataCell(Text('')),
                const DataCell(Text('')),
                const DataCell(Text('')),
                DataCell(Text(totalHoras.toStringAsFixed(0),
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

class _RegistroManoObra {
  final String fecha;
  final String lote;
  final String trabajador;
  final String cargo;
  final double horas;
  final double costoMes;
  final double total;

  const _RegistroManoObra({
    required this.fecha,
    required this.lote,
    required this.trabajador,
    required this.cargo,
    required this.horas,
    required this.costoMes,
    required this.total,
  });
}

class _CostoPorLote {
  final String lote;
  final double costo;
  final double horas;

  const _CostoPorLote({
    required this.lote,
    required this.costo,
    required this.horas,
  });
}

class _DistribucionLote {
  final String nombre;
  final double valor;

  const _DistribucionLote({
    required this.nombre,
    required this.valor,
  });
}

class _HorasPorLote {
  final String lote;
  final double horas;

  const _HorasPorLote({
    required this.lote,
    required this.horas,
  });
}

class _EficienciaLote {
  final String lote;
  final double costoPorHora;

  const _EficienciaLote({
    required this.lote,
    required this.costoPorHora,
  });
}

class _ResumenTrabajador {
  final String nombre;
  final String cargo;
  final double totalHoras;
  final double totalCosto;
  final int registros;

  const _ResumenTrabajador({
    required this.nombre,
    required this.cargo,
    required this.totalHoras,
    required this.totalCosto,
    required this.registros,
  });

  _ResumenTrabajador copyWith({
    String? nombre,
    String? cargo,
    double? totalHoras,
    double? totalCosto,
    int? registros,
  }) {
    return _ResumenTrabajador(
      nombre: nombre ?? this.nombre,
      cargo: cargo ?? this.cargo,
      totalHoras: totalHoras ?? this.totalHoras,
      totalCosto: totalCosto ?? this.totalCosto,
      registros: registros ?? this.registros,
    );
  }
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
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: [info.color1, info.color2]),
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.16),
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
