class UnidadMedidaModel {
  final int id;
  final String nombre;
  final String nombreCorto;

  UnidadMedidaModel({
    required this.id,
    required this.nombre,
    required this.nombreCorto,
  });

  factory UnidadMedidaModel.fromJson(Map<String, dynamic> json) {
    final dynamic rawId = json['id'];
    return UnidadMedidaModel(
      id: rawId is int ? rawId : int.tryParse(rawId?.toString() ?? '') ?? 0,
      nombre: (json['name'] ?? '').toString(),
      nombreCorto: (json['name_short'] ?? '').toString(),
    );
  }
}
