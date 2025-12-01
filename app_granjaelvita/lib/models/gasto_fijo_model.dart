class GastoFijoModel {
  final String id;
  final String nombreCosto;
  final double montoTotal;
  final String periodoProrrateo;
  final String metodoProrrateo;
  final String fecha;
  final String observaciones;
  final String? loteId;
  final String? loteCodigo;
  final String? loteNombre;

  GastoFijoModel({
    required this.id,
    required this.nombreCosto,
    required this.montoTotal,
    required this.periodoProrrateo,
    required this.metodoProrrateo,
    required this.fecha,
    required this.observaciones,
    this.loteId,
    this.loteCodigo,
    this.loteNombre,
  });

  factory GastoFijoModel.fromJson(Map<String, dynamic> json) {
    // Extraer información del lote
    String? loteId;
    String? loteCodigo;
    String? loteNombre;
    
    if (json['lote'] != null) {
      final lote = json['lote'] as Map<String, dynamic>;
      loteId = lote['id']?.toString();
      loteCodigo = lote['codigo']?.toString();
      loteNombre = lote['name']?.toString();
    } else {
      loteId = json['loteId']?.toString();
      loteCodigo = json['loteCodigo']?.toString();
      loteNombre = json['loteNombre']?.toString();
    }

    return GastoFijoModel(
      id: json['id']?.toString() ?? '',
      nombreCosto: json['nombreCosto']?.toString() ?? '',
      montoTotal: (json['montoTotal'] as num?)?.toDouble() ?? 0.0,
      periodoProrrateo: json['periodoProrrateo']?.toString() ?? '',
      metodoProrrateo: json['metodoProrrateo']?.toString() ?? '',
      fecha: json['fecha']?.toString() ?? '',
      observaciones: json['observaciones']?.toString() ?? '',
      loteId: loteId,
      loteCodigo: loteCodigo,
      loteNombre: loteNombre,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'nombreCosto': nombreCosto,
      'montoTotal': montoTotal,
      'periodoProrrateo': periodoProrrateo,
      'metodoProrrateo': metodoProrrateo,
      'fecha': fecha,
      'observaciones': observaciones,
      'loteId': loteId,
    };
  }
}
