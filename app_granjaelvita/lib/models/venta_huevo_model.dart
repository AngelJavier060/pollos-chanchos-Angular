import 'dart:convert';

class VentaHuevoModel {
  final int? id;
  final String fecha; // Formato normalizado yyyy-MM-dd
  final String? loteId;
  final String? loteCodigo;
  final int? animalId;
  final String? animalName;
  final double cantidad;
  final double precioUnit;
  final double total;

  VentaHuevoModel({
    required this.id,
    required this.fecha,
    required this.loteId,
    required this.loteCodigo,
    required this.animalId,
    required this.animalName,
    required this.cantidad,
    required this.precioUnit,
    required this.total,
  });

  /// Convierte cualquier representación de fecha usada por el backend
  /// (string ISO, 'yyyy-MM-dd', array [yyyy,mm,dd], etc.) a 'yyyy-MM-dd'.
  static String normalizeFecha(dynamic raw) {
    if (raw == null) return '';
    if (raw is String) {
      if (raw.contains('T')) {
        return raw.split('T').first;
      }
      return raw;
    }
    if (raw is List && raw.length >= 3) {
      final y = int.tryParse(raw[0].toString()) ?? 0;
      final m = int.tryParse(raw[1].toString()) ?? 1;
      final d = int.tryParse(raw[2].toString()) ?? 1;
      return _formatDate(DateTime(y, m, d));
    }
    if (raw is Map<String, dynamic>) {
      final y = raw['year'] as int?;
      final m = raw['month'] as int?;
      final d = raw['day'] as int?;
      if (y != null && m != null && d != null) {
        return _formatDate(DateTime(y, m, d));
      }
    }
    if (raw is int) {
      // Asumimos milisegundos desde epoch
      return _formatDate(DateTime.fromMillisecondsSinceEpoch(raw));
    }
    return raw.toString();
  }

  static String _formatDate(DateTime d) {
    final y = d.year.toString().padLeft(4, '0');
    final m = d.month.toString().padLeft(2, '0');
    final day = d.day.toString().padLeft(2, '0');
    return '$y-$m-$day';
  }

  static double _toDouble(dynamic value) {
    if (value == null) return 0.0;
    if (value is num) return value.toDouble();
    return double.tryParse(value.toString()) ?? 0.0;
  }

  factory VentaHuevoModel.fromJson(Map<String, dynamic> json) {
    final rawFecha = json['fecha'];
    final fechaNorm = normalizeFecha(rawFecha);
    final cantidad = _toDouble(json['cantidad']);
    final precioUnit = _toDouble(json['precioUnit']);
    double total = _toDouble(json['total']);
    if (total == 0 && cantidad != 0 && precioUnit != 0) {
      total = cantidad * precioUnit;
    }

    int? parseId(dynamic v) {
      if (v == null) return null;
      if (v is int) return v;
      return int.tryParse(v.toString());
    }

    return VentaHuevoModel(
      id: parseId(json['id']),
      fecha: fechaNorm,
      loteId: json['loteId']?.toString(),
      loteCodigo: json['loteCodigo']?.toString(),
      animalId: (json['animalId'] is num) ? (json['animalId'] as num).toInt() : int.tryParse(json['animalId']?.toString() ?? ''),
      animalName: json['animalName']?.toString(),
      cantidad: cantidad,
      precioUnit: precioUnit,
      total: total,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'fecha': fecha,
      'loteId': loteId,
      'loteCodigo': loteCodigo,
      'animalId': animalId,
      'animalName': animalName,
      'cantidad': cantidad,
      'precioUnit': precioUnit,
      'total': total,
    };
  }

  String toJsonString() => json.encode(toJson());
}
