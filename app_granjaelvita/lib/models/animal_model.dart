class AnimalModel {
  final int id;
  final String nombre;
  final String? descripcion;

  AnimalModel({
    required this.id,
    required this.nombre,
    this.descripcion,
  });

  factory AnimalModel.fromJson(Map<String, dynamic> json) {
    final dynamic rawId = json['id'];
    return AnimalModel(
      id: rawId is int ? rawId : int.tryParse(rawId?.toString() ?? '') ?? 0,
      nombre: (json['name'] ?? json['nombre'] ?? '').toString(),
      descripcion: (json['description'] ?? json['descripcion'])?.toString(),
    );
  }
}
