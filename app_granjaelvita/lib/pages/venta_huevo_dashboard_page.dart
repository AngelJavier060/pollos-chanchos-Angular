import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

import '../models/venta_huevo_model.dart';
import '../services/ventas_service.dart';
import '../services/lote_service.dart';
import 'venta_huevo_form_page.dart';

class VentaHuevoDashboardPage extends StatefulWidget {
  const VentaHuevoDashboardPage({super.key});

  @override
  State<VentaHuevoDashboardPage> createState() => _VentaHuevoDashboardPageState();
}

class _VentaHuevoDashboardPageState extends State<VentaHuevoDashboardPage> {
  final List<VentaHuevoModel> _ventas = [];
  final List<LoteDto> _lotes = [];
  final _loteSrv = LoteServiceMobile();
  bool _cargando = true;
  String? _error;
  DateTimeRange? _rangoFechas;
  
  // Paginación para la tabla de ventas
  int _paginaActualTabla = 1;
  static const int _registrosPorPagina = 10;
  
  // Selector de mes/año
  int _mesSeleccionado = DateTime.now().month;
  int _anioSeleccionado = DateTime.now().year;
  
  final List<String> _meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  List<int> get _aniosDisponibles {
    final now = DateTime.now();
    return List.generate(6, (i) => now.year - 5 + i);
  }

  @override
  void initState() {
    super.initState();
    _cargarVentas();
    _cargarLotes();
  }

  Future<void> _cargarLotes() async {
    try {
      final list = await _loteSrv.getAll();
      if (!mounted) return;
      setState(() {
        _lotes
          ..clear()
          ..addAll(list);
      });
    } catch (_) {
      // Ignorar errores de carga de lotes
    }
  }

  /// Formatea el nombre del lote para mostrar el nombre legible (columna name)
  /// NO usar codigo, usar siempre name de la tabla lote
  String _formatLoteName(String loteStr) {
    if (loteStr.isEmpty) return 'Sin lote';
    
    // Buscar en la lista de lotes cargados
    for (final lote in _lotes) {
      // Comparar por ID o código
      if (lote.id == loteStr || lote.codigo == loteStr) {
        // PRIORIZAR: name sobre codigo
        return lote.name.isNotEmpty ? lote.name : lote.codigo;
      }
    }
    
    // Si ya tiene formato de nombre (ej: "Lote01"), usarlo tal cual
    if (loteStr.toLowerCase().startsWith('lote')) {
      return loteStr;
    }
    
    // Si el código parece ser un ID numérico largo, buscar en lotes
    if (RegExp(r'^\d+$').hasMatch(loteStr)) {
      for (final lote in _lotes) {
        if (lote.codigo == loteStr) {
          return lote.name.isNotEmpty ? lote.name : 'Lote $loteStr';
        }
      }
    }
    
    return loteStr;
  }

  Future<void> _seleccionarRangoFechas() async {
    final now = DateTime.now();
    final initial = _rangoFechas ??
        DateTimeRange(
          start: DateTime(now.year, now.month, 1),
          end: now,
        );
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime(2100),
      initialDateRange: initial,
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: Color(0xFFF59E0B),
              onPrimary: Colors.white,
              surface: Colors.white,
              onSurface: Color(0xFF111827),
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() {
        _rangoFechas = picked;
      });
    }
  }
  
  void _aplicarFiltroPorMes() {
    final primerDia = DateTime(_anioSeleccionado, _mesSeleccionado, 1);
    final ultimoDia = DateTime(_anioSeleccionado, _mesSeleccionado + 1, 0);
    setState(() {
      _rangoFechas = DateTimeRange(start: primerDia, end: ultimoDia);
    });
    final from = _formatoIso(primerDia);
    final to = _formatoIso(ultimoDia);
    _cargarVentas(from: from, to: to);
  }

  String get _textoRangoFechas {
    if (_rangoFechas == null) return 'Seleccionar fecha';
    final s = _formatoCorto(_rangoFechas!.start);
    final e = _formatoCorto(_rangoFechas!.end);
    if (s == e) return s;
    return '$s - $e';
  }

  String _formatoCorto(DateTime d) {
    final dd = d.day.toString().padLeft(2, '0');
    final mm = d.month.toString().padLeft(2, '0');
    return '$dd/$mm/${d.year}';
  }

  String _formatoIso(DateTime d) {
    final y = d.year.toString().padLeft(4, '0');
    final m = d.month.toString().padLeft(2, '0');
    final day = d.day.toString().padLeft(2, '0');
    return '$y-$m-$day';
  }

  Widget _buildErrorBanner(String message) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFCA5A5)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.warning_amber_rounded,
            color: Color(0xFFB91C1C),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                color: Color(0xFF991B1B),
                fontSize: 12,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _cargarVentas({String? from, String? to}) async {
    setState(() {
      _cargando = true;
      _error = null;
    });
    try {
      final list = await VentasServiceMobile.listarVentasHuevos(
        from: from,
        to: to,
      );
      setState(() {
        _ventas
          ..clear()
          ..addAll(list);
        _cargando = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _cargando = false;
      });
    }
  }

  int get _registros => _ventas.length;

  double get _cantidadTotal =>
      _ventas.fold<double>(0, (sum, v) => sum + v.cantidad);

  double get _montoTotal =>
      _ventas.fold<double>(0, (sum, v) => sum + v.total);

  List<_VentaHuevo> get _ventasTabla => _ventas
      .map(
        (v) => _VentaHuevo(
          id: v.id ?? 0,
          fecha: v.fecha,
          lote: (v.loteCodigo ?? v.loteId ?? '').toString(),
          cantidad: v.cantidad,
          precioUnit: v.precioUnit,
          total: v.total,
        ),
      )
      .toList();

  List<_VentaPorLote> get _ventasPorLote {
    final Map<String, _AcumLote> map = {};
    for (final v in _ventas) {
      final key = (v.loteCodigo ?? v.loteId ?? 'Lote').toString();
      final acum = map.putIfAbsent(key, () => _AcumLote());
      acum.cantidad += v.cantidad;
      acum.ingresos += v.total;
    }
    return map.entries
        .map(
          (e) => _VentaPorLote(
            lote: e.key,
            cantidad: e.value.cantidad,
            ingresos: e.value.ingresos,
          ),
        )
        .toList();
  }

  List<_DistribucionIngreso> get _distribucionIngresos => _ventasPorLote
      .map(
        (e) => _DistribucionIngreso(
          nombre: e.lote,
          valor: e.ingresos,
        ),
      )
      .toList();

  List<_VentaPorMes> get _ventasPorMes {
    final Map<int, _AcumMes> map = {};
    for (final v in _ventas) {
      if (v.fecha.isEmpty) continue;
      DateTime? d;
      try {
        d = DateTime.parse(v.fecha);
      } catch (_) {
        continue;
      }
      final ym = d.year * 100 + d.month;
      final label =
          '${_mesAbrev(d.month)} ${d.year.toString().substring(2)}';
      final acum = map.putIfAbsent(ym, () => _AcumMes(label: label));
      acum.cantidad += v.cantidad;
      acum.ingresos += v.total;
    }
    final keys = map.keys.toList()..sort();
    return keys
        .map(
          (k) => _VentaPorMes(
            mes: map[k]!.label,
            cantidad: map[k]!.cantidad,
            ingresos: map[k]!.ingresos,
          ),
        )
        .toList();
  }

  String _mesAbrev(int month) {
    const nombres = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic'
    ];
    if (month < 1 || month > 12) return month.toString();
    return nombres[month - 1];
  }

  @override
  Widget build(BuildContext context) {
    final ventas = _ventasTabla;
    final ventasPorLote = _ventasPorLote;
    final ventasPorMes = _ventasPorMes;
    final distribucionIngresos = _distribucionIngresos;

    final registros = _registros;
    final cantidadTotal = _cantidadTotal.toInt();
    final montoTotal = _montoTotal;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Venta de Huevo'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: 'Registrar venta',
            onPressed: () async {
              final result = await Navigator.push<bool>(
                context,
                MaterialPageRoute(
                  builder: (_) => const VentaHuevoFormPage(),
                ),
              );
              if (result == true) {
                await _cargarVentas();
              }
            },
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final result = await Navigator.push<bool>(
            context,
            MaterialPageRoute(
              builder: (_) => const VentaHuevoFormPage(),
            ),
          );
          if (result == true) {
            await _cargarVentas();
          }
        },
        icon: const Icon(Icons.add),
        label: const Text('Registrar venta'),
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFFFFFBEB), Color(0xFFFFEDD5)],
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
              if (_error != null && _error!.isNotEmpty) ...[
                const SizedBox(height: 8),
                _buildErrorBanner(_error!),
              ],
              const SizedBox(height: 16),
              _buildFilterRow(),
              const SizedBox(height: 16),
              _buildKpis(registros, cantidadTotal, montoTotal),
              const SizedBox(height: 16),
              _buildChartsRow1(ventasPorLote, distribucionIngresos),
              const SizedBox(height: 16),
              _buildChartsRow2(ventasPorMes),
              const SizedBox(height: 16),
              _buildTablaVentas(ventas),
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
            child: Row(
              children: [
                Icon(Icons.egg, size: 40, color: Color(0xFFF59E0B)),
                SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Venta de Huevos',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF111827),
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Solo lectura usando datos actuales',
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
          ),
        ],
      ),
    );
  }

  Widget _buildFilterRow() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Título de la sección
          Row(
            children: [
              Icon(Icons.filter_list, color: Color(0xFFF59E0B), size: 20),
              const SizedBox(width: 8),
              const Text(
                'Filtros de búsqueda',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF111827),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          
          // Fila de filtros
          Wrap(
            spacing: 16,
            runSpacing: 12,
            crossAxisAlignment: WrapCrossAlignment.end,
            children: [
              // Selector de Mes
              SizedBox(
                width: 160,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Mes',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF4B5563),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Color(0xFFE5E7EB), width: 1.5),
                        color: const Color(0xFFF9FAFB),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<int>(
                          value: _mesSeleccionado,
                          isExpanded: true,
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          borderRadius: BorderRadius.circular(10),
                          icon: const Icon(Icons.keyboard_arrow_down, color: Color(0xFF6B7280)),
                          items: List.generate(12, (i) {
                            return DropdownMenuItem(
                              value: i + 1,
                              child: Text(
                                _meses[i],
                                style: const TextStyle(fontSize: 13, color: Color(0xFF374151)),
                              ),
                            );
                          }),
                          onChanged: (val) {
                            if (val != null) {
                              setState(() => _mesSeleccionado = val);
                            }
                          },
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              
              // Selector de Año
              SizedBox(
                width: 120,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Año',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF4B5563),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Color(0xFFE5E7EB), width: 1.5),
                        color: const Color(0xFFF9FAFB),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<int>(
                          value: _anioSeleccionado,
                          isExpanded: true,
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          borderRadius: BorderRadius.circular(10),
                          icon: const Icon(Icons.keyboard_arrow_down, color: Color(0xFF6B7280)),
                          items: _aniosDisponibles.map((anio) {
                            return DropdownMenuItem(
                              value: anio,
                              child: Text(
                                anio.toString(),
                                style: const TextStyle(fontSize: 13, color: Color(0xFF374151)),
                              ),
                            );
                          }).toList(),
                          onChanged: (val) {
                            if (val != null) {
                              setState(() => _anioSeleccionado = val);
                            }
                          },
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              
              // Botón aplicar mes/año
              ElevatedButton.icon(
                onPressed: _aplicarFiltroPorMes,
                icon: const Icon(Icons.calendar_month, size: 18),
                label: const Text('Aplicar'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFF59E0B),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
              
              
              // Selector de rango de fechas personalizado
              SizedBox(
                width: 200,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Rango personalizado',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF4B5563),
                      ),
                    ),
                    const SizedBox(height: 6),
                    InkWell(
                      onTap: _seleccionarRangoFechas,
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: Color(0xFFE5E7EB), width: 1.5),
                          color: const Color(0xFFF9FAFB),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.date_range, color: Color(0xFFF59E0B), size: 20),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                _textoRangoFechas,
                                style: TextStyle(
                                  fontSize: 13,
                                  color: _rangoFechas != null ? const Color(0xFF374151) : const Color(0xFF9CA3AF),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              
              // Botón buscar por rango
              ElevatedButton.icon(
                onPressed: () {
                  if (_rangoFechas == null) {
                    _cargarVentas();
                  } else {
                    final from = _formatoIso(_rangoFechas!.start);
                    final to = _formatoIso(_rangoFechas!.end);
                    _cargarVentas(from: from, to: to);
                  }
                },
                icon: const Icon(Icons.search, size: 18),
                label: const Text('Buscar'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2563EB),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
              
              // Botón limpiar filtros
              OutlinedButton.icon(
                onPressed: () {
                  setState(() {
                    _rangoFechas = null;
                    _mesSeleccionado = DateTime.now().month;
                    _anioSeleccionado = DateTime.now().year;
                  });
                  _cargarVentas();
                },
                icon: const Icon(Icons.clear_all, size: 18),
                label: const Text('Limpiar'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF6B7280),
                  side: const BorderSide(color: Color(0xFFE5E7EB)),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
            ],
          ),
          
          // Indicador de filtro activo
          if (_rangoFechas != null) ...[  
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF3C7),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFFCD34D)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.info_outline, color: Color(0xFFB45309), size: 16),
                  const SizedBox(width: 8),
                  Text(
                    'Mostrando datos del ${_formatoCorto(_rangoFechas!.start)} al ${_formatoCorto(_rangoFechas!.end)}',
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFFB45309),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildKpis(int registros, int cantidadTotal, double montoTotal) {
    final kpis = [
      _KpiInfo(
        titulo: 'REGISTROS',
        valor: registros.toString(),
        subtitulo: 'Ventas registradas',
        color1: const Color(0xFF3B82F6),
        color2: const Color(0xFF2563EB),
        icono: Icons.shopping_cart,
      ),
      _KpiInfo(
        titulo: 'CANTIDAD TOTAL',
        valor: cantidadTotal.toString(),
        subtitulo: 'Huevos vendidos',
        color1: const Color(0xFF22C55E),
        color2: const Color(0xFF16A34A),
        icono: Icons.egg,
      ),
      _KpiInfo(
        titulo: 'MONTO TOTAL',
        valor: 'S/ ${montoTotal.toStringAsFixed(2)}',
        subtitulo: 'Acumulado histórico',
        color1: const Color(0xFFF59E0B),
        color2: const Color(0xFFEA580C),
        icono: Icons.attach_money,
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
    List<_VentaPorLote> ventasPorLote,
    List<_DistribucionIngreso> distribucionIngresos,
  ) {
    // Mostrar mensaje si no hay datos
    if (ventasPorLote.isEmpty) {
      return Row(
        children: [
          Expanded(
            child: _CardDashboard(
              titulo: 'Ingresos por Lote',
              child: SizedBox(
                height: 200,
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.bar_chart, size: 48, color: Colors.grey[300]),
                      const SizedBox(height: 8),
                      Text(
                        'Sin datos para mostrar',
                        style: TextStyle(color: Colors.grey[500], fontSize: 14),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: _CardDashboard(
              titulo: 'Distribución de Ingresos por Lote',
              child: SizedBox(
                height: 200,
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.pie_chart, size: 48, color: Colors.grey[300]),
                      const SizedBox(height: 8),
                      Text(
                        'Sin datos para mostrar',
                        style: TextStyle(color: Colors.grey[500], fontSize: 14),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      );
    }

    // Gráfica de barras - Ingresos por Lote
    final barGroups = <BarChartGroupData>[];
    double maxIngresos = 0;
    for (var i = 0; i < ventasPorLote.length; i++) {
      final r = ventasPorLote[i];
      if (r.ingresos > maxIngresos) maxIngresos = r.ingresos;
      barGroups.add(
        BarChartGroupData(
          x: i,
          barRods: [
            BarChartRodData(
              toY: r.ingresos,
              gradient: const LinearGradient(
                colors: [Color(0xFFFBBF24), Color(0xFFF59E0B)],
                begin: Alignment.bottomCenter,
                end: Alignment.topCenter,
              ),
              width: 22,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(6),
                topRight: Radius.circular(6),
              ),
              backDrawRodData: BackgroundBarChartRodData(
                show: true,
                toY: maxIngresos * 1.3,
                color: const Color(0xFFE5E7EB).withOpacity(0.3),
              ),
            ),
          ],
        ),
      );
    }
    final maxIngresosY = maxIngresos == 0 ? 1.0 : maxIngresos * 1.3;

    // Gráfica de pastel - Distribución de Ingresos
    final totalIngresos =
        distribucionIngresos.fold<double>(0, (s, e) => s + e.valor);
    const colors = [
      Color(0xFFF59E0B),
      Color(0xFF10B981),
      Color(0xFF3B82F6),
      Color(0xFF8B5CF6),
      Color(0xFFEC4899),
      Color(0xFF06B6D4),
      Color(0xFFEF4444),
    ];
    final pieSections = <PieChartSectionData>[];
    for (var i = 0; i < distribucionIngresos.length; i++) {
      final d = distribucionIngresos[i];
      final percent =
          totalIngresos == 0 ? 0.0 : d.valor / totalIngresos * 100;
      pieSections.add(
        PieChartSectionData(
          color: colors[i % colors.length],
          value: d.valor,
          radius: 70,
          title: '${percent.toStringAsFixed(1)}%',
          titleStyle: const TextStyle(
            color: Colors.white,
            fontSize: 12,
            fontWeight: FontWeight.bold,
            shadows: [Shadow(color: Colors.black26, blurRadius: 2)],
          ),
          titlePositionPercentageOffset: 0.55,
        ),
      );
    }

    final barCard = _CardDashboard(
      titulo: 'Ingresos por Lote (S/)',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Leyenda
          Row(
            children: [
              Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFFBBF24), Color(0xFFF59E0B)],
                  ),
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
              const SizedBox(width: 6),
              const Text(
                'Ingresos totales por lote',
                style: TextStyle(fontSize: 12, color: Color(0xFF6B7280)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 240,
            child: BarChart(
              BarChartData(
                minY: 0,
                maxY: maxIngresosY,
                barGroups: barGroups,
                gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  horizontalInterval: maxIngresosY / 5,
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
                      reservedSize: 50,
                      getTitlesWidget: (value, meta) {
                        if (value == meta.max) return const SizedBox.shrink();
                        return Padding(
                          padding: const EdgeInsets.only(right: 4),
                          child: Text(
                            'S/ ${value.toInt()}',
                            style: const TextStyle(fontSize: 9, color: Color(0xFF6B7280)),
                          ),
                        );
                      },
                    ),
                  ),
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 30,
                      getTitlesWidget: (value, meta) {
                        final index = value.toInt();
                        if (index < 0 || index >= ventasPorLote.length) {
                          return const SizedBox.shrink();
                        }
                        return Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(
                            ventasPorLote[index].lote,
                            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w500),
                          ),
                        );
                      },
                    ),
                  ),
                ),
                barTouchData: BarTouchData(
                  enabled: true,
                  touchTooltipData: BarTouchTooltipData(
                    getTooltipColor: (group) => const Color(0xFF1F2937),
                    tooltipRoundedRadius: 8,
                    getTooltipItem: (group, groupIndex, rod, rodIndex) {
                      final lote = ventasPorLote[group.x].lote;
                      final cantidad = ventasPorLote[group.x].cantidad;
                      return BarTooltipItem(
                        '$lote\nS/ ${rod.toY.toStringAsFixed(2)}\n${cantidad.toInt()} huevos',
                        const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 11,
                        ),
                      );
                    },
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );

    final pieCard = _CardDashboard(
      titulo: 'Distribución de Ingresos por Lote',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Leyenda de la gráfica de pastel
          Wrap(
            spacing: 12,
            runSpacing: 6,
            children: [
              for (var i = 0; i < distribucionIngresos.length; i++)
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(
                        color: colors[i % colors.length],
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      distribucionIngresos[i].nombre,
                      style: const TextStyle(fontSize: 11, color: Color(0xFF374151)),
                    ),
                  ],
                ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 220,
            child: PieChart(
              PieChartData(
                sections: pieSections,
                sectionsSpace: 2,
                centerSpaceRadius: 35,
                pieTouchData: PieTouchData(
                  enabled: true,
                  touchCallback: (event, response) {},
                ),
              ),
            ),
          ),
          // Total de ingresos
          const SizedBox(height: 8),
          Center(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFFF3F4F6),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                'Total: S/ ${totalIngresos.toStringAsFixed(2)}',
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

  Widget _buildChartsRow2(List<_VentaPorMes> ventasPorMes) {
    if (ventasPorMes.isEmpty) {
      return _CardDashboard(
        titulo: 'Huevos Vendidos por Mes',
        child: SizedBox(
          height: 200,
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.bar_chart, size: 48, color: Colors.grey[300]),
                const SizedBox(height: 8),
                Text(
                  'Sin datos para mostrar',
                  style: TextStyle(color: Colors.grey[500], fontSize: 14),
                ),
              ],
            ),
          ),
        ),
      );
    }

    // Calcular el máximo para el eje Y (solo cantidad de huevos)
    double maxCantidad = 0;
    for (final r in ventasPorMes) {
      if (r.cantidad > maxCantidad) maxCantidad = r.cantidad.toDouble();
    }
    if (maxCantidad == 0) maxCantidad = 1;
    final maxY = maxCantidad * 1.2;

    // Crear barras para cada mes
    final barGroups = <BarChartGroupData>[];
    for (var i = 0; i < ventasPorMes.length; i++) {
      final r = ventasPorMes[i];
      barGroups.add(
        BarChartGroupData(
          x: i,
          barRods: [
            BarChartRodData(
              toY: r.cantidad.toDouble(),
              color: const Color(0xFF10B981),
              width: 24,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(6),
                topRight: Radius.circular(6),
              ),
              backDrawRodData: BackgroundBarChartRodData(
                show: true,
                toY: maxY,
                color: const Color(0xFFE5E7EB).withOpacity(0.3),
              ),
            ),
          ],
          showingTooltipIndicators: [],
        ),
      );
    }

    return _CardDashboard(
      titulo: 'Huevos Vendidos por Mes',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Leyenda
          Row(
            children: [
              Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981),
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
              const SizedBox(width: 6),
              const Text(
                'Total de huevos vendidos',
                style: TextStyle(fontSize: 12, color: Color(0xFF6B7280)),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 260,
            child: BarChart(
              BarChartData(
                minY: 0,
                maxY: maxY,
                barGroups: barGroups,
                gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  horizontalInterval: maxY / 5,
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
                      reservedSize: 45,
                      getTitlesWidget: (value, meta) {
                        if (value == meta.max) return const SizedBox.shrink();
                        return Padding(
                          padding: const EdgeInsets.only(right: 4),
                          child: Text(
                            value.toInt().toString(),
                            style: const TextStyle(fontSize: 10, color: Color(0xFF6B7280)),
                          ),
                        );
                      },
                    ),
                  ),
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 30,
                      getTitlesWidget: (value, meta) {
                        final index = value.toInt();
                        if (index < 0 || index >= ventasPorMes.length) {
                          return const SizedBox.shrink();
                        }
                        return Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(
                            ventasPorMes[index].mes,
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500),
                          ),
                        );
                      },
                    ),
                  ),
                ),
                barTouchData: BarTouchData(
                  enabled: true,
                  touchTooltipData: BarTouchTooltipData(
                    getTooltipColor: (group) => const Color(0xFF1F2937),
                    tooltipRoundedRadius: 8,
                    getTooltipItem: (group, groupIndex, rod, rodIndex) {
                      final mes = ventasPorMes[group.x].mes;
                      return BarTooltipItem(
                        '$mes\n${rod.toY.toInt()} huevos',
                        const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      );
                    },
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTablaVentas(List<_VentaHuevo> ventas) {
    // Calcular paginación
    final totalPaginas = (ventas.length / _registrosPorPagina).ceil().clamp(1, 999);
    if (_paginaActualTabla > totalPaginas) {
      _paginaActualTabla = totalPaginas;
    }
    final inicio = (_paginaActualTabla - 1) * _registrosPorPagina;
    final fin = (inicio + _registrosPorPagina).clamp(0, ventas.length);
    final ventasPaginadas = ventas.sublist(inicio, fin);

    return _CardDashboard(
      titulo: 'Ventas guardadas',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Ventas guardadas',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF111827),
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFDBEAFE),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  '${ventas.length} registros',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1D4ED8),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: DataTable(
              columns: const [
                DataColumn(label: Text('Lote')),
                DataColumn(label: Text('Fecha')),
                DataColumn(label: Text('Cantidad'), numeric: true),
                DataColumn(label: Text('Precio Unit.'), numeric: true),
                DataColumn(label: Text('Total'), numeric: true),
              ],
              rows: [
                for (final v in ventasPaginadas)
                  DataRow(
                    cells: [
                      DataCell(Text(_formatLoteName(v.lote))),
                      DataCell(Text(v.fecha)),
                      DataCell(Text(v.cantidad.toStringAsFixed(0))),
                      DataCell(Text('S/ ${v.precioUnit.toStringAsFixed(2)}')),
                      DataCell(Text('S/ ${v.total.toStringAsFixed(2)}',
                          style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              color: Color(0xFFB45309)))),
                    ],
                  ),
              ],
            ),
          ),
          // Controles de paginación
          if (totalPaginas > 1) ...[
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                IconButton(
                  onPressed: _paginaActualTabla > 1
                      ? () => setState(() => _paginaActualTabla--)
                      : null,
                  icon: Icon(
                    Icons.chevron_left,
                    color: _paginaActualTabla > 1 
                        ? const Color(0xFF2563EB) 
                        : Colors.grey.shade300,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    'Página $_paginaActualTabla de $totalPaginas',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF1D4ED8),
                    ),
                  ),
                ),
                IconButton(
                  onPressed: _paginaActualTabla < totalPaginas
                      ? () => setState(() => _paginaActualTabla++)
                      : null,
                  icon: Icon(
                    Icons.chevron_right,
                    color: _paginaActualTabla < totalPaginas 
                        ? const Color(0xFF2563EB) 
                        : Colors.grey.shade300,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _AcumLote {
  double cantidad;
  double ingresos;

  _AcumLote({
    this.cantidad = 0,
    this.ingresos = 0,
  });
}

class _AcumMes {
  final String label;
  double cantidad;
  double ingresos;

  _AcumMes({
    required this.label,
    this.cantidad = 0,
    this.ingresos = 0,
  });
}

class _VentaHuevo {
  final int id;
  final String fecha;
  final String lote;
  final double cantidad;
  final double precioUnit;
  final double total;

  const _VentaHuevo({
    required this.id,
    required this.fecha,
    required this.lote,
    required this.cantidad,
    required this.precioUnit,
    required this.total,
  });
}

class _VentaPorLote {
  final String lote;
  final double cantidad;
  final double ingresos;

  const _VentaPorLote({
    required this.lote,
    required this.cantidad,
    required this.ingresos,
  });
}

class _VentaPorMes {
  final String mes;
  final double cantidad;
  final double ingresos;

  const _VentaPorMes({
    required this.mes,
    required this.cantidad,
    required this.ingresos,
  });
}

class _DistribucionIngreso {
  final String nombre;
  final double valor;

  const _DistribucionIngreso({
    required this.nombre,
    required this.valor,
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
