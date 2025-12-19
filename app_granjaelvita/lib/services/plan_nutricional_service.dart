import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config.dart';
import 'auth_service.dart';

/// Modelo de etapa del plan nutricional
class EtapaNutricional {
  final int? id;
  final String nombre;
  final String planNombre;
  final int diasMin;
  final int diasMax;
  final String alimentoRecomendado;
  final double cantidadPorAnimal;
  final String unidad;
  final int? productoId;
  final String? productoNombre;
  
  /// Estado de selección para el modal (mutable)
  bool seleccionado;

  EtapaNutricional({
    this.id,
    required this.nombre,
    required this.planNombre,
    required this.diasMin,
    required this.diasMax,
    required this.alimentoRecomendado,
    required this.cantidadPorAnimal,
    this.unidad = 'kg',
    this.productoId,
    this.productoNombre,
    this.seleccionado = false,
  });

  factory EtapaNutricional.fromMap(Map<String, dynamic> m) {
    final diasEdad = m['diasEdad'] as Map<String, dynamic>? ?? {};
    final consumo = m['consumoDiario'] as Map<String, dynamic>? ?? {};
    final producto = m['producto'] as Map<String, dynamic>?;
    
    // Calcular cantidad por animal (en kg)
    double cantidadKg = 0;
    if (m['quantityPerAnimal'] != null) {
      cantidadKg = double.tryParse(m['quantityPerAnimal'].toString()) ?? 0;
    } else if (consumo['min'] != null) {
      // Convertir de gramos a kg
      cantidadKg = (double.tryParse(consumo['min'].toString()) ?? 0) / 1000;
    }
    
    return EtapaNutricional(
      id: int.tryParse((m['id'] ?? '').toString()),
      nombre: m['nombre']?.toString() ?? '',
      planNombre: m['planNombre']?.toString() ?? '',
      diasMin: int.tryParse((diasEdad['min'] ?? '0').toString()) ?? 0,
      diasMax: int.tryParse((diasEdad['max'] ?? '0').toString()) ?? 0,
      alimentoRecomendado: producto?['name']?.toString() ?? m['tipoAlimento']?.toString() ?? '',
      cantidadPorAnimal: double.parse(cantidadKg.toStringAsFixed(3)),
      unidad: 'kg',
      productoId: int.tryParse((producto?['id'] ?? '').toString()),
      productoNombre: producto?['name']?.toString(),
    );
  }

  /// Verifica si el día actual está dentro de esta etapa
  bool contieneD(int dias) => dias >= diasMin && dias <= diasMax;

  /// Rango visual (ej: "1-30 días")
  String get rangoTexto => '$diasMin-$diasMax días';
}

/// Modelo del plan nutricional activo
class PlanNutricionalActivo {
  final String nombre;
  final String tipoAnimal;
  final List<EtapaNutricional> etapas;

  PlanNutricionalActivo({
    required this.nombre,
    required this.tipoAnimal,
    required this.etapas,
  });

  factory PlanNutricionalActivo.fromMap(Map<String, dynamic> m) {
    final etapasList = (m['etapas'] as List<dynamic>?) ?? [];
    return PlanNutricionalActivo(
      nombre: m['nombre']?.toString() ?? m['name']?.toString() ?? '',
      tipoAnimal: m['tipoAnimal']?.toString() ?? '',
      etapas: etapasList
          .map((e) => EtapaNutricional.fromMap(e as Map<String, dynamic>))
          .toList(),
    );
  }

  /// Obtener las etapas que aplican para un día específico
  List<EtapaNutricional> etapasParaDia(int dias) {
    return etapas.where((e) => e.contieneD(dias)).toList();
  }

  /// Obtener todas las etapas del mismo rango principal
  List<EtapaNutricional> etapasDelRangoPrincipal(int dias) {
    // 1) Regla principal: devolver TODAS las etapas que contienen el día
    //    (esto cubre el caso de múltiples opciones en el mismo rango, p.ej. 180-365)
    final porDia = etapasParaDia(dias);
    if (porDia.isNotEmpty) return porDia;

    // 2) Si no hay coincidencias exactas por día, intentar agrupar por nombre del plan
    //    Encontrar una etapa de referencia (la que contenga el día o la primera disponible)
    final etapaActual = etapas.firstWhere(
      (e) => e.contieneD(dias),
      orElse: () => etapas.isNotEmpty
          ? etapas.first
          : EtapaNutricional(
              nombre: '', planNombre: '', diasMin: 0, diasMax: 0,
              alimentoRecomendado: '', cantidadPorAnimal: 0,
            ),
    );

    // Extraer rango del nombre del plan (ej: "Plan 1-30" -> min=1, max=30)
    final rango = _extraerRangoDeNombre(etapaActual.planNombre);
    if (rango != null) {
      // Filtrar todas las etapas que pertenecen a ese rango detectado
      return etapas.where((e) {
        final r = _extraerRangoDeNombre(e.planNombre);
        if (r != null) return r['min'] == rango['min'] && r['max'] == rango['max'];
        return e.diasMin >= rango['min']! && e.diasMax <= rango['max']!;
      }).toList();
    }

    // 3) Fallback final: agrupar por los mismos límites min/max exactos
    return etapas.where((e) => e.diasMin == etapaActual.diasMin && e.diasMax == etapaActual.diasMax).toList();
  }

  Map<String, int>? _extraerRangoDeNombre(String? nombre) {
    if (nombre == null || nombre.isEmpty) return null;
    final regex = RegExp(r'(\d+)\s*(?:-|–|—|al|a)\s*(\d+)', caseSensitive: false);
    final match = regex.firstMatch(nombre.toLowerCase());
    if (match != null) {
      final min = int.tryParse(match.group(1) ?? '');
      final max = int.tryParse(match.group(2) ?? '');
      if (min != null && max != null && min > 0 && max >= min) {
        return {'min': min, 'max': max};
      }
    }
    return null;
  }
}

/// Servicio para obtener planes nutricionales del backend
class PlanNutricionalService {
  /// Headers con autenticación
  static Future<Map<String, String>> _getHeaders() async {
    if (AuthService.token == null || AuthService.token!.isEmpty) {
      await AuthService.loadSavedSession();
    }
    final token = AuthService.token;
    if (token == null || token.isEmpty) {
      throw Exception('No hay sesión activa. Por favor, inicie sesión nuevamente.');
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  /// GET genérico
  Future<dynamic> _get(String path) async {
    final headers = await _getHeaders();
    final url = Uri.parse('$apiBaseUrl$path');
    final response = await http.get(url, headers: headers);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return response.body.isNotEmpty ? json.decode(response.body) : null;
    }
    if (response.statusCode == 401) {
      throw Exception('Sesión expirada. Por favor, inicie sesión nuevamente.');
    }
    throw Exception('Error ${response.statusCode}');
  }

  /// Obtener plan nutricional activo para un tipo de animal (pollos/chanchos)
  Future<PlanNutricionalActivo?> obtenerPlanActivo(String tipoAnimal) async {
    // 1) Intentar endpoint integrado (si existe en el backend)
    try {
      final data = await _get('/api/plan-nutricional/integrado/$tipoAnimal');
      if (data != null && data is Map<String, dynamic>) {
        return PlanNutricionalActivo.fromMap(data);
      }
    } catch (_) {
      // ignorar y usar fallback integrado en cliente
    }

    // 2) Fallback robusto: construir plan integrado desde endpoints reales del Admin
    try {
      final planes = await _get('/api/plan-alimentacion') as List<dynamic>;
      // Filtrar por tipo de animal similar a Angular (por id y por nombres)
      final planesFiltrados = planes.where((p) => _esPlanDelTipo(p as Map<String, dynamic>, tipoAnimal)).toList();
      if (planesFiltrados.isEmpty) return null;

      // Obtener detalles de TODOS los planes del tipo
      final etapas = <EtapaNutricional>[];
      for (final p in planesFiltrados) {
        final plan = p as Map<String, dynamic>;
        final planId = plan['id'];
        if (planId == null) continue;
        try {
          final detalles = await _get('/api/plan-alimentacion/$planId/detalles') as List<dynamic>;
          for (final d in detalles) {
            final detalle = d as Map<String, dynamic>;
            // Mapear al modelo EtapaNutricional igual que Angular
            final producto = detalle['product'] as Map<String, dynamic>?;
            final dayStart = int.tryParse((detalle['dayStart'] ?? '').toString()) ?? 0;
            final dayEnd = int.tryParse((detalle['dayEnd'] ?? '').toString()) ?? 0;
            final qty = double.tryParse((detalle['quantityPerAnimal'] ?? '0').toString()) ?? 0.0;

            etapas.add(
              EtapaNutricional(
                id: int.tryParse((detalle['id'] ?? '').toString()),
                nombre: 'Etapa $dayStart-$dayEnd',
                planNombre: (plan['name'] ?? '').toString(),
                diasMin: dayStart,
                diasMax: dayEnd,
                alimentoRecomendado: (producto?['name'] ?? '').toString(),
                cantidadPorAnimal: double.parse(qty.toStringAsFixed(3)),
                unidad: 'kg',
                productoId: int.tryParse((producto?['id'] ?? '').toString()),
                productoNombre: (producto?['name'] ?? '').toString(),
              ),
            );
          }
        } catch (_) {
          // continuar con los demás planes
        }
      }

      if (etapas.isEmpty) return null;
      return PlanNutricionalActivo(
        nombre: 'Plan Integrado ${tipoAnimal[0].toUpperCase()}${tipoAnimal.substring(1)}',
        tipoAnimal: tipoAnimal,
        etapas: etapas,
      );
    } catch (_) {
      return null;
    }
  }

  bool _esPlanDelTipo(Map<String, dynamic> plan, String tipoAnimal) {
    final nombreAnimal = (plan['animalName'] ?? '').toString().toLowerCase();
    final objetoAnimal = ((plan['animal'] as Map<String, dynamic>?)?['name'] ?? '').toString().toLowerCase();
    final nombrePlan = (plan['name'] ?? '').toString().toLowerCase();
    final descripcion = (plan['description'] ?? '').toString().toLowerCase();

    final idAnimalRaw = (plan['animal'] as Map<String, dynamic>?)?['id'] ?? plan['animalId'];
    final idAnimalNum = int.tryParse(idAnimalRaw?.toString() ?? '');
    if (idAnimalNum != null) {
      if (tipoAnimal == 'pollos' && idAnimalNum == 1) return true;
      if (tipoAnimal == 'chanchos' && idAnimalNum == 2) return true;
    }

    final terminosPollos = ['pollo', 'pollos', 'ave', 'aves', 'gallina', 'gallinas'];
    final terminosChanchos = ['chancho', 'chanchos', 'cerdo', 'cerdos', 'porcino', 'porcinos'];
    final terminos = tipoAnimal == 'pollos' ? terminosPollos : terminosChanchos;

    final fuente = '$nombreAnimal $objetoAnimal $nombrePlan $descripcion';
    final fuenteNorm = fuente.toLowerCase();
    return terminos.any((t) => fuenteNorm.contains(t));
  }

  /// Obtener stock válido agrupado por producto (FEFO)
  Future<Map<int, double>> obtenerStockValido() async {
    try {
      final data = await _get('/api/inventario-entradas/stock-valido');
      if (data != null && data is Map<String, dynamic>) {
        final result = <int, double>{};
        data.forEach((key, value) {
          final id = int.tryParse(key);
          final stock = double.tryParse(value.toString()) ?? 0;
          if (id != null) result[id] = stock;
        });
        return result;
      }
    } catch (_) {}
    return {};
  }

  /// Registrar consumo de alimento (deducción automática de inventario)
  Future<Map<String, dynamic>> registrarConsumo({
    required String loteId,
    required double cantidadKg,
    String? nombreProducto,
    int? productoId,
    String? observaciones,
  }) async {
    final headers = await _getHeaders();
    final url = Uri.parse('$apiBaseUrl/api/plan-alimentacion/registrar-consumo');
    
    final body = <String, dynamic>{
      'loteId': loteId,
      'cantidadKg': cantidadKg,
    };
    if (nombreProducto != null && nombreProducto.trim().isNotEmpty) {
      body['nombreProducto'] = nombreProducto.trim();
    }
    if (productoId != null) {
      body['productId'] = productoId;
    }
    if (observaciones != null && observaciones.trim().isNotEmpty) {
      body['observaciones'] = observaciones.trim();
    }

    final response = await http.post(url, headers: headers, body: json.encode(body));
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final data = response.body.isNotEmpty ? json.decode(response.body) : {};
      return data is Map<String, dynamic> ? data : {'success': true, 'data': data};
    }
    if (response.statusCode == 401) {
      throw Exception('Sesión expirada. Por favor, inicie sesión nuevamente.');
    }
    throw Exception('Error al registrar consumo: ${response.statusCode}');
  }

  /// Registrar mortalidad
  Future<Map<String, dynamic>> registrarMortalidad({
    required String loteId,
    required int cantidad,
    String? causa,
    String? observaciones,
  }) async {
    final headers = await _getHeaders();
    final url = Uri.parse('$apiBaseUrl/api/mortalidad');
    
    final body = <String, dynamic>{
      'loteId': loteId,
      'cantidad': cantidad,
      if (causa != null && causa.trim().isNotEmpty) 'causa': causa.trim(),
      if (observaciones != null) 'observaciones': observaciones,
    };

    final response = await http.post(url, headers: headers, body: json.encode(body));
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final data = response.body.isNotEmpty ? json.decode(response.body) : {};
      return data is Map<String, dynamic> ? data : {'success': true};
    }
    throw Exception('Error al registrar mortalidad: ${response.statusCode}');
  }

  /// Registrar morbilidad (enfermo)
  Future<Map<String, dynamic>> registrarMorbilidad({
    required String loteId,
    required int cantidad,
    String? sintomas,
    String? tratamiento,
    String? observaciones,
  }) async {
    final headers = await _getHeaders();
    final url = Uri.parse('$apiBaseUrl/api/morbilidad');
    
    final body = <String, dynamic>{
      'loteId': loteId,
      'cantidad': cantidad,
      if (sintomas != null) 'sintomas': sintomas,
      if (tratamiento != null) 'tratamiento': tratamiento,
      if (observaciones != null) 'observaciones': observaciones,
    };

    final response = await http.post(url, headers: headers, body: json.encode(body));
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final data = response.body.isNotEmpty ? json.decode(response.body) : {};
      return data is Map<String, dynamic> ? data : {'success': true};
    }
    throw Exception('Error al registrar morbilidad: ${response.statusCode}');
  }

  /// Obtener causas de mortalidad
  Future<List<Map<String, dynamic>>> obtenerCausasMortalidad() async {
    try {
      final data = await _get('/api/mortalidad/causas');
      if (data != null && data is List) {
        return data.map((e) => e as Map<String, dynamic>).toList();
      }
    } catch (_) {}
    // Fallback: causas por defecto
    return [
      {'id': 1, 'nombre': 'Enfermedad', 'color': '#F44336'},
      {'id': 2, 'nombre': 'Ahogamiento', 'color': '#2196F3'},
      {'id': 3, 'nombre': 'Ataque de animales', 'color': '#FF9800'},
      {'id': 4, 'nombre': 'Desconocida', 'color': '#9E9E9E'},
      {'id': 5, 'nombre': 'Otro', 'color': '#607D8B'},
    ];
  }

  /// Contar mortalidad total por lote
  Future<int> contarMortalidadPorLote(String loteId) async {
    try {
      final data = await _get('/api/mortalidad/lote/$loteId/total');
      return int.tryParse(data?.toString() ?? '0') ?? 0;
    } catch (_) {
      return 0;
    }
  }

  /// Contar enfermos activos por lote
  Future<int> contarEnfermosPorLote(String loteId) async {
    try {
      final data = await _get('/api/morbilidad/lote/$loteId/activos');
      if (data is Map<String, dynamic>) {
        return int.tryParse(data['enfermosActivos']?.toString() ?? '0') ?? 0;
      }
      return int.tryParse(data?.toString() ?? '0') ?? 0;
    } catch (_) {
      return 0;
    }
  }

  /// Registrar en historial de alimentación (PlanEjecucion debug)
  /// Equivalente al servicio Angular AlimentacionService.registrarAlimentacion
  Future<void> registrarAlimentacionHistorial({
    required String loteId,
    required double cantidadAplicada,
    required int animalesVivos,
    required int animalesMuertos,
    String? observaciones,
    DateTime? fecha,
  }) async {
    final headers = await _getHeaders();
    final url = Uri.parse('$apiBaseUrl/api/plan-ejecucion/debug/registrar-alimentacion');
    final hoy = fecha ?? DateTime.now();
    final fechaStr = '${hoy.year.toString().padLeft(4, '0')}-${hoy.month.toString().padLeft(2, '0')}-${hoy.day.toString().padLeft(2, '0')}';

    final body = <String, dynamic>{
      'loteId': loteId,
      'fecha': fechaStr,
      'cantidadAplicada': double.parse(cantidadAplicada.toStringAsFixed(3)),
      'animalesVivos': animalesVivos,
      'animalesMuertos': animalesMuertos,
      'observaciones': (observaciones ?? '').trim(),
    };

    await http.post(url, headers: headers, body: json.encode(body));
  }

  /// Obtener historial de alimentación
  Future<List<dynamic>> obtenerHistorialAlimentacion(String fechaInicio, String fechaFin) async {
    try {
      final data = await _get('/api/plan-ejecucion/debug/historial?fechaInicio=$fechaInicio&fechaFin=$fechaFin');
      if (data is List) {
        // Importamos el modelo directamente aquí para evitar dependencias circulares
        return data.map((item) {
          if (item is Map<String, dynamic>) {
            return _parseRegistroAlimentacion(item);
          }
          return item;
        }).toList();
      }
      return [];
    } catch (e) {
      print('Error obteniendo historial: $e');
      return [];
    }
  }

  /// Parsear registro de alimentación del historial
  dynamic _parseRegistroAlimentacion(Map<String, dynamic> json) {
    // Retornamos un mapa con los campos normalizados
    String jornada = 'N/A';
    try {
      final fechaCreacion = json['createDate'] ?? '';
      if (fechaCreacion.toString().isNotEmpty) {
        final dt = DateTime.parse(fechaCreacion.toString());
        jornada = dt.hour < 12 ? 'Mañana' : 'Tarde';
      }
    } catch (_) {}

    final obs = json['observations'] ?? '';
    String loteNombre = json['loteDescripcion'] ?? '';
    if (loteNombre.isEmpty || loteNombre == 'Lote sin descripción') {
      final match = RegExp(r'Lote:\s*([^(|]+)').firstMatch(obs.toString());
      if (match != null) loteNombre = match.group(1)?.trim() ?? '';
    }

    return {
      'id': json['id'] ?? 0,
      'fecha': json['executionDate'] ?? '',
      'fechaCreacion': json['createDate'] ?? '',
      'loteId': json['loteId'] ?? '',
      'loteNombre': loteNombre.isNotEmpty ? loteNombre : 'Sin nombre',
      'loteCodigo': json['loteCodigo'] ?? '',
      'cantidad': (json['quantityApplied'] ?? 0).toDouble(),
      'animalesVivos': json['animalesVivos'],
      'animalesMuertos': json['animalesMuertos'],
      'observaciones': obs,
      'estado': json['status'] ?? 'EJECUTADO',
      'jornada': jornada,
    };
  }
}
