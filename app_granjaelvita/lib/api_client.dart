import 'dart:convert';

import 'package:http/http.dart' as http;

class ApiException implements Exception {
  final int statusCode;
  final String message;
  ApiException(this.statusCode, this.message);
  @override
  String toString() => 'ApiException($statusCode): $message';
}

/// Cliente HTTP compatible con Android, iOS, Windows y Web (Chrome).
class ApiClient {
  final String baseUrl;
  ApiClient({required this.baseUrl});

  Future<Map<String, dynamic>> post(
    String path,
    Map<String, dynamic> body, {
    Map<String, String>? headers,
  }) async {
    final uri = Uri.parse('$baseUrl$path');
    final res = await http.post(
      uri,
      headers: {
        'Content-Type': 'application/json',
        ...?headers,
      },
      body: json.encode(body),
    );
    return _decodeMap(res);
  }

  Future<dynamic> get(
    String path, {
    Map<String, String>? headers,
    Map<String, String>? query,
  }) async {
    final uri = Uri.parse('$baseUrl$path').replace(queryParameters: query);
    final res = await http.get(uri, headers: headers);
    if (res.statusCode >= 200 && res.statusCode < 300) {
      if (res.body.isEmpty) return null;
      return json.decode(res.body);
    }
    final data = res.body.isNotEmpty ? json.decode(res.body) : {};
    final msg = (data is Map && data['message'] is String)
        ? data['message'] as String
        : 'Error HTTP ${res.statusCode}';
    throw ApiException(res.statusCode, msg);
  }

  Map<String, dynamic> _decodeMap(http.Response res) {
    final data = res.body.isNotEmpty ? json.decode(res.body) : {};
    if (res.statusCode >= 200 && res.statusCode < 300) {
      if (data is Map<String, dynamic>) return data;
      return {'data': data};
    }
    final msg = (data is Map && data['message'] is String)
        ? data['message'] as String
        : 'Error HTTP ${res.statusCode}';
    throw ApiException(res.statusCode, msg);
  }
}
