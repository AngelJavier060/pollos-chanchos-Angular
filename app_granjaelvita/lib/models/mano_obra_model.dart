import 'package:meta/meta.dart';

class GastoManoObraModel {
  final String? id;
  final String nombreTrabajador;
  final String cargo;
  final double horasTrabajadas;
  final double costoPorHora;
  /// Fecha en formato yyyy-MM-dd
  final String fecha;
  final String? loteId;
  final String? loteCodigo;
  final String? loteNombre;
  final String? observaciones;
  final double total;

  const GastoManoObraModel({
    this.id,
    required this.nombreTrabajador,
    required this.cargo,
    required this.horasTrabajadas,
    required this.costoPorHora,
    required this.fecha,
    this.loteId,
    this.loteCodigo,
    this.loteNombre,
    this.observaciones,
    required this.total,
  });

  factory GastoManoObraModel.fromJson(Map<String, dynamic> json) {
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

    String? loteId;
    String? loteCodigo;
    String? loteNombre;
    if (json['lote'] is Map<String, dynamic>) {
      final lote = json['lote'] as Map<String, dynamic>;
      loteId = lote['id']?.toString();
      loteCodigo = lote['codigo']?.toString();
      loteNombre = (lote['name'] ?? lote['nombre'])?.toString();
    } else {
      loteId = json['loteId']?.toString();
      loteCodigo = json['loteCodigo']?.toString();
    }

    final horas = parseDouble(json['horasTrabajadas']);
    final costoHora = parseDouble(json['costoPorHora']);
    double total = parseDouble(json['total']);
    if (total == 0 && horas > 0 && costoHora > 0) {
      total = horas * costoHora;
    }

    return GastoManoObraModel(
      id: json['id']?.toString(),
      nombreTrabajador: json['nombreTrabajador']?.toString() ?? '',
      cargo: json['cargo']?.toString() ?? '',
      horasTrabajadas: horas,
      costoPorHora: costoHora,
      fecha: fechaStr,
      loteId: loteId,
      loteCodigo: loteCodigo,
      loteNombre: loteNombre,
      observaciones: json['observaciones']?.toString(),
      total: total,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'nombreTrabajador': nombreTrabajador,
      'cargo': cargo,
      'horasTrabajadas': horasTrabajadas,
      'costoPorHora': costoPorHora,
      'fecha': fecha,
      if (loteId != null) 'loteId': loteId,
      if (loteCodigo != null) 'loteCodigo': loteCodigo,
      if (observaciones != null && observaciones!.isNotEmpty)
        'observaciones': observaciones,
      'total': total,
    };
  }
}
