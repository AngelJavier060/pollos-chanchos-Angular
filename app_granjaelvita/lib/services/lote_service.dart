import '../api_client.dart';
import '../config.dart';

class LoteDto {
  final String id;
  final String codigo;
  final String name;
  final int quantity;
  final String animalName;
  final String raceName;
  final DateTime? birthdate;
  final int? quantityOriginal;
  LoteDto({
    required this.id,
    required this.codigo,
    required this.name,
    required this.quantity,
    required this.animalName,
    required this.raceName,
    required this.birthdate,
    required this.quantityOriginal,
  });
  factory LoteDto.fromMap(Map<String, dynamic> m) {
    final race = (m['race'] ?? {}) as Map<String, dynamic>;
    final animal = (race['animal'] ?? {}) as Map<String, dynamic>;
    final bd = m['birthdate'];
    DateTime? birthdate;
    if (bd is String) {
      birthdate = DateTime.tryParse(bd);
    } else if (bd is int) {
      birthdate = DateTime.fromMillisecondsSinceEpoch(bd);
    }
    return LoteDto(
      id: (m['id'] ?? '').toString(),
      codigo: (m['codigo'] ?? '') as String,
      name: (m['name'] ?? '') as String,
      quantity: int.tryParse((m['quantity'] ?? '0').toString()) ?? 0,
      animalName: (animal['name'] ?? '').toString(),
      raceName: (race['name'] ?? '').toString(),
      birthdate: birthdate,
      quantityOriginal: int.tryParse((m['quantityOriginal'] ?? '').toString()),
    );
  }
}

class LoteServiceMobile {
  final ApiClient _api = ApiClient(baseUrl: apiBaseUrl);
  Future<List<LoteDto>> getActivosPollos() async {
    final data = await _api.get('/api/lote/activos');
    final list = (data is List) ? data : <dynamic>[];
    final lotes = list.whereType<Map<String, dynamic>>().map((e) => LoteDto.fromMap(e)).toList();
    return lotes.where((l) => l.animalName.toLowerCase().contains('pollo')).toList();
  }
}

