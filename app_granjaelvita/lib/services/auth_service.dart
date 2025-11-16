import '../config.dart';
import '../api_client.dart';

class LoginResult {
  final String token;
  final String refreshToken;
  final String username;
  final String name;
  final List<String> roles;
  final String greeting;
  LoginResult({
    required this.token,
    required this.refreshToken,
    required this.username,
    required this.name,
    required this.roles,
    required this.greeting,
  });
}

class AuthService {
  final ApiClient _api = ApiClient(baseUrl: apiBaseUrl);

  Future<LoginResult> login(String username, String password) async {
    final body = {'username': username, 'password': password, 'rememberMe': true};
    final res = await _api.post(authLoginPath, body);
    final roles = (res['roles'] is List)
        ? (res['roles'] as List).map((e) => e.toString()).toList()
        : <String>[];
    final name = (res['name'] ?? res['username'] ?? '') as String;
    final greeting = _greetingForRoles(roles);
    return LoginResult(
      token: (res['token'] ?? '') as String,
      refreshToken: (res['refreshToken'] ?? '') as String,
      username: (res['username'] ?? '') as String,
      name: name,
      roles: roles,
      greeting: greeting,
    );
  }

  String _greetingForRoles(List<String> roles) {
    if (roles.contains('ROLE_ADMIN')) return 'Bienvenido Administrador';
    if (roles.contains('ROLE_POULTRY')) return 'Bienvenido a Pollos';
    if (roles.contains('ROLE_PORCINE')) return 'Bienvenido a Chanchos';
    return 'Bienvenido';
  }
}

