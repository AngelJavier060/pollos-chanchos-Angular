class ProveedorModel {
  final int id;
  final String nombre;

  ProveedorModel({required this.id, required this.nombre});

  factory ProveedorModel.fromJson(Map<String, dynamic> json) {
    final dynamic rawId = json['id'];
    return ProveedorModel(
      id: rawId is int ? rawId : int.tryParse(rawId?.toString() ?? '') ?? 0,
      nombre: (json['name'] ?? '').toString(),
    );
  }
}
