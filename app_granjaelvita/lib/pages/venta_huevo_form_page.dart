import 'package:flutter/material.dart';

import '../services/lote_service.dart';
import '../services/ventas_service.dart';

class VentaHuevoFormPage extends StatefulWidget {
  const VentaHuevoFormPage({super.key});

  @override
  State<VentaHuevoFormPage> createState() => _VentaHuevoFormPageState();
}

class _VentaHuevoFormPageState extends State<VentaHuevoFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _loteSrv = LoteServiceMobile();

  String _animal = 'Pollos';
  String _batch = 'Lote002 - Lote002';
  final TextEditingController _dateController = TextEditingController();
  final TextEditingController _quantityController = TextEditingController();
  final TextEditingController _unitPriceController = TextEditingController();
  final TextEditingController _cubetasController =
      TextEditingController(text: '1');

  static const int _huevosPorCubeta = 30;
  String _tipoCantidad = 'cubetas'; // 'cubetas' o 'unidades'

  List<LoteDto> _lotes = [];
  LoteDto? _loteSel;
  bool _guardando = false;

  @override
  void initState() {
    super.initState();
    _initDefaultValues();
    _cargarLotes();
  }

  void _initDefaultValues() {
    final now = DateTime.now();
    final y = now.year.toString();
    final m = now.month.toString().padLeft(2, '0');
    final d = now.day.toString().padLeft(2, '0');
    _dateController.text = '$y-$m-$d';
    _tipoCantidad = 'cubetas';
    _cubetasController.text = '1';
    _quantityController.clear();
    _unitPriceController.text = '0';
  }

  Future<void> _cargarLotes() async {
    try {
      final lotes = await _loteSrv.getActivosPollos();
      if (!mounted) return;
      setState(() {
        _lotes = lotes;
        if (lotes.isNotEmpty) {
          _loteSel = lotes.first;
          _batch = _formatLoteLabel(_loteSel!);
        }
      });
    } catch (_) {
      // En caso de error, dejamos el formulario usable pero sin lotes cargados
    }
  }

  @override
  void dispose() {
    _dateController.dispose();
    _quantityController.dispose();
    _unitPriceController.dispose();
    _cubetasController.dispose();
    super.dispose();
  }

  double get _cantidadHuevos {
    if (_tipoCantidad == 'cubetas') {
      final cubetas =
          double.tryParse(_cubetasController.text.replaceAll(',', '.')) ?? 0;
      return cubetas * _huevosPorCubeta;
    }
    return double.tryParse(_quantityController.text.replaceAll(',', '.')) ?? 0;
  }

  double get _precioPorHuevo {
    final ref =
        double.tryParse(_unitPriceController.text.replaceAll(',', '.')) ?? 0;
    if (_tipoCantidad == 'cubetas') {
      if (_huevosPorCubeta <= 0) return 0;
      return ref / _huevosPorCubeta;
    }
    return ref;
  }

  double get _calculatedTotal {
    final q = _cantidadHuevos;
    final p = _precioPorHuevo;
    if (q <= 0 || p <= 0) return 0;
    return q * p;
  }

  String _formatLoteLabel(LoteDto l) => l.codigo.isNotEmpty
      ? '${l.codigo} - ${l.name}'
      : l.name;

  InputDecoration _inputDecoration(String label,
      {Widget? icon, String? hintText}) {
    return InputDecoration(
      labelText: label,
      hintText: hintText,
      prefixIcon: icon,
      filled: true,
      fillColor: Colors.grey.shade50,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(color: Colors.grey.shade300, width: 2),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(color: Colors.grey.shade300, width: 2),
      ),
      focusedBorder: const OutlineInputBorder(
        borderRadius: BorderRadius.all(Radius.circular(16)),
        borderSide: BorderSide(color: Color(0xFFF59E0B), width: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFFFFFBEB), Color(0xFFFFF7ED)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 900),
                child: _buildCard(),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCard() {
    return Card(
      elevation: 18,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFFF59E0B), Color(0xFFF97316)],
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Icon(Icons.egg,
                      color: Colors.white, size: 30),
                ),
                const SizedBox(width: 16),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Venta de Huevo',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 26,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Registro de venta (solo vista por ahora)',
                        style: TextStyle(
                          color: Color(0xFFFEF3C7),
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _buildMainGrid(),
                  const SizedBox(height: 24),
                  _buildTotalCard(),
                  const SizedBox(height: 24),
                  _buildActions(),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMainGrid() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth >= 700;

        final leftColumn = Column(
          children: [
            // Campo Animal: Solo lectura, siempre "Pollos" para ventas de huevos
            TextFormField(
              initialValue: 'Pollos',
              readOnly: true,
              decoration: _inputDecoration(
                'Animal',
                icon:
                    const Icon(Icons.person_outline, color: Color(0xFFF59E0B)),
              ),
              style: const TextStyle(
                fontWeight: FontWeight.w500,
                color: Color(0xFF374151),
              ),
            ),
            const SizedBox(height: 18),
            // Dropdown de Lotes: Solo lotes activos con animales
            _lotes.isEmpty
                ? Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF3C7),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFFBBF24)),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.warning_amber_rounded, color: Color(0xFFD97706)),
                        SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'No hay lotes activos con pollos disponibles',
                            style: TextStyle(
                              color: Color(0xFF92400E),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ),
                  )
                : DropdownButtonFormField<String>(
                    value: _batch,
                    decoration: _inputDecoration(
                      'Lote activo',
                      icon: const Icon(Icons.inventory_2,
                          color: Color(0xFFEA580C)),
                    ),
                    items: _lotes
                        .map(
                          (l) => DropdownMenuItem<String>(
                            value: _formatLoteLabel(l),
                            child: Text(
                              '${_formatLoteLabel(l)} (${l.quantity} pollos)',
                              style: const TextStyle(fontSize: 14),
                            ),
                          ),
                        )
                        .toList(),
                    onChanged: (value) {
                      setState(() {
                        _batch = value ?? _batch;
                        _loteSel = _lotes.firstWhere(
                          (l) => _formatLoteLabel(l) == _batch,
                          orElse: () => _loteSel ??
                              (_lotes.isNotEmpty
                                  ? _lotes.first
                                  : LoteDto(
                                      id: '',
                                      codigo: '',
                                      name: '',
                                      quantity: 0,
                                      animalName: '',
                                      raceName: '',
                                      birthdate: null,
                                      quantityOriginal: 0,
                                      cost: 0.0,
                                    )),
                        );
                      });
                    },
                  ),
          ],
        );

        final rightColumn = Column(
          children: [
            TextFormField(
              controller: _dateController,
              readOnly: true,
              decoration: _inputDecoration(
                'Fecha',
                icon: const Icon(Icons.calendar_today,
                    color: Color(0xFF3B82F6)),
              ),
              onTap: _pickDate,
            ),
            const SizedBox(height: 18),
            DropdownButtonFormField<String>(
              value: _tipoCantidad,
              decoration: _inputDecoration(
                'Registrar por',
                icon: const Icon(Icons.swap_vert,
                    color: Color(0xFF10B981)),
              ),
              items: const [
                DropdownMenuItem(
                  value: 'cubetas',
                  child: Text('Cubetas'),
                ),
                DropdownMenuItem(
                  value: 'unidades',
                  child: Text('Unidades (huevos)'),
                ),
              ],
              onChanged: (value) {
                setState(() {
                  _tipoCantidad = value ?? 'cubetas';
                });
              },
            ),
            const SizedBox(height: 18),
            if (_tipoCantidad == 'cubetas') ...[
              TextFormField(
                controller: _cubetasController,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                decoration: _inputDecoration(
                  'Cantidad de cubetas',
                  icon: const Icon(Icons.shopping_cart,
                      color: Color(0xFF10B981)),
                  hintText: '1',
                ),
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Equivalente: ${_cantidadHuevos.toInt()} huevos (30 huevos/cubeta)',
                  style: const TextStyle(
                    fontSize: 11,
                    color: Color(0xFF6B7280),
                  ),
                ),
              ),
            ] else ...[
              TextFormField(
                controller: _quantityController,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                decoration: _inputDecoration(
                  'Cantidad de huevos',
                  icon: const Icon(Icons.shopping_cart,
                      color: Color(0xFF10B981)),
                  hintText: '1',
                ),
                onChanged: (_) => setState(() {}),
              ),
            ],
            const SizedBox(height: 18),
            TextFormField(
              controller: _unitPriceController,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              decoration: _inputDecoration(
                _tipoCantidad == 'cubetas'
                    ? 'Precio por cubeta'
                    : 'Precio por huevo',
                icon:
                    const Icon(Icons.attach_money, color: Color(0xFF8B5CF6)),
                hintText: '0',
              ),
              onChanged: (_) => setState(() {}),
            ),
          ],
        );

        if (isWide) {
          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: leftColumn),
              const SizedBox(width: 20),
              Expanded(child: rightColumn),
            ],
          );
        }

        return Column(
          children: [
            leftColumn,
            const SizedBox(height: 20),
            rightColumn,
          ],
        );
      },
    );
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    DateTime initialDate = now;
    final text = _dateController.text;
    try {
      if (text.isNotEmpty && text.contains('-')) {
        final parts = text.split('-');
        if (parts.length == 3) {
          initialDate = DateTime(
            int.parse(parts[0]),
            int.parse(parts[1]),
            int.parse(parts[2]),
          );
        }
      }
    } catch (_) {}

    final selected = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: DateTime(2020),
      lastDate: DateTime(2100),
    );
    if (selected != null) {
      final y = selected.year.toString();
      final m = selected.month.toString().padLeft(2, '0');
      final d = selected.day.toString().padLeft(2, '0');
      setState(() {
        _dateController.text = '$y-$m-$d';
      });
    }
  }

  Widget _buildTotalCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFFEF3C7), Color(0xFFFDE68A)],
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFFCD34D)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Total línea:',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF4B5563),
                ),
              ),
              Text(
                'S/ ${_calculatedTotal.toStringAsFixed(2)}',
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFFB45309),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'Lote: $_batch : Animales en lote: 0',
            style: const TextStyle(
              fontSize: 11,
              color: Color(0xFF6B7280),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActions() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ElevatedButton(
          onPressed: _guardando ? null : _onGuardar,
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF2563EB),
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(18),
            ),
            elevation: 10,
          ),
          child: const Text(
            'Guardar venta',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
        ),
        const SizedBox(height: 12),
        OutlinedButton(
          onPressed: _clearForm,
          style: OutlinedButton.styleFrom(
            foregroundColor: const Color(0xFF374151),
            side: const BorderSide(color: Color(0xFFD1D5DB)),
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(18),
            ),
          ),
          child: const Text(
            'Limpiar',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
          ),
        ),
      ],
    );
  }

  void _clearForm() {
    _formKey.currentState?.reset();
    _animal = 'Pollos';
    _batch = 'Lote002 - Lote002';
    _tipoCantidad = 'cubetas';
    _cubetasController.text = '1';
    _quantityController.clear();
    _unitPriceController.text = '0';
    _initDefaultValues();
    setState(() {});
  }

  Future<void> _onGuardar() async {
    if (_guardando) return;

    final lote = _loteSel;
    if (lote == null) {
      _showSnack('Seleccione un lote');
      return;
    }

    final fecha = _dateController.text.trim();
    if (fecha.isEmpty) {
      _showSnack('Seleccione una fecha');
      return;
    }

    final cantidad = _cantidadHuevos;
    final precio = _precioPorHuevo;

    if (cantidad <= 0 || precio <= 0) {
      _showSnack('Ingrese cantidad y precio válidos');
      return;
    }

    setState(() {
      _guardando = true;
    });

    try {
      await VentasServiceMobile.crearVentaHuevo(
        fecha: fecha,
        loteId: lote.id,
        loteCodigo: lote.codigo,
        animalName: _animal,
        cantidad: cantidad,
        precioUnit: precio,
      );

      _showSnack('Venta guardada correctamente');
      if (mounted) {
        Navigator.pop(context, true);
      }
    } catch (e) {
      _showSnack('Error al guardar: ' + e.toString());
    } finally {
      if (mounted) {
        setState(() {
          _guardando = false;
        });
      }
    }
  }

  void _showSnack(String m) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(m)));
  }
}
