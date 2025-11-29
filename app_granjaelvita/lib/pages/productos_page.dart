import 'package:flutter/material.dart';
import '../models/producto_model.dart';
import '../services/producto_service.dart';
import 'producto_form_page.dart';
import 'productos_dashboard_page.dart';

class ProductosPage extends StatefulWidget {
  const ProductosPage({super.key});

  @override
  State<ProductosPage> createState() => _ProductosPageState();
}

class _ProductosPageState extends State<ProductosPage> {
  List<ProductoModel> _productos = [];
  bool _cargando = true;
  String? _error;
  bool _mostrarDashboard = true;

  @override
  void initState() {
    super.initState();
    _cargarProductos();
  }

  Future<void> _cargarProductos() async {
    setState(() {
      _cargando = true;
      _error = null;
    });

    try {
      final productos = await ProductoService.listarProductos();
      setState(() {
        _productos = productos;
        _cargando = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _cargando = false;
      });
    }
  }

  void _navegarAFormulario({ProductoModel? producto}) async {
    final resultado = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ProductoFormPage(producto: producto),
      ),
    );

    if (resultado == true) {
      _cargarProductos();
    }
  }

  @override
  Widget build(BuildContext context) {
    // Si está cargando, mostrar indicador
    if (_cargando) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Productos'),
          backgroundColor: const Color(0xFF6366F1),
          foregroundColor: Colors.white,
          elevation: 0,
        ),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    // Si hay error, mostrar pantalla de error
    if (_error != null) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Productos'),
          backgroundColor: const Color(0xFF6366F1),
          foregroundColor: Colors.white,
          elevation: 0,
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 64, color: Colors.red),
              const SizedBox(height: 16),
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.red),
              ),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: _cargarProductos,
                icon: const Icon(Icons.refresh),
                label: const Text('Reintentar'),
              ),
            ],
          ),
        ),
      );
    }

    // Si debe mostrar dashboard y hay productos, mostrar dashboard
    if (_mostrarDashboard && _productos.isNotEmpty) {
      return ProductosDashboardPage(
        productos: _productos,
        onContinue: () {
          setState(() {
            _mostrarDashboard = false;
          });
        },
      );
    }

    // Mostrar lista de productos o estado vacío
    return Scaffold(
      appBar: AppBar(
        title: const Text('Productos'),
        backgroundColor: const Color(0xFF6366F1),
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          if (_productos.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.bar_chart),
              tooltip: 'Ver Dashboard',
              onPressed: () {
                setState(() {
                  _mostrarDashboard = true;
                });
              },
            ),
        ],
      ),
      body: _productos.isEmpty ? _buildEmptyState() : _buildProductList(),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _navegarAFormulario(),
        backgroundColor: const Color(0xFF6366F1),
        icon: const Icon(Icons.add),
        label: const Text('Nuevo Producto'),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.inventory_2_outlined,
              size: 100, color: Colors.grey[300]),
          const SizedBox(height: 24),
          Text(
            'No hay productos registrados',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Agrega tu primer producto',
            style: TextStyle(fontSize: 14, color: Colors.grey[500]),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: () => _navegarAFormulario(),
            icon: const Icon(Icons.add),
            label: const Text('Agregar Producto'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF6366F1),
              padding: const EdgeInsets.symmetric(
                  horizontal: 24, vertical: 12),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProductList() {
    // Estadísticas
    final totalProductos = _productos.length;
    final productosPollos =
        _productos.where((p) => p.animalTipo == 'pollos').length;
    final productosChanchos =
        _productos.where((p) => p.animalTipo == 'chanchos').length;
    final productosBajoStock =
        _productos.where((p) => p.cantidadActual <= p.nivelMinimo).length;

    return Column(
      children: [
        // Estadísticas
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.1),
                blurRadius: 10,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: _buildStatCard(
                      'Total',
                      totalProductos.toString(),
                      Icons.inventory_2,
                      Colors.white,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildStatCard(
                      'Pollos',
                      productosPollos.toString(),
                      Icons.egg,
                      Colors.white,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _buildStatCard(
                      'Chanchos',
                      productosChanchos.toString(),
                      Icons.pets,
                      Colors.white,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildStatCard(
                      'Bajo Stock',
                      productosBajoStock.toString(),
                      Icons.warning_amber,
                      productosBajoStock > 0
                          ? Colors.orange
                          : Colors.white,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        // Lista de productos
        Expanded(
          child: RefreshIndicator(
            onRefresh: _cargarProductos,
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _productos.length,
              itemBuilder: (context, index) {
                final producto = _productos[index];
                return _buildProductCard(producto);
              },
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStatCard(
      String label, String value, IconData icon, Color iconColor) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.2),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(icon, color: iconColor, size: 32),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 12,
                  color: Colors.white70,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildProductCard(ProductoModel producto) {
    final bajoStock = producto.cantidadActual <= producto.nivelMinimo;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => _navegarAFormulario(producto: producto),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF6366F1).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      _getCategoriaIcon(producto.categoriaPrincipal),
                      color: const Color(0xFF6366F1),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          producto.nombre,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          producto.categoriaPrincipal,
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  ),
                  _buildAnimalChip(producto.animalTipo),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _buildInfoRow(
                      Icons.inventory,
                      'Stock: ${producto.cantidadActual} ${producto.unidadMedida}',
                      bajoStock ? Colors.orange : Colors.grey[700]!,
                    ),
                  ),
                  Expanded(
                    child: _buildInfoRow(
                      Icons.attach_money,
                      '\$${producto.precioUnitario.toStringAsFixed(2)}',
                      Colors.green,
                    ),
                  ),
                ],
              ),
              if (bajoStock)
                Container(
                  margin: const EdgeInsets.only(top: 12),
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.orange.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.orange),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.warning_amber,
                          color: Colors.orange, size: 16),
                      const SizedBox(width: 8),
                      Text(
                        'Stock bajo - Mínimo: ${producto.nivelMinimo}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.orange,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAnimalChip(String tipo) {
    Color color;
    String label;
    IconData icon;

    switch (tipo) {
      case 'pollos':
        color = Colors.blue;
        label = 'Pollos';
        icon = Icons.egg;
        break;
      case 'chanchos':
        color = Colors.pink;
        label = 'Chanchos';
        icon = Icons.pets;
        break;
      default:
        color = Colors.purple;
        label = 'Ambos';
        icon = Icons.all_inclusive;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String text, Color color) {
    return Row(
      children: [
        Icon(icon, size: 16, color: color),
        const SizedBox(width: 4),
        Expanded(
          child: Text(
            text,
            style: TextStyle(fontSize: 12, color: color),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  IconData _getCategoriaIcon(String categoria) {
    switch (categoria.toLowerCase()) {
      case 'vacunas':
        return Icons.vaccines;
      case 'antibioticos':
        return Icons.medication;
      case 'antiparasitarios':
        return Icons.bug_report;
      case 'vitaminas':
        return Icons.water_drop;
      case 'desinfectantes':
        return Icons.cleaning_services;
      default:
        return Icons.category;
    }
  }
}
