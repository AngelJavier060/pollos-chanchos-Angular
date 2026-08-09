import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:image_picker/image_picker.dart';

import '../config.dart';
import '../models/gestacion_chancha_model.dart';
import '../models/gestacion_no_prenada_model.dart';
import '../models/gestacion_parto_model.dart';
import 'auth_service.dart';

class GestacionService {
  static const _httpTimeout = Duration(seconds: 12);

  static Future<Map<String, String>> _headers({bool json = true}) async {
    if (AuthService.token == null || AuthService.token!.isEmpty) {
      await AuthService.loadSavedSession();
    }
    final token = AuthService.token;
    if (token == null || token.isEmpty) {
      throw Exception('No hay sesión activa. Inicie sesión nuevamente.');
    }
    final h = <String, String>{'Authorization': 'Bearer $token'};
    if (json) h['Content-Type'] = 'application/json';
    return h;
  }

  Future<http.Response> _get(String path, Map<String, String> headers) {
    return http.get(Uri.parse('$apiBaseUrl$path'), headers: headers).timeout(_httpTimeout);
  }

  /// Carga inicial en paralelo con un solo header (más rápido al abrir la pantalla).
  Future<({
    List<GestacionChancha> chanchas,
    List<GestacionParto> partos,
    List<GestacionNoPrenada> noPrenadas,
  })> cargarResumenInicial() async {
    final headers = await _headers();
    final results = await Future.wait([
      _get('/api/gestacion', headers),
      _get('/api/gestacion/partos', headers),
      _get('/api/gestacion/no-prenadas', headers),
    ]);

    List<GestacionChancha> chanchas = [];
    List<GestacionParto> partos = [];
    List<GestacionNoPrenada> noPrenadas = [];

    try {
      final decoded = _decode(results[0]);
      _ensureOk(results[0], decoded, 'Error al listar gestaciones');
      final data = decoded['data'];
      if (data is List) {
        chanchas = data
            .whereType<Map>()
            .map((e) => GestacionChancha.fromMap(Map<String, dynamic>.from(e)))
            .toList();
      }
    } catch (_) {
      rethrow;
    }

    try {
      final decoded = _decode(results[1]);
      if (results[1].statusCode >= 200 && results[1].statusCode < 300) {
        final data = decoded['data'];
        if (data is List) {
          partos = data
              .whereType<Map>()
              .map((e) => GestacionParto.fromMap(Map<String, dynamic>.from(e)))
              .toList();
        }
      }
    } catch (_) {
      partos = [];
    }

    try {
      final decoded = _decode(results[2]);
      if (results[2].statusCode >= 200 && results[2].statusCode < 300) {
        final data = decoded['data'];
        if (data is List) {
          noPrenadas = data
              .whereType<Map>()
              .map((e) => GestacionNoPrenada.fromMap(Map<String, dynamic>.from(e)))
              .toList();
        }
      }
    } catch (_) {
      noPrenadas = [];
    }

    return (chanchas: chanchas, partos: partos, noPrenadas: noPrenadas);
  }

  Future<List<GestacionChancha>> listar() async {
    final headers = await _headers();
    final response = await _get('/api/gestacion', headers);
    final decoded = _decode(response);
    _ensureOk(response, decoded, 'Error al listar gestaciones');
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
    return _parseChancha(response);
  }

  Future<GestacionChancha> actualizar(String id, Map<String, dynamic> body) async {
    final headers = await _headers();
    final url = Uri.parse('$apiBaseUrl/api/gestacion/$id');
    final response = await http.put(url, headers: headers, body: json.encode(body));
    return _parseChancha(response);
  }

  Future<void> eliminar(String id) async {
    final headers = await _headers();
    final url = Uri.parse('$apiBaseUrl/api/gestacion/$id');
    final response = await http.delete(url, headers: headers);
    final decoded = _decode(response);
    _ensureOk(response, decoded, 'No se pudo eliminar');
  }

  Future<List<GestacionParto>> listarPartos() async {
    final headers = await _headers();
    final response = await _get('/api/gestacion/partos', headers);
    final decoded = _decode(response);
    _ensureOk(response, decoded, 'Error al listar partos');
    final data = decoded['data'];
    if (data is! List) return [];
    return data
        .whereType<Map>()
        .map((e) => GestacionParto.fromMap(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<GestacionParto> registrarParto(String gestacionId, Map<String, dynamic> body) async {
    final headers = await _headers();
    final url = Uri.parse('$apiBaseUrl/api/gestacion/$gestacionId/parto');
    final response = await http.post(url, headers: headers, body: json.encode(body));
    return _parseParto(response);
  }

  Future<List<GestacionNoPrenada>> listarNoPrenadas() async {
    final headers = await _headers();
    final response = await _get('/api/gestacion/no-prenadas', headers);
    final decoded = _decode(response);
    _ensureOk(response, decoded, 'Error al listar no gestantes');
    final data = decoded['data'];
    if (data is! List) return [];
    return data
        .whereType<Map>()
        .map((e) => GestacionNoPrenada.fromMap(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<GestacionNoPrenada> registrarNoPrenada(String gestacionId, Map<String, dynamic> body) async {
    final headers = await _headers();
    final url = Uri.parse('$apiBaseUrl/api/gestacion/$gestacionId/no-prenada');
    final response = await http.post(url, headers: headers, body: json.encode(body));
    final decoded = _decode(response);
    _ensureOk(response, decoded, 'Error al registrar no gestante');
    if (decoded['data'] is! Map) throw Exception(decoded['message'] ?? 'Error');
    return GestacionNoPrenada.fromMap(Map<String, dynamic>.from(decoded['data'] as Map));
  }

  Future<GestacionParto> actualizarParto(String partoId, Map<String, dynamic> body) async {
    final headers = await _headers();
    final url = Uri.parse('$apiBaseUrl/api/gestacion/partos/$partoId');
    final response = await http.put(url, headers: headers, body: json.encode(body));
    return _parseParto(response);
  }

  Future<int> siguienteNumeroParto(String loteId, int numeroEnLote) async {
    final headers = await _headers();
    final url = Uri.parse(
      '$apiBaseUrl/api/gestacion/siguiente-parto?loteId=${Uri.encodeQueryComponent(loteId)}&numeroEnLote=$numeroEnLote',
    );
    final response = await http.get(url, headers: headers);
    final decoded = _decode(response);
    _ensureOk(response, decoded, 'Error al obtener número de parto');
    return int.tryParse((decoded['data'] ?? '1').toString()) ?? 1;
  }

  Future<String> uploadFoto(XFile file) async {
    final headers = await _headers(json: false);
    final url = Uri.parse('$apiBaseUrl/api/gestacion/upload-foto');
    final request = http.MultipartRequest('POST', url);
    request.headers.addAll(headers);
    final bytes = await file.readAsBytes();
    if (bytes.isEmpty) {
      throw Exception('La imagen está vacía. Intente tomar la foto de nuevo.');
    }
    // En Android/iOS la cámara a veces no envía mime ni extensión; el backend exige image/*
    final rawName = file.name.trim();
    final mime = (file.mimeType ?? '').toLowerCase();
    final filename = _nombreImagenUpload(rawName, mime);
    final contentType = _mediaTypeImagen(filename, mime);
    request.files.add(
      http.MultipartFile.fromBytes(
        'file',
        bytes,
        filename: filename,
        contentType: contentType,
      ),
    );
    final streamed = await request.send();
    final response = await http.Response.fromStream(streamed);
    final decoded = _decode(response);
    _ensureOk(response, decoded, 'Error al subir imagen');
    final urlFoto = (decoded['data'] ?? decoded['url'] ?? '').toString();
    if (urlFoto.isEmpty) throw Exception('No se recibió URL de imagen');
    return urlFoto;
  }

  /// Asegura nombre con extensión de imagen válida.
  String _nombreImagenUpload(String rawName, String mime) {
    final lower = rawName.toLowerCase();
    if (lower.endsWith('.jpg') ||
        lower.endsWith('.jpeg') ||
        lower.endsWith('.png') ||
        lower.endsWith('.webp') ||
        lower.endsWith('.gif') ||
        lower.endsWith('.heic') ||
        lower.endsWith('.heif')) {
      return rawName;
    }
    if (mime.contains('png')) return 'foto_gestacion.png';
    if (mime.contains('webp')) return 'foto_gestacion.webp';
    if (mime.contains('gif')) return 'foto_gestacion.gif';
    return 'foto_gestacion.jpg';
  }

  MediaType _mediaTypeImagen(String filename, String mime) {
    if (mime.startsWith('image/')) {
      final parts = mime.split('/');
      if (parts.length == 2 && parts[1].isNotEmpty) {
        return MediaType('image', parts[1]);
      }
    }
    final lower = filename.toLowerCase();
    if (lower.endsWith('.png')) return MediaType('image', 'png');
    if (lower.endsWith('.webp')) return MediaType('image', 'webp');
    if (lower.endsWith('.gif')) return MediaType('image', 'gif');
    if (lower.endsWith('.heic') || lower.endsWith('.heif')) {
      return MediaType('image', 'heic');
    }
    return MediaType('image', 'jpeg');
  }

  Map<String, dynamic> _decode(http.Response response) {
    if (response.statusCode == 401) {
      throw Exception('Sesión expirada. Inicie sesión nuevamente.');
    }
    if (response.body.isEmpty) return {};
    final decoded = json.decode(response.body);
    return decoded is Map ? Map<String, dynamic>.from(decoded) : {};
  }

  void _ensureOk(http.Response response, Map<String, dynamic> decoded, String fallback) {
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(decoded['message'] ?? fallback);
    }
    if (decoded['success'] == false) {
      throw Exception(decoded['message'] ?? fallback);
    }
  }

  GestacionChancha _parseChancha(http.Response response) {
    final decoded = _decode(response);
    _ensureOk(response, decoded, 'Error en la operación');
    if (decoded['data'] is! Map) throw Exception(decoded['message'] ?? 'Error');
    return GestacionChancha.fromMap(Map<String, dynamic>.from(decoded['data'] as Map));
  }

  GestacionParto _parseParto(http.Response response) {
    final decoded = _decode(response);
    _ensureOk(response, decoded, 'Error en la operación');
    if (decoded['data'] is! Map) throw Exception(decoded['message'] ?? 'Error');
    return GestacionParto.fromMap(Map<String, dynamic>.from(decoded['data'] as Map));
  }
}
