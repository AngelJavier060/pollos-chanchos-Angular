import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/gestacion_chancha_model.dart';
import '../models/gestacion_parto_model.dart';
import '../services/gestacion_service.dart';
import '../utils/gestacion_calculo.dart';
import '../utils/gestacion_image_picker.dart';
import '../utils/gestacion_media.dart';

const _primary = Color(0xFF003527);
const _onSurface = Color(0xFF0B1C30);
const _variant = Color(0xFF404944);
const _surface = Color(0xFFF8F9FF);

Future<bool?> showRegistrarPartoSheet({
  required BuildContext context,
  required GestacionService service,
  required GestacionChancha chancha,
}) {
  return showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    backgroundColor: _surface,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
    ),
    builder: (_) => _PartoFormSheet(
      service: service,
      titulo: 'Registrar parto',
      hint: '${chancha.nombre} — al guardar se cierra el ciclo y libera el cupo.',
      nombreChancha: chancha.nombre,
      numeroParto: chancha.numeroParto,
      fechaInicial: DateTime.now(),
      onSubmit: (body) => service.registrarParto(chancha.id, body),
    ),
  );
}

/// Cierra ciclo porque no quedó prenada; libera cupo para reiniciar.
Future<bool?> showNoPrenadaSheet({
  required BuildContext context,
  required GestacionService service,
  required GestacionChancha chancha,
}) {
  return showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    backgroundColor: _surface,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
    ),
    builder: (_) => _NoPrenadaFormSheet(service: service, chancha: chancha),
  );
}

Future<void> showVerPartoSheet({
  required BuildContext context,
  required GestacionParto parto,
  required bool modoEdicion,
  required GestacionService service,
  required ValueChanged<GestacionParto> onUpdated,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: _surface,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
    ),
    builder: (ctx) => _VerPartoSheet(
      parto: parto,
      modoEdicion: modoEdicion,
      service: service,
      onUpdated: onUpdated,
    ),
  );
}

Future<GestacionParto?> showEditarPartoSheet({
  required BuildContext context,
  required GestacionService service,
  required GestacionParto parto,
}) {
  return showModalBottomSheet<GestacionParto>(
    context: context,
    isScrollControlled: true,
    backgroundColor: _surface,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
    ),
    builder: (_) => _PartoFormSheet(
      service: service,
      titulo: 'Editar parto',
      hint: 'Corrija datos de ${parto.nombreChancha} · Parto #${parto.numeroParto}. No reabre la gestación.',
      nombreChancha: parto.nombreChancha,
      numeroParto: parto.numeroParto,
      fechaInicial: parseFechaLocal(parto.fechaParto),
      nacidosInicial: parto.lechonesNacidos,
      vivosInicial: parto.lechonesVivos,
      muertosInicial: parto.lechonesMuertos,
      obsInicial: parto.observaciones,
      fotoInicial: parto.fotoUrl,
      onSubmit: (body) => service.actualizarParto(parto.id, body),
      returnParto: true,
    ),
  );
}

class _VerPartoSheet extends StatelessWidget {
  final GestacionParto parto;
  final bool modoEdicion;
  final GestacionService service;
  final ValueChanged<GestacionParto> onUpdated;

  const _VerPartoSheet({
    required this.parto,
    required this.modoEdicion,
    required this.service,
    required this.onUpdated,
  });

  @override
  Widget build(BuildContext context) {
    final fotoChancha = resolveGestacionMediaUrl(parto.fotoChanchaUrl);
    final fotoParto = resolveGestacionMediaUrl(parto.fotoUrl);
    final bottom = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.fromLTRB(16, 12, 16, 16 + bottom),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'Detalle del parto',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: _primary),
                  ),
                ),
                IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close)),
              ],
            ),
            Text(
              '${parto.nombreChancha}${parto.loteNombre.isNotEmpty ? ' · ${parto.loteNombre}' : ''} · Parto #${parto.numeroParto}',
              style: const TextStyle(color: _variant, fontSize: 13),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(child: _fotoBox('Foto de la chancha', fotoChancha, Icons.pets_rounded)),
                const SizedBox(width: 8),
                Expanded(child: _fotoBox('Foto del parto', fotoParto, Icons.image_outlined)),
              ],
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                _dato('Fecha de parto', formatFechaEs(parto.fechaParto)),
                _dato('Lechones nacidos', '${parto.lechonesNacidos}'),
                _dato('Lechones vivos', '${parto.lechonesVivos}'),
                _dato('Lechones muertos', '${parto.lechonesMuertos}'),
              ],
            ),
            if (parto.observaciones.trim().isNotEmpty) ...[
              const SizedBox(height: 12),
              const Text('Observaciones', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: _variant)),
              Text(parto.observaciones),
            ],
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Cerrar'),
                  ),
                ),
                if (modoEdicion) ...[
                  const SizedBox(width: 10),
                  Expanded(
                    child: FilledButton(
                      style: FilledButton.styleFrom(backgroundColor: _primary),
                      onPressed: () async {
                        final actualizado = await showEditarPartoSheet(
                          context: context,
                          service: service,
                          parto: parto,
                        );
                        if (actualizado != null) {
                          onUpdated(actualizado);
                          if (context.mounted) Navigator.pop(context);
                        }
                      },
                      child: const Text('Editar'),
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _fotoBox(String label, String url, IconData icon) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label.toUpperCase(),
            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 0.5, color: _variant)),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: AspectRatio(
            aspectRatio: 1,
            child: url.isNotEmpty
                ? Image.network(url, fit: BoxFit.cover, errorBuilder: (_, __, ___) => _ph(icon))
                : _ph(icon),
          ),
        ),
      ],
    );
  }

  Widget _ph(IconData icon) => Container(
        color: const Color(0xFFE5EEFF),
        child: Icon(icon, color: _variant, size: 36),
      );

  Widget _dato(String label, String value) {
    return SizedBox(
      width: 140,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label.toUpperCase(),
              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: _variant)),
          Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: _onSurface)),
        ],
      ),
    );
  }
}

class _PartoFormSheet extends StatefulWidget {
  final GestacionService service;
  final String titulo;
  final String hint;
  final String nombreChancha;
  final int numeroParto;
  final DateTime fechaInicial;
  final int? nacidosInicial;
  final int? vivosInicial;
  final int muertosInicial;
  final String obsInicial;
  final String fotoInicial;
  final Future<dynamic> Function(Map<String, dynamic> body) onSubmit;
  final bool returnParto;

  const _PartoFormSheet({
    required this.service,
    required this.titulo,
    required this.hint,
    required this.nombreChancha,
    required this.numeroParto,
    required this.fechaInicial,
    required this.onSubmit,
    this.nacidosInicial,
    this.vivosInicial,
    this.muertosInicial = 0,
    this.obsInicial = '',
    this.fotoInicial = '',
    this.returnParto = false,
  });

  @override
  State<_PartoFormSheet> createState() => _PartoFormSheetState();
}

class _PartoFormSheetState extends State<_PartoFormSheet> {
  final _formKey = GlobalKey<FormState>();
  late DateTime _fecha;
  late final TextEditingController _nacidos;
  late final TextEditingController _vivos;
  late final TextEditingController _muertos;
  late final TextEditingController _obs;
  String _fotoUrl = '';
  bool _guardando = false;
  bool _subiendo = false;

  @override
  void initState() {
    super.initState();
    _fecha = widget.fechaInicial;
    _nacidos = TextEditingController(text: widget.nacidosInicial?.toString() ?? '');
    _vivos = TextEditingController(text: widget.vivosInicial?.toString() ?? '');
    _muertos = TextEditingController(text: widget.muertosInicial.toString());
    _obs = TextEditingController(text: widget.obsInicial);
    _fotoUrl = widget.fotoInicial;
  }

  @override
  void dispose() {
    _nacidos.dispose();
    _vivos.dispose();
    _muertos.dispose();
    _obs.dispose();
    super.dispose();
  }

  Future<void> _pickFoto() async {
    final file = await pickGestacionImage(context);
    if (file == null) return;
    setState(() => _subiendo = true);
    try {
      final url = await widget.service.uploadFoto(file);
      if (!mounted) return;
      setState(() => _fotoUrl = url);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => _subiendo = false);
    }
  }

  Future<void> _guardar() async {
    if (!_formKey.currentState!.validate()) return;
    final nacidos = int.tryParse(_nacidos.text.trim());
    final vivos = int.tryParse(_vivos.text.trim());
    final muertos = int.tryParse(_muertos.text.trim()) ?? 0;
    if (nacidos == null || nacidos < 0) {
      _toast('Indique lechones nacidos');
      return;
    }
    if (vivos == null || vivos < 0) {
      _toast('Indique lechones vivos');
      return;
    }
    if (vivos > nacidos || muertos > nacidos || vivos + muertos > nacidos) {
      _toast('Revise nacidos / vivos / muertos');
      return;
    }
    setState(() => _guardando = true);
    try {
      final body = {
        'fechaParto': DateFormat('yyyy-MM-dd').format(_fecha),
        'lechonesNacidos': nacidos,
        'lechonesVivos': vivos,
        'lechonesMuertos': muertos,
        'observaciones': _obs.text.trim(),
        'fotoUrl': _fotoUrl,
      };
      final result = await widget.onSubmit(body);
      if (!mounted) return;
      Navigator.pop(context, widget.returnParto ? result : true);
    } catch (e) {
      if (!mounted) return;
      _toast('$e');
    } finally {
      if (mounted) setState(() => _guardando = false);
    }
  }

  void _toast(String m) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    return SizedBox(
      height: MediaQuery.of(context).size.height * 0.88,
      child: Padding(
        padding: EdgeInsets.fromLTRB(16, 8, 16, 16 + bottom),
        child: Form(
          key: _formKey,
          child: ListView(
            children: [
              Text(widget.titulo,
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: _primary)),
              const SizedBox(height: 6),
              Text(widget.hint, style: const TextStyle(fontSize: 13, color: _variant)),
              const SizedBox(height: 16),
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Fecha de parto'),
                subtitle: Text(DateFormat('dd/MM/yyyy').format(_fecha)),
                trailing: const Icon(Icons.calendar_today_outlined),
                onTap: () async {
                  final p = await showDatePicker(
                    context: context,
                    initialDate: _fecha,
                    firstDate: DateTime(2020),
                    lastDate: DateTime.now().add(const Duration(days: 1)),
                    locale: const Locale('es', 'ES'),
                  );
                  if (p != null) setState(() => _fecha = p);
                },
              ),
              TextFormField(
                controller: _nacidos,
                decoration: const InputDecoration(labelText: 'Lechones nacidos *'),
                keyboardType: TextInputType.number,
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Requerido' : null,
              ),
              TextFormField(
                controller: _vivos,
                decoration: const InputDecoration(labelText: 'Lechones vivos *'),
                keyboardType: TextInputType.number,
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Requerido' : null,
              ),
              TextFormField(
                controller: _muertos,
                decoration: const InputDecoration(labelText: 'Lechones muertos'),
                keyboardType: TextInputType.number,
              ),
              TextFormField(
                controller: _obs,
                decoration: const InputDecoration(labelText: 'Observaciones'),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  if (_fotoUrl.isNotEmpty)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.network(
                        resolveGestacionMediaUrl(_fotoUrl),
                        width: 64,
                        height: 64,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => const SizedBox(width: 64, height: 64),
                      ),
                    ),
                  const SizedBox(width: 10),
                  OutlinedButton.icon(
                    onPressed: _subiendo ? null : _pickFoto,
                    icon: const Icon(Icons.photo_camera_outlined),
                    label: Text(_subiendo ? 'Subiendo…' : (_fotoUrl.isEmpty ? 'Foto parto' : 'Cambiar foto')),
                  ),
                  if (_fotoUrl.isNotEmpty)
                    IconButton(
                      onPressed: () => setState(() => _fotoUrl = ''),
                      icon: const Icon(Icons.close),
                    ),
                ],
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: (_guardando || _subiendo) ? null : _guardar,
                style: FilledButton.styleFrom(
                  backgroundColor: _primary,
                  minimumSize: const Size.fromHeight(48),
                ),
                child: Text(_guardando ? 'Guardando…' : 'Guardar'),
              ),
              TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
            ],
          ),
        ),
      ),
    );
  }
}

class _NoPrenadaFormSheet extends StatefulWidget {
  final GestacionService service;
  final GestacionChancha chancha;

  const _NoPrenadaFormSheet({required this.service, required this.chancha});

  @override
  State<_NoPrenadaFormSheet> createState() => _NoPrenadaFormSheetState();
}

class _NoPrenadaFormSheetState extends State<_NoPrenadaFormSheet> {
  DateTime _fecha = DateTime.now();
  String _motivo = 'retorno_celo';
  final _obs = TextEditingController();
  bool _guardando = false;

  @override
  void dispose() {
    _obs.dispose();
    super.dispose();
  }

  Future<void> _guardar() async {
    setState(() => _guardando = true);
    try {
      await widget.service.registrarNoPrenada(widget.chancha.id, {
        'fechaConfirmacion': DateFormat('yyyy-MM-dd').format(_fecha),
        'motivo': _motivo,
        'observaciones': _obs.text.trim(),
      });
      if (!mounted) return;
      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => _guardando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(16, 16, 16, 16 + bottom),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'No gestante',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: _primary),
            ),
            const SizedBox(height: 8),
            Text(
              '${widget.chancha.nombre} — se cierra el ciclo, queda en historial y puede reiniciar con Nueva gestación.',
              style: const TextStyle(fontSize: 13, color: _variant),
            ),
            const SizedBox(height: 16),
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Fecha de confirmación'),
              subtitle: Text(DateFormat('dd/MM/yyyy').format(_fecha)),
              trailing: const Icon(Icons.calendar_today_outlined),
              onTap: () async {
                final p = await showDatePicker(
                  context: context,
                  initialDate: _fecha,
                  firstDate: DateTime(2020),
                  lastDate: DateTime.now().add(const Duration(days: 1)),
                  locale: const Locale('es', 'ES'),
                );
                if (p != null) setState(() => _fecha = p);
              },
            ),
            DropdownButtonFormField<String>(
              value: _motivo,
              decoration: const InputDecoration(labelText: 'Motivo'),
              items: const [
                DropdownMenuItem(value: 'retorno_celo', child: Text('Retorno a celo')),
                DropdownMenuItem(value: 'ultrasonido_negativo', child: Text('Ultrasonido negativo')),
                DropdownMenuItem(value: 'otro', child: Text('Otro')),
              ],
              onChanged: (v) => setState(() => _motivo = v ?? 'otro'),
            ),
            TextField(
              controller: _obs,
              decoration: const InputDecoration(labelText: 'Observaciones'),
            ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: _guardando ? null : _guardar,
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFB45309),
                minimumSize: const Size.fromHeight(48),
              ),
              child: Text(_guardando ? 'Guardando…' : 'Confirmar y liberar'),
            ),
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
          ],
        ),
      ),
    );
  }
}
