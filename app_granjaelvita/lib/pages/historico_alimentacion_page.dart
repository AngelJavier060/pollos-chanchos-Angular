import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/plan_nutricional_service.dart';
import '../services/auth_service.dart';
import '../services/lote_service.dart';

/// Modelo para registros de alimentación históricos
class RegistroAlimentacion {
  final int id;
  final String fecha;
  final String fechaCreacion;
  final String loteId;
  final String loteNombre;
  final String loteCodigo;
  final double cantidad;
  final int? animalesVivos;
  final int? animalesMuertos;
  final String? observaciones;
  final String estado;
  final String jornada;
  final List<ProductoConsumido> productos;

  RegistroAlimentacion({
    required this.id,
    required this.fecha,
    required this.fechaCreacion,
    required this.loteId,
    required this.loteNombre,
    required this.loteCodigo,
    required this.cantidad,
    this.animalesVivos,
    this.animalesMuertos,
    this.observaciones,
    required this.estado,
    required this.jornada,
    this.productos = const [],
  });

  factory RegistroAlimentacion.fromJson(Map<String, dynamic> json) {
    // Parsear jornada de la hora de creación
    String jornada = 'N/A';
    try {
      final fechaCreacion = json['createDate'] ?? json['fechaCreacion'] ?? '';
      if (fechaCreacion.isNotEmpty) {
        final dt = DateTime.parse(fechaCreacion);
        jornada = dt.hour < 12 ? 'Mañana' : 'Tarde';
      }
    } catch (_) {}

    // Extraer productos de las observaciones
    final obs = json['observations'] ?? json['observaciones'] ?? '';
    final productos = _parseProductos(obs, json['quantityApplied'] ?? json['cantidadAplicada'] ?? 0);

    // Extraer nombre del lote de las observaciones si no viene directo
    String loteNombre = json['loteDescripcion'] ?? '';
    if (loteNombre.isEmpty || loteNombre == 'Lote sin descripción') {
      final match = RegExp(r'Lote:\s*([^(|]+)').firstMatch(obs);
      if (match != null) loteNombre = match.group(1)?.trim() ?? '';
    }

    return RegistroAlimentacion(
      id: json['id'] ?? 0,
      fecha: json['executionDate'] ?? json['fecha'] ?? '',
      fechaCreacion: json['createDate'] ?? json['fechaCreacion'] ?? '',
      loteId: json['loteId'] ?? '',
      loteNombre: loteNombre.isNotEmpty ? loteNombre : 'Sin nombre',
      loteCodigo: json['loteCodigo'] ?? json['codigoLote'] ?? '',
      cantidad: (json['quantityApplied'] ?? json['cantidadAplicada'] ?? 0).toDouble(),
      animalesVivos: json['animalesVivos'],
      animalesMuertos: json['animalesMuertos'],
      observaciones: obs,
      estado: json['status'] ?? json['estado'] ?? 'EJECUTADO',
      jornada: jornada,
      productos: productos,
    );
  }

  static List<ProductoConsumido> _parseProductos(String obs, num cantidad) {
    final productos = <ProductoConsumido>[];
    final match = RegExp(r'Producto:\s*([^|]+)').firstMatch(obs);
    if (match != null) {
      final nombre = match.group(1)?.trim() ?? '';
      if (nombre.isNotEmpty) {
        productos.add(ProductoConsumido(nombre: nombre, cantidad: cantidad.toDouble()));
      }
    }
    return productos;
  }
}

class ProductoConsumido {
  final String nombre;
  final double cantidad;

  ProductoConsumido({required this.nombre, required this.cantidad});
}

class HistoricoAlimentacionPage extends StatefulWidget {
  const HistoricoAlimentacionPage({super.key});

  @override
  State<HistoricoAlimentacionPage> createState() => _HistoricoAlimentacionPageState();
}

class _HistoricoAlimentacionPageState extends State<HistoricoAlimentacionPage> {
  final PlanNutricionalService _planService = PlanNutricionalService();
  final AuthService _authService = AuthService();
  
  bool _cargando = true;
  List<RegistroAlimentacion> _registros = [];
  String _tipoAnimal = 'pollo';
  String? _error;

  // Estadísticas
  int _totalRegistros = 0;
  double _totalConsumido = 0;
  int _lotesActivos = 0;

  @override
  void initState() {
    super.initState();
    _cargarDatos();
  }

  Future<void> _cargarDatos() async {
    setState(() { _cargando = true; _error = null; });
    
    try {
      _tipoAnimal = await AuthService.getTipoAnimal();
      
      // Obtener historial de los últimos 3 meses
      final fechaFin = DateTime.now();
      final fechaInicio = DateTime.now().subtract(const Duration(days: 90));
      final fechaInicioStr = DateFormat('yyyy-MM-dd').format(fechaInicio);
      final fechaFinStr = DateFormat('yyyy-MM-dd').format(fechaFin);
      
      final datos = await _planService.obtenerHistorialAlimentacion(fechaInicioStr, fechaFinStr);
      
      // Convertir los datos a RegistroAlimentacion
      final registros = datos.map<RegistroAlimentacion>((item) {
        if (item is Map<String, dynamic>) {
          return RegistroAlimentacion(
            id: item['id'] ?? 0,
            fecha: item['fecha'] ?? '',
            fechaCreacion: item['fechaCreacion'] ?? '',
            loteId: item['loteId'] ?? '',
            loteNombre: item['loteNombre'] ?? 'Sin nombre',
            loteCodigo: item['loteCodigo'] ?? '',
            cantidad: (item['cantidad'] ?? 0).toDouble(),
            animalesVivos: item['animalesVivos'],
            animalesMuertos: item['animalesMuertos'],
            observaciones: item['observaciones'],
            estado: item['estado'] ?? 'EJECUTADO',
            jornada: item['jornada'] ?? 'N/A',
          );
        }
        return RegistroAlimentacion(
          id: 0, fecha: '', fechaCreacion: '', loteId: '', 
          loteNombre: '', loteCodigo: '', cantidad: 0, estado: '', jornada: '',
        );
      }).toList();
      
      setState(() {
        _registros = registros;
        _totalRegistros = registros.length;
        _totalConsumido = registros.fold(0.0, (sum, r) => sum + r.cantidad);
        _lotesActivos = registros.map((r) => r.loteId).toSet().length;
        _cargando = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Error al cargar historial: $e';
        _cargando = false;
      });
    }
  }

  MaterialColor get _colorPrimario => _tipoAnimal == 'chanchos' ? Colors.pink : Colors.green;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Histórico de Alimentación', style: TextStyle(color: _colorPrimario.shade700)),
        backgroundColor: _colorPrimario.shade50,
        iconTheme: IconThemeData(color: _colorPrimario.shade700),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _cargarDatos,
          ),
        ],
      ),
      body: _cargando 
        ? Center(child: CircularProgressIndicator(color: _colorPrimario))
        : _error != null
          ? _buildError()
          : _buildContent(),
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 64, color: Colors.red.shade300),
          const SizedBox(height: 16),
          Text(_error!, style: TextStyle(color: Colors.red.shade700)),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: _cargarDatos,
            icon: const Icon(Icons.refresh),
            label: const Text('Reintentar'),
            style: ElevatedButton.styleFrom(backgroundColor: _colorPrimario),
          ),
        ],
      ),
    );
  }

  Widget _buildContent() {
    return RefreshIndicator(
      onRefresh: _cargarDatos,
      color: _colorPrimario,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // KPI Cards
          _buildKPICards(),
          const SizedBox(height: 20),
          
          // Lista de registros
          Text(
            'Registros Recientes',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: _colorPrimario.shade800),
          ),
          const SizedBox(height: 12),
          
          if (_registros.isEmpty)
            _buildEmptyState()
          else
            ..._registros.take(50).map((registro) => _buildRegistroCard(registro)),
        ],
      ),
    );
  }

  Widget _buildKPICards() {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _buildKPICard(
                icon: Icons.list_alt,
                title: 'Total Registros',
                value: _totalRegistros.toString(),
                color: Colors.blue,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildKPICard(
                icon: Icons.scale,
                title: 'Total Consumido',
                value: '${_totalConsumido.toStringAsFixed(2)} kg',
                color: Colors.orange,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildKPICard(
                icon: Icons.inventory_2,
                title: 'Lotes Activos',
                value: _lotesActivos.toString(),
                color: _colorPrimario,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildKPICard(
                icon: Icons.trending_up,
                title: 'Promedio/Registro',
                value: _totalRegistros > 0 
                  ? '${(_totalConsumido / _totalRegistros).toStringAsFixed(2)} kg'
                  : '0 kg',
                color: Colors.purple,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildKPICard({
    required IconData icon,
    required String title,
    required String value,
    required MaterialColor color,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.shade100,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: color.shade600, size: 20),
              ),
              const Spacer(),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: color.shade700),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: TextStyle(fontSize: 12, color: color.shade600),
          ),
        ],
      ),
    );
  }

  Widget _buildRegistroCard(RegistroAlimentacion registro) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: () => _mostrarDetalles(registro),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header con fecha y jornada
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: _colorPrimario.shade100,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      '#${registro.id}',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: _colorPrimario.shade700),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: registro.jornada == 'Mañana' ? Colors.amber.shade100 : Colors.indigo.shade100,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          registro.jornada == 'Mañana' ? Icons.wb_sunny : Icons.nightlight_round,
                          size: 14,
                          color: registro.jornada == 'Mañana' ? Colors.amber.shade700 : Colors.indigo.shade700,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          registro.jornada,
                          style: TextStyle(
                            fontSize: 12,
                            color: registro.jornada == 'Mañana' ? Colors.amber.shade700 : Colors.indigo.shade700,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Spacer(),
                  Text(
                    _formatearFecha(registro.fechaCreacion),
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              
              // Lote info
              Row(
                children: [
                  Icon(Icons.inventory_2, size: 18, color: _colorPrimario),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      registro.loteNombre,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                  ),
                ],
              ),
              if (registro.loteCodigo.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(left: 26),
                  child: Text(
                    'Código: ${registro.loteCodigo}',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                ),
              const SizedBox(height: 12),
              
              // Cantidad
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.orange.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.scale, color: Colors.orange.shade700, size: 20),
                        const SizedBox(width: 8),
                        const Text('Cantidad:'),
                      ],
                    ),
                    Text(
                      '${registro.cantidad.toStringAsFixed(2)} kg',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.orange.shade800),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              
              // Animales y Ver detalles
              Row(
                children: [
                  if (registro.animalesVivos != null) ...[
                    Icon(Icons.favorite, size: 16, color: Colors.green.shade600),
                    const SizedBox(width: 4),
                    Text('${registro.animalesVivos}', style: TextStyle(color: Colors.green.shade700)),
                    const SizedBox(width: 12),
                  ],
                  if (registro.animalesMuertos != null && registro.animalesMuertos! > 0) ...[
                    Icon(Icons.warning, size: 16, color: Colors.red.shade600),
                    const SizedBox(width: 4),
                    Text('${registro.animalesMuertos}', style: TextStyle(color: Colors.red.shade700)),
                  ],
                  const Spacer(),
                  TextButton.icon(
                    onPressed: () => _mostrarDetalles(registro),
                    icon: const Icon(Icons.visibility, size: 18),
                    label: const Text('Ver detalles'),
                    style: TextButton.styleFrom(foregroundColor: _colorPrimario),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Icon(Icons.inbox, size: 64, color: Colors.grey.shade400),
          const SizedBox(height: 16),
          Text(
            'No hay registros de alimentación',
            style: TextStyle(fontSize: 16, color: Colors.grey.shade600),
          ),
          const SizedBox(height: 8),
          Text(
            'Los registros aparecerán aquí después de alimentar a los animales.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
          ),
        ],
      ),
    );
  }

  void _mostrarDetalles(RegistroAlimentacion registro) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.75,
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: _colorPrimario,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.receipt_long, color: Colors.white),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Detalles del Registro #${registro.id}',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            
            // Content
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Lote
                  _buildDetalleSection(
                    icon: Icons.inventory_2,
                    title: 'Lote',
                    color: Colors.green,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(registro.loteNombre, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        if (registro.loteCodigo.isNotEmpty)
                          Text('Código: ${registro.loteCodigo}', style: TextStyle(color: Colors.grey.shade600)),
                      ],
                    ),
                  ),
                  
                  // Fechas
                  _buildDetalleSection(
                    icon: Icons.calendar_today,
                    title: 'Fechas',
                    color: Colors.blue,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Registro: ${_formatearFecha(registro.fecha)}'),
                        Text('Creación: ${_formatearFechaHora(registro.fechaCreacion)}'),
                      ],
                    ),
                  ),
                  
                  // Cantidad
                  _buildDetalleSection(
                    icon: Icons.scale,
                    title: 'Cantidad Total',
                    color: Colors.orange,
                    child: Text(
                      '${registro.cantidad.toStringAsFixed(2)} kg',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 24, color: Colors.orange.shade800),
                    ),
                  ),
                  
                  // Productos consumidos
                  _buildDetalleSection(
                    icon: Icons.restaurant,
                    title: 'Productos Consumidos',
                    color: Colors.amber,
                    child: registro.productos.isNotEmpty
                      ? Column(
                          children: registro.productos.map((p) => Padding(
                            padding: const EdgeInsets.symmetric(vertical: 4),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    Icon(Icons.grass, size: 16, color: Colors.green.shade600),
                                    const SizedBox(width: 8),
                                    Text(p.nombre),
                                  ],
                                ),
                                Text('${p.cantidad.toStringAsFixed(2)} kg', style: const TextStyle(fontWeight: FontWeight.bold)),
                              ],
                            ),
                          )).toList(),
                        )
                      : Text('Sin productos específicos', style: TextStyle(color: Colors.grey.shade500, fontStyle: FontStyle.italic)),
                  ),
                  
                  // Animales
                  _buildDetalleSection(
                    icon: Icons.pets,
                    title: 'Animales',
                    color: Colors.purple,
                    child: Row(
                      children: [
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.green.shade50,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Column(
                              children: [
                                Icon(Icons.favorite, color: Colors.green.shade600),
                                const SizedBox(height: 4),
                                Text('Vivos', style: TextStyle(color: Colors.green.shade600, fontSize: 12)),
                                Text(
                                  registro.animalesVivos?.toString() ?? 'N/A',
                                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.green.shade800),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.red.shade50,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Column(
                              children: [
                                Icon(Icons.warning, color: Colors.red.shade600),
                                const SizedBox(height: 4),
                                Text('Muertos', style: TextStyle(color: Colors.red.shade600, fontSize: 12)),
                                Text(
                                  registro.animalesMuertos?.toString() ?? 'N/A',
                                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.red.shade800),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  
                  // Estado y jornada
                  _buildDetalleSection(
                    icon: Icons.info,
                    title: 'Estado',
                    color: Colors.grey,
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: registro.estado == 'EJECUTADO' ? Colors.green.shade100 : Colors.yellow.shade100,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            registro.estado,
                            style: TextStyle(
                              color: registro.estado == 'EJECUTADO' ? Colors.green.shade800 : Colors.yellow.shade800,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: registro.jornada == 'Mañana' ? Colors.amber.shade100 : Colors.indigo.shade100,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                registro.jornada == 'Mañana' ? Icons.wb_sunny : Icons.nightlight_round,
                                size: 16,
                                color: registro.jornada == 'Mañana' ? Colors.amber.shade700 : Colors.indigo.shade700,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                registro.jornada,
                                style: TextStyle(
                                  color: registro.jornada == 'Mañana' ? Colors.amber.shade700 : Colors.indigo.shade700,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  
                  // Observaciones
                  if (registro.observaciones != null && registro.observaciones!.isNotEmpty)
                    _buildDetalleSection(
                      icon: Icons.comment,
                      title: 'Observaciones',
                      color: Colors.grey,
                      child: Text(
                        registro.observaciones!,
                        style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
                      ),
                    ),
                ],
              ),
            ),
            
            // Footer
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                border: Border(top: BorderSide(color: Colors.grey.shade300)),
              ),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(context),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _colorPrimario,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text('Aceptar', style: TextStyle(fontSize: 16, color: Colors.white)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetalleSection({
    required IconData icon,
    required String title,
    required MaterialColor color,
    required Widget child,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: color.shade600),
              const SizedBox(width: 8),
              Text(title, style: TextStyle(fontWeight: FontWeight.bold, color: color.shade700)),
            ],
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }

  String _formatearFecha(String fecha) {
    try {
      final dt = DateTime.parse(fecha);
      return DateFormat('d MMM yyyy', 'es').format(dt);
    } catch (_) {
      return fecha;
    }
  }

  String _formatearFechaHora(String fecha) {
    try {
      final dt = DateTime.parse(fecha);
      return DateFormat('d MMM yyyy, HH:mm', 'es').format(dt);
    } catch (_) {
      return fecha;
    }
  }
}
