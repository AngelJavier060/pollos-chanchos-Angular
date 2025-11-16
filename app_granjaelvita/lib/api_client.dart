import 'dart:convert';
import 'dart:io';

class ApiException implements Exception {
  final int statusCode;
  final String message;
  ApiException(this.statusCode, this.message);
  @override
  String toString() => 'ApiException(' + statusCode.toString() + '): ' + message;
}

class ApiClient {
  final String baseUrl;
  ApiClient({required this.baseUrl});

  Future<Map<String, dynamic>> post(String path, Map<String, dynamic> body, {Map<String, String>? headers}) async {
    final client = HttpClient();
    try {
      final uri = Uri.parse(baseUrl + path);
      final req = await client.postUrl(uri);
      req.headers.set(HttpHeaders.contentTypeHeader, 'application/json');
      headers?.forEach((k, v) => req.headers.set(k, v));
      req.add(utf8.encode(json.encode(body)));
      final res = await req.close();
      final text = await res.transform(utf8.decoder).join();
      final status = res.statusCode;
      final data = text.isNotEmpty ? json.decode(text) : {};
      if (status >= 200 && status < 300) {
        if (data is Map<String, dynamic>) return data;
        return {'data': data};
      }
      final msg = (data is Map && data['message'] is String) ? data['message'] as String : 'Error HTTP ' + status.toString();
      throw ApiException(status, msg);
    } finally {
      client.close(force: true);
    }
  }

  Future<dynamic> get(String path, {Map<String, String>? headers, Map<String, String>? query}) async {
    final client = HttpClient();
    try {
      final uri = Uri.parse(baseUrl + path).replace(queryParameters: query);
      final req = await client.getUrl(uri);
      if (headers != null) {
        headers.forEach((k, v) => req.headers.set(k, v));
      }
      final res = await req.close();
      final text = await res.transform(utf8.decoder).join();
      final status = res.statusCode;
      if (status >= 200 && status < 300) {
        return text.isNotEmpty ? json.decode(text) : null;
      }
      final data = text.isNotEmpty ? json.decode(text) : {};
      final msg = (data is Map && data['message'] is String) ? data['message'] as String : 'Error HTTP ' + status.toString();
      throw ApiException(status, msg);
    } finally {
      client.close(force: true);
    }
  }
}
