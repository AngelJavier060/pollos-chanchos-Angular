import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config.dart';
import '../models/gestacion_chancha_model.dart';
import 'auth_service.dart';

class GestacionService {
  static Future<Map<String, String>> _headers() async {
    if (AuthService.token == null || AuthService.token!.isEmpty) {
      await AuthService.loadSavedSession();
    }
    final token = AuthService.token;
    if (token == null || token.isEmpty) {
      throw Exception('No hay sesión activa. Inicie sesión nuevamente.');
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  Future<List<GestacionChancha>> listar() async {
    final headers = await _headers();
    final url = Uri.parse('$apiBaseUrl/api/gestacion');
    final response = await http.get(url, headers: headers);
    if (response.statusCode == 401) {
      throw Exception('Sesión expirada. Inicie sesión nuevamente.');
    }
    final decoded = response.body.isNotEmpty ? json.decode(response.body) : {};
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final msg = decoded is Map ? (decoded['message'] ?? 'Error ${response.statusCode}') : 'Error';
      throw Exception(msg);
    }
    if (decoded is! Map || decoded['success'] != true) {
      final msg = decoded is Map ? (decoded['message'] ?? 'Error al listar') : 'Error al listar';
      throw Exception(msg);
    }
    final data = decoded['data'];
    if (data is! List) return [];
    return data
        .whereType<Map>()
        .map((e) => GestacionChancha.fromMap(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<GestacionChancha> crear(Map<String, dynamic> body) async {
    final headers = await _headers();
    final url = Uri.parse('$apiBaseUrl/api/gestacion');
    final response = await http.post(url, headers: headers, body: json.encode(body));
    return _parseSingle(response);
  }

  Future<GestacionChancha> actualizar(String id, Map<String, dynamic> body) async {
    final headers = await _headers();
    final url = Uri.parse('$apiBaseUrl/api/gestacion/$id');
    final response = await http.put(url, headers: headers, body: json.encode(body));
    return _parseSingle(response);
  }

  Future<void> eliminar(String id) async {
    final headers = await _headers();
    final url = Uri.parse('$apiBaseUrl/api/gestacion/$id');
    final response = await http.delete(url, headers: headers);
    if (response.statusCode == 401) {
      throw Exception('Sesión expirada. Inicie sesión nuevamente.');
    }
    final decoded = response.body.isNotEmpty ? json.decode(response.body) : {};
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final msg = decoded is Map ? (decoded['message'] ?? 'Error ${response.statusCode}') : 'Error';
      throw Exception(msg);
    }
    if (decoded is Map && decoded['success'] != true) {
      throw Exception(decoded['message'] ?? 'No se pudo eliminar');
    }
  }

  GestacionChancha _parseSingle(http.Response response) {
    if (response.statusCode == 401) {
      throw Exception('Sesión expirada. Inicie sesión nuevamente.');
    }
    final decoded = response.body.isNotEmpty ? json.decode(response.body) : {};
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final msg = decoded is Map ? (decoded['message'] ?? 'Error ${response.statusCode}') : 'Error';
      throw Exception(msg);
    }
    if (decoded is! Map || decoded['success'] != true || decoded['data'] is! Map) {
      final msg = decoded is Map ? (decoded['message'] ?? 'Error en la operación') : 'Error';
      throw Exception(msg);
    }
    return GestacionChancha.fromMap(Map<String, dynamic>.from(decoded['data'] as Map));
  }
}
