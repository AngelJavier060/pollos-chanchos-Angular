import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config.dart';
import '../models/mano_obra_model.dart';
import 'auth_service.dart';

class ManoObraServiceMobile {
  static const String _endpoint = '/api/costos/mano-obra';

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

  /// Lista todos los registros de mano de obra.
  /// Permite filtrar opcionalmente por rango de fechas (desde, hasta)
  /// y por lote (loteId o loteCodigo).
  static Future<List<GastoManoObraModel>> listar({
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
            .map((m) => GastoManoObraModel.fromJson(m))
            .toList();

        // Ordenar igual que en Angular: por lote, fecha y horas
        registros.sort((a, b) {
          final loteA = (a.loteCodigo ?? a.loteId ?? '').toString();
          final loteB = (b.loteCodigo ?? b.loteId ?? '').toString();
          final cmpLote = loteA.compareTo(loteB);
          if (cmpLote != 0) return cmpLote;

          final cmpFecha = a.fecha.compareTo(b.fecha);
          if (cmpFecha != 0) return cmpFecha;

          return a.horasTrabajadas.compareTo(b.horasTrabajadas);
        });

        return registros;
      }

      if (resp.statusCode == 401) {
        throw Exception('No autorizado (401). Vuelva a iniciar sesión.');
      }

      throw Exception('Error al cargar registros de mano de obra: ${resp.statusCode}');
    } catch (e) {
      throw Exception('Error de conexión al listar mano de obra: $e');
    }
  }

  /// Crea uno o varios registros de mano de obra con la misma información
  /// de trabajador, pero distribuyendo el monto mensual entre los lotes
  /// de forma similar a la lógica usada en el panel web (Angular).
  ///
  /// - [montoMensual] es el pago total mensual del cuidador.
  /// - Si [aplicarPorIgual] es true, ese monto se divide equitativamente
  ///   entre todos los [loteIds].
  /// - Si es false, se registra el monto completo para cada lote.
  static Future<List<GastoManoObraModel>> crearProrrateado({
    required String nombreTrabajador,
    required String cargo,
    required double horasTrabajadas,
    required double montoMensual,
    required String fecha,
    required List<String> loteIds,
    bool aplicarPorIgual = false,
    String? observaciones,
  }) async {
    if (montoMensual <= 0) {
      throw Exception('El monto mensual debe ser mayor que 0');
    }
    if (horasTrabajadas <= 0) {
      throw Exception('Las horas trabajadas deben ser mayores que 0');
    }
    if (loteIds.isEmpty) {
      throw Exception('Debe seleccionar al menos un lote para registrar mano de obra');
    }

    final uri = Uri.parse(apiBaseUrl + _endpoint);
    final headers = _buildHeaders();
    final resultados = <GastoManoObraModel>[];
    final numLotes = loteIds.length;

    for (final loteId in loteIds) {
      final totalLote = aplicarPorIgual ? (montoMensual / numLotes) : montoMensual;
      final costoPorHoraLote = totalLote / horasTrabajadas;

      final body = <String, dynamic>{
        'nombreTrabajador': nombreTrabajador,
        'cargo': cargo,
        'horasTrabajadas': double.parse(horasTrabajadas.toStringAsFixed(2)),
        'costoPorHora': double.parse(costoPorHoraLote.toStringAsFixed(6)),
        'fecha': fecha,
        'loteId': loteId,
        if (observaciones != null && observaciones.isNotEmpty)
          'observaciones': observaciones,
      };

      try {
        final resp = await http.post(
          uri,
          headers: headers,
          body: json.encode(body),
        );

        if (resp.statusCode == 200 || resp.statusCode == 201) {
          final dynamic data = json.decode(resp.body);
          if (data is Map<String, dynamic>) {
            resultados.add(GastoManoObraModel.fromJson(data));
          } else {
            // Si el backend no devuelve el objeto completo, construimos uno base
            resultados.add(
              GastoManoObraModel(
                id: null,
                nombreTrabajador: nombreTrabajador,
                cargo: cargo,
                horasTrabajadas: horasTrabajadas,
                costoPorHora: costoPorHoraLote,
                fecha: fecha,
                loteId: loteId,
                loteCodigo: null,
                loteNombre: null,
                observaciones: observaciones,
                total: totalLote,
              ),
            );
          }
        } else if (resp.statusCode == 401) {
          throw Exception('No autorizado (401). Vuelva a iniciar sesión.');
        } else {
          String message =
              'Error al crear registro de mano de obra: ${resp.statusCode}';
          try {
            final dynamic data = json.decode(resp.body);
            if (data is Map && data['message'] is String) {
              message = data['message'] as String;
            }
          } catch (_) {}
          throw Exception(message);
        }
      } catch (e) {
        throw Exception('Error de conexión al crear mano de obra: $e');
      }
    }

    return resultados;
  }
}
