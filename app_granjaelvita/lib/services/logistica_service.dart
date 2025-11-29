import 'dart:convert';
import 'package:http/http.dart' as http;

import '../config.dart';
import 'auth_service.dart';

class RegistroLogistica {
  final int? id;
  final String fecha;
  final String? loteId;
  final String? loteCodigo;
  final String tipoTransporte;
  final String concepto;
  final String unidad;
  final double cantidadTransportada;
  final double costoUnitario;
  final double total;
  final String? observaciones;

  RegistroLogistica({
    this.id,
    required this.fecha,
    this.loteId,
    this.loteCodigo,
    required this.tipoTransporte,
    required this.concepto,
    required this.unidad,
    required this.cantidadTransportada,
    required this.costoUnitario,
    required this.total,
    this.observaciones,
  });

  factory RegistroLogistica.fromJson(Map<String, dynamic> json) {
    // Parsear fecha
    String fechaStr = '';
    final rawFecha = json['fecha'];
    if (rawFecha is String) {
      fechaStr = rawFecha.contains('T') ? rawFecha.split('T').first : rawFecha;
    } else if (rawFecha is List && rawFecha.length >= 3) {
      final y = rawFecha[0].toString().padLeft(4, '0');
      final m = rawFecha[1].toString().padLeft(2, '0');
      final d = rawFecha[2].toString().padLeft(2, '0');
      fechaStr = '$y-$m-$d';
    }

    double parseDouble(dynamic v) {
      if (v == null) return 0.0;
      if (v is num) return v.toDouble();
      return double.tryParse(v.toString()) ?? 0.0;
    }

    final cantidadTransportada = parseDouble(json['cantidadTransportada']);
    final costoUnitario = parseDouble(json['costoUnitario']);
    double total = parseDouble(json['total']);
    if (total == 0 && cantidadTransportada > 0 && costoUnitario > 0) {
      total = cantidadTransportada * costoUnitario;
    }

    // Obtener lote info
    String? loteCodigo;
    String? loteId;
    if (json['lote'] is Map) {
      final lote = json['lote'] as Map<String, dynamic>;
      loteCodigo = lote['codigo']?.toString();
      loteId = lote['id']?.toString();
    } else {
      loteCodigo = json['loteCodigo']?.toString();
      loteId = json['loteId']?.toString();
    }

    return RegistroLogistica(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? ''),
      fecha: fechaStr,
      loteId: loteId,
      loteCodigo: loteCodigo,
      tipoTransporte: json['tipoTransporte']?.toString() ?? '',
      concepto: json['concepto']?.toString() ?? '',
      unidad: json['unidad']?.toString() ?? '',
      cantidadTransportada: cantidadTransportada,
      costoUnitario: costoUnitario,
      total: total,
      observaciones: json['observaciones']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'fecha': fecha,
      if (loteId != null) 'loteId': loteId,
      if (loteCodigo != null) 'loteCodigo': loteCodigo,
      'tipoTransporte': tipoTransporte,
      'concepto': concepto,
      'unidad': unidad,
      'cantidadTransportada': cantidadTransportada,
      'costoUnitario': costoUnitario,
      'total': total,
      if (observaciones != null) 'observaciones': observaciones,
    };
  }
}

class LogisticaServiceMobile {
  static const String _endpoint = '/api/costos/logistica';

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

  /// Lista todos los registros de logística
  static Future<List<RegistroLogistica>> listar({String? desde, String? hasta}) async {
    try {
      final query = <String, String>{};
      if (desde != null && desde.isNotEmpty) query['desde'] = desde;
      if (hasta != null && hasta.isNotEmpty) query['hasta'] = hasta;

      final uri = Uri.parse(apiBaseUrl + _endpoint).replace(
        queryParameters: query.isEmpty ? null : query,
      );
      final resp = await http.get(uri, headers: _buildHeaders());

      if (resp.statusCode == 200) {
        final dynamic data = json.decode(resp.body);
        final list = (data is List) ? data : <dynamic>[];
        return list
            .whereType<Map<String, dynamic>>()
            .map((m) => RegistroLogistica.fromJson(m))
            .toList();
      }

      if (resp.statusCode == 401) {
        throw Exception('No autorizado (401). Vuelva a iniciar sesión.');
      }

      throw Exception('Error al cargar registros: ${resp.statusCode}');
    } catch (e) {
      throw Exception('Error de conexión al listar logística: $e');
    }
  }

  /// Crea un nuevo registro de logística
  static Future<RegistroLogistica> crear({
    required String fecha,
    required String loteId,
    String? loteCodigo,
    required String tipoTransporte,
    required String concepto,
    required String unidad,
    required double cantidadTransportada,
    required double costoUnitario,
    String? observaciones,
  }) async {
    try {
      final double total = cantidadTransportada * costoUnitario;
      final body = <String, dynamic>{
        'fecha': fecha,
        'loteId': loteId,
        if (loteCodigo != null && loteCodigo.isNotEmpty) 'loteCodigo': loteCodigo,
        'tipoTransporte': tipoTransporte,
        'concepto': concepto,
        'unidad': unidad,
        'cantidadTransportada': cantidadTransportada,
        'costoUnitario': double.parse(costoUnitario.toStringAsFixed(2)),
        'total': double.parse(total.toStringAsFixed(2)),
        if (observaciones != null && observaciones.isNotEmpty) 'observaciones': observaciones,
      };

      final uri = Uri.parse(apiBaseUrl + _endpoint);
      final resp = await http.post(uri, headers: _buildHeaders(), body: json.encode(body));

      if (resp.statusCode == 200 || resp.statusCode == 201) {
        final dynamic data = json.decode(resp.body);
        if (data is Map<String, dynamic>) {
          return RegistroLogistica.fromJson(data);
        }
        return RegistroLogistica(
          fecha: fecha,
          loteId: loteId,
          loteCodigo: loteCodigo,
          tipoTransporte: tipoTransporte,
          concepto: concepto,
          unidad: unidad,
          cantidadTransportada: cantidadTransportada,
          costoUnitario: costoUnitario,
          total: total,
          observaciones: observaciones,
        );
      }

      if (resp.statusCode == 401) {
        throw Exception('No autorizado (401). Vuelva a iniciar sesión.');
      }

      String message = 'Error al crear registro: ${resp.statusCode}';
      try {
        final dynamic data = json.decode(resp.body);
        if (data is Map && data['message'] is String) {
          message = data['message'] as String;
        }
      } catch (_) {}
      throw Exception(message);
    } catch (e) {
      throw Exception('Error de conexión al crear logística: $e');
    }
  }
}
