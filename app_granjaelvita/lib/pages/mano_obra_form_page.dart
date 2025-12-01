import 'package:flutter/material.dart';

import '../models/mano_obra_model.dart';
import '../services/lote_service.dart';
import '../services/mano_obra_service.dart';

class ManoObraFormPage extends StatefulWidget {
  const ManoObraFormPage({super.key});

  @override
  State<ManoObraFormPage> createState() => _ManoObraFormPageState();
}

class _ManoObraFormPageState extends State<ManoObraFormPage> {
  final _formKey = GlobalKey<FormState>();

  final TextEditingController _workerController = TextEditingController();
  final TextEditingController _positionController = TextEditingController();
  final TextEditingController _hoursController = TextEditingController();
  final TextEditingController _monthlyCostController = TextEditingController();
  final TextEditingController _dateController = TextEditingController();
  final TextEditingController _observationsController = TextEditingController();

  final List<LoteDto> _lotes = [];
  final List<String> _selectedLoteIds = [];
  bool _applyToAll = false;

  bool _saving = false;
  String? _error;
  String? _success;

  @override
  void initState() {
    super.initState();
    _initDefaultValues();
    _cargarLotesActivos();
  }

  void _initDefaultValues() {
    final now = DateTime.now();
    final y = now.year.toString();
    final m = now.month.toString().padLeft(2, '0');
    final d = now.day.toString().padLeft(2, '0');
    _dateController.text = '$y-$m-$d';
  }

  Future<void> _cargarLotesActivos() async {
    try {
      final srv = LoteServiceMobile();
      final lotes = await srv.getActivos();
      setState(() {
        _lotes
          ..clear()
          ..addAll(lotes.where((l) => l.quantity > 0));
      });
    } catch (_) {
      // Si falla, dejamos la lista vacía
    }
  }

  @override
  void dispose() {
    _workerController.dispose();
    _positionController.dispose();
    _hoursController.dispose();
    _monthlyCostController.dispose();
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
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: Color(0xFF2563EB), width: 2),
      ),
    );
  }

  double get _estimatedTotalCost {
    final monthly =
        double.tryParse(_monthlyCostController.text.replaceAll(',', '.')) ?? 0;
    if (monthly <= 0) return 0;
    // El costo mensual es el valor real total que se va a repartir.
    // El estimado muestra ese monto total.
    return monthly;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF020617), Color(0xFF0B1120), Color(0xFF1E293B)],
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
                child: Column(
                  children: [
                    _buildHeaderCard(),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeaderCard() {
    return Card(
      elevation: 20,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF2563EB), Color(0xFF4F46E5), Color(0xFF7C3AED)],
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
                  child: const Icon(Icons.person_outline,
                      color: Colors.white, size: 30),
                ),
                const SizedBox(width: 16),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Mano de Obra',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 26,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Registro de horas y costos por trabajador',
                        style: TextStyle(
                          color: Color(0xFFDBEAFE),
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
              controller: _workerController,
              decoration: _inputDecoration(
                'Trabajador *',
                icon: const Icon(Icons.person_outline,
                    color: Color(0xFF2563EB)),
                hintText: 'Ejemplo: Juan Pérez',
              ),
              validator: (v) =>
                  v == null || v.trim().isEmpty ? 'Campo requerido' : null,
            ),
            const SizedBox(height: 18),
            TextFormField(
              controller: _positionController,
              decoration: _inputDecoration(
                'Cargo *',
                icon: const Icon(Icons.work_outline,
                    color: Color(0xFF4F46E5)),
                hintText: 'Ejemplo: Operador, Cuidador, Técnico...',
              ),
              validator: (v) =>
                  v == null || v.trim().isEmpty ? 'Campo requerido' : null,
            ),
            const SizedBox(height: 18),
            Stack(
              alignment: Alignment.centerRight,
              children: [
                TextFormField(
                  controller: _hoursController,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  decoration: _inputDecoration(
                    'Horas trabajadas',
                    icon: const Icon(Icons.access_time,
                        color: Color(0xFF059669)),
                    hintText: 'Ejemplo: 8 horas',
                  ),
                  onChanged: (_) => setState(() {}),
                ),
                const Padding(
                  padding: EdgeInsets.only(right: 20),
                  child: Text(
                    'hrs',
                    style: TextStyle(
                      color: Color(0xFF6B7280),
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
          ],
        );

        final rightColumn = Column(
          children: [
            Stack(
              alignment: Alignment.centerLeft,
              children: [
                TextFormField(
                  controller: _monthlyCostController,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  decoration: _inputDecoration(
                    'Costo por mes',
                    icon: const Icon(Icons.attach_money,
                        color: Color(0xFF7C3AED)),
                    hintText: '0.00',
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
            const SizedBox(height: 18),
            TextFormField(
              controller: _dateController,
              readOnly: true,
              decoration: _inputDecoration(
                'Fecha',
                icon: const Icon(Icons.calendar_today,
                    color: Color(0xFFF59E0B)),
              ),
              onTap: _pickDate,
            ),
            const SizedBox(height: 18),
            Container(
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
                  const Text(
                    'Costo Total Estimado:',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF4B5563),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'S/ ${_estimatedTotalCost.toStringAsFixed(2)}',
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF2563EB),
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Basado en 160 horas mensuales estándar',
                    style: TextStyle(
                      fontSize: 11,
                      color: Color(0xFF6B7280),
                    ),
                  ),
                ],
              ),
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
                      colors: [Color(0xFF2563EB), Color(0xFF4F46E5)],
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
                InkWell(
                  onTap: () {
                    setState(() {
                      _applyToAll = !_applyToAll;
                    });
                  },
                  child: Row(
                    children: [
                      Checkbox(
                        value: _applyToAll,
                        onChanged: (v) {
                          setState(() {
                            _applyToAll = v ?? false;
                          });
                        },
                        activeColor: const Color(0xFF2563EB),
                      ),
                      const Text(
                        'Aplicar a todos los lotes activos',
                        style: TextStyle(
                          fontSize: 12,
                          color: Color(0xFF4B5563),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
        const SizedBox(height: 14),
        if (_selectedLoteIds.isNotEmpty)
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
              childAspectRatio: 3.5,
            ),
            itemCount: _selectedLoteIds.length,
            itemBuilder: (context, index) {
              final loteId = _selectedLoteIds[index];
              final lote =
                  _lotes.firstWhere((l) => l.id == loteId, orElse: () => _lotes.first);
              final batch = lote.name.isNotEmpty ? lote.name : lote.codigo;
              return Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFDBEAFE), Color(0xFFE0E7FF)],
                  ),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFBFDBFE)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      batch,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF111827),
                      ),
                    ),
                    IconButton(
                      onPressed: () => _removeBatch(index),
                      icon: const Icon(Icons.close_rounded, size: 18),
                      color: Colors.white,
                      style: IconButton.styleFrom(
                        backgroundColor: const Color(0xFFEF4444),
                        padding: const EdgeInsets.all(6),
                      ),
                    ),
                  ],
                ),
              );
            },
          )
        else
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey.shade300, width: 2),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Seleccione lote',
                  style: TextStyle(
                    color: Color(0xFF9CA3AF),
                    fontWeight: FontWeight.w500,
                  ),
                ),
                PopupMenuButton<String>(
                  icon: const Icon(Icons.keyboard_arrow_down,
                      color: Color(0xFF9CA3AF)),
                  onSelected: (id) {
                    setState(() {
                      if (!_selectedLoteIds.contains(id)) {
                        _selectedLoteIds.add(id);
                      }
                    });
                  },
                  itemBuilder: (context) {
                    return _lotes
                        .map(
                          (l) => PopupMenuItem<String>(
                            value: l.id,
                            child: Text(
                              (l.name.isNotEmpty ? l.name : l.codigo) +
                                  '  (${l.quantity} vivos)',
                            ),
                          ),
                        )
                        .toList();
                  },
                ),
              ],
            ),
          ),
      ],
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
            'Notas adicionales sobre el trabajo realizado...',
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
          onPressed: _saving ? null : _onGuardar,
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
            'Guardar Registro',
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

  void _addBatch() {
    // Ya no se usa el agregado manual sin datos reales.
  }

  void _removeBatch(int index) {
    setState(() {
      _selectedLoteIds.removeAt(index);
    });
  }

  void _clearForm() {
    _formKey.currentState?.reset();
    _workerController.clear();
    _positionController.clear();
    _hoursController.clear();
    _monthlyCostController.clear();
    _observationsController.clear();
    _selectedLoteIds.clear();
    _applyToAll = false;
    _error = null;
    _success = null;
    _initDefaultValues();
    setState(() {});
  }

  void _onGuardar() {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    final horas =
        double.tryParse(_hoursController.text.replaceAll(',', '.')) ?? 0;
    final montoMensual =
        double.tryParse(_monthlyCostController.text.replaceAll(',', '.')) ?? 0;

    if (montoMensual <= 0) {
      setState(() {
        _error = 'Ingrese un monto mensual válido.';
        _success = null;
      });
      return;
    }

    if (horas <= 0) {
      setState(() {
        _error = 'Ingrese las horas trabajadas para registrar el pago.';
        _success = null;
      });
      return;
    }

    List<String> lotesSeleccionados;
    if (_applyToAll) {
      lotesSeleccionados = _lotes.map((l) => l.id).toList();
    } else {
      lotesSeleccionados = List<String>.from(_selectedLoteIds);
    }

    if (lotesSeleccionados.isEmpty) {
      setState(() {
        _error =
            'Seleccione al menos un lote o active "Aplicar a todos los lotes activos".';
        _success = null;
      });
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
      _success = null;
    });

    ManoObraServiceMobile.crearProrrateado(
      nombreTrabajador: _workerController.text.trim(),
      cargo: _positionController.text.trim(),
      horasTrabajadas: horas,
      montoMensual: montoMensual,
      fecha: _dateController.text.trim(),
      loteIds: lotesSeleccionados,
      aplicarPorIgual: _applyToAll,
      observaciones: _observationsController.text.trim(),
    ).then((_) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        _success = 'Registro guardado correctamente.';
      });
      Navigator.pop(context, true);
    }).catchError((e) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        _error = e.toString();
      });
    });
  }
}
