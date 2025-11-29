import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config.dart';
import '../models/venta_huevo_model.dart';
import '../models/venta_animal_model.dart';
import 'auth_service.dart';

class VentasServiceMobile {
  static const String _endpointHuevos = '/api/ventas/huevos';
  static const String _endpointAnimales = '/api/ventas/animales';

  static Map<String, String> _buildHeaders() {
    final token = AuthService.token;
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer ' + token;
    }
    return headers;
  }

  /// Lista ventas de animales.
  /// Usa el mismo esquema de filtros from/to (yyyy-MM-dd).
  static Future<List<VentaAnimalModel>> listarVentasAnimales({String? from, String? to}) async {
    try {
      final query = <String, String>{};
      if (from != null && from.isNotEmpty) {
        query['from'] = from;
      }
      if (to != null && to.isNotEmpty) {
        query['to'] = to;
      }

      final uri = Uri.parse(apiBaseUrl + _endpointAnimales).replace(queryParameters: query.isEmpty ? null : query);
      final resp = await http.get(uri, headers: _buildHeaders());

      if (resp.statusCode == 200) {
        final dynamic data = json.decode(resp.body);
        final list = (data is List) ? data : <dynamic>[];
        return list
            .whereType<Map<String, dynamic>>()
            .map((m) => VentaAnimalModel.fromJson(m))
            .toList();
      }

      if (resp.statusCode == 401) {
        throw Exception('No autorizado (401). Vuelva a iniciar sesión.');
      }

      throw Exception('Error al cargar ventas de animales: ' + resp.statusCode.toString());
    } catch (e) {
      throw Exception('Error de conexión al listar ventas de animales: $e');
    }
  }

  /// Lista ventas de huevos.
  /// Si se pasan [from] y [to], se envían como query params (yyyy-MM-dd).
  static Future<List<VentaHuevoModel>> listarVentasHuevos({String? from, String? to}) async {
    try {
      final query = <String, String>{};
      if (from != null && from.isNotEmpty) {
        query['from'] = from;
      }
      if (to != null && to.isNotEmpty) {
        query['to'] = to;
      }

      final uri = Uri.parse(apiBaseUrl + _endpointHuevos).replace(queryParameters: query.isEmpty ? null : query);
      final resp = await http.get(uri, headers: _buildHeaders());

      if (resp.statusCode == 200) {
        final dynamic data = json.decode(resp.body);
        final list = (data is List) ? data : <dynamic>[];
        return list
            .whereType<Map<String, dynamic>>()
            .map((m) => VentaHuevoModel.fromJson(m))
            .toList();
      }

      if (resp.statusCode == 401) {
        throw Exception('No autorizado (401). Vuelva a iniciar sesión.');
      }

      throw Exception('Error al cargar ventas de huevos: ' + resp.statusCode.toString());
    } catch (e) {
      throw Exception('Error de conexión al listar ventas de huevos: $e');
    }
  }

  /// Registra una venta de huevos en el backend.
  /// [fecha] debe estar en formato yyyy-MM-dd.
  static Future<VentaHuevoModel> crearVentaHuevo({
    required String fecha,
    required String loteId,
    String? loteCodigo,
    int? animalId,
    String? animalName,
    required double cantidad,
    required double precioUnit,
  }) async {
    try {
      final double total = (cantidad * precioUnit);
      final body = <String, dynamic>{
        'fecha': fecha,
        'loteId': loteId,
        if (loteCodigo != null && loteCodigo.isNotEmpty) 'loteCodigo': loteCodigo,
        if (animalId != null) 'animalId': animalId,
        if (animalName != null && animalName.isNotEmpty) 'animalName': animalName,
        'cantidad': cantidad,
        'precioUnit': double.parse(precioUnit.toStringAsFixed(2)),
        'total': double.parse(total.toStringAsFixed(2)),
      };

      final uri = Uri.parse(apiBaseUrl + _endpointHuevos);
      final resp = await http.post(uri, headers: _buildHeaders(), body: json.encode(body));

      if (resp.statusCode == 200 || resp.statusCode == 201) {
        final dynamic data = json.decode(resp.body);
        if (data is Map<String, dynamic>) {
          return VentaHuevoModel.fromJson(data);
        }
        // Si el backend no devuelve el objeto completo, devolvemos uno mínimo basado en el request
        return VentaHuevoModel(
          id: null,
          fecha: fecha,
          loteId: loteId,
          loteCodigo: loteCodigo,
          animalId: animalId,
          animalName: animalName,
          cantidad: cantidad,
          precioUnit: precioUnit,
          total: double.parse(total.toStringAsFixed(2)),
        );
      }

      if (resp.statusCode == 401) {
        throw Exception('No autorizado (401). Vuelva a iniciar sesión.');
      }

      String message = 'Error al crear venta de huevos: ' + resp.statusCode.toString();
      try {
        final dynamic data = json.decode(resp.body);
        if (data is Map && data['message'] is String) {
          message = data['message'] as String;
        }
      } catch (_) {}
      throw Exception(message);
    } catch (e) {
      throw Exception('Error de conexión al crear venta de huevos: $e');
    }
  }

  /// Registra una venta de animales en el backend.
  /// [fecha] debe estar en formato yyyy-MM-dd.
  static Future<VentaAnimalModel> crearVentaAnimal({
    required String fecha,
    required String loteId,
    String? loteCodigo,
    int? animalId,
    String? animalName,
    required double cantidad,
    required double precioUnit,
  }) async {
    try {
      final double total = (cantidad * precioUnit);
      final body = <String, dynamic>{
        'fecha': fecha,
        'loteId': loteId,
        if (loteCodigo != null && loteCodigo.isNotEmpty) 'loteCodigo': loteCodigo,
        if (animalId != null) 'animalId': animalId,
        if (animalName != null && animalName.isNotEmpty) 'animalName': animalName,
        'cantidad': cantidad,
        'precioUnit': double.parse(precioUnit.toStringAsFixed(2)),
        'total': double.parse(total.toStringAsFixed(2)),
      };

      final uri = Uri.parse(apiBaseUrl + _endpointAnimales);
      final resp = await http.post(uri, headers: _buildHeaders(), body: json.encode(body));

      if (resp.statusCode == 200 || resp.statusCode == 201) {
        final dynamic data = json.decode(resp.body);
        if (data is Map<String, dynamic>) {
          return VentaAnimalModel.fromJson(data);
        }
        return VentaAnimalModel(
          id: null,
          fecha: fecha,
          loteId: loteId,
          loteCodigo: loteCodigo,
          animalId: animalId,
          animalName: animalName,
          cantidad: cantidad,
          precioUnit: precioUnit,
          total: double.parse(total.toStringAsFixed(2)),
        );
      }

      if (resp.statusCode == 401) {
        throw Exception('No autorizado (401). Vuelva a iniciar sesión.');
      }

      String message = 'Error al crear venta de animales: ' + resp.statusCode.toString();
      try {
        final dynamic data = json.decode(resp.body);
        if (data is Map && data['message'] is String) {
          message = data['message'] as String;
        }
      } catch (_) {}
      throw Exception(message);
    } catch (e) {
      throw Exception('Error de conexión al crear venta de animales: $e');
    }
  }
}
