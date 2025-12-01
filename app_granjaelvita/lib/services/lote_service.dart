import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config.dart';
import 'auth_service.dart';

class LoteDto {
  final String id;
  final String codigo;
  final String name;
  final int quantity;
  final String animalName;
  final String raceName;
  final DateTime? birthdate;
  final int? quantityOriginal;
  final double cost;
  final int? maleCount;
  final int? femaleCount;
  final String? malePurpose;
  final String? femalePurpose;
  final int? raceId;
  final int? animalId;

  LoteDto({
    required this.id,
    required this.codigo,
    required this.name,
    required this.quantity,
    required this.animalName,
    required this.raceName,
    required this.birthdate,
    required this.quantityOriginal,
    required this.cost,
    this.maleCount,
    this.femaleCount,
    this.malePurpose,
    this.femalePurpose,
    this.raceId,
    this.animalId,
  });

  /// Cantidad de muertos = original - vivos
  int get muertos => (quantityOriginal ?? quantity) - quantity;

  /// Es pollo/ave
  bool get esPollo {
    final n = animalName.toLowerCase();
    return n.contains('pollo') || n.contains('ave') || n.contains('gallina');
  }

  /// Es chancho/cerdo
  bool get esChancho {
    final n = animalName.toLowerCase();
    return n.contains('chancho') || n.contains('cerdo') || n.contains('porc');
  }

  factory LoteDto.fromMap(Map<String, dynamic> m) {
    final race = (m['race'] ?? {}) as Map<String, dynamic>;
    final animal = (race['animal'] ?? {}) as Map<String, dynamic>;
    final bd = m['birthdate'];
    DateTime? birthdate;
    if (bd is String) {
      birthdate = DateTime.tryParse(bd);
    } else if (bd is int) {
      birthdate = DateTime.fromMillisecondsSinceEpoch(bd);
    } else if (bd is List && bd.length >= 3) {
      // Array [yyyy, MM, dd, ...]
      birthdate = DateTime(bd[0] as int, bd[1] as int, bd[2] as int);
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
      cost: double.tryParse((m['cost'] ?? '0').toString()) ?? 0.0,
      maleCount: int.tryParse((m['maleCount'] ?? '').toString()),
      femaleCount: int.tryParse((m['femaleCount'] ?? '').toString()),
      malePurpose: m['malePurpose']?.toString(),
      femalePurpose: m['femalePurpose']?.toString(),
      raceId: int.tryParse((race['id'] ?? '').toString()),
      animalId: int.tryParse((animal['id'] ?? '').toString()),
    );
  }
}

/// Modelo de Raza para el formulario
class RazaDto {
  final int id;
  final String name;
  final int animalId;
  final String animalName;

  RazaDto({
    required this.id,
    required this.name,
    required this.animalId,
    required this.animalName,
  });

  factory RazaDto.fromMap(Map<String, dynamic> m) {
    final animal = (m['animal'] ?? {}) as Map<String, dynamic>;
    return RazaDto(
      id: int.tryParse((m['id'] ?? '0').toString()) ?? 0,
      name: (m['name'] ?? '').toString(),
      animalId: int.tryParse((animal['id'] ?? '0').toString()) ?? 0,
      animalName: (animal['name'] ?? '').toString(),
    );
  }

  bool get esPollo {
    final n = animalName.toLowerCase();
    return n.contains('pollo') || n.contains('ave') || n.contains('gallina');
  }

  bool get esChancho {
    final n = animalName.toLowerCase();
    return n.contains('chancho') || n.contains('cerdo') || n.contains('porc');
  }
}

class LoteServiceMobile {
  /// Obtiene los headers con autenticación, intentando cargar sesión si es necesario
  static Future<Map<String, String>> _getHeaders() async {
    // Si no hay token en memoria, intentar cargar la sesión guardada
    if (AuthService.token == null || AuthService.token!.isEmpty) {
      await AuthService.loadSavedSession();
    }
    
    final token = AuthService.token;
    if (token == null || token.isEmpty) {
      throw Exception('No hay sesión activa. Por favor, inicie sesión nuevamente.');
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  /// GET genérico con autenticación
  Future<dynamic> _get(String path) async {
    final headers = await _getHeaders();
    final url = Uri.parse('$apiBaseUrl$path');
    final response = await http.get(url, headers: headers);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return response.body.isNotEmpty ? json.decode(response.body) : null;
    }
    // Error 401 = sesión expirada o token inválido
    if (response.statusCode == 401) {
      throw Exception('Sesión expirada. Por favor, inicie sesión nuevamente.');
    }
    final msg = response.body.isNotEmpty 
        ? (json.decode(response.body)['message'] ?? 'Error ${response.statusCode}')
        : 'Error ${response.statusCode}';
    throw Exception(msg);
  }

  /// POST genérico con autenticación
  Future<dynamic> _post(String path, Map<String, dynamic> body) async {
    final headers = await _getHeaders();
    final url = Uri.parse('$apiBaseUrl$path');
    final response = await http.post(url, headers: headers, body: json.encode(body));
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return response.body.isNotEmpty ? json.decode(response.body) : {};
    }
    // Error 401 = sesión expirada o token inválido
    if (response.statusCode == 401) {
      throw Exception('Sesión expirada. Por favor, inicie sesión nuevamente.');
    }
    final msg = response.body.isNotEmpty 
        ? (json.decode(response.body)['message'] ?? 'Error ${response.statusCode}')
        : 'Error ${response.statusCode}';
    throw Exception(msg);
  }

  /// Obtener todos los lotes
  Future<List<LoteDto>> getAll() async {
    final data = await _get('/api/lote');
    final list = (data is List) ? data : <dynamic>[];
    return list.whereType<Map<String, dynamic>>().map((e) => LoteDto.fromMap(e)).toList();
  }

  /// Obtener lotes activos (quantity > 0)
  Future<List<LoteDto>> getActivos() async {
    final data = await _get('/api/lote/activos');
    final list = (data is List) ? data : <dynamic>[];
    return list.whereType<Map<String, dynamic>>().map((e) => LoteDto.fromMap(e)).toList();
  }

  /// Obtener lotes históricos (cerrados o con quantity = 0)
  /// Usa el endpoint /historico-fechas que incluye los últimos 365 días por defecto
  Future<List<LoteDto>> getHistorico() async {
    // Primero intentamos con el endpoint de histórico por fechas (más completo)
    try {
      // Buscar en los últimos 365 días
      final hace1Anio = DateTime.now().subtract(const Duration(days: 365));
      final desde = '${hace1Anio.year}-${hace1Anio.month.toString().padLeft(2, '0')}-${hace1Anio.day.toString().padLeft(2, '0')}';
      final hasta = DateTime.now();
      final hastaStr = '${hasta.year}-${hasta.month.toString().padLeft(2, '0')}-${hasta.day.toString().padLeft(2, '0')}';
      
      final data = await _get('/api/lote/historico-fechas?desde=$desde&hasta=$hastaStr');
      final list = (data is List) ? data : <dynamic>[];
      if (list.isNotEmpty) {
        return list.whereType<Map<String, dynamic>>().map((e) => LoteDto.fromMap(e)).toList();
      }
    } catch (_) {
      // Si falla, intentamos con el endpoint simple
    }
    
    // Fallback: obtener todos y filtrar los que tienen quantity = 0
    final data = await _get('/api/lote/historico');
    final list = (data is List) ? data : <dynamic>[];
    return list.whereType<Map<String, dynamic>>().map((e) => LoteDto.fromMap(e)).toList();
  }

  /// Obtener resumen general
  Future<Map<String, dynamic>> getResumen() async {
    final data = await _get('/api/lote/resumen');
    return (data is Map<String, dynamic>) ? data : {};
  }

  /// Obtener razas disponibles
  Future<List<RazaDto>> getRazas() async {
    final data = await _get('/api/race');
    final list = (data is List) ? data : <dynamic>[];
    return list.whereType<Map<String, dynamic>>().map((e) => RazaDto.fromMap(e)).toList();
  }

  /// Crear nuevo lote
  Future<LoteDto> crearLote({
    required String name,
    required int quantity,
    required DateTime birthdate,
    required double cost,
    required int raceId,
    int? maleCount,
    int? femaleCount,
    String? malePurpose,
    String? femalePurpose,
  }) async {
    final body = <String, dynamic>{
      'name': name.trim(),
      'quantity': quantity,
      'birthdate': birthdate.toIso8601String().split('T')[0],
      'cost': cost,
      'race': {'id': raceId},
    };
    if (maleCount != null) body['maleCount'] = maleCount;
    if (femaleCount != null) body['femaleCount'] = femaleCount;
    if (malePurpose != null && malePurpose.isNotEmpty) body['malePurpose'] = malePurpose;
    if (femalePurpose != null && femalePurpose.isNotEmpty) body['femalePurpose'] = femalePurpose;

    final data = await _post('/api/lote/nuevo', body);
    return LoteDto.fromMap(data as Map<String, dynamic>);
  }

  /// Filtrar solo lotes de pollos activos
  Future<List<LoteDto>> getActivosPollos() async {
    final lotes = await getActivos();
    return lotes.where((l) => l.esPollo && l.quantity > 0).toList();
  }

  /// Filtrar solo lotes de chanchos activos
  Future<List<LoteDto>> getActivosChanchos() async {
    final lotes = await getActivos();
    return lotes.where((l) => l.esChancho && l.quantity > 0).toList();
  }
}

