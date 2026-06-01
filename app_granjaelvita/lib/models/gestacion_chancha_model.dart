class GestacionChancha {
  final String id;
  final String nombre;
  final String raza;
  final String fechaInseminacion;
  final int numeroParto;
  final String observaciones;
  final String loteId;
  final String loteCodigo;
  final String loteNombre;
  final int numeroEnLote;
  final bool activa;

  GestacionChancha({
    required this.id,
    required this.nombre,
    required this.raza,
    required this.fechaInseminacion,
    required this.numeroParto,
    required this.observaciones,
    required this.loteId,
    required this.loteCodigo,
    required this.loteNombre,
    required this.numeroEnLote,
    required this.activa,
  });

  factory GestacionChancha.fromMap(Map<String, dynamic> m) {
    return GestacionChancha(
      id: (m['id'] ?? '').toString(),
      nombre: (m['nombre'] ?? '').toString(),
      raza: (m['raza'] ?? '').toString(),
      fechaInseminacion: (m['fechaInseminacion'] ?? '').toString(),
      numeroParto: int.tryParse((m['numeroParto'] ?? '1').toString()) ?? 1,
      observaciones: (m['observaciones'] ?? '').toString(),
      loteId: (m['loteId'] ?? '').toString(),
      loteCodigo: (m['loteCodigo'] ?? '').toString(),
      loteNombre: (m['loteNombre'] ?? '').toString(),
      numeroEnLote: int.tryParse((m['numeroEnLote'] ?? '0').toString()) ?? 0,
      activa: m['activa'] != false,
    );
  }

  Map<String, dynamic> toRequestBody() => {
        'loteId': loteId,
        'numeroEnLote': numeroEnLote,
        'fechaInseminacion': fechaInseminacion,
        'numeroParto': numeroParto,
        'observaciones': observaciones,
        'activa': activa,
      };

  String get subtituloLote {
    final nom = loteNombre.trim();
    if (nom.isNotEmpty) return 'Lote: $nom';
    if (loteCodigo.trim().isNotEmpty) return 'Lote: ${loteCodigo.trim()}';
    return '';
  }
}
