import 'package:flutter/material.dart';
import '../services/inventario_service.dart';
import '../models/entrada_inventario_model.dart';

/// Página de Gestión de Entradas de Inventario
/// Muestra inversión por producto y listado de entradas con filtros
class EntradasInventarioPage extends StatefulWidget {
  const EntradasInventarioPage({super.key});

  @override
  State<EntradasInventarioPage> createState() => _EntradasInventarioPageState();
}

class _EntradasInventarioPageState extends State<EntradasInventarioPage> {
  final InventarioService _service = InventarioService();
  List<InversionProducto> _inversiones = [];
  List<EntradaInventarioModel> _entradas = [];
  bool _isLoading = true;
  String? _error;
  String _filtroEstado = 'vigentes'; // 'vigentes', 'historico', 'todos'
  String _busqueda = '';
  final TextEditingController _busquedaController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _cargarDatos();
  }

  @override
  void dispose() {
    _busquedaController.dispose();
    super.dispose();
  }

  Future<void> _cargarDatos() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final inversiones = await _service.calcularInversionPorProducto();
      final entradas = await _service.obtenerTodasLasEntradas();
      
      setState(() {
        _inversiones = inversiones;
        _entradas = entradas;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  double get _totalInvertido => _inversiones.fold(0, (sum, i) => sum + i.inversionTotal);
  
  List<EntradaInventarioModel> get _entradasFiltradas {
    var resultado = _entradas;
    
    // Filtrar por estado
    switch (_filtroEstado) {
      case 'vigentes':
        resultado = resultado.where((e) => e.esVigente).toList();
        break;
      case 'historico':
        resultado = resultado.where((e) => e.esFinalizada).toList();
        break;
    }
    
    // Filtrar por búsqueda
    if (_busqueda.isNotEmpty) {
      final busquedaLower = _busqueda.toLowerCase();
      resultado = resultado.where((e) =>
        (e.productName?.toLowerCase().contains(busquedaLower) ?? false) ||
        (e.codigoLote?.toLowerCase().contains(busquedaLower) ?? false)
      ).toList();
    }
    
    return resultado;
  }
  
  int get _vigentesCount => _entradas.where((e) => e.esVigente).length;
  int get _historicoCount => _entradas.where((e) => e.esFinalizada).length;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[100],
      appBar: AppBar(
        title: const Text('Gestión de Entradas'),
        backgroundColor: Colors.indigo,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _cargarDatos,
            tooltip: 'Actualizar',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _buildError()
              : RefreshIndicator(
                  onRefresh: _cargarDatos,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildSearchBar(),
                        const SizedBox(height: 16),
                        _buildInversionSection(),
                        const SizedBox(height: 24),
                        _buildEntradasSection(),
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

  Widget _buildSearchBar() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(color: Colors.black.withAlpha(13), blurRadius: 8, offset: const Offset(0, 2)),
        ],
      ),
      child: TextField(
        controller: _busquedaController,
        decoration: InputDecoration(
          hintText: 'Buscar por producto o código de lote...',
          prefixIcon: const Icon(Icons.search, color: Colors.grey),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
          filled: true,
          fillColor: Colors.white,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        ),
        onChanged: (value) {
          setState(() => _busqueda = value);
        },
      ),
    );
  }

  Widget _buildInversionSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header con total
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Icon(Icons.attach_money, color: Colors.green[600], size: 24),
                const SizedBox(width: 8),
                const Text(
                  'Inversión por Producto',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1E3A5F)),
                ),
              ],
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text('TOTAL INVERTIDO', style: TextStyle(fontSize: 10, color: Colors.grey[500])),
                Text(
                  '\$${_totalInvertido.toStringAsFixed(2)}',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.green[600]),
                ),
              ],
            ),
          ],
        ),
        const SizedBox(height: 16),
        
        // Grid de inversiones
        _inversiones.isEmpty
            ? _buildEmptyInversion()
            : GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 1.1,
                ),
                itemCount: _inversiones.length,
                itemBuilder: (context, index) => _buildInversionCard(_inversiones[index]),
              ),
      ],
    );
  }

  Widget _buildEmptyInversion() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Center(
        child: Column(
          children: [
            Icon(Icons.inbox, size: 48, color: Colors.grey[400]),
            const SizedBox(height: 8),
            Text('No hay inversiones registradas', style: TextStyle(color: Colors.grey[600])),
          ],
        ),
      ),
    );
  }

  Widget _buildInversionCard(InversionProducto inversion) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border(left: BorderSide(color: Colors.green[500]!, width: 4)),
        boxShadow: [
          BoxShadow(color: Colors.black.withAlpha(13), blurRadius: 8, offset: const Offset(0, 2)),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        inversion.nombre,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        inversion.categoria ?? 'General',
                        style: TextStyle(fontSize: 11, color: Colors.grey[500]),
                      ),
                    ],
                  ),
                ),
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: Colors.green[50],
                    shape: BoxShape.circle,
                  ),
                  child: Icon(Icons.attach_money, color: Colors.green[600], size: 18),
                ),
              ],
            ),
            const Spacer(),
            
            // Inversión total
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Inversión Total', style: TextStyle(fontSize: 11, color: Colors.grey[600])),
                Text(
                  '\$${inversion.inversionTotal.toStringAsFixed(2)}',
                  style: TextStyle(fontWeight: FontWeight.bold, color: Colors.green[600]),
                ),
              ],
            ),
            const SizedBox(height: 4),
            
            // Compra inicial
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(Icons.shopping_cart, size: 12, color: Colors.grey[400]),
                    const SizedBox(width: 4),
                    Text('Compra inicial', style: TextStyle(fontSize: 10, color: Colors.grey[500])),
                  ],
                ),
                Text('\$${inversion.compraInicial.toStringAsFixed(2)}',
                    style: TextStyle(fontSize: 11, color: Colors.grey[600])),
              ],
            ),
            const SizedBox(height: 2),
            
            // Recargas
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(Icons.inbox, size: 12, color: Colors.grey[400]),
                    const SizedBox(width: 4),
                    Text('Recargas', style: TextStyle(fontSize: 10, color: Colors.grey[500])),
                  ],
                ),
                Text('${inversion.cantidadEntradas}',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.blue[600])),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEntradasSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header
        Row(
          children: [
            Icon(Icons.inventory_2, color: Colors.grey[700], size: 22),
            const SizedBox(width: 8),
            const Text(
              'Listado de Entradas',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1E3A5F)),
            ),
          ],
        ),
        const SizedBox(height: 12),
        
        // Tabs de filtro
        _buildFilterTabs(),
        const SizedBox(height: 12),
        
        // Lista de entradas
        _entradasFiltradas.isEmpty
            ? _buildEmptyEntradas()
            : ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _entradasFiltradas.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (context, index) => _buildEntradaCard(_entradasFiltradas[index]),
              ),
      ],
    );
  }

  Widget _buildFilterTabs() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          _buildFilterTab('vigentes', 'Vigentes', _vigentesCount, Colors.green),
          const SizedBox(width: 8),
          _buildFilterTab('historico', 'Histórico', _historicoCount, Colors.grey),
          const SizedBox(width: 8),
          _buildFilterTab('todos', 'Todos', _entradas.length, Colors.blue),
        ],
      ),
    );
  }

  Widget _buildFilterTab(String value, String label, int count, Color color) {
    final isSelected = _filtroEstado == value;
    return GestureDetector(
      onTap: () => setState(() => _filtroEstado = value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? color : Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: isSelected ? color : Colors.grey[300]!),
        ),
        child: Row(
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: isSelected ? Colors.white.withAlpha(204) : color.withAlpha(128),
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                fontWeight: FontWeight.w600,
                color: isSelected ? Colors.white : Colors.grey[700],
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: isSelected ? Colors.white.withAlpha(51) : Colors.grey[200],
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                count.toString(),
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: isSelected ? Colors.white : Colors.grey[700],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyEntradas() {
    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Center(
        child: Column(
          children: [
            Icon(Icons.inbox, size: 48, color: Colors.grey[400]),
            const SizedBox(height: 12),
            Text('No hay entradas registradas', style: TextStyle(color: Colors.grey[600])),
          ],
        ),
      ),
    );
  }

  Widget _buildEntradaCard(EntradaInventarioModel entrada) {
    final esVigente = entrada.esVigente;
    final estadoColor = esVigente ? Colors.green : Colors.grey;
    final estadoText = esVigente ? 'Vigente' : 'Finalizado';
    final estadoIcon = esVigente ? Icons.check_circle : Icons.archive;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(color: Colors.black.withAlpha(13), blurRadius: 8, offset: const Offset(0, 2)),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        entrada.productName ?? 'Producto #${entrada.productId}',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        entrada.unidadControl ?? 'Sin unidad',
                        style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: estadoColor.withAlpha(26),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(estadoIcon, size: 14, color: estadoColor),
                      const SizedBox(width: 4),
                      Text(
                        estadoText,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: estadoColor,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            // Info grid
            Row(
              children: [
                Expanded(
                  child: _buildInfoItem('Lote', entrada.codigoLote ?? '-'),
                ),
                Expanded(
                  child: _buildInfoItem(
                    'Stock Restante',
                    (entrada.stockBaseRestante ?? 0).toStringAsFixed(1),
                    valueColor: estadoColor,
                    isBold: true,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: _buildInfoItem('Ingreso', _formatDate(entrada.fechaIngreso) ?? '-'),
                ),
                Expanded(
                  child: _buildInfoItem('Vence', _formatDate(entrada.fechaVencimiento) ?? 'Sin venc.'),
                ),
              ],
            ),
            
            // Solo mostrar badge de estado
            if (!esVigente) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.archive, size: 12, color: Colors.grey[500]),
                    const SizedBox(width: 4),
                    Text(
                      'Histórico',
                      style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildInfoItem(String label, String value, {Color? valueColor, bool isBold = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(fontSize: 11, color: Colors.grey[500])),
        const SizedBox(height: 2),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            fontWeight: isBold ? FontWeight.bold : FontWeight.w500,
            color: valueColor ?? Colors.grey[800],
          ),
        ),
      ],
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
