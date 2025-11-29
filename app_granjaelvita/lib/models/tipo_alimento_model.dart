class TipoAlimentoModel {
  final int id;
  final String nombre;

  TipoAlimentoModel({required this.id, required this.nombre});

  factory TipoAlimentoModel.fromJson(Map<String, dynamic> json) {
    final dynamic rawId = json['id'];
    return TipoAlimentoModel(
      id: rawId is int ? rawId : int.tryParse(rawId?.toString() ?? '') ?? 0,
      nombre: (json['name'] ?? '').toString(),
    );
  }
}
