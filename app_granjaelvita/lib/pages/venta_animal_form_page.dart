import 'package:flutter/material.dart';

import '../services/lote_service.dart';
import '../services/ventas_service.dart';

class VentaAnimalFormPage extends StatefulWidget {
  const VentaAnimalFormPage({super.key});

  @override
  State<VentaAnimalFormPage> createState() => _VentaAnimalFormPageState();
}

class _VentaAnimalFormPageState extends State<VentaAnimalFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _loteSrv = LoteServiceMobile();

  String _animal = 'Pollos';
  final TextEditingController _dateController = TextEditingController();
  final TextEditingController _quantityController = TextEditingController();
  final TextEditingController _unitPriceController = TextEditingController();
  
  List<LoteDto> _lotes = [];
  LoteDto? _loteSel;
  bool _guardando = false;
  bool _cargandoLotes = true;

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
    _quantityController.text = '';
    _unitPriceController.text = '';
  }

  Future<void> _cargarLotes() async {
    try {
      final lotes = await _loteSrv.getActivos();
      if (!mounted) return;
      setState(() {
        _lotes = lotes;
        _cargandoLotes = false;
        final filtrados = _lotesFiltrados;
        if (filtrados.isNotEmpty) {
          _loteSel = filtrados.first;
        }
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
    _dateController.dispose();
    _quantityController.dispose();
    _unitPriceController.dispose();
    super.dispose();
  }

  double get _totalLinea {
    final q = double.tryParse(_quantityController.text.replaceAll(',', '.')) ?? 0;
    final p = double.tryParse(_unitPriceController.text.replaceAll(',', '.')) ?? 0;
    if (q <= 0 || p <= 0) return 0;
    return q * p;
  }

  List<LoteDto> get _lotesFiltrados {
    if (_lotes.isEmpty) return _lotes;
    final a = _animal.toLowerCase();
    
    List<LoteDto> lotesConStock = _lotes.where((l) => l.quantity > 0).toList();
    
    if (a.contains('pollo')) {
      return lotesConStock
          .where((l) => l.animalName.toLowerCase().contains('pollo') ||
                        l.animalName.toLowerCase().contains('ave') ||
                        l.animalName.toLowerCase().contains('gallina'))
          .toList();
    }
    if (a.contains('chancho')) {
      return lotesConStock
          .where((l) => l.animalName.toLowerCase().contains('chancho') ||
                        l.animalName.toLowerCase().contains('cerdo') ||
                        l.animalName.toLowerCase().contains('puerco'))
          .toList();
    }
    return lotesConStock;
  }

  String _formatLoteLabel(LoteDto l) {
    final base = l.codigo.isNotEmpty ? l.codigo : l.name;
    final name = l.name;
    final qty = l.quantity;
    return '$base - $name ($qty animales)';
  }

  int get _stockDisponible {
    if (_loteSel == null) return 0;
    return _loteSel!.quantity;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFFF0F9FF), Color(0xFFE0F2FE)],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              _buildHeader(),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: _buildFormCard(),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
            child: Row(
              children: [
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.arrow_back_ios, color: Colors.white),
                ),
                const Expanded(
                  child: Text(
                    'Registrar Venta',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.15),
            ),
            child: const Text(
              'Complete los datos de la venta de animales',
              style: TextStyle(
                fontSize: 14,
                color: Colors.white70,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFormCard() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Selector de Animal
            _buildSectionTitle('Tipo de Animal', Icons.pets),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: _buildAnimalSelector(),
            ),
            const SizedBox(height: 20),

            // Selector de Lote
            _buildSectionTitle('Lote', Icons.inventory_2),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: _buildLoteDropdown(),
            ),
            const SizedBox(height: 20),

            // Fecha
            _buildSectionTitle('Fecha de Venta', Icons.calendar_today),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: _buildDateField(),
            ),
            const SizedBox(height: 20),

            // Cantidad
            _buildSectionTitle('Cantidad', Icons.format_list_numbered),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: _buildQuantityField(),
            ),
            const SizedBox(height: 20),

            // Precio Unitario
            _buildSectionTitle('Precio Unitario', Icons.attach_money),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: _buildPriceField(),
            ),
            const SizedBox(height: 24),

            // Total
            _buildTotalSection(),
            const SizedBox(height: 24),

            // Botones
            _buildButtons(),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title, IconData icon) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFF2563EB).withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 18, color: const Color(0xFF2563EB)),
          ),
          const SizedBox(width: 12),
          Text(
            title.toUpperCase(),
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: Color(0xFF64748B),
              letterSpacing: 1.2,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAnimalSelector() {
    return Row(
      children: [
        Expanded(
          child: _buildAnimalOption('Pollos', '🐔', _animal == 'Pollos'),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildAnimalOption('Chanchos', '🐷', _animal == 'Chanchos'),
        ),
      ],
    );
  }

  Widget _buildAnimalOption(String label, String emoji, bool selected) {
    return GestureDetector(
      onTap: () {
        setState(() {
          _animal = label;
          final filtrados = _lotesFiltrados;
          if (filtrados.isNotEmpty) {
            _loteSel = filtrados.first;
          } else {
            _loteSel = null;
          }
        });
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFF2563EB) : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected ? const Color(0xFF2563EB) : Colors.grey.shade300,
            width: 2,
          ),
          boxShadow: selected
              ? [
                  BoxShadow(
                    color: const Color(0xFF2563EB).withOpacity(0.3),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ]
              : null,
        ),
        child: Column(
          children: [
            Text(emoji, style: const TextStyle(fontSize: 32)),
            const SizedBox(height: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: selected ? Colors.white : Colors.grey.shade700,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLoteDropdown() {
    if (_cargandoLotes) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.grey.shade50,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.grey.shade300),
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
            SizedBox(width: 12),
            Text('Cargando lotes...'),
          ],
        ),
      );
    }

    final lotesFiltrados = _lotesFiltrados;
    
    if (lotesFiltrados.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFFFEF3C7),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFFBBF24)),
        ),
        child: Row(
          children: [
            const Icon(Icons.warning_amber_rounded, color: Color(0xFFD97706)),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'No hay lotes disponibles para $_animal',
                style: const TextStyle(color: Color(0xFF92400E)),
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey.shade300, width: 1.5),
      ),
      child: DropdownButtonFormField<LoteDto>(
        value: _loteSel,
        decoration: const InputDecoration(
          contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          border: InputBorder.none,
        ),
        isExpanded: true,
        icon: const Icon(Icons.keyboard_arrow_down, color: Color(0xFF2563EB)),
        items: lotesFiltrados.map((l) {
          return DropdownMenuItem<LoteDto>(
            value: l,
            child: Text(
              _formatLoteLabel(l),
              style: const TextStyle(fontSize: 15),
              overflow: TextOverflow.ellipsis,
            ),
          );
        }).toList(),
        onChanged: (v) {
          setState(() {
            _loteSel = v;
          });
        },
      ),
    );
  }

  Widget _buildDateField() {
    return GestureDetector(
      onTap: _pickDate,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        decoration: BoxDecoration(
          color: Colors.grey.shade50,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.grey.shade300, width: 1.5),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                _dateController.text.isEmpty ? 'Seleccione fecha' : _dateController.text,
                style: TextStyle(
                  fontSize: 16,
                  color: _dateController.text.isEmpty ? Colors.grey : Colors.black87,
                ),
              ),
            ),
            const Icon(Icons.calendar_month, color: Color(0xFF2563EB)),
          ],
        ),
      ),
    );
  }

  Widget _buildQuantityField() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          decoration: BoxDecoration(
            color: Colors.grey.shade50,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.grey.shade300, width: 1.5),
          ),
          child: TextFormField(
            controller: _quantityController,
            keyboardType: const TextInputType.numberWithOptions(decimal: false),
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
            decoration: const InputDecoration(
              hintText: 'Ingrese cantidad',
              contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              border: InputBorder.none,
            ),
            onChanged: (_) => setState(() {}),
          ),
        ),
        if (_loteSel != null) ...[
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFFDCFCE7),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.inventory, size: 16, color: Color(0xFF16A34A)),
                const SizedBox(width: 6),
                Text(
                  'Stock disponible: $_stockDisponible animales',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF16A34A),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildPriceField() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey.shade300, width: 1.5),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            decoration: BoxDecoration(
              color: Colors.grey.shade200,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(12),
                bottomLeft: Radius.circular(12),
              ),
            ),
            child: const Text(
              'S/',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Color(0xFF64748B),
              ),
            ),
          ),
          Expanded(
            child: TextFormField(
              controller: _unitPriceController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
              decoration: const InputDecoration(
                hintText: '0.00',
                contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                border: InputBorder.none,
              ),
              onChanged: (_) => setState(() {}),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTotalSection() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            const Color(0xFF10B981).withOpacity(0.1),
            const Color(0xFF059669).withOpacity(0.1),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF10B981).withOpacity(0.3)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'TOTAL DE LA VENTA',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF059669),
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '${_quantityController.text.isEmpty ? "0" : _quantityController.text} × S/ ${_unitPriceController.text.isEmpty ? "0.00" : _unitPriceController.text}',
                style: const TextStyle(
                  fontSize: 13,
                  color: Color(0xFF6B7280),
                ),
              ),
            ],
          ),
          Text(
            'S/ ${_totalLinea.toStringAsFixed(2)}',
            style: const TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.bold,
              color: Color(0xFF059669),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildButtons() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        children: [
          SizedBox(
            width: double.infinity,
            height: 56,
            child: ElevatedButton(
              onPressed: _guardando ? null : _onGuardar,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2563EB),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
                elevation: 4,
                shadowColor: const Color(0xFF2563EB).withOpacity(0.4),
              ),
              child: _guardando
                  ? const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.save, size: 22),
                        SizedBox(width: 10),
                        Text(
                          'Guardar Venta',
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _clearForm,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFF64748B),
                    side: const BorderSide(color: Color(0xFFCBD5E1), width: 1.5),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.refresh, size: 20),
                      SizedBox(width: 8),
                      Text('Limpiar', style: TextStyle(fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton(
                  onPressed: () => Navigator.pop(context),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFF64748B),
                    side: const BorderSide(color: Color(0xFFCBD5E1), width: 1.5),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.close, size: 20),
                      SizedBox(width: 8),
                      Text('Cerrar', style: TextStyle(fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
              ),
            ],
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
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: Color(0xFF2563EB),
              onPrimary: Colors.white,
              surface: Colors.white,
              onSurface: Colors.black87,
            ),
          ),
          child: child!,
        );
      },
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

  void _clearForm() {
    _quantityController.text = '';
    _unitPriceController.text = '';
    _initDefaultValues();
    setState(() {});
  }

  Future<void> _onGuardar() async {
    if (_guardando) return;

    final lote = _loteSel;
    if (lote == null) {
      _showSnack('Seleccione un lote', isError: true);
      return;
    }

    final fecha = _dateController.text.trim();
    if (fecha.isEmpty) {
      _showSnack('Seleccione una fecha', isError: true);
      return;
    }

    final cantidad = double.tryParse(_quantityController.text.replaceAll(',', '.')) ?? 0;
    final precio = double.tryParse(_unitPriceController.text.replaceAll(',', '.')) ?? 0;

    if (cantidad <= 0) {
      _showSnack('Ingrese una cantidad válida', isError: true);
      return;
    }

    if (cantidad > _stockDisponible) {
      _showSnack('La cantidad excede el stock disponible ($_stockDisponible)', isError: true);
      return;
    }

    if (precio <= 0) {
      _showSnack('Ingrese un precio válido', isError: true);
      return;
    }

    // Calcular si el lote llegará a 0 después de la venta
    final stockRestante = _stockDisponible - cantidad.toInt();
    final loteLlegoACero = stockRestante <= 0;
    final loteCodigo = lote.codigo;

    setState(() {
      _guardando = true;
    });

    try {
      await VentasServiceMobile.crearVentaAnimal(
        fecha: fecha,
        loteId: lote.id,
        loteCodigo: lote.codigo,
        animalName: lote.animalName.isNotEmpty ? lote.animalName : _animal,
        cantidad: cantidad,
        precioUnit: precio,
      );

      if (!mounted) return;
      
      _showSuccessDialog(
        loteLlegoACero: loteLlegoACero,
        loteCodigo: loteCodigo,
      );
    } catch (e) {
      _showSnack('Error al guardar: $e', isError: true);
    } finally {
      if (mounted) {
        setState(() {
          _guardando = false;
        });
      }
    }
  }

  void _showSuccessDialog({bool loteLlegoACero = false, String? loteCodigo}) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981).withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.check_circle,
                color: Color(0xFF10B981),
                size: 64,
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              '¡Venta Registrada!',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: Color(0xFF111827),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Total: S/ ${_totalLinea.toStringAsFixed(2)}',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: Color(0xFF10B981),
              ),
            ),
            if (loteLlegoACero) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFFBBF24)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline, color: Color(0xFFD97706), size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'El lote ${loteCodigo ?? ''} llegó a 0 animales y fue movido al histórico.',
                        style: const TextStyle(
                          fontSize: 13,
                          color: Color(0xFF92400E),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () async {
                      Navigator.pop(context);
                      _clearForm();
                      // Recargar lotes para reflejar el nuevo stock
                      await _cargarLotes();
                    },
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    child: const Text('Nueva Venta'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pop(context); // Cierra dialog
                      Navigator.pop(context, true); // Vuelve al dashboard con refresh
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    child: const Text('Ver Dashboard'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showSnack(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              isError ? Icons.error_outline : Icons.check_circle_outline,
              color: Colors.white,
            ),
            const SizedBox(width: 10),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: isError ? const Color(0xFFDC2626) : const Color(0xFF10B981),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }
}
