/// Modelo para las entradas de inventario (tabla inventario_entrada_producto)
class EntradaInventarioModel {
  final int? id;
  final int productId;
  final String? productName;
  final String? productCategory;
  final String? providerName;
  final String? codigoLote;
  final String? fechaIngreso;
  final String? fechaVencimiento;
  final String? unidadControl;
  final double? contenidoPorUnidad;
  final double? cantidadUnidades;
  final double? costoUnitarioBase;
  final double? costoPorUnidadControl;
  final double? stockUnidadesRestantes;
  final double? stockBaseRestante;
  final bool? activo;
  final String? observaciones;

  EntradaInventarioModel({
    this.id,
    required this.productId,
    this.productName,
    this.productCategory,
    this.providerName,
    this.codigoLote,
    this.fechaIngreso,
    this.fechaVencimiento,
    this.unidadControl,
    this.contenidoPorUnidad,
    this.cantidadUnidades,
    this.costoUnitarioBase,
    this.costoPorUnidadControl,
    this.stockUnidadesRestantes,
    this.stockBaseRestante,
    this.activo,
    this.observaciones,
  });

  /// Calcular el costo total de esta entrada
  double get costoTotal {
    if ((costoPorUnidadControl ?? 0) > 0) {
      return (costoPorUnidadControl ?? 0) * (cantidadUnidades ?? 1);
    }
    if ((costoUnitarioBase ?? 0) > 0 && (contenidoPorUnidad ?? 0) > 0) {
      return (costoUnitarioBase ?? 0) * (contenidoPorUnidad ?? 0) * (cantidadUnidades ?? 1);
    }
    return 0;
  }

  /// Verificar si la entrada está vigente (tiene stock y está activa)
  bool get esVigente => (activo ?? false) && (stockBaseRestante ?? 0) > 0;

  /// Verificar si la entrada está finalizada
  bool get esFinalizada => !esVigente;

  factory EntradaInventarioModel.fromJson(Map<String, dynamic> json) {
    return EntradaInventarioModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? ''),
      productId: json['product']?['id'] ?? json['productId'] ?? 0,
      productName: _asString(json['product']?['name'] ?? json['productName']),
      productCategory: _asString(json['product']?['typeFood']?['name'] ?? json['productCategory']),
      providerName: _asString(json['provider']?['name'] ?? json['providerName']),
      codigoLote: _asString(json['codigoLote']),
      fechaIngreso: _asString(json['fechaIngreso']),
      fechaVencimiento: _asString(json['fechaVencimiento']),
      unidadControl: _asString(json['unidadControl']),
      contenidoPorUnidad: _parseDouble(json['contenidoPorUnidad']),
      cantidadUnidades: _parseDouble(json['cantidadUnidades']),
      costoUnitarioBase: _parseDouble(json['costoUnitarioBase']),
      costoPorUnidadControl: _parseDouble(json['costoPorUnidadControl']),
      stockUnidadesRestantes: _parseDouble(json['stockUnidadesRestantes']),
      stockBaseRestante: _parseDouble(json['stockBaseRestante']),
      activo: json['activo'] is bool ? json['activo'] : (json['activo']?.toString() == 'true'),
      observaciones: _asString(json['observaciones']),
    );
  }

  static double? _parseDouble(dynamic value) {
    if (value == null) return null;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    return double.tryParse(value.toString());
  }

  static String? _asString(dynamic value) {
    if (value == null) return null;
    if (value is String) return value;
    if (value is List) {
      try {
        return value.join(', ');
      } catch (_) {
        return value.toString();
      }
    }
    return value.toString();
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'productId': productId,
      'codigoLote': codigoLote,
      'fechaIngreso': fechaIngreso,
      'fechaVencimiento': fechaVencimiento,
      'unidadControl': unidadControl,
      'contenidoPorUnidadBase': contenidoPorUnidad,
      'cantidadUnidades': cantidadUnidades,
      'costoUnitarioBase': costoUnitarioBase,
      'costoPorUnidadControl': costoPorUnidadControl,
      'observaciones': observaciones,
    };
  }
}

/// Modelo para el stock real por producto (FEFO)
class StockRealProducto {
  final int productId;
  final String nombre;
  final String? categoria;
  final String? animal;
  final double stockDisponible;
  final double nivelMinimo;
  final double nivelMaximo;
  final String unidadMedida;
  final bool? activo;

  StockRealProducto({
    required this.productId,
    required this.nombre,
    this.categoria,
    this.animal,
    required this.stockDisponible,
    required this.nivelMinimo,
    required this.nivelMaximo,
    required this.unidadMedida,
    this.activo,
  });

  /// Calcular el porcentaje de progreso respecto al nivel máximo
  double get progreso {
    if (nivelMaximo > 0) {
      final pct = (stockDisponible / nivelMaximo) * 100;
      return pct.clamp(0, 100);
    }
    // Fallback suave si no hay nivel máximo configurado
    // Evita 100% por defecto y muestra relación frente a (stock + nivelMinimo)
    final denom = (nivelMinimo > 0) ? (nivelMinimo * 2) : (stockDisponible > 0 ? stockDisponible : 1);
    final pct = (stockDisponible / denom) * 100;
    return pct.clamp(0, 100);
  }

  /// Estado del stock
  String get estado {
    if (stockDisponible <= 0) return 'agotado';
    if (stockDisponible <= nivelMinimo) return 'critico';
    return 'normal';
  }

  factory StockRealProducto.fromJson(Map<String, dynamic> json) {
    return StockRealProducto(
      productId: json['id'] ?? json['productId'] ?? 0,
      nombre: json['name'] ?? json['nombre'] ?? '',
      categoria: json['typeFood']?['name'] ?? json['categoria'],
      animal: json['animal']?['name'] ?? json['animal'],
      stockDisponible: _parseDouble(json['stockDisponible'] ?? json['quantity']) ?? 0,
      nivelMinimo: _parseDouble(json['level_min'] ?? json['nivelMinimo']) ?? 0,
      nivelMaximo: _parseDouble(json['level_max'] ?? json['nivelMaximo']) ?? 0,
      unidadMedida: json['unitMeasurement']?['name'] ?? json['unidadMedida'] ?? 'kg',
      activo: json['active'] as bool?,
    );
  }

  static double? _parseDouble(dynamic value) {
    if (value == null) return null;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    return double.tryParse(value.toString());
  }
}

/// Modelo para inversión por producto
class InversionProducto {
  final int productId;
  final String nombre;
  final String? categoria;
  final double compraInicial; // price_unit del producto
  final double costoEntradas; // suma de costos de entradas
  final int cantidadEntradas;

  InversionProducto({
    required this.productId,
    required this.nombre,
    this.categoria,
    required this.compraInicial,
    required this.costoEntradas,
    required this.cantidadEntradas,
  });

  double get inversionTotal => compraInicial + costoEntradas;
}
