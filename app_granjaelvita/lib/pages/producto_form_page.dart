import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/producto_model.dart';
import '../models/tipo_alimento_model.dart';
import '../models/subcategoria_inventario_model.dart';
import '../models/stage_model.dart';
import '../models/unidad_medida_model.dart';
import '../models/proveedor_model.dart';
import '../models/animal_model.dart';
import '../services/producto_service.dart';

class ProductoFormPage extends StatefulWidget {
  final ProductoModel? producto;

  const ProductoFormPage({super.key, this.producto});

  @override
  State<ProductoFormPage> createState() => _ProductoFormPageState();
}

class _ProductoFormPageState extends State<ProductoFormPage> {
  final _formKey = GlobalKey<FormState>();
  bool _guardando = false;

  // Controllers
  late TextEditingController _nombreController;
  late TextEditingController _descripcionController;
  late TextEditingController _cantidadActualController;
  late TextEditingController _nivelMinimoController;
  late TextEditingController _nivelMaximoController;
  late TextEditingController _usoPrincipalController;
  late TextEditingController _dosisRecomendadaController;
  late TextEditingController _precioUnitarioController;
  late TextEditingController _numeroFacturaController;
  late TextEditingController _loteFabricanteController;
  late TextEditingController _tiempoRetiroController;
  late TextEditingController _observacionesMedicasController;
  late TextEditingController _infoNutricionalController;

  // Dropdowns
  String _animalTipo = 'pollos';
  String _categoriaPrincipal = '';
  String? _subcategoria;
  String? _etapaAplicacion;
  String _unidadMedida = '';
  String? _viaAplicacion;
  String? _proveedor;

  int? _tipoAlimentoSeleccionadoId;
  List<TipoAlimentoModel> _tiposAlimento = [];
  List<SubcategoriaInventarioModel> _subcategoriasDisponibles = [];
  List<StageModel> _etapas = [];
  List<UnidadMedidaModel> _unidadesMedida = [];
  List<ProveedorModel> _proveedores = [];
  List<AnimalModel> _animales = [];
  int? _animalSeleccionadoId;
  bool _showMedicamentos = false;
  bool _showAlimentos = false;
  bool _incluirEnBotiquin = false;
  String? _presentacion;

  // Fechas
  DateTime? _fechaCompra;
  DateTime? _fechaVencimiento;

  @override
  void initState() {
    super.initState();
    _inicializarControllers();
    _cargarTiposAlimento();
    _cargarEtapasYUnidades();
    _cargarProveedores();
    _cargarAnimales();
  }

  void _inicializarControllers() {
    final p = widget.producto;
    _nombreController = TextEditingController(text: p?.nombre ?? '');
    _descripcionController = TextEditingController(text: p?.descripcion ?? '');
    _cantidadActualController =
        TextEditingController(text: p?.cantidadActual.toString() ?? '0');
    _nivelMinimoController =
        TextEditingController(text: p?.nivelMinimo.toString() ?? '0');
    _nivelMaximoController =
        TextEditingController(text: p?.nivelMaximo?.toString() ?? '');
    _usoPrincipalController = TextEditingController(text: p?.usoPrincipal ?? '');
    _dosisRecomendadaController =
        TextEditingController(text: p?.dosisRecomendada ?? '');
    _precioUnitarioController =
        TextEditingController(text: p?.precioUnitario.toString() ?? '0');
    _numeroFacturaController =
        TextEditingController(text: p?.numeroFactura ?? '');
    _loteFabricanteController =
        TextEditingController(text: p?.loteFabricante ?? '');
    _tiempoRetiroController =
        TextEditingController(text: p?.tiempoRetiro?.toString() ?? '');
    _observacionesMedicasController =
        TextEditingController(text: p?.observacionesMedicas ?? '');
    _infoNutricionalController =
        TextEditingController(text: p?.infoNutricional ?? '');

    if (p != null) {
      _animalTipo = p.animalTipo;
      _categoriaPrincipal = p.categoriaPrincipal;
      _subcategoria = p.subcategoria;
      _etapaAplicacion = p.etapaAplicacion;
      _unidadMedida = p.unidadMedida;
      _viaAplicacion = p.viaAplicacion;
      _proveedor = p.proveedor;
      _incluirEnBotiquin = p.incluirEnBotiquin ?? false;
      _presentacion = p.presentacion;
      if (p.fechaCompra != null) {
        _fechaCompra = DateTime.tryParse(p.fechaCompra!);
      }
      if (p.fechaVencimiento != null) {
        _fechaVencimiento = DateTime.tryParse(p.fechaVencimiento!);
      }
    }
    _recalcularTogglesUso();
  }

  Future<void> _cargarTiposAlimento() async {
    try {
      final tipos = await ProductoService.listarTiposAlimento();
      if (!mounted) return;
      setState(() {
        _tiposAlimento = tipos;
        _recalcularTogglesUso();
      });

      if (_categoriaPrincipal.isNotEmpty) {
        TipoAlimentoModel? seleccionado;
        for (final t in tipos) {
          if (t.nombre.toLowerCase() == _categoriaPrincipal.toLowerCase()) {
            seleccionado = t;
            break;
          }
        }
        if (seleccionado != null) {
          _tipoAlimentoSeleccionadoId = seleccionado.id;
          await _cargarSubcategoriasParaTipo(seleccionado.id);
        }
      }
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _tiposAlimento = [];
      });
    }
  }

  Future<void> _cargarEtapasYUnidades() async {
    try {
      final etapas = await ProductoService.listarEtapas();
      final unidades = await ProductoService.listarUnidadesMedida();
      if (!mounted) return;
      setState(() {
        _etapas = etapas;
        _unidadesMedida = unidades;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _etapas = [];
        _unidadesMedida = [];
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

  Future<void> _cargarAnimales() async {
    try {
      final animales = await ProductoService.listarAnimales();
      if (!mounted) return;
      setState(() {
        _animales = animales;
        if (widget.producto != null) {
          _preSeleccionarAnimalDesdeTipo();
        }
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _animales = [];
      });
    }
  }

  void _preSeleccionarAnimalDesdeTipo() {
    if (_animales.isEmpty) return;

    if (_animalTipo == 'pollos') {
      for (final a in _animales) {
        final n = a.nombre.toLowerCase();
        if (n.contains('pollo') || n.contains('ave') || n.contains('broiler')) {
          _animalSeleccionadoId = a.id;
          return;
        }
      }
    } else if (_animalTipo == 'chanchos') {
      for (final a in _animales) {
        final n = a.nombre.toLowerCase();
        if (n.contains('chancho') || n.contains('cerdo') || n.contains('porcino')) {
          _animalSeleccionadoId = a.id;
          return;
        }
      }
    }
  }

  void _onAnimalChanged(int? id) {
    setState(() {
      _animalSeleccionadoId = id;

      if (id == null) {
        _animalTipo = 'ambos';
        return;
      }

      AnimalModel? seleccionado;
      for (final a in _animales) {
        if (a.id == id) {
          seleccionado = a;
          break;
        }
      }

      if (seleccionado == null) {
        _animalTipo = 'ambos';
        return;
      }

      final nombre = seleccionado.nombre.toLowerCase();
      if (nombre.contains('pollo') || nombre.contains('ave') || nombre.contains('broiler')) {
        _animalTipo = 'pollos';
      } else if (nombre.contains('chancho') || nombre.contains('cerdo') || nombre.contains('porcino')) {
        _animalTipo = 'chanchos';
      } else {
        _animalTipo = 'ambos';
      }
    });
  }

  Future<void> _cargarSubcategoriasParaTipo(int typeFoodId) async {
    try {
      final subs =
          await ProductoService.listarSubcategoriasPorTipo(typeFoodId);
      if (!mounted) return;
      setState(() {
        _subcategoriasDisponibles = subs;
        if (_subcategoria != null &&
            !_subcategoriasDisponibles.any((s) =>
                s.nombre.toLowerCase() == _subcategoria!.toLowerCase())) {
          _subcategoria = null;
        }
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _subcategoriasDisponibles = [];
        _subcategoria = null;
      });
    }
  }

  Future<void> _onCategoriaPrincipalChanged(String? nombre) async {
    if (nombre == null || nombre.isEmpty) {
      setState(() {
        _categoriaPrincipal = '';
        _tipoAlimentoSeleccionadoId = null;
        _subcategoria = null;
        _subcategoriasDisponibles = [];
        _showMedicamentos = false;
        _showAlimentos = false;
      });
      return;
    }

    setState(() {
      _categoriaPrincipal = nombre;
      _subcategoria = null;
      _recalcularTogglesUso();
    });

    TipoAlimentoModel? seleccionado;
    for (final t in _tiposAlimento) {
      if (t.nombre == nombre) {
        seleccionado = t;
        break;
      }
    }
    if (seleccionado == null) {
      for (final t in _tiposAlimento) {
        if (t.nombre.toLowerCase() == nombre.toLowerCase()) {
          seleccionado = t;
          break;
        }
      }
    }

    if (seleccionado != null) {
      _tipoAlimentoSeleccionadoId = seleccionado.id;
      await _cargarSubcategoriasParaTipo(seleccionado.id);
    } else {
      if (!mounted) return;
      setState(() {
        _tipoAlimentoSeleccionadoId = null;
        _subcategoriasDisponibles = [];
      });
    }
  }

  void _recalcularTogglesUso() {
    final nombre = _categoriaPrincipal.toLowerCase();
    _showMedicamentos =
        nombre.contains('medic') || nombre.contains('sanid') || nombre.contains('farm');
    _showAlimentos =
        nombre.contains('alimen') || nombre.contains('balance');
  }

  @override
  void dispose() {
    _nombreController.dispose();
    _descripcionController.dispose();
    _cantidadActualController.dispose();
    _nivelMinimoController.dispose();
    _nivelMaximoController.dispose();
    _usoPrincipalController.dispose();
    _dosisRecomendadaController.dispose();
    _precioUnitarioController.dispose();
    _numeroFacturaController.dispose();
    _loteFabricanteController.dispose();
    _tiempoRetiroController.dispose();
    _observacionesMedicasController.dispose();
    _infoNutricionalController.dispose();
    super.dispose();
  }

  Future<void> _guardarProducto() async {
    if (!_formKey.currentState!.validate()) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Por favor complete los campos requeridos'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() => _guardando = true);

    try {
      // Resolver IDs de relaciones a partir de las selecciones del formulario
      final int? animalId = _animalSeleccionadoId;

      int? providerId;
      if (_proveedor != null && _proveedor!.isNotEmpty) {
        for (final p in _proveedores) {
          if (p.nombre == _proveedor) {
            providerId = p.id;
            break;
          }
        }
      }

      final int? typeFoodId = _tipoAlimentoSeleccionadoId;

      int? unitMeasurementId;
      if (_unidadMedida.isNotEmpty) {
        for (final u in _unidadesMedida) {
          final val =
              (u.nombreCorto.isNotEmpty ? u.nombreCorto : u.nombre);
          if (val == _unidadMedida) {
            unitMeasurementId = u.id;
            break;
          }
        }
      }

      int? stageId;
      if (_etapaAplicacion != null && _etapaAplicacion!.isNotEmpty) {
        for (final e in _etapas) {
          if (e.nombre == _etapaAplicacion) {
            stageId = e.id;
            break;
          }
        }
      }

      int? subcategoryId;
      if (_subcategoria != null && _subcategoria!.isNotEmpty) {
        for (final s in _subcategoriasDisponibles) {
          if (s.nombre == _subcategoria) {
            subcategoryId = s.id;
            break;
          }
        }
      }

      final producto = ProductoModel(
        id: widget.producto?.id,
        nombre: _nombreController.text.trim(),
        descripcion: _descripcionController.text.trim().isEmpty
            ? null
            : _descripcionController.text.trim(),
        animalTipo: _animalTipo,
        animalId: animalId,
        providerId: providerId,
        typeFoodId: typeFoodId,
        unitMeasurementId: unitMeasurementId,
        stageId: stageId,
        subcategoryId: subcategoryId,
        categoriaPrincipal: _categoriaPrincipal,
        subcategoria: _subcategoria,
        etapaAplicacion: _etapaAplicacion,
        unidadMedida: _unidadMedida,
        cantidadActual: double.parse(_cantidadActualController.text),
        nivelMinimo: double.parse(_nivelMinimoController.text),
        nivelMaximo: _nivelMaximoController.text.isEmpty
            ? null
            : double.parse(_nivelMaximoController.text),
        usoPrincipal: _usoPrincipalController.text.trim().isEmpty
            ? null
            : _usoPrincipalController.text.trim(),
        dosisRecomendada: _dosisRecomendadaController.text.trim().isEmpty
            ? null
            : _dosisRecomendadaController.text.trim(),
        viaAplicacion: _viaAplicacion,
        precioUnitario: double.parse(_precioUnitarioController.text),
        fechaCompra: _fechaCompra?.toIso8601String().split('T')[0],
        proveedor: _proveedor,
        numeroFactura: _numeroFacturaController.text.trim().isEmpty
            ? null
            : _numeroFacturaController.text.trim(),
        fechaVencimiento: _fechaVencimiento?.toIso8601String().split('T')[0],
        loteFabricante: _loteFabricanteController.text.trim().isEmpty
            ? null
            : _loteFabricanteController.text.trim(),
        incluirEnBotiquin: _incluirEnBotiquin,
        tiempoRetiro: _tiempoRetiroController.text.trim().isEmpty
            ? null
            : int.tryParse(_tiempoRetiroController.text.trim()),
        observacionesMedicas:
            _observacionesMedicasController.text.trim().isEmpty
                ? null
                : _observacionesMedicasController.text.trim(),
        presentacion: _presentacion,
        infoNutricional: _infoNutricionalController.text.trim().isEmpty
            ? null
            : _infoNutricionalController.text.trim(),
      );

      if (widget.producto == null) {
        await ProductoService.crearProducto(producto);
      } else {
        await ProductoService.actualizarProducto(widget.producto!.id!, producto);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.producto == null
                ? '✓ Producto guardado exitosamente'
                : '✓ Producto actualizado exitosamente'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _guardando = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.producto == null ? 'Nuevo Producto' : 'Editar Producto'),
        backgroundColor: const Color(0xFF6366F1),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _buildSeccion(
              titulo: 'Información Básica',
              icono: Icons.info_outline,
              children: [
                _buildTextField(
                  controller: _nombreController,
                  label: 'Nombre del Producto',
                  required: true,
                  hint: 'Ej: Newcastle Cepa La Sota',
                ),
                const SizedBox(height: 16),
                _buildDropdown<int>(
                  label: 'Animal',
                  value: _animales.any((a) => a.id == _animalSeleccionadoId)
                      ? _animalSeleccionadoId
                      : null,
                  required: true,
                  items: _animales
                      .map(
                        (a) => DropdownMenuItem<int>(
                          value: a.id,
                          child: Text(a.nombre),
                        ),
                      )
                      .toList(),
                  onChanged: (v) => _onAnimalChanged(v as int?),
                ),
                const SizedBox(height: 16),
                _buildTextField(
                  controller: _descripcionController,
                  label: 'Descripción',
                  maxLines: 3,
                  hint: 'Descripción breve del producto...',
                ),
              ],
            ),
            const SizedBox(height: 16),
            _buildSeccion(
              titulo: 'Clasificación',
              icono: Icons.category,
              children: [
                _buildDropdown(
                  label: 'Categoría Principal',
                  value:
                      _categoriaPrincipal.isEmpty ? null : _categoriaPrincipal,
                  required: true,
                  items: _tiposAlimento
                      .map(
                        (t) => DropdownMenuItem<String>(
                          value: t.nombre,
                          child: Text(t.nombre),
                        ),
                      )
                      .toList(),
                  onChanged: (v) =>
                      _onCategoriaPrincipalChanged(v as String?),
                ),
                const SizedBox(height: 16),
                _buildDropdown(
                  label: 'Subcategoría',
                  value: _subcategoria != null &&
                          _subcategoriasDisponibles
                              .any((s) => s.nombre == _subcategoria)
                      ? _subcategoria
                      : null,
                  items: _subcategoriasDisponibles
                      .map(
                        (s) => DropdownMenuItem<String>(
                          value: s.nombre,
                          child: Text(s.nombre),
                        ),
                      )
                      .toList(),
                  onChanged: (v) =>
                      setState(() => _subcategoria = v as String?),
                ),
                const SizedBox(height: 16),
                _buildDropdown(
                  label: 'Etapa de Aplicación',
                  value: _etapas.any((e) => e.nombre == _etapaAplicacion)
                      ? _etapaAplicacion
                      : null,
                  items: _etapas
                      .map(
                        (e) => DropdownMenuItem<String>(
                          value: e.nombre,
                          child: Text(e.nombre),
                        ),
                      )
                      .toList(),
                  onChanged: (v) => setState(() => _etapaAplicacion = v),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _buildSeccion(
              titulo: 'Control de Inventario',
              icono: Icons.inventory_2,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: _buildDropdown(
                        label: 'Unidad de Medida',
                        value: _unidadesMedida.any((u) {
                          final val =
                              (u.nombreCorto.isNotEmpty ? u.nombreCorto : u.nombre);
                          return val == _unidadMedida;
                        })
                            ? _unidadMedida
                            : null,
                        required: true,
                        items: _unidadesMedida
                            .map(
                              (u) {
                                final val = u.nombreCorto.isNotEmpty
                                    ? u.nombreCorto
                                    : u.nombre;
                                final label = u.nombreCorto.isNotEmpty
                                    ? '${u.nombre} (${u.nombreCorto})'
                                    : u.nombre;
                                return DropdownMenuItem<String>(
                                  value: val,
                                  child: Text(label),
                                );
                              },
                            )
                            .toList(),
                        onChanged: (v) =>
                            setState(() => _unidadMedida = v as String),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildTextField(
                        controller: _cantidadActualController,
                        label: 'Cantidad Actual',
                        required: true,
                        keyboardType: TextInputType.number,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: _buildTextField(
                        controller: _nivelMinimoController,
                        label: 'Nivel Mínimo',
                        required: true,
                        keyboardType: TextInputType.number,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildTextField(
                        controller: _nivelMaximoController,
                        label: 'Nivel Máximo',
                        keyboardType: TextInputType.number,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                _buildAlertBox(
                  '⚠️ Alerta: El sistema te notificará cuando el stock llegue al nivel mínimo.',
                  Colors.orange,
                ),
              ],
            ),
            const SizedBox(height: 16),
            _buildSeccion(
              titulo: 'Información de Uso',
              icono: Icons.medical_services,
              children: _buildInformacionUsoChildren(),
            ),
            const SizedBox(height: 16),
            _buildSeccion(
              titulo: 'Información de Compra',
              icono: Icons.attach_money,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: _buildTextField(
                        controller: _precioUnitarioController,
                        label: 'Precio Unitario',
                        required: true,
                        keyboardType: TextInputType.number,
                        prefix: const Text('\$ '),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildDateField(
                        label: 'Fecha de Compra',
                        value: _fechaCompra,
                        onChanged: (v) => setState(() => _fechaCompra = v),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                _buildDropdown(
                  label: 'Proveedor',
                  value: _proveedores.any((p) => p.nombre == _proveedor)
                      ? _proveedor
                      : null,
                  items: _proveedores
                      .map(
                        (p) => DropdownMenuItem<String>(
                          value: p.nombre,
                          child: Text(p.nombre),
                        ),
                      )
                      .toList(),
                  onChanged: (v) => setState(() => _proveedor = v as String?),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: _buildTextField(
                        controller: _numeroFacturaController,
                        label: 'Número de Factura',
                        hint: 'FAC-12345',
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildDateField(
                        label: 'Fecha de Vencimiento',
                        value: _fechaVencimiento,
                        onChanged: (v) => setState(() => _fechaVencimiento = v),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                _buildTextField(
                  controller: _loteFabricanteController,
                  label: 'Lote del Fabricante',
                  hint: 'Número de lote',
                ),
              ],
            ),
            const SizedBox(height: 80),
          ],
        ),
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: _guardando ? null : () => Navigator.pop(context),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text('Cancelar'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              flex: 2,
              child: ElevatedButton.icon(
                onPressed: _guardando ? null : _guardarProducto,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF6366F1),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                icon: _guardando
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.save),
                label: Text(_guardando ? 'Guardando...' : 'Guardar Producto'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSeccion({
    required String titulo,
    required IconData icono,
    required List<Widget> children,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
                  ),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icono, color: Colors.white, size: 20),
              ),
              const SizedBox(width: 12),
              Text(
                titulo.toUpperCase(),
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF6366F1),
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
          const Divider(height: 24),
          ...children,
        ],
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    bool required = false,
    String? hint,
    int maxLines = 1,
    TextInputType? keyboardType,
    Widget? prefix,
  }) {
    return TextFormField(
      controller: controller,
      maxLines: maxLines,
      keyboardType: keyboardType,
      decoration: InputDecoration(
        labelText: label + (required ? ' *' : ''),
        hintText: hint,
        prefix: prefix,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: Color(0xFFE5E7EB), width: 2),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: Color(0xFFE5E7EB), width: 2),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: Color(0xFF6366F1), width: 2),
        ),
        filled: true,
        fillColor: Colors.white,
      ),
      validator: required
          ? (v) => v == null || v.trim().isEmpty ? 'Campo requerido' : null
          : null,
    );
  }

  Widget _buildDropdown<T>({
    required String label,
    required T? value,
    required List<DropdownMenuItem<T>> items,
    required ValueChanged<T?> onChanged,
    bool required = false,
  }) {
    return DropdownButtonFormField<T>(
      value: value,
      decoration: InputDecoration(
        labelText: label + (required ? ' *' : ''),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: Color(0xFFE5E7EB), width: 2),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: Color(0xFFE5E7EB), width: 2),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: Color(0xFF6366F1), width: 2),
        ),
        filled: true,
        fillColor: Colors.white,
      ),
      items: items,
      onChanged: onChanged,
      validator: required
          ? (v) => v == null ? 'Campo requerido' : null
          : null,
    );
  }

  Widget _buildDateField({
    required String label,
    required DateTime? value,
    required ValueChanged<DateTime?> onChanged,
  }) {
    return InkWell(
      onTap: () async {
        final picked = await showDatePicker(
          context: context,
          initialDate: value ?? DateTime.now(),
          firstDate: DateTime(2000),
          lastDate: DateTime(2100),
        );
        if (picked != null) {
          onChanged(picked);
        }
      },
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: Color(0xFFE5E7EB), width: 2),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: Color(0xFFE5E7EB), width: 2),
          ),
          filled: true,
          fillColor: Colors.white,
        ),
        child: Text(
          value == null ? '' : DateFormat('yyyy-MM-dd').format(value),
          style: TextStyle(
            color: value == null ? Colors.grey : Colors.black,
          ),
        ),
      ),
    );
  }

  List<Widget> _buildInformacionUsoChildren() {
    // Bloque específico para Medicamentos
    if (_showMedicamentos) {
      return [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFFF5F3FF),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFF8B5CF6)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: const [
                  Icon(Icons.medication, color: Color(0xFF8B5CF6)),
                  SizedBox(width: 8),
                  Text(
                    'Datos de Medicamento',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF6D28D9),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _buildTextField(
                      controller: _usoPrincipalController,
                      label: 'Uso Principal',
                      required: true,
                      maxLines: 2,
                      hint: 'Ej: Infecciones respiratorias',
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildTextField(
                      controller: _dosisRecomendadaController,
                      label: 'Dosis Recomendada',
                      required: true,
                      hint: 'Ej: 1 ml/10 kg',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _buildDropdown<String>(
                      label: 'Vía de Administración',
                      value: _viaAplicacion,
                      items: const [
                        DropdownMenuItem(value: 'oral', child: Text('Oral')),
                        DropdownMenuItem(value: 'inyectable', child: Text('Inyectable')),
                        DropdownMenuItem(value: 'topico', child: Text('Tópica')),
                        DropdownMenuItem(value: 'ocular', child: Text('Ocular/Nasal')),
                        DropdownMenuItem(value: 'agua', child: Text('En agua de bebida')),
                        DropdownMenuItem(value: 'alimento', child: Text('En alimento')),
                      ],
                      onChanged: (v) => setState(() => _viaAplicacion = v),
                      required: true,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildTextField(
                      controller: _tiempoRetiroController,
                      label: 'Tiempo de Retiro (días)',
                      keyboardType: TextInputType.number,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _buildDateField(
                      label: 'Fecha de Vencimiento',
                      value: _fechaVencimiento,
                      onChanged: (v) => setState(() => _fechaVencimiento = v),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              _buildTextField(
                controller: _observacionesMedicasController,
                label: 'Observaciones Médicas',
                maxLines: 3,
                hint: 'Notas u observaciones...',
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Switch(
                    value: _incluirEnBotiquin,
                    activeColor: const Color(0xFF16A34A),
                    onChanged: (v) => setState(() => _incluirEnBotiquin = v),
                  ),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      'Incluir en Botiquín',
                      style: TextStyle(fontSize: 13),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ];
    }

    // Bloque específico para Alimentos
    if (_showAlimentos) {
      return [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFFF0FDF4),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFF22C55E)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: const [
                  Icon(Icons.grass, color: Color(0xFF16A34A)),
                  SizedBox(width: 8),
                  Text(
                    'Información Nutricional',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF166534),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _buildDropdown<String>(
                      label: 'Presentación',
                      value: _presentacion,
                      items: const [
                        DropdownMenuItem(value: 'entero', child: Text('Entero')),
                        DropdownMenuItem(value: 'molido', child: Text('Molido')),
                        DropdownMenuItem(value: 'picado', child: Text('Picado')),
                        DropdownMenuItem(value: 'liquido', child: Text('Líquido')),
                        DropdownMenuItem(value: 'pellet', child: Text('Pellet')),
                      ],
                      onChanged: (v) => setState(() => _presentacion = v),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildTextField(
                      controller: _infoNutricionalController,
                      label: 'Información Nutricional',
                      hint: 'Ej: Proteína 18%, Grasa 4%',
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ];
    }

    // Bloque genérico (otros tipos)
    return [
      _buildTextField(
        controller: _usoPrincipalController,
        label: 'Uso Principal',
        maxLines: 2,
        hint: 'Para qué se utiliza este producto...',
      ),
      const SizedBox(height: 16),
      _buildTextField(
        controller: _dosisRecomendadaController,
        label: 'Dosis Recomendada',
        hint: 'Ej: 0.03-0.05 ml por ave',
      ),
      const SizedBox(height: 16),
      _buildDropdown<String>(
        label: 'Vía de Aplicación',
        value: _viaAplicacion,
        items: const [
          DropdownMenuItem(value: 'oral', child: Text('Oral')),
          DropdownMenuItem(value: 'inyectable', child: Text('Inyectable')),
          DropdownMenuItem(value: 'topico', child: Text('Tópico')),
          DropdownMenuItem(value: 'ocular', child: Text('Ocular/Nasal')),
          DropdownMenuItem(value: 'agua', child: Text('En agua de bebida')),
          DropdownMenuItem(value: 'alimento', child: Text('En alimento')),
        ],
        onChanged: (v) => setState(() => _viaAplicacion = v),
      ),
    ];
  }

  Widget _buildAlertBox(String text, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        border: Border.all(color: color, width: 2),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Icon(Icons.warning_amber, color: color, size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                fontSize: 12,
                color: color.withOpacity(0.9),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoBox(String text, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        border: Border.all(color: color.withOpacity(0.3), width: 2),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 12,
          color: color.withOpacity(0.9),
        ),
      ),
    );
  }
}
