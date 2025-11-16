import 'package:flutter/material.dart';
import '../services/lote_service.dart';
import '../services/plan_alimentacion_service.dart';
import '../widgets/lote_card.dart';

class AlimentacionPage extends StatefulWidget {
  const AlimentacionPage({super.key});
  @override
  State<AlimentacionPage> createState() => _AlimentacionPageState();
}

class _AlimentacionPageState extends State<AlimentacionPage> {
  final _loteSrv = LoteServiceMobile();
  final _planSrv = PlanAlimentacionServiceMobile();
  final _productoCtrl = TextEditingController(text: 'Balanceado');
  final _cantidadCtrl = TextEditingController();
  final _obsCtrl = TextEditingController();
  bool _cargando = true;
  String? _error;
  List<LoteDto> _lotes = [];
  LoteDto? _loteSel;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    setState(() { _cargando = true; _error = null; });
    try {
      final lotes = await _loteSrv.getActivosPollos();
      setState(() { _lotes = lotes; if (lotes.isNotEmpty) _loteSel = lotes.first; });
    } catch (e) {
      setState(() { _error = e.toString(); });
    } finally {
      setState(() { _cargando = false; });
    }
  }

  Future<void> _registrar(LoteDto lote, VoidCallback closeSheet) async {
    final cant = double.tryParse(_cantidadCtrl.text.replaceAll(',', '.'));
    if (cant == null || cant <= 0) { _snack('Ingrese cantidad válida (kg)'); return; }
    setState(() { _cargando = true; });
    try {
      final r = await _planSrv.registrarConsumo(
        loteId: lote.id,
        cantidadKg: cant,
        nombreProducto: _productoCtrl.text,
        observaciones: _obsCtrl.text,
      );
      _snack(r['success'] == false ? (r['error']?.toString() ?? 'Error al registrar') : 'Registro guardado');
      _cantidadCtrl.clear();
      _obsCtrl.clear();
      closeSheet();
    } catch (e) {
      _snack('Error: ' + e.toString());
    } finally {
      setState(() { _cargando = false; });
    }
  }

  void _abrirBottomSheet(LoteDto lote) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text('Ingresar alimento - ' + lote.codigo, textAlign: TextAlign.center, style: Theme.of(ctx).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  TextField(controller: _productoCtrl, decoration: const InputDecoration(labelText: 'Producto (nombre)')),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _cantidadCtrl,
                    decoration: const InputDecoration(labelText: 'Cantidad (kg)'),
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _obsCtrl,
                    decoration: const InputDecoration(labelText: 'Observaciones (opcional)'),
                    minLines: 1,
                    maxLines: 3,
                  ),
                  const SizedBox(height: 16),
                  FilledButton.icon(
                    onPressed: _cargando ? null : () => _registrar(lote, () => Navigator.of(ctx).pop()),
                    icon: const Icon(Icons.save),
                    label: const Text('Registrar'),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  String _edadDias(DateTime? bd) {
    if (bd == null) return '—';
    final now = DateTime.now();
    final dias = now.difference(bd).inDays;
    return dias.toString() + ' días';
    }

  String _edadMesesDias(DateTime? bd) {
    if (bd == null) return '—';
    final now = DateTime.now();
    int months = (now.year - bd.year) * 12 + (now.month - bd.month);
    DateTime anchor = DateTime(bd.year, bd.month + months, bd.day);
    if (now.isBefore(anchor)) {
      months--;
      anchor = DateTime(bd.year, bd.month + months, bd.day);
    }
    final days = now.difference(anchor).inDays;
    final mStr = months.toString() + (months == 1 ? ' mes' : ' meses');
    final dStr = days.toString() + (days == 1 ? ' día' : ' días');
    return mStr + ' y ' + dStr;
  }

  void _snack(String m) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Alimentación')),
      body: _cargando
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _cargar,
              child: _lotes.isEmpty
                  ? ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        if (_error != null)
                          Text(_error!, style: const TextStyle(color: Colors.red))
                        else
                          Container(
                            height: 140,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 10, offset: Offset(0, 3))],
                            ),
                            child: const Text('No hay lotes activos de pollos'),
                          ),
                      ],
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemBuilder: (context, index) {
                        final l = _lotes[index];
                        final registrados = (l.quantityOriginal ?? l.quantity).toString();
                        final mortalidad = (l.quantityOriginal != null)
                            ? (l.quantityOriginal! - l.quantity).toString()
                            : '0';
                        return LoteCard(
                          titulo: l.codigo.isNotEmpty ? l.codigo : l.name,
                          estado: 'Activo',
                          subtitulo: l.animalName.toUpperCase() + ' · ' + (l.raceName.isNotEmpty ? l.raceName : ''),
                          edadDias: _edadDias(l.birthdate),
                          edadMeses: _edadMesesDias(l.birthdate),
                          registrados: registrados,
                          vivos: l.quantity.toString() + ' ' + l.animalName.toLowerCase(),
                          mortalidad: mortalidad,
                          onIngresar: () => _abrirBottomSheet(l),
                        );
                      },
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemCount: _lotes.length,
                    ),
            ),
    );
  }
}
