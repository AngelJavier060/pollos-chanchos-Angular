import 'package:flutter/material.dart';
import '../services/inventario_service.dart';
import '../models/entrada_inventario_model.dart';

/// Página del Centro de Alertas de Inventario
/// Muestra productos agotados, stock crítico, por vencer y vencidos
class AlertasInventarioPage extends StatefulWidget {
  const AlertasInventarioPage({super.key});

  @override
  State<AlertasInventarioPage> createState() => _AlertasInventarioPageState();
}

class _AlertasInventarioPageState extends State<AlertasInventarioPage> {
  final InventarioService _service = InventarioService();
  
  List<StockRealProducto> _productosAgotados = [];
  List<StockRealProducto> _productosCriticos = [];
  List<EntradaInventarioModel> _entradasPorVencer = [];
  List<EntradaInventarioModel> _entradasVencidas = [];
  
  bool _isLoading = true;
  String? _error;
  int _diasAlerta = 15;

  @override
  void initState() {
    super.initState();
    _cargarDatos();
  }

  Future<void> _cargarDatos() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final stockReal = await _service.obtenerStockReal();
      final porVencer = await _service.obtenerEntradasPorVencer(dias: _diasAlerta);
      final vencidas = await _service.obtenerEntradasVencidas();
      
      setState(() {
        _productosAgotados = stockReal.where((p) => p.estado == 'agotado').toList();
        _productosCriticos = stockReal.where((p) => p.estado == 'critico').toList();
        _entradasPorVencer = porVencer;
        _entradasVencidas = vencidas;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[100],
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _buildError()
              : RefreshIndicator(
                  onRefresh: _cargarDatos,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    child: Column(
                      children: [
                        _buildHeader(),
                        Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            children: [
                              _buildAgotadosSection(),
                              const SizedBox(height: 16),
                              _buildCriticosSection(),
                              const SizedBox(height: 16),
                              _buildPorVencerSection(),
                              const SizedBox(height: 16),
                              _buildVencidosSection(),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 64, color: Colors.red[300]),
          const SizedBox(height: 16),
          Text('Error al cargar datos', style: TextStyle(fontSize: 18, color: Colors.grey[700])),
          const SizedBox(height: 8),
          Text(_error ?? '', style: TextStyle(fontSize: 14, color: Colors.grey[500]), textAlign: TextAlign.center),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: _cargarDatos,
            icon: const Icon(Icons.refresh),
            label: const Text('Reintentar'),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF2D3748), Color(0xFF1A202C)],
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        ),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // AppBar row
              Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back, color: Colors.white),
                    onPressed: () => Navigator.pop(context),
                  ),
                  const SizedBox(width: 8),
                  const Icon(Icons.notifications, color: Colors.amber, size: 32),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Centro de Alertas',
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        Text(
                          'Panel de control para gestión proactiva del stock',
                          style: TextStyle(fontSize: 12, color: Colors.white70),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              
              // Controles
              Row(
                children: [
                  // Selector de días
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white.withAlpha(26),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        const Text('Días alerta:', style: TextStyle(color: Colors.white70, fontSize: 13)),
                        const SizedBox(width: 8),
                        Container(
                          width: 50,
                          height: 32,
                          decoration: BoxDecoration(
                            color: Colors.white.withAlpha(38),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: TextField(
                            textAlign: TextAlign.center,
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                            decoration: const InputDecoration(
                              border: InputBorder.none,
                              contentPadding: EdgeInsets.symmetric(vertical: 8),
                            ),
                            keyboardType: TextInputType.number,
                            controller: TextEditingController(text: _diasAlerta.toString()),
                            onSubmitted: (value) {
                              final dias = int.tryParse(value) ?? 15;
                              setState(() => _diasAlerta = dias);
                              _cargarDatos();
                            },
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  
                  // Botón actualizar
                  ElevatedButton.icon(
                    onPressed: _cargarDatos,
                    icon: const Icon(Icons.refresh, size: 18),
                    label: const Text('Actualizar'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue[600],
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              
              // Stats cards
              Row(
                children: [
                  Expanded(child: _buildStatCard('Agotados', _productosAgotados.length, Colors.red)),
                  const SizedBox(width: 12),
                  Expanded(child: _buildStatCard('Críticos', _productosCriticos.length, Colors.amber)),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(child: _buildStatCard('Por Vencer', _entradasPorVencer.length, Colors.orange)),
                  const SizedBox(width: 12),
                  Expanded(child: _buildStatCard('Vencidos', _entradasVencidas.length, Colors.grey)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatCard(String title, int count, Color color) {
    return Container(
      height: 80,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: color.withAlpha(26),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withAlpha(128), width: 2),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  title,
                  style: TextStyle(fontSize: 11, color: color),
                ),
                Text(
                  count.toString(),
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAgotadosSection() {
    return _buildAlertSection(
      title: 'PRODUCTOS AGOTADOS',
      subtitle: 'Requieren reposición inmediata',
      count: _productosAgotados.length,
      color: Colors.red,
      icon: Icons.error,
      emptyMessage: '¡Ningún producto agotado! Stock disponible para todos los productos.',
      emptyIcon: Icons.thumb_up,
      emptyIconColor: Colors.green,
      content: _productosAgotados.isEmpty
          ? null
          : Column(
              children: _productosAgotados.map((p) => _buildProductoAlertCard(p, Colors.red)).toList(),
            ),
    );
  }

  Widget _buildCriticosSection() {
    return _buildAlertSection(
      title: 'STOCK CRÍTICO',
      subtitle: 'Por debajo del stock mínimo',
      count: _productosCriticos.length,
      color: Colors.amber[700]!,
      icon: Icons.warning_amber,
      emptyMessage: 'Todos los productos están por encima del stock mínimo.',
      emptyIcon: Icons.thumb_up,
      emptyIconColor: Colors.green,
      content: _productosCriticos.isEmpty
          ? null
          : Column(
              children: _productosCriticos.map((p) => _buildProductoAlertCard(p, Colors.amber[700]!)).toList(),
            ),
    );
  }

  Widget _buildPorVencerSection() {
    return _buildAlertSection(
      title: 'PRÓXIMOS A VENCER',
      subtitle: 'Vencen en ≤ $_diasAlerta días',
      count: _entradasPorVencer.length,
      color: Colors.orange,
      icon: Icons.schedule,
      emptyMessage: 'No hay productos próximos a vencer en los próximos $_diasAlerta días.',
      emptyIcon: Icons.thumb_up,
      emptyIconColor: Colors.green,
      content: _entradasPorVencer.isEmpty
          ? null
          : Column(
              children: _entradasPorVencer.map((e) => _buildEntradaAlertCard(e, Colors.orange)).toList(),
            ),
    );
  }

  Widget _buildVencidosSection() {
    return _buildAlertSection(
      title: 'VENCIDOS',
      subtitle: 'No consumibles, considerar dar de baja',
      count: _entradasVencidas.length,
      color: Colors.grey[600]!,
      icon: Icons.cancel,
      emptyMessage: 'No hay productos vencidos.',
      emptyIcon: Icons.thumb_up,
      emptyIconColor: Colors.green,
      content: _entradasVencidas.isEmpty
          ? null
          : Column(
              children: _entradasVencidas.map((e) => _buildEntradaAlertCard(e, Colors.grey[600]!)).toList(),
            ),
    );
  }

  Widget _buildAlertSection({
    required String title,
    required String subtitle,
    required int count,
    required Color color,
    required IconData icon,
    required String emptyMessage,
    required IconData emptyIcon,
    required Color emptyIconColor,
    Widget? content,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border(left: BorderSide(color: color, width: 4)),
        boxShadow: [
          BoxShadow(color: Colors.black.withAlpha(13), blurRadius: 8, offset: const Offset(0, 2)),
        ],
      ),
      child: Column(
        children: [
          // Header
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: color.withAlpha(13),
              borderRadius: const BorderRadius.only(
                topRight: Radius.circular(16),
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: color.withAlpha(26),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(icon, color: color, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            '$title ($count)',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                              color: color.withAlpha(230),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        subtitle,
                        style: TextStyle(fontSize: 12, color: color.withAlpha(179)),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          
          // Content
          if (content != null)
            Padding(
              padding: const EdgeInsets.all(12),
              child: content,
            )
          else
            Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: emptyIconColor.withAlpha(26),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(emptyIcon, color: emptyIconColor, size: 28),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    emptyMessage,
                    style: TextStyle(color: Colors.grey[600], fontSize: 14),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildProductoAlertCard(StockRealProducto producto, Color color) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withAlpha(13),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withAlpha(51)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Fila superior: nombre y stock
          Row(
            children: [
              Expanded(
                child: Text(
                  producto.nombre,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Text(
                '${producto.stockDisponible.toStringAsFixed(1)} ${producto.unidadMedida}',
                style: TextStyle(fontWeight: FontWeight.bold, color: color, fontSize: 15),
              ),
            ],
          ),
          const SizedBox(height: 6),
          // Fila inferior: categoría, nivel mín y botón
          Row(
            children: [
              Expanded(
                child: Wrap(
                  spacing: 8,
                  children: [
                    Text(
                      producto.categoria ?? 'General',
                      style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                    ),
                    Text(
                      'Mín: ${producto.nivelMinimo.toStringAsFixed(0)}',
                      style: TextStyle(fontSize: 11, color: Colors.grey[500]),
                    ),
                  ],
                ),
              ),
              ElevatedButton(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Reponer producto - Próximamente')),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: color,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  minimumSize: Size.zero,
                ),
                child: const Text('Reponer', style: TextStyle(fontSize: 11)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildEntradaAlertCard(EntradaInventarioModel entrada, Color color) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withAlpha(13),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withAlpha(51)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Fila superior: nombre y stock
          Row(
            children: [
              Expanded(
                child: Text(
                  entrada.productName ?? 'Producto #${entrada.productId}',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Text(
                (entrada.stockBaseRestante ?? 0).toStringAsFixed(1),
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: color),
              ),
              Text(
                ' Stock',
                style: TextStyle(fontSize: 11, color: Colors.grey[500]),
              ),
            ],
          ),
          const SizedBox(height: 6),
          // Fila inferior: lote, fecha y botón
          Row(
            children: [
              Expanded(
                child: Wrap(
                  spacing: 8,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text(
                      'Lote: ${entrada.codigoLote ?? '-'}',
                      style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                    ),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.calendar_today, size: 11, color: color),
                        const SizedBox(width: 3),
                        Text(
                          _formatDate(entrada.fechaVencimiento) ?? 'Sin fecha',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: color),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              ElevatedButton.icon(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Priorizar uso - Próximamente')),
                  );
                },
                icon: const Icon(Icons.schedule, size: 12, color: Colors.white),
                label: const Text('Priorizar', style: TextStyle(fontSize: 10)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: color,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  minimumSize: Size.zero,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String? _formatDate(String? isoDate) {
    if (isoDate == null || isoDate.isEmpty) return null;
    try {
      final date = DateTime.parse(isoDate);
      return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
    } catch (_) {
      return isoDate;
    }
  }
}
