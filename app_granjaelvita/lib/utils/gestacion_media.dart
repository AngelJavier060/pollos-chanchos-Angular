import '../config.dart';

/// Convierte rutas relativas del backend (/uploads/...) en URL absoluta.
String resolveGestacionMediaUrl(String? path) {
  if (path == null) return '';
  final value = path.trim();
  if (value.isEmpty) return '';

  if (value.startsWith('http://') || value.startsWith('https://')) {
    try {
      final uri = Uri.parse(value);
      final baseUri = Uri.parse(apiBaseUrl);
      if (uri.host == 'localhost' || uri.host == '127.0.0.1') {
        return uri
            .replace(
              scheme: baseUri.scheme,
              host: baseUri.host,
              port: baseUri.hasPort ? baseUri.port : null,
            )
            .toString();
      }
    } catch (_) {}
    return value;
  }

  final base = apiBaseUrl.endsWith('/') ? apiBaseUrl.substring(0, apiBaseUrl.length - 1) : apiBaseUrl;
  return value.startsWith('/') ? '$base$value' : '$base/$value';
}
