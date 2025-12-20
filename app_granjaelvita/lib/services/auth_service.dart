import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../config.dart';
import '../api_client.dart';

class LoginResult {
  final String token;
  final String refreshToken;
  final String username;
  final String name;
  final List<String> roles;
  final String greeting;
  final String? photoUrl; // URL de la foto del usuario
  
  LoginResult({
    required this.token,
    required this.refreshToken,
    required this.username,
    required this.name,
    required this.roles,
    required this.greeting,
    this.photoUrl,
  });
}

class AuthService {
  // Sesión actual (token en memoria)
  static String? _token;
  static String? _refreshToken;

  static const String _keySession = 'auth_session';
  static const String _keyBiometricEnabled = 'auth_biometric_enabled';
  static const FlutterSecureStorage _storage = FlutterSecureStorage();

  static String? get token => _token;
  static String? get refreshToken => _refreshToken;

  final ApiClient _api = ApiClient(baseUrl: apiBaseUrl);

  Future<LoginResult> login(String username, String password) async {
    final body = {'username': username, 'password': password, 'rememberMe': true};
    final res = await _api.post(authLoginPath, body);
    final roles = (res['roles'] is List)
        ? (res['roles'] as List).map((e) => e.toString()).toList()
        : <String>[];
    final name = (res['name'] ?? res['username'] ?? '') as String;
    final greeting = _greetingForRoles(roles);

    final token = (res['token'] ?? '') as String;
    final refreshToken = (res['refreshToken'] ?? '') as String;
    // El backend devuelve 'profilePicture' con la ruta o URL de la foto
    final rawPhoto = res['profilePicture'] as String?;
    final photoUrl = _normalizePhotoUrl(rawPhoto);

    // Guardar token en memoria para otros servicios (ej: productos)
    _token = token;
    _refreshToken = refreshToken;

    // Persistir sesión de forma segura para uso con huella
    final sessionMap = <String, dynamic>{
      'token': token,
      'refreshToken': refreshToken,
      'username': (res['username'] ?? username) as String,
      'name': name,
      'roles': roles,
      'greeting': greeting,
      'photoUrl': photoUrl,
    };
    await _storage.write(key: _keySession, value: json.encode(sessionMap));

    return LoginResult(
      token: token,
      refreshToken: refreshToken,
      username: (res['username'] ?? '') as String,
      name: name,
      roles: roles,
      greeting: greeting,
      photoUrl: photoUrl,
    );
  }

  String _greetingForRoles(List<String> roles) {
    if (roles.contains('ROLE_ADMIN')) return 'Bienvenido Administrador';
    if (roles.contains('ROLE_POULTRY')) return 'Bienvenido a Pollos';
    if (roles.contains('ROLE_PORCINE')) return 'Bienvenido a Chanchos';
    return 'Bienvenido';
  }

  /// Normaliza la URL de la foto del usuario.
  /// Si el backend envía solo una ruta relativa como "/uploads/abc.jpg",
  /// la convierte en una URL completa usando apiBaseUrl.
  String? _normalizePhotoUrl(String? raw) {
    if (raw == null) return null;
    final value = raw.trim();
    if (value.isEmpty) return null;

    // Si ya es una URL absoluta, normalizamos el host para entornos locales
    if (value.startsWith('http://') || value.startsWith('https://')) {
      try {
        final uri = Uri.parse(value);
        final baseUri = Uri.parse(apiBaseUrl);

        // Caso típico: la web guarda "http://localhost:8088/uploads/..." pero
        // desde el emulador Android debemos apuntar a 10.0.2.2:8088
        if (uri.host == 'localhost' || uri.host == '127.0.0.1') {
          final normalized = uri.replace(
            scheme: baseUri.scheme,
            host: baseUri.host,
            port: baseUri.hasPort ? baseUri.port : null,
          );
          return normalized.toString();
        }
      } catch (_) {
        // Si algo falla al parsear, continuamos y devolvemos el valor original
      }

      return value;
    }

    // Caso típico: ruta relativa guardada en BD ("/uploads/..." o "uploads/...")
    final base = apiBaseUrl;
    if (base.endsWith('/')) {
      return '$base${value.startsWith('/') ? value.substring(1) : value}';
    }
    return '$base${value.startsWith('/') ? '' : '/'}$value';
  }

  // ========= Métodos estáticos para sesión persistente / biometría =========

  static Future<LoginResult?> loadSavedSession() async {
    final jsonStr = await _storage.read(key: _keySession);
    if (jsonStr == null) return null;
    try {
      final data = json.decode(jsonStr) as Map<String, dynamic>;
      final rolesRaw = data['roles'];
      final List<String> roles = rolesRaw is List
          ? rolesRaw.map((e) => e.toString()).toList()
          : <String>[];

      final result = LoginResult(
        token: (data['token'] ?? '') as String,
        refreshToken: (data['refreshToken'] ?? '') as String,
        username: (data['username'] ?? '') as String,
        name: (data['name'] ?? '') as String,
        roles: roles,
        greeting: (data['greeting'] ?? 'Bienvenido') as String,
        photoUrl: data['photoUrl'] as String?,
      );

      // Restaurar en memoria
      _token = result.token;
      _refreshToken = result.refreshToken;
      return result;
    } catch (_) {
      return null;
    }
  }

  static Future<bool> hasSavedSession() async {
    final v = await _storage.read(key: _keySession);
    return v != null;
  }

  static Future<void> clearSession() async {
    _token = null;
    _refreshToken = null;
    await _storage.delete(key: _keySession);
  }

  static Future<void> setBiometricEnabled(bool enabled) async {
    await _storage.write(
      key: _keyBiometricEnabled,
      value: enabled ? 'true' : 'false',
    );
  }

  static Future<bool> isBiometricEnabled() async {
    final v = await _storage.read(key: _keyBiometricEnabled);
    return v == 'true';
  }

  /// Cierra la sesión actual y limpia todos los datos de autenticación
  static Future<void> logout() async {
    _token = null;
    _refreshToken = null;
  }

  /// Obtiene el tipo de animal del usuario basado en su rol
  /// Retorna 'pollos', 'chanchos', o 'admin' si es administrador
  static Future<String> getTipoAnimal() async {
    final session = await loadSavedSession();
    if (session == null) return 'pollos'; // Default
    
    final roles = session.roles;
    if (roles.contains('ROLE_ADMIN')) return 'admin';
    if (roles.contains('ROLE_PORCINE')) return 'chanchos';
    if (roles.contains('ROLE_POULTRY')) return 'pollos';
    return 'pollos'; // Default
  }

  /// Verifica si el usuario es administrador
  static Future<bool> isAdmin() async {
    final session = await loadSavedSession();
    if (session == null) return false;
    return session.roles.contains('ROLE_ADMIN');
  }

  /// Obtiene los roles del usuario actual
  static Future<List<String>> getRoles() async {
    final session = await loadSavedSession();
    return session?.roles ?? [];
  }
}

