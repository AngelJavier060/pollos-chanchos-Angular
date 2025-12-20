import 'package:flutter/material.dart';
import '../services/inventario_service.dart';
import '../models/entrada_inventario_model.dart';
import '../models/proveedor_model.dart';
import '../services/producto_service.dart';

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
  List<StockRealProducto> _stock = [];
  List<StockRealProducto> _agotados = [];
  bool _isLoading = true;
  String? _error;
  String _filtroEstado = 'vigentes'; // 'vigentes', 'historico', 'todos'
  String _busqueda = '';
  final TextEditingController _busquedaController = TextEditingController();
  List<ProveedorModel> _proveedores = [];
  static const Color _brandPrimary = Color(0xFF7A9BCB);
  static const Color _brandSecondary = Color(0xFF9DBDD1);

  @override
  void initState() {
    super.initState();
    _cargarDatos();
    _cargarProveedores();
  }

  /// Banner de productos agotados con acceso directo a recarga
  Widget _buildAgotadosBanner() {
    if (_agotados.isEmpty) return const SizedBox.shrink();
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.red[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.red[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.error_outline, color: Colors.red),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Productos agotados (${_agotados.length}) - Reponer stock',
                  style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF7F1D1D)),
                ),
              ),
              TextButton(
                onPressed: () => _abrirNuevaEntrada(_agotados.first),
                child: const Text('Reponer ahora'),
              )
            ],
          ),
          const SizedBox(height: 8),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: _agotados
                  .map((p) => Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ActionChip(
                          label: Text(p.nombre, overflow: TextOverflow.ellipsis),
                          avatar: const Icon(Icons.inventory_2, size: 18, color: Colors.red),
                          backgroundColor: Colors.white,
                          onPressed: () => _abrirNuevaEntrada(p),
                        ),
                      ))
                  .toList(),
            ),
          )
        ],
      ),
    );
  }

  /// Formulario de nueva entrada (recarga)
  Future<void> _abrirNuevaEntrada(StockRealProducto? preselect) async {
    StockRealProducto? seleccionado = preselect;
    final unidadCtrl = TextEditingController();
    final contenidoCtrl = TextEditingController();
    final cantidadCtrl = TextEditingController();
    final costoBaseCtrl = TextEditingController();
    final costoControlCtrl = TextEditingController();
    final loteCtrl = TextEditingController();
    final observacionesCtrl = TextEditingController();
    String? proveedorNombre;
    int? providerIdSel;
    DateTime? fechaIngreso;
    DateTime? fechaVencimiento;
    bool listenersAttached = false;

    void _syncCostoControl() {
      final contenido = double.tryParse(contenidoCtrl.text.trim());
      final costoBase = double.tryParse(costoBaseCtrl.text.trim());
      if (contenido != null && contenido > 0 && costoBase != null) {
        final calc = costoBase * contenido; // costo por unidad de control = costo base (kg/ml) * contenido
        costoControlCtrl.text = calc.toStringAsFixed(4);
      }
    }

    final productosOrdenados = [
      ..._agotados,
      ..._stock.where((p) => p.estado != 'agotado')
    ];

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom,
            left: 16,
            right: 16,
            top: 16,
          ),
          child: StatefulBuilder(
            builder: (ctx, setModal) {
              if (!listenersAttached) {
                contenidoCtrl.addListener(() {
                  _syncCostoControl();
                  setModal(() {});
                });
                costoBaseCtrl.addListener(() {
                  _syncCostoControl();
                  setModal(() {});
                });
                listenersAttached = true;
              }
              return SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.add_circle_outline, color: _brandPrimary),
                        const SizedBox(width: 8),
                        const Expanded(
                          child: Text(
                            'Nueva Entrada de Inventario',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () => Navigator.pop(ctx),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<StockRealProducto>(
                      value: seleccionado,
                      items: productosOrdenados
                          .map((p) => DropdownMenuItem(
                                value: p,
                                child: Row(
                                  children: [
                                    if (p.estado == 'agotado')
                                      const Icon(Icons.error, color: Colors.red, size: 16)
                                    else if (p.estado == 'critico')
                                      const Icon(Icons.warning_amber, color: Colors.orange, size: 16)
                                    else
                                      const Icon(Icons.check_circle, color: Colors.green, size: 16),
                                    const SizedBox(width: 6),
                                    Expanded(child: Text(p.nombre, overflow: TextOverflow.ellipsis)),
                                  ],
                                ),
                              ))
                          .toList(),
                      onChanged: (v) => setModal(() => seleccionado = v),
                      decoration: const InputDecoration(
                        labelText: 'Producto',
                        hintText: 'Seleccione un producto',
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: unidadCtrl,
                            decoration: const InputDecoration(
                              labelText: 'Unidad de control',
                              hintText: 'saco, frasco, caja',
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextField(
                            controller: loteCtrl,
                            decoration: const InputDecoration(
                              labelText: 'Código de lote',
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: contenidoCtrl,
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            decoration: InputDecoration(
                              labelText: 'Contenido por unidad (${seleccionado?.unidadMedida ?? 'base'})',
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextField(
                            controller: cantidadCtrl,
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            decoration: const InputDecoration(
                              labelText: 'Cantidad de unidades',
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    if ((double.tryParse(contenidoCtrl.text.trim()) ?? 0) > 0 &&
                        (double.tryParse(cantidadCtrl.text.trim()) ?? 0) > 0)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: _brandSecondary.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: _brandPrimary.withOpacity(0.4)),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.calculate, color: _brandPrimary),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'Total base calculado: ' +
                                    ((double.tryParse(contenidoCtrl.text.trim()) ?? 0) *
                                            (double.tryParse(cantidadCtrl.text.trim()) ?? 0))
                                        .toStringAsFixed(2) +
                                    ' ${seleccionado?.unidadMedida ?? ''}',
                                style: const TextStyle(fontWeight: FontWeight.w600),
                              ),
                            ),
                          ],
                        ),
                      ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: costoBaseCtrl,
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            decoration: const InputDecoration(
                              labelText: 'Costo unitario base',
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextField(
                            controller: costoControlCtrl,
                            readOnly: true,
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            decoration: const InputDecoration(
                              labelText: 'Costo por unidad de control',
                              hintText: 'Se calcula automáticamente',
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      value: proveedorNombre,
                      items: _proveedores
                          .map((p) => DropdownMenuItem<String>(
                                value: p.nombre,
                                child: Text(p.nombre),
                              ))
                          .toList(),
                      onChanged: (v) => setModal(() {
                        proveedorNombre = v;
                        final found = _proveedores.firstWhere(
                          (p) => p.nombre == v,
                          orElse: () => ProveedorModel(id: 0, nombre: ''),
                        );
                        providerIdSel = found.id != 0 ? found.id : null;
                      }),
                      decoration: const InputDecoration(
                        labelText: 'Proveedor (opcional)',
                        hintText: 'Seleccione un proveedor',
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: observacionesCtrl,
                      maxLines: 2,
                      decoration: const InputDecoration(
                        labelText: 'Observaciones',
                        hintText: 'Notas u observaciones de esta entrada',
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () async {
                              final now = DateTime.now();
                              final picked = await showDatePicker(
                                context: ctx,
                                firstDate: DateTime(now.year - 2),
                                lastDate: DateTime(now.year + 2),
                                initialDate: fechaIngreso ?? now,
                              );
                              if (picked != null) setModal(() => fechaIngreso = picked);
                            },
                            icon: const Icon(Icons.event_available),
                            label: Text(fechaIngreso == null
                                ? 'Fecha de ingreso'
                                : '${fechaIngreso!.day.toString().padLeft(2, '0')}/${fechaIngreso!.month.toString().padLeft(2, '0')}/${fechaIngreso!.year}'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () async {
                              final now = DateTime.now();
                              final picked = await showDatePicker(
                                context: ctx,
                                firstDate: DateTime(now.year - 2),
                                lastDate: DateTime(now.year + 5),
                                initialDate: fechaVencimiento ?? now,
                              );
                              if (picked != null) setModal(() => fechaVencimiento = picked);
                            },
                            icon: const Icon(Icons.event_busy),
                            label: Text(fechaVencimiento == null
                                ? 'Fecha de vencimiento'
                                : '${fechaVencimiento!.day.toString().padLeft(2, '0')}/${fechaVencimiento!.month.toString().padLeft(2, '0')}/${fechaVencimiento!.year}'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: () async {
                          try {
                            if (seleccionado == null) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Seleccione un producto')),
                              );
                              return;
                            }
                            final contenido = double.tryParse(contenidoCtrl.text.trim());
                            final cantidad = double.tryParse(cantidadCtrl.text.trim());
                            final costoBase = double.tryParse(costoBaseCtrl.text.trim());
                            final costoControl = double.tryParse(costoControlCtrl.text.trim());

                            if (unidadCtrl.text.trim().isEmpty) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Unidad de control es obligatoria')),
                              );
                              return;
                            }

                            if (contenido == null || cantidad == null) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Contenido por unidad y Cantidad son obligatorios')),
                              );
                              return;
                            }

                            if (fechaIngreso == null) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Seleccione la fecha de ingreso')),
                              );
                              return;
                            }

                            await _service.crearEntrada(
                              productId: seleccionado!.productId,
                              codigoLote: loteCtrl.text.trim().isEmpty ? null : loteCtrl.text.trim(),
                              fechaIngresoIso: fechaIngreso?.toIso8601String(),
                              fechaVencimientoIso: fechaVencimiento?.toIso8601String(),
                              unidadControl: unidadCtrl.text.trim(),
                              contenidoPorUnidadBase: contenido,
                              cantidadUnidades: cantidad,
                              observaciones: observacionesCtrl.text.trim().isEmpty ? null : observacionesCtrl.text.trim(),
                              providerId: providerIdSel,
                              costoUnitarioBase: costoBase,
                              costoPorUnidadControl: costoControl,
                            );

                            if (mounted) {
                              Navigator.pop(ctx);
                              await _cargarDatos();
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Entrada creada correctamente')),
                                );
                              }
                            }
                          } catch (e) {
                            if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('Error al crear entrada: $e')),
                              );
                            }
                          }
                        },
                        icon: const Icon(Icons.save),
                        label: const Text('Crear Entrada'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _brandPrimary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                  ],
                ),
              );
            },
          ),
        );
      },
    );
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
      final stock = await _service.obtenerStockReal();
      
      setState(() {
        _inversiones = inversiones;
        _entradas = entradas;
        _stock = stock;
        _agotados = stock.where((p) => p.estado == 'agotado').toList();
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _cargarProveedores() async {
    try {
      final proveedores = await ProductoService.listarProveedores();
      if (!mounted) return;
      setState(() {
        _proveedores = proveedores;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _proveedores = [];
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
        backgroundColor: _brandPrimary,
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
                        _buildAgotadosBanner(),
                        const SizedBox(height: 12),
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
            Text(
              'Listado de Entradas',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: _brandPrimary),
            ),
            const Spacer(),
            ElevatedButton.icon(
              onPressed: () => _abrirNuevaEntrada(null),
              icon: const Icon(Icons.add, size: 16),
              label: const Text('Nueva Entrada'),
              style: ElevatedButton.styleFrom(
                backgroundColor: _brandPrimary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              ),
            )
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
          color: isSelected ? _brandPrimary : Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: isSelected ? _brandPrimary : Colors.grey[300]!),
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
