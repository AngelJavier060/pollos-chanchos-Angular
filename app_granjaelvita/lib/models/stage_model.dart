class StageModel {
  final int id;
  final String nombre;

  StageModel({required this.id, required this.nombre});

  factory StageModel.fromJson(Map<String, dynamic> json) {
    final dynamic rawId = json['id'];
    return StageModel(
      id: rawId is int ? rawId : int.tryParse(rawId?.toString() ?? '') ?? 0,
      nombre: (json['name'] ?? '').toString(),
    );
  }
}
