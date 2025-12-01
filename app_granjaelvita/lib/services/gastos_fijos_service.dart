import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config.dart';
import '../models/gasto_fijo_model.dart';
import 'auth_service.dart';

class GastosFijosServiceMobile {
  static const String _endpoint = '/api/costos/fijos';

  static Map<String, String> _buildHeaders() {
    final token = AuthService.token;
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  /// Lista todos los registros de gastos fijos.
  static Future<List<GastoFijoModel>> listar({
    String? desde,
    String? hasta,
    String? loteId,
    String? loteCodigo,
  }) async {
    try {
      final query = <String, String>{};
      if (desde != null && desde.isNotEmpty) query['desde'] = desde;
      if (hasta != null && hasta.isNotEmpty) query['hasta'] = hasta;
      if (loteId != null && loteId.isNotEmpty) query['loteId'] = loteId;
      if (loteCodigo != null && loteCodigo.isNotEmpty) {
        query['loteCodigo'] = loteCodigo;
      }

      final uri = Uri.parse(apiBaseUrl + _endpoint)
          .replace(queryParameters: query.isEmpty ? null : query);
      final resp = await http.get(uri, headers: _buildHeaders());

      if (resp.statusCode == 200) {
        final dynamic data = json.decode(resp.body);
        final list = (data is List) ? data : <dynamic>[];
        final registros = list
            .whereType<Map<String, dynamic>>()
            .map((e) => GastoFijoModel.fromJson(e))
            .toList();
        // Ordenar por fecha descendente
        registros.sort((a, b) => b.fecha.compareTo(a.fecha));
        return registros;
      } else {
        throw Exception('Error al listar gastos fijos: ${resp.statusCode}');
      }
    } catch (e) {
      throw Exception('Error de conexión: $e');
    }
  }

  /// Crea un nuevo registro de gasto fijo.
  static Future<GastoFijoModel> crear(Map<String, dynamic> data) async {
    try {
      final uri = Uri.parse(apiBaseUrl + _endpoint);
      final resp = await http.post(
        uri,
        headers: _buildHeaders(),
        body: json.encode(data),
      );

      if (resp.statusCode == 200 || resp.statusCode == 201) {
        final dynamic responseData = json.decode(resp.body);
        return GastoFijoModel.fromJson(responseData as Map<String, dynamic>);
      } else {
        throw Exception('Error al crear gasto fijo: ${resp.statusCode}');
      }
    } catch (e) {
      throw Exception('Error de conexión: $e');
    }
  }

  /// Actualiza un registro de gasto fijo existente.
  static Future<GastoFijoModel> actualizar(
      String id, Map<String, dynamic> data) async {
    try {
      final uri = Uri.parse('$apiBaseUrl$_endpoint/$id');
      final resp = await http.put(
        uri,
        headers: _buildHeaders(),
        body: json.encode(data),
      );

      if (resp.statusCode == 200) {
        final dynamic responseData = json.decode(resp.body);
        return GastoFijoModel.fromJson(responseData as Map<String, dynamic>);
      } else {
        throw Exception('Error al actualizar gasto fijo: ${resp.statusCode}');
      }
    } catch (e) {
      throw Exception('Error de conexión: $e');
    }
  }

  /// Elimina un registro de gasto fijo.
  static Future<void> eliminar(String id) async {
    try {
      final uri = Uri.parse('$apiBaseUrl$_endpoint/$id');
      final resp = await http.delete(uri, headers: _buildHeaders());

      if (resp.statusCode != 200 && resp.statusCode != 204) {
        throw Exception('Error al eliminar gasto fijo: ${resp.statusCode}');
      }
    } catch (e) {
      throw Exception('Error de conexión: $e');
    }
  }
}
