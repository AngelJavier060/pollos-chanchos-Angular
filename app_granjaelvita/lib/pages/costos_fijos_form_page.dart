import 'package:flutter/material.dart';

class CostosFijosFormPage extends StatefulWidget {
  const CostosFijosFormPage({super.key});

  @override
  State<CostosFijosFormPage> createState() => _CostosFijosFormPageState();
}

class _CostosFijosFormPageState extends State<CostosFijosFormPage> {
  final _formKey = GlobalKey<FormState>();

  final TextEditingController _costNameController = TextEditingController();
  final TextEditingController _totalAmountController = TextEditingController();
  String _prorratePeriod = '';
  final TextEditingController _prorrateMethodController =
      TextEditingController();
  final TextEditingController _dateController = TextEditingController();
  final TextEditingController _observationsController =
      TextEditingController();

  final List<String> _batches = [];
  bool _applyToAll = false;

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
    _costNameController.dispose();
    _totalAmountController.dispose();
    _prorrateMethodController.dispose();
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
        borderSide: BorderSide(color: Color(0xFF8B5CF6), width: 2),
      ),
    );
  }

  String get _prorratedAmount {
    if (_totalAmountController.text.isEmpty ||
        _prorratePeriod.isEmpty ||
        _batches.isEmpty) {
      return '0.00';
    }
    final total =
        double.tryParse(_totalAmountController.text.replaceAll(',', '.')) ?? 0;
    if (total <= 0) return '0.00';

    final periodMultiplier = <String, int>{
      'Mensual': 1,
      'Bimestral': 2,
      'Trimestral': 3,
      'Semestral': 6,
      'Anual': 12,
    };
    final months = periodMultiplier[_prorratePeriod] ?? 1;
    if (months <= 0 || _batches.isEmpty) return '0.00';

    final perBatch = total / _batches.length / months;
    return perBatch.toStringAsFixed(2);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFFF5F3FF), Color(0xFFFAE8FF)],
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
                colors: [Color(0xFF7C3AED), Color(0xFF6D28D9), Color(0xFFDB2777)],
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
                  child: const Icon(Icons.percent,
                      color: Colors.white, size: 30),
                ),
                const SizedBox(width: 16),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Costos Fijos',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 26,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Prorrateables por periodo y por lote (opcional)',
                        style: TextStyle(
                          color: Color(0xFFE9D5FF),
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
                  _buildLotesSection(),
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
              controller: _costNameController,
              decoration: _inputDecoration(
                'Nombre del costo *',
                icon:
                    const Icon(Icons.description, color: Color(0xFF7C3AED)),
                hintText:
                    'Ejemplo: Energía eléctrica, Agua, Alquiler...',
              ),
              validator: (v) =>
                  v == null || v.trim().isEmpty ? 'Campo requerido' : null,
            ),
            const SizedBox(height: 18),
            DropdownButtonFormField<String>(
              value: _prorratePeriod.isEmpty ? null : _prorratePeriod,
              decoration: _inputDecoration('Periodo prorrateo',
                  icon: const Icon(Icons.refresh, color: Color(0xFF8B5CF6))),
              items: const [
                DropdownMenuItem(
                  value: '',
                  child: Text('Mensual, Semanal, etc.'),
                ),
                DropdownMenuItem(value: 'Semanal', child: Text('Semanal')),
                DropdownMenuItem(value: 'Mensual', child: Text('Mensual')),
                DropdownMenuItem(value: 'Bimestral', child: Text('Bimestral')),
                DropdownMenuItem(value: 'Trimestral', child: Text('Trimestral')),
                DropdownMenuItem(value: 'Semestral', child: Text('Semestral')),
                DropdownMenuItem(value: 'Anual', child: Text('Anual')),
              ],
              onChanged: (value) {
                setState(() {
                  _prorratePeriod = value ?? '';
                });
              },
            ),
            const SizedBox(height: 18),
            TextFormField(
              controller: _dateController,
              readOnly: true,
              decoration: _inputDecoration(
                'Fecha',
                icon: const Icon(Icons.calendar_today,
                    color: Color(0xFF2563EB)),
              ),
              onTap: _pickDate,
            ),
          ],
        );

        final rightColumn = Column(
          children: [
            Stack(
              alignment: Alignment.centerLeft,
              children: [
                TextFormField(
                  controller: _totalAmountController,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  decoration: _inputDecoration(
                    'Monto total',
                    hintText: 'Ejemplo: 150.00',
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
              controller: _prorrateMethodController,
              decoration: _inputDecoration(
                'Método prorrateo',
                icon:
                    const Icon(Icons.percent, color: Color(0xFFDB2777)),
                hintText: 'Por animales, por días, etc.',
              ),
            ),
            const SizedBox(height: 18),
            if (_totalAmountController.text.isNotEmpty &&
                _prorratePeriod.isNotEmpty &&
                _batches.isNotEmpty)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFEEF2FF), Color(0xFFE0E7FF)],
                  ),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFC4B5FD)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Monto Total:',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF4B5563),
                          ),
                        ),
                        Text(
                          'S/ ${_totalAmountController.text}',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF111827),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Periodo:',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF4B5563),
                          ),
                        ),
                        Text(
                          _prorratePeriod,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF111827),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Lotes:',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF4B5563),
                          ),
                        ),
                        Text(
                          _batches.length.toString(),
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF111827),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    const Divider(color: Color(0xFFC4B5FD)),
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Por Lote/Mes:',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF5B21B6),
                          ),
                        ),
                        Text(
                          'S/ $_prorratedAmount',
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF7C3AED),
                          ),
                        ),
                      ],
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

  Widget _buildLotesSection() {
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
                      colors: [Color(0xFF7C3AED), Color(0xFFDB2777)],
                    ),
                    borderRadius: BorderRadius.circular(6),
                  ),
                ),
                const SizedBox(width: 8),
                const Text(
                  'Lotes (opcional)',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF374151),
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
            Flexible(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Flexible(
                    child: InkWell(
                      onTap: () {
                        setState(() {
                          _applyToAll = !_applyToAll;
                        });
                      },
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Checkbox(
                            value: _applyToAll,
                            onChanged: (v) {
                              setState(() {
                                _applyToAll = v ?? false;
                              });
                            },
                            activeColor: const Color(0xFF7C3AED),
                          ),
                          const Flexible(
                            child: Text(
                              'Aplicar a todos los lotes',
                              style: TextStyle(
                                fontSize: 12,
                                color: Color(0xFF4B5563),
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton.icon(
                    onPressed: _addBatch,
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
            ),
          ],
        ),
        const SizedBox(height: 14),
        if (_batches.isNotEmpty)
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
              childAspectRatio: 3.5,
            ),
            itemCount: _batches.length,
            itemBuilder: (context, index) {
              final batch = _batches[index];
              return Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFEEF2FF), Color(0xFFE0E7FF)],
                  ),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFC4B5FD)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          batch,
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF111827),
                          ),
                        ),
                        if (_totalAmountController.text.isNotEmpty &&
                            _prorratePeriod.isNotEmpty)
                          Text(
                            'S/ $_prorratedAmount/mes',
                            style: const TextStyle(
                              fontSize: 11,
                              color: Color(0xFF7C3AED),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                      ],
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
              children: const [
                Text(
                  'Sin lote',
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
            'Notas adicionales sobre el costo fijo...',
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
          onPressed: _onGuardar,
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF7C3AED),
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(18),
            ),
            elevation: 10,
          ),
          child: const Text(
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
    _costNameController.clear();
    _totalAmountController.clear();
    _prorrateMethodController.clear();
    _observationsController.clear();
    _prorratePeriod = '';
    _batches.clear();
    _applyToAll = false;
    _initDefaultValues();
    setState(() {});
  }

  void _onGuardar() {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    Navigator.pop(context, true);
  }
}
