import 'package:flutter/material.dart';

class GastoOperacionFormPage extends StatefulWidget {
  const GastoOperacionFormPage({super.key});

  @override
  State<GastoOperacionFormPage> createState() => _GastoOperacionFormPageState();
}

class _GastoOperacionFormPageState extends State<GastoOperacionFormPage> {
  final _formKey = GlobalKey<FormState>();

  final TextEditingController _expenseNameController = TextEditingController();
  final TextEditingController _detailController = TextEditingController();
  final TextEditingController _unitController = TextEditingController();
  final TextEditingController _quantityController = TextEditingController();
  final TextEditingController _unitCostController = TextEditingController();
  final TextEditingController _dateController = TextEditingController();
  final TextEditingController _observationsController = TextEditingController();

  final List<String> _animals = [];
  final List<String> _batches = [];
  bool _applyToAllBatches = false;

  final List<String> _expenseTypes = const [
    'Energía eléctrica',
    'Agua',
    'Desinfección',
    'Combustible',
    'Gas',
    'Mantenimiento',
    'Reparaciones',
    'Otro',
  ];

  @override
  void initState() {
    super.initState();
    _initDefaultValues();
  }

  void _initDefaultValues() {
    final now = DateTime.now();
    final y = now.year.toString();
    final m = now.month.toString().padLeft(2, '0');
    final d = now.day.toString().padLeft(2, '0');
    _dateController.text = '$y-$m-$d';
  }

  @override
  void dispose() {
    _expenseNameController.dispose();
    _detailController.dispose();
    _unitController.dispose();
    _quantityController.dispose();
    _unitCostController.dispose();
    _dateController.dispose();
    _observationsController.dispose();
    super.dispose();
  }

  InputDecoration _inputDecoration(String label, {Widget? icon}) {
    return InputDecoration(
      labelText: label,
      prefixIcon: icon,
      filled: true,
      fillColor: const Color(0xFFF9FAFB),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Color(0xFFE5E7EB), width: 2),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Color(0xFFE5E7EB), width: 2),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Color(0xFF10B981), width: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFFECFDF5), Color(0xFFE0F2FE)],
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
                child: Card(
                  elevation: 12,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(24),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _buildHeader(),
                      Padding(
                        padding: const EdgeInsets.all(20),
                        child: Form(
                          key: _formKey,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              _buildAnimalsSection(),
                              const SizedBox(height: 20),
                              _buildMainGrid(),
                              const SizedBox(height: 20),
                              _buildBatchesSection(),
                              const SizedBox(height: 20),
                              _buildObservations(),
                              const SizedBox(height: 24),
                              _buildActions(),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF059669), Color(0xFF0D9488)],
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          Row(
            children: [
              Icon(Icons.build_rounded, color: Colors.white, size: 30),
              SizedBox(width: 10),
              Text(
                'Gastos de Operación',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          SizedBox(height: 6),
          Text(
            'Consumos operativos: energía, agua, insumos generales',
            style: TextStyle(
              color: Color(0xFFD1FAE5),
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionLabel(String title) {
    return Row(
      children: [
        Container(
          width: 4,
          height: 18,
          decoration: BoxDecoration(
            color: const Color(0xFF059669),
            borderRadius: BorderRadius.circular(4),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          title,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: Color(0xFF374151),
          ),
        ),
      ],
    );
  }

  Widget _buildAnimalsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.start,
          children: [
            _buildSectionLabel('Animal(es)'),
          ],
        ),
        const SizedBox(height: 10),
        if (_animals.isNotEmpty)
          Column(
            children: [
              for (int i = 0; i < _animals.length; i++) ...[
                Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.symmetric(
                      horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFECFDF5),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                        color: const Color(0xFF6EE7B7), width: 2),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          _animals[i],
                          style: const TextStyle(
                            color: Color(0xFF374151),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                      IconButton(
                        onPressed: () => _removeAnimal(i),
                        icon: const Icon(Icons.close_rounded, size: 18),
                        color: Colors.white,
                        style: IconButton.styleFrom(
                          backgroundColor: const Color(0xFFEF4444),
                          padding: const EdgeInsets.all(6),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          )
        else
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: const Color(0xFFF9FAFB),
              borderRadius: BorderRadius.circular(14),
              border:
                  Border.all(color: const Color(0xFFE5E7EB), width: 2),
            ),
            child: const Text(
              'Seleccione animal',
              style: TextStyle(
                color: Color(0xFF9CA3AF),
                fontSize: 14,
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildMainGrid() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth >= 700;

        final leftColumn = Column(
          children: [
            TextFormField(
              controller: _expenseNameController,
              decoration: _inputDecoration(
                'Nombre del gasto',
                icon:
                    const Icon(Icons.bolt_rounded, color: Color(0xFF059669)),
              ).copyWith(
                hintText:
                    'Ej: Energía eléctrica, Agua, Desinfección, Combustible',
              ),
              validator: (v) =>
                  v == null || v.trim().isEmpty ? 'Campo requerido' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _unitController,
              decoration: _inputDecoration('Unidad').copyWith(
                hintText: 'Ej: kg, ml, unidad, dosis, kWh, m³',
              ),
              validator: (v) =>
                  v == null || v.trim().isEmpty ? 'Campo requerido' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _unitCostController,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              decoration: _inputDecoration(
                'Costo unitario',
                icon: const Icon(Icons.attach_money_rounded,
                    color: Color(0xFF059669)),
              ).copyWith(
                hintText: 'Ej: 0.15',
              ),
              validator: (v) =>
                  v == null || v.trim().isEmpty ? 'Campo requerido' : null,
            ),
          ],
        );

        final rightColumn = Column(
          children: [
            TextFormField(
              controller: _detailController,
              decoration: _inputDecoration('Detalle').copyWith(
                hintText:
                    'Ej: Lectura de medidor, limpieza mensual, proveedor',
              ),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _quantityController,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              decoration: _inputDecoration('Cantidad consumida').copyWith(
                hintText: 'Ej: 120.5',
              ),
              validator: (v) =>
                  v == null || v.trim().isEmpty ? 'Campo requerido' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _dateController,
              readOnly: true,
              decoration: _inputDecoration(
                'Fecha',
                icon: const Icon(Icons.calendar_today_rounded,
                    color: Color(0xFF059669)),
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

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final currentText = _dateController.text;
    DateTime? initialDate;
    try {
      if (currentText.isNotEmpty && currentText.contains('-')) {
        final parts = currentText.split('-');
        if (parts.length == 3) {
          final y = int.parse(parts[0]);
          final m = int.parse(parts[1]);
          final d = int.parse(parts[2]);
          initialDate = DateTime(y, m, d);
        }
      }
    } catch (_) {}
    initialDate ??= now;

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
            _buildSectionLabel('Lotes asociados'),
            Row(
              children: [
                Row(
                  children: [
                    Checkbox(
                      value: _applyToAllBatches,
                      activeColor: const Color(0xFF059669),
                      onChanged: (value) {
                        setState(() {
                          _applyToAllBatches = value ?? false;
                        });
                      },
                    ),
                    const Text(
                      'Aplicar a todos los lotes filtrados',
                      style: TextStyle(
                        fontSize: 12,
                        color: Color(0xFF4B5563),
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 8),
                ElevatedButton.icon(
                  onPressed: _addBatch,
                  icon: const Icon(Icons.add, size: 18),
                  label: const Text('Agregar lote'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF22C55E),
                    foregroundColor: Colors.white,
                    elevation: 3,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 8),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
        const SizedBox(height: 10),
        if (_batches.isNotEmpty)
          Column(
            children: [
              for (int i = 0; i < _batches.length; i++) ...[
                Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.symmetric(
                      horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFECFDF5),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                        color: const Color(0xFF6EE7B7), width: 2),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          _batches[i],
                          style: const TextStyle(
                            color: Color(0xFF374151),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                      IconButton(
                        onPressed: () => _removeBatch(i),
                        icon: const Icon(Icons.close_rounded, size: 18),
                        color: Colors.white,
                        style: IconButton.styleFrom(
                          backgroundColor: const Color(0xFFEF4444),
                          padding: const EdgeInsets.all(6),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          )
        else
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: const Color(0xFFF9FAFB),
              borderRadius: BorderRadius.circular(14),
              border:
                  Border.all(color: const Color(0xFFE5E7EB), width: 2),
            ),
            child: const Text(
              'Seleccione lote',
              style: TextStyle(
                color: Color(0xFF9CA3AF),
                fontSize: 14,
              ),
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
            fontWeight: FontWeight.w600,
            color: Color(0xFF374151),
          ),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: _observationsController,
          maxLines: 4,
          decoration: _inputDecoration('Notas adicionales'),
        ),
      ],
    );
  }

  Widget _buildActions() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ElevatedButton(
          onPressed: _onGuardar,
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF059669),
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            elevation: 6,
          ),
          child: const Text(
            'Guardar',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          ),
        ),
        const SizedBox(height: 10),
        OutlinedButton(
          onPressed: _clearForm,
          style: OutlinedButton.styleFrom(
            foregroundColor: const Color(0xFF374151),
            side: const BorderSide(color: Color(0xFFD1D5DB)),
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
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

  void _addAnimal() {
    setState(() {
      final index = _animals.length + 1;
      _animals.add('Animal $index');
    });
  }

  void _removeAnimal(int index) {
    setState(() {
      _animals.removeAt(index);
    });
  }

  void _addBatch() {
    setState(() {
      final index = _batches.length + 1;
      _batches.add('Lote $index');
    });
  }

  void _removeBatch(int index) {
    setState(() {
      _batches.removeAt(index);
    });
  }

  void _clearForm() {
    _formKey.currentState?.reset();
    _expenseNameController.clear();
    _detailController.clear();
    _unitController.clear();
    _quantityController.clear();
    _unitCostController.clear();
    _observationsController.clear();
    _animals.clear();
    _batches.clear();
    _applyToAllBatches = false;
    _initDefaultValues();
    setState(() {});
  }

  void _onGuardar() {
    if (!_formKey.currentState!.validate()) return;

    // De momento solo cerramos devolviendo true.
    // Más adelante aquí se podrá llamar a un servicio HTTP para persistir.
    Navigator.pop(context, true);
  }
}
