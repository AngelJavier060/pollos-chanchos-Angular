import 'package:flutter/material.dart';

import '../services/lote_service.dart';
import '../services/logistica_service.dart';

class LogisticaFormPage extends StatefulWidget {
  const LogisticaFormPage({super.key});

  @override
  State<LogisticaFormPage> createState() => _LogisticaFormPageState();
}

class _LogisticaFormPageState extends State<LogisticaFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _loteSrv = LoteServiceMobile();

  final TextEditingController _transportTypeController =
      TextEditingController();
  final TextEditingController _conceptController = TextEditingController();
  final TextEditingController _unitController = TextEditingController();
  final TextEditingController _quantityController = TextEditingController();
  final TextEditingController _unitCostController = TextEditingController();
  final TextEditingController _dateController = TextEditingController();
  final TextEditingController _observationsController =
      TextEditingController();

  List<LoteDto> _lotes = [];
  List<LoteDto> _lotesSeleccionados = [];
  bool _applyToAll = false;
  bool _cargandoLotes = true;
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
  }

  Future<void> _cargarLotes() async {
    try {
      final lotes = await _loteSrv.getAll();
      if (!mounted) return;
      // Filtrar solo lotes activos (con animales disponibles)
      final lotesActivos = lotes.where((l) => l.quantity > 0).toList();
      setState(() {
        _lotes = lotesActivos;
        _cargandoLotes = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _cargandoLotes = false;
      });
    }
  }

  @override
  void dispose() {
    _transportTypeController.dispose();
    _conceptController.dispose();
    _unitController.dispose();
    _quantityController.dispose();
    _unitCostController.dispose();
    _dateController.dispose();
    _observationsController.dispose();
    super.dispose();
  }

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
        borderSide: BorderSide(color: Color(0xFFF97316), width: 2),
      ),
    );
  }

  String get _calculatedTotal {
    final quantity =
        double.tryParse(_quantityController.text.replaceAll(',', '.')) ?? 0;
    final unitCost =
        double.tryParse(_unitCostController.text.replaceAll(',', '.')) ?? 0;
    if (quantity <= 0 || unitCost <= 0) return '0.00';
    return (quantity * unitCost).toStringAsFixed(2);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFFFFF7ED), Color(0xFFFEF3C7)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 1000),
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
                colors: [Color(0xFFEA580C), Color(0xFFF59E0B), Color(0xFFEAB308)],
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
                  child: const Icon(Icons.local_shipping,
                      color: Colors.white, size: 30),
                ),
                const SizedBox(width: 16),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Movilización y Logística',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 26,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Transporte, traslados y costos logísticos',
                        style: TextStyle(
                          color: Color(0xFFFDE68A),
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
                  _buildTotalCost(),
                  const SizedBox(height: 24),
                  _buildBatchesSection(),
                  const SizedBox(height: 24),
                  _buildObservations(),
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
            TextFormField(
              controller: _transportTypeController,
              decoration: _inputDecoration(
                'Tipo transporte *',
                icon: const Icon(Icons.local_shipping,
                    color: Color(0xFFEA580C)),
                hintText: 'Ejemplo: Camión, Furgoneta, Motocarro...',
              ),
              validator: (v) =>
                  v == null || v.trim().isEmpty ? 'Campo requerido' : null,
            ),
            const SizedBox(height: 18),
            TextFormField(
              controller: _unitController,
              decoration: _inputDecoration(
                'Unidad',
                icon:
                    const Icon(Icons.inventory_2, color: Color(0xFFF59E0B)),
                hintText: 'Ejemplo: kg, litros, unidades...',
              ),
            ),
            const SizedBox(height: 18),
            Stack(
              alignment: Alignment.centerLeft,
              children: [
                TextFormField(
                  controller: _unitCostController,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  decoration: _inputDecoration(
                    'Costo unitario',
                    hintText: 'Ejemplo: 1.50 por kg',
                  ).copyWith(prefixIcon: null),
                  onChanged: (_) => setState(() {}),
                ),
                const Positioned(
                  left: 18,
                  child: Text(
                    'S/',
                    style: TextStyle(
                      color: Color(0xFF6B7280),
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ),
              ],
            ),
          ],
        );

        final rightColumn = Column(
          children: [
            TextFormField(
              controller: _conceptController,
              decoration: _inputDecoration(
                'Concepto',
                icon: const Icon(Icons.place_outlined,
                    color: Color(0xFFEA580C)),
                hintText:
                    'Ejemplo: Transporte de alimento, traslado de animales...',
              ),
            ),
            const SizedBox(height: 18),
            TextFormField(
              controller: _quantityController,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              decoration: _inputDecoration(
                'Cantidad transportada',
                hintText: 'Ejemplo: 500 kg',
              ),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 18),
            TextFormField(
              controller: _dateController,
              readOnly: true,
              decoration: _inputDecoration(
                'Fecha',
                icon:
                    const Icon(Icons.calendar_today, color: Color(0xFF2563EB)),
              ),
              onTap: _pickDate,
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

  Widget _buildTotalCost() {
    if ((_quantityController.text.isEmpty) ||
        (_unitCostController.text.isEmpty)) {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFFFEDD5), Color(0xFFFEF3C7)],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFFCD34D)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Costo Total',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF4B5563),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '${_quantityController.text} ${_unitController.text.isEmpty ? 'unidades' : _unitController.text} × S/ ${_unitCostController.text}',
                style: const TextStyle(
                  fontSize: 11,
                  color: Color(0xFF6B7280),
                ),
              ),
            ],
          ),
          Text(
            'S/ $_calculatedTotal',
            style: const TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.bold,
              color: Color(0xFFEA580C),
            ),
          ),
        ],
      ),
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

  Widget _buildBatchesSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Container(
                  width: 4,
                  height: 24,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFFEA580C), Color(0xFFF59E0B)],
                    ),
                    borderRadius: BorderRadius.circular(6),
                  ),
                ),
                const SizedBox(width: 8),
                const Text(
                  'Lotes asociados',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF374151),
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
            Row(
              children: [
                Row(
                  children: [
                    Checkbox(
                      value: _applyToAll,
                      onChanged: (v) {
                        setState(() {
                          _applyToAll = v ?? false;
                          if (_applyToAll) {
                            _lotesSeleccionados = List.from(_lotes);
                          }
                        });
                      },
                      activeColor: const Color(0xFFEA580C),
                    ),
                    Text(
                      'Aplicar a todos (${_lotes.length})',
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF4B5563),
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 8),
                ElevatedButton.icon(
                  onPressed: _applyToAll ? null : _showLoteSelector,
                  icon: const Icon(Icons.add, size: 18),
                  label: const Text('Agregar lote'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF22C55E),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 10),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                    elevation: 6,
                  ),
                ),
              ],
            ),
          ],
        ),
        const SizedBox(height: 14),
        if (_cargandoLotes)
          const Center(child: CircularProgressIndicator())
        else if (_applyToAll)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF3C7),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFFCD34D)),
            ),
            child: Row(
              children: [
                const Icon(Icons.check_circle, color: Color(0xFFEA580C)),
                const SizedBox(width: 12),
                Text(
                  'Se aplicará a ${_lotes.length} lotes',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ],
            ),
          )
        else if (_lotesSeleccionados.isNotEmpty)
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _lotesSeleccionados.map((lote) {
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFFFFBEB), Color(0xFFFEF3C7)],
                  ),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFFCD34D)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '${lote.codigo} - ${lote.animalName}',
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF111827),
                      ),
                    ),
                    const SizedBox(width: 8),
                    GestureDetector(
                      onTap: () {
                        setState(() {
                          _lotesSeleccionados.remove(lote);
                        });
                      },
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: const BoxDecoration(
                          color: Color(0xFFEF4444),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.close, size: 14, color: Colors.white),
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          )
        else
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey.shade300, width: 2),
            ),
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Seleccione un lote o marque "Aplicar a todos"',
                  style: TextStyle(
                    color: Color(0xFF9CA3AF),
                    fontWeight: FontWeight.w500,
                  ),
                ),
                Icon(Icons.keyboard_arrow_down, color: Color(0xFF9CA3AF)),
              ],
            ),
          ),
      ],
    );
  }

  void _showLoteSelector() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return DraggableScrollableSheet(
          initialChildSize: 0.6,
          maxChildSize: 0.9,
          minChildSize: 0.3,
          expand: false,
          builder: (_, scrollController) {
            final disponibles = _lotes.where((l) => !_lotesSeleccionados.contains(l)).toList();
            return Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: const BoxDecoration(
                    color: Color(0xFFEA580C),
                    borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.inventory_2, color: Colors.white),
                      SizedBox(width: 12),
                      Text(
                        'Seleccionar Lote',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: disponibles.isEmpty
                      ? const Center(child: Text('No hay más lotes disponibles'))
                      : ListView.separated(
                          controller: scrollController,
                          itemCount: disponibles.length,
                          separatorBuilder: (_, __) => const Divider(height: 1),
                          itemBuilder: (_, index) {
                            final lote = disponibles[index];
                            return ListTile(
                              leading: CircleAvatar(
                                backgroundColor: const Color(0xFFFEF3C7),
                                child: Text(
                                  lote.animalName.isNotEmpty ? lote.animalName[0] : '?',
                                  style: const TextStyle(color: Color(0xFFEA580C)),
                                ),
                              ),
                              title: Text(lote.codigo.isNotEmpty ? lote.codigo : lote.name),
                              subtitle: Text('${lote.animalName} - ${lote.quantity} animales'),
                              onTap: () {
                                setState(() {
                                  _lotesSeleccionados.add(lote);
                                });
                                Navigator.pop(ctx);
                              },
                            );
                          },
                        ),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Widget _buildObservations() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Observaciones',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: Color(0xFF374151),
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: _observationsController,
          maxLines: 4,
          decoration: _inputDecoration(
            'Notas adicionales sobre el transporte o logística...',
          ),
        ),
      ],
    );
  }

  Widget _buildActions() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ElevatedButton(
          onPressed: _guardando ? null : _onGuardar,
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFFEA580C),
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(18),
            ),
            elevation: 10,
          ),
          child: _guardando
              ? const SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  ),
                )
              : const Text(
                  'Guardar',
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
    _transportTypeController.clear();
    _conceptController.clear();
    _unitController.clear();
    _quantityController.clear();
    _unitCostController.clear();
    _observationsController.clear();
    _lotesSeleccionados.clear();
    _applyToAll = false;
    _initDefaultValues();
    setState(() {});
  }

  Future<void> _onGuardar() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    // Validar que hay lotes seleccionados
    final lotes = _applyToAll ? _lotes : _lotesSeleccionados;
    if (lotes.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Seleccione al menos un lote o marque "Aplicar a todos"'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    // Validar campos numéricos
    final cantidad = double.tryParse(_quantityController.text.replaceAll(',', '.')) ?? 0;
    final costoUnit = double.tryParse(_unitCostController.text.replaceAll(',', '.')) ?? 0;

    if (cantidad <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ingrese una cantidad válida'), backgroundColor: Colors.red),
      );
      return;
    }

    setState(() => _guardando = true);

    try {
      // Guardar para cada lote seleccionado
      for (final lote in lotes) {
        await LogisticaServiceMobile.crear(
          fecha: _dateController.text,
          loteId: lote.id,
          loteCodigo: lote.codigo,
          tipoTransporte: _transportTypeController.text.trim(),
          concepto: _conceptController.text.trim(),
          unidad: _unitController.text.trim(),
          cantidadTransportada: cantidad,
          costoUnitario: costoUnit,
          observaciones: _observationsController.text.trim(),
        );
      }

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Registro guardado para ${lotes.length} lote(s)'),
          backgroundColor: Colors.green,
        ),
      );

      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error al guardar: $e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) setState(() => _guardando = false);
    }
  }
}
