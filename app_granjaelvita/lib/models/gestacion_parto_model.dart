class GestacionParto {
  final String id;
  final String gestacionId;
  final String loteId;
  final int numeroEnLote;
  final String nombreChancha;
  final int numeroParto;
  final String fechaParto;
  final int lechonesNacidos;
  final int lechonesVivos;
  final int lechonesMuertos;
  final String observaciones;
  final String fotoUrl;
  final String fotoChanchaUrl;
  final String loteNombre;

  GestacionParto({
    required this.id,
    required this.gestacionId,
    required this.loteId,
    required this.numeroEnLote,
    required this.nombreChancha,
    required this.numeroParto,
    required this.fechaParto,
    required this.lechonesNacidos,
    required this.lechonesVivos,
    required this.lechonesMuertos,
    required this.observaciones,
    required this.fotoUrl,
    required this.fotoChanchaUrl,
    required this.loteNombre,
  });

  factory GestacionParto.fromMap(Map<String, dynamic> m) {
    return GestacionParto(
      id: (m['id'] ?? '').toString(),
      gestacionId: (m['gestacionId'] ?? '').toString(),
      loteId: (m['loteId'] ?? '').toString(),
      numeroEnLote: int.tryParse((m['numeroEnLote'] ?? '0').toString()) ?? 0,
      nombreChancha: (m['nombreChancha'] ?? '').toString(),
      numeroParto: int.tryParse((m['numeroParto'] ?? '1').toString()) ?? 1,
      fechaParto: (m['fechaParto'] ?? '').toString(),
      lechonesNacidos: int.tryParse((m['lechonesNacidos'] ?? '0').toString()) ?? 0,
      lechonesVivos: int.tryParse((m['lechonesVivos'] ?? '0').toString()) ?? 0,
      lechonesMuertos: int.tryParse((m['lechonesMuertos'] ?? '0').toString()) ?? 0,
      observaciones: (m['observaciones'] ?? '').toString(),
      fotoUrl: (m['fotoUrl'] ?? '').toString(),
      fotoChanchaUrl: (m['fotoChanchaUrl'] ?? '').toString(),
      loteNombre: (m['loteNombre'] ?? '').toString(),
    );
  }
}
