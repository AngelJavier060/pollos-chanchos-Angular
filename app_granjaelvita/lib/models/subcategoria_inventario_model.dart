class SubcategoriaInventarioModel {
  final int id;
  final String nombre;

  SubcategoriaInventarioModel({required this.id, required this.nombre});

  factory SubcategoriaInventarioModel.fromJson(Map<String, dynamic> json) {
    final dynamic rawId = json['id'];
    return SubcategoriaInventarioModel(
      id: rawId is int ? rawId : int.tryParse(rawId?.toString() ?? '') ?? 0,
      nombre: (json['name'] ?? '').toString(),
    );
  }
}
