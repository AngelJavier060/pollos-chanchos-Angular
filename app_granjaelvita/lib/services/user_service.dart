import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config.dart';
import 'auth_service.dart';

class UserModel {
  final int id;
  final String username;
  final String? name;
  final String? email;
  final String? profilePicture;
  final bool active;
  final List<String> roles;

  UserModel({
    required this.id,
    required this.username,
    this.name,
    this.email,
    this.profilePicture,
    required this.active,
    required this.roles,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    final rolesRaw = json['roles'];
    List<String> roles = [];
    if (rolesRaw is List) {
      roles = rolesRaw.map((e) => e.toString()).toList();
    }

    return UserModel(
      id: int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      username: json['username']?.toString() ?? '',
      name: json['name']?.toString(),
      email: json['email']?.toString(),
      profilePicture: json['profilePicture']?.toString(),
      active: json['active'] == true || json['active'] == 'true',
      roles: roles,
    );
  }

  String get displayName => name?.isNotEmpty == true ? name! : username;
  
  String get roleDisplay {
    if (roles.contains('ROLE_ADMIN')) return 'Administrador';
    if (roles.contains('ROLE_POULTRY')) return 'Pollos';
    if (roles.contains('ROLE_PORCINE')) return 'Chanchos';
    if (roles.contains('ROLE_USER')) return 'Usuario';
    return roles.isNotEmpty ? roles.first : 'Sin rol';
  }

  String? get normalizedPhotoUrl {
    if (profilePicture == null || profilePicture!.isEmpty) return null;
    
    final value = profilePicture!.trim();
    if (value.startsWith('http://') || value.startsWith('https://')) {
      // Normalizar localhost a la URL correcta
      try {
        final uri = Uri.parse(value);
        final baseUri = Uri.parse(apiBaseUrl);
        if (uri.host == 'localhost' || uri.host == '127.0.0.1') {
          return uri.replace(
            scheme: baseUri.scheme,
            host: baseUri.host,
            port: baseUri.hasPort ? baseUri.port : null,
          ).toString();
        }
      } catch (_) {}
      return value;
    }
    
    // Ruta relativa
    final base = apiBaseUrl;
    if (base.endsWith('/')) {
      return '$base${value.startsWith('/') ? value.substring(1) : value}';
    }
    return '$base${value.startsWith('/') ? '' : '/'}$value';
  }
}

class UserServiceMobile {
  static const String _endpoint = '/api/users';

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

  /// Lista todos los usuarios
  static Future<List<UserModel>> listar() async {
    try {
      final uri = Uri.parse(apiBaseUrl + _endpoint);
      final resp = await http.get(uri, headers: _buildHeaders());

      if (resp.statusCode == 200) {
        final dynamic data = json.decode(resp.body);
        final list = (data is List) ? data : <dynamic>[];
        return list
            .whereType<Map<String, dynamic>>()
            .map((e) => UserModel.fromJson(e))
            .toList();
      } else {
        throw Exception('Error al listar usuarios: ${resp.statusCode}');
      }
    } catch (e) {
      throw Exception('Error de conexión: $e');
    }
  }

  /// Activa un usuario
  static Future<void> activar(int userId) async {
    try {
      final uri = Uri.parse('$apiBaseUrl$_endpoint/$userId/activate');
      final resp = await http.put(uri, headers: _buildHeaders());

      if (resp.statusCode != 200 && resp.statusCode != 204) {
        throw Exception('Error al activar usuario: ${resp.statusCode}');
      }
    } catch (e) {
      throw Exception('Error de conexión: $e');
    }
  }

  /// Desactiva un usuario
  static Future<void> desactivar(int userId) async {
    try {
      final uri = Uri.parse('$apiBaseUrl$_endpoint/$userId/deactivate');
      final resp = await http.put(uri, headers: _buildHeaders());

      if (resp.statusCode != 200 && resp.statusCode != 204) {
        throw Exception('Error al desactivar usuario: ${resp.statusCode}');
      }
    } catch (e) {
      throw Exception('Error de conexión: $e');
    }
  }

  /// Cambia el estado del usuario (activo <-> inactivo)
  static Future<void> toggleStatus(int userId) async {
    try {
      final uri = Uri.parse('$apiBaseUrl$_endpoint/$userId/toggle-status');
      final resp = await http.post(
        uri,
        headers: _buildHeaders(),
        body: json.encode({}),
      );

      if (resp.statusCode != 200 && resp.statusCode != 204) {
        throw Exception('Error al cambiar estado: ${resp.statusCode}');
      }
    } catch (e) {
      throw Exception('Error de conexión: $e');
    }
  }
}
