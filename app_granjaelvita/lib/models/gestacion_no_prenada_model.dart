class GestacionNoPrenada {
  final String id;
  final String gestacionId;
  final String loteId;
  final int numeroEnLote;
  final String nombreChancha;
  final String fechaInseminacion;
  final String fechaConfirmacion;
  final int diasGestacion;
  final String motivo;
  final String observaciones;
  final String fotoUrl;
  final String loteNombre;

  GestacionNoPrenada({
    required this.id,
    required this.gestacionId,
    required this.loteId,
    required this.numeroEnLote,
    required this.nombreChancha,
    required this.fechaInseminacion,
    required this.fechaConfirmacion,
    required this.diasGestacion,
    required this.motivo,
    required this.observaciones,
    required this.fotoUrl,
    required this.loteNombre,
  });

  factory GestacionNoPrenada.fromMap(Map<String, dynamic> m) {
    return GestacionNoPrenada(
      id: (m['id'] ?? '').toString(),
      gestacionId: (m['gestacionId'] ?? '').toString(),
      loteId: (m['loteId'] ?? '').toString(),
      numeroEnLote: int.tryParse((m['numeroEnLote'] ?? '0').toString()) ?? 0,
      nombreChancha: (m['nombreChancha'] ?? '').toString(),
      fechaInseminacion: (m['fechaInseminacion'] ?? '').toString(),
      fechaConfirmacion: (m['fechaConfirmacion'] ?? '').toString(),
      diasGestacion: int.tryParse((m['diasGestacion'] ?? '0').toString()) ?? 0,
      motivo: (m['motivo'] ?? 'otro').toString(),
      observaciones: (m['observaciones'] ?? '').toString(),
      fotoUrl: (m['fotoUrl'] ?? '').toString(),
      loteNombre: (m['loteNombre'] ?? '').toString(),
    );
  }

  String get motivoLabel {
    switch (motivo) {
      case 'retorno_celo':
        return 'Retorno a celo';
      case 'ultrasonido_negativo':
        return 'Ultrasonido negativo';
      default:
        return 'Otro';
    }
  }
}
