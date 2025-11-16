import 'package:flutter/material.dart';

class LoteCard extends StatelessWidget {
  final String titulo;
  final String estado;
  final String subtitulo;
  final String edadDias;
  final String edadMeses;
  final String registrados;
  final String vivos;
  final String? mortalidad;
  final VoidCallback onIngresar;

  const LoteCard({
    super.key,
    required this.titulo,
    required this.estado,
    required this.subtitulo,
    required this.edadDias,
    required this.edadMeses,
    required this.registrados,
    required this.vivos,
    this.mortalidad,
    required this.onIngresar,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 10, offset: Offset(0, 3))],
        border: Border.all(color: Colors.black12, width: 0.6),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onIngresar,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        titulo,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                      ),
                    ),
                    _EstadoBadge(text: estado, color: cs.primary),
                  ],
                ),
                const SizedBox(height: 6),
                Text(subtitulo, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey[700], letterSpacing: .2)),
                const SizedBox(height: 12),
                _ItemRow(label: 'Edad:', value: edadDias),
                _ItemRow(label: 'Meses:', value: edadMeses),
                _ItemRow(label: 'Registrados:', value: registrados),
                _ItemRow(label: 'Vivos:', value: vivos),
                if (mortalidad != null) _ItemRow(label: 'Mortalidad:', value: mortalidad!),
                const SizedBox(height: 12),
                FilledButton.icon(
                  onPressed: onIngresar,
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.green,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  icon: const Icon(Icons.restaurant),
                  label: const Text('Ingresar Alimentos Diarios'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _EstadoBadge extends StatelessWidget {
  final String text;
  final Color color;
  const _EstadoBadge({required this.text, required this.color});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withOpacity(0.35)),
      ),
      child: Text(text, style: TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 12)),
    );
  }
}

class _ItemRow extends StatelessWidget {
  final String label;
  final String value;
  const _ItemRow({required this.label, required this.value});
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          SizedBox(width: 110, child: Text(label, style: Theme.of(context).textTheme.bodyMedium)),
          Expanded(
            child: Text(
              value,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}
