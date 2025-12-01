import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config.dart';
import '../models/entrada_inventario_model.dart';
import 'auth_service.dart';

/// Servicio para gestión de inventario conectado al backend
class InventarioService {
  
  /// Construir headers con autenticación
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

  /// Obtener todos los productos con su stock real (FEFO)
  Future<List<StockRealProducto>> obtenerStockReal() async {
    try {
      // Primero obtenemos los productos
      final productosUrl = Uri.parse('$apiBaseUrl/api/product');
      final productosRes = await http.get(productosUrl, headers: _buildHeaders());
      
      if (productosRes.statusCode == 401) {
        throw Exception('No autorizado (401). Vuelva a iniciar sesión.');
      }
      if (productosRes.statusCode < 200 || productosRes.statusCode >= 300) {
        throw Exception('Error al obtener productos: ${productosRes.statusCode}');
      }
      
      final List<dynamic> productosJson = json.decode(productosRes.body);
      
      // Obtener stock válido agrupado
      Map<String, dynamic> stockMap = {};
      try {
        final stockUrl = Uri.parse('$apiBaseUrl/api/inventario-entradas/stock-valido');
        final stockRes = await http.get(stockUrl, headers: _buildHeaders());
        
        if (stockRes.statusCode >= 200 && stockRes.statusCode < 300 && stockRes.body.isNotEmpty) {
          final decoded = json.decode(stockRes.body);
          if (decoded is Map<String, dynamic>) {
            stockMap = decoded;
          }
        }
      } catch (_) {
        // Ignorar error de stock-valido, usar quantity del producto
      }
      
      // Obtener todas las entradas para calcular stock original por producto
      Map<int, double> stockOriginalMap = {};
      try {
        final entradas = await obtenerTodasLasEntradas();
        for (final e in entradas) {
          final pid = e.productId;
          final contenido = e.contenidoPorUnidad ?? 0;
          final cantidad = e.cantidadUnidades ?? 0;
          final stockBase = contenido * cantidad;
          stockOriginalMap[pid] = (stockOriginalMap[pid] ?? 0) + stockBase;
        }
      } catch (_) {
        // Ignorar error, usar level_max como fallback
      }
      
      // Combinar productos con su stock real
      final List<StockRealProducto> resultado = [];
      for (final p in productosJson) {
        final productIdStr = p['id']?.toString() ?? '0';
        final productId = int.tryParse(productIdStr) ?? 0;
        final rawStock = stockMap[productIdStr] ?? p['quantity'] ?? 0;
        final stockDisponible = rawStock is num ? rawStock.toDouble() : double.tryParse(rawStock.toString()) ?? 0.0;

        // nivel mínimo/máximo reales del producto
        final nivelMin = (p['level_min'] is num) ? (p['level_min'] as num).toDouble() : double.tryParse(p['level_min']?.toString() ?? '') ?? 0.0;
        double nivelMax = (p['level_max'] is num) ? (p['level_max'] as num).toDouble() : double.tryParse(p['level_max']?.toString() ?? '') ?? 0.0;
        
        // Usar stock original de entradas como nivel máximo para el cálculo de progreso
        // Esto coincide con la lógica del frontend web Angular
        final stockOriginal = stockOriginalMap[productId] ?? 0.0;
        if (stockOriginal > 0) {
          nivelMax = stockOriginal;
        } else if (nivelMax <= 0) {
          // Fallback si no hay entradas ni level_max configurado
          nivelMax = (nivelMin > 0) ? (nivelMin * 3) : (stockDisponible > 0 ? stockDisponible * 1.5 : 100);
        }

        final activo = (p['active'] is bool) ? p['active'] as bool : (p['active']?.toString() == 'true');
        if (activo != true) {
          // Mostrar solo productos activos
          continue;
        }

        resultado.add(StockRealProducto(
          productId: productId,
          nombre: p['name'] ?? '',
          categoria: p['typeFood']?['name'],
          animal: p['animal']?['name'],
          stockDisponible: stockDisponible,
          nivelMinimo: nivelMin,
          nivelMaximo: nivelMax,
          unidadMedida: p['unitMeasurement']?['name'] ?? 'kg',
          activo: activo,
        ));
      }
      
      return resultado;
    } catch (e) {
      rethrow;
    }
  }

  /// Obtener todas las entradas de inventario
  Future<List<EntradaInventarioModel>> obtenerTodasLasEntradas() async {
    try {
      final url = Uri.parse('$apiBaseUrl/api/inventario-entradas/todas');
      final res = await http.get(url, headers: _buildHeaders());
      
      if (res.statusCode == 401) {
        throw Exception('No autorizado (401). Vuelva a iniciar sesión.');
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        throw Exception('Error al obtener entradas: ${res.statusCode}');
      }
      
      final decoded = json.decode(res.body);
      
      // Manejar si viene como lista directa o como objeto con data
      List<dynamic> jsonList;
      if (decoded is List) {
        jsonList = decoded;
      } else if (decoded is Map && decoded['data'] is List) {
        jsonList = decoded['data'];
      } else if (decoded is Map && decoded['content'] is List) {
        jsonList = decoded['content'];
      } else {
        jsonList = [];
      }
      
      return jsonList.map((e) => EntradaInventarioModel.fromJson(e)).toList();
    } catch (e) {
      rethrow;
    }
  }

  /// Obtener entradas por producto
  Future<List<EntradaInventarioModel>> obtenerEntradasPorProducto(int productId) async {
    try {
      final url = Uri.parse('$apiBaseUrl/api/inventario-entradas?productId=$productId');
      final res = await http.get(url, headers: _buildHeaders());
      
      if (res.statusCode == 401) {
        throw Exception('No autorizado (401). Vuelva a iniciar sesión.');
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        throw Exception('Error al obtener entradas: ${res.statusCode}');
      }
      
      final decoded = json.decode(res.body);
      List<dynamic> jsonList;
      if (decoded is List) {
        jsonList = decoded;
      } else if (decoded is Map && decoded['data'] is List) {
        jsonList = decoded['data'];
      } else {
        jsonList = [];
      }
      
      return jsonList.map((e) => EntradaInventarioModel.fromJson(e)).toList();
    } catch (e) {
      rethrow;
    }
  }

  /// Obtener entradas por vencer (en los próximos X días)
  Future<List<EntradaInventarioModel>> obtenerEntradasPorVencer({int dias = 15}) async {
    try {
      final url = Uri.parse('$apiBaseUrl/api/inventario-entradas/por-vencer?dias=$dias');
      final res = await http.get(url, headers: _buildHeaders());
      
      if (res.statusCode == 401) {
        throw Exception('No autorizado (401). Vuelva a iniciar sesión.');
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        throw Exception('Error al obtener entradas por vencer: ${res.statusCode}');
      }
      
      final decoded = json.decode(res.body);
      List<dynamic> jsonList;
      if (decoded is List) {
        jsonList = decoded;
      } else if (decoded is Map && decoded['data'] is List) {
        jsonList = decoded['data'];
      } else {
        jsonList = [];
      }
      
      return jsonList.map((e) => EntradaInventarioModel.fromJson(e)).toList();
    } catch (e) {
      rethrow;
    }
  }

  /// Obtener entradas vencidas
  Future<List<EntradaInventarioModel>> obtenerEntradasVencidas() async {
    try {
      final url = Uri.parse('$apiBaseUrl/api/inventario-entradas/vencidas');
      final res = await http.get(url, headers: _buildHeaders());
      
      if (res.statusCode == 401) {
        throw Exception('No autorizado (401). Vuelva a iniciar sesión.');
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        throw Exception('Error al obtener entradas vencidas: ${res.statusCode}');
      }
      
      final decoded = json.decode(res.body);
      List<dynamic> jsonList;
      if (decoded is List) {
        jsonList = decoded;
      } else if (decoded is Map && decoded['data'] is List) {
        jsonList = decoded['data'];
      } else {
        jsonList = [];
      }
      
      return jsonList.map((e) => EntradaInventarioModel.fromJson(e)).toList();
    } catch (e) {
      rethrow;
    }
  }

  /// Obtener productos con stock bajo (bajo el nivel mínimo)
  Future<List<StockRealProducto>> obtenerProductosStockBajo() async {
    final stockReal = await obtenerStockReal();
    return stockReal.where((p) => p.estado == 'critico' || p.estado == 'agotado').toList();
  }

  /// Calcular inversión por producto
  Future<List<InversionProducto>> calcularInversionPorProducto() async {
    try {
      // Obtener productos
      final productosUrl = Uri.parse('$apiBaseUrl/api/product');
      final productosRes = await http.get(productosUrl, headers: _buildHeaders());
      
      if (productosRes.statusCode == 401) {
        throw Exception('No autorizado (401). Vuelva a iniciar sesión.');
      }
      if (productosRes.statusCode < 200 || productosRes.statusCode >= 300) {
        throw Exception('Error al obtener productos: ${productosRes.statusCode}');
      }
      
      final List<dynamic> productosJson = json.decode(productosRes.body);
      
      // Obtener todas las entradas
      final entradas = await obtenerTodasLasEntradas();
      
      // Calcular inversión por producto
      final List<InversionProducto> resultado = [];
      
      for (final p in productosJson) {
        final activo = (p['active'] is bool) ? p['active'] as bool : (p['active']?.toString() == 'true');
        if (activo != true) continue; // solo activos
        final productId = int.tryParse(p['id']?.toString() ?? '0') ?? 0;
        final priceUnit = (p['price_unit'] ?? 0).toDouble();
        
        // Filtrar entradas de este producto
        final entradasProducto = entradas.where((e) => e.productId == productId).toList();
        
        // Sumar costos de entradas
        final costoEntradas = entradasProducto.fold<double>(0, (sum, e) => sum + e.costoTotal);
        
        // Solo incluir productos con inversión > 0
        if (priceUnit > 0 || costoEntradas > 0 || entradasProducto.isNotEmpty) {
          resultado.add(InversionProducto(
            productId: productId,
            nombre: p['name'] ?? '',
            categoria: p['typeFood']?['name'],
            compraInicial: priceUnit,
            costoEntradas: costoEntradas,
            cantidadEntradas: entradasProducto.length,
          ));
        }
      }
      
      return resultado;
    } catch (e) {
      rethrow;
    }
  }

  /// Crear una nueva entrada de inventario (recarga)
  Future<void> crearEntrada({
    required int productId,
    String? codigoLote,
    String? fechaIngresoIso,
    String? fechaVencimientoIso,
    String? unidadControl,
    double? contenidoPorUnidadBase,
    double? cantidadUnidades,
    String? observaciones,
    int? providerId,
    double? costoUnitarioBase,
    double? costoPorUnidadControl,
  }) async {
    final url = Uri.parse('$apiBaseUrl/api/inventario-entradas');
    final body = <String, dynamic>{
      'productId': productId,
      if (codigoLote != null && codigoLote.isNotEmpty) 'codigoLote': codigoLote,
      if (fechaIngresoIso != null) 'fechaIngreso': fechaIngresoIso,
      if (fechaVencimientoIso != null) 'fechaVencimiento': fechaVencimientoIso,
      if (unidadControl != null && unidadControl.isNotEmpty) 'unidadControl': unidadControl,
      if (contenidoPorUnidadBase != null) 'contenidoPorUnidadBase': contenidoPorUnidadBase,
      if (cantidadUnidades != null) 'cantidadUnidades': cantidadUnidades,
      if (observaciones != null && observaciones.isNotEmpty) 'observaciones': observaciones,
      if (providerId != null) 'providerId': providerId,
      if (costoUnitarioBase != null) 'costoUnitarioBase': costoUnitarioBase,
      if (costoPorUnidadControl != null) 'costoPorUnidadControl': costoPorUnidadControl,
    };

    final res = await http.post(url, headers: _buildHeaders(), body: json.encode(body));
    if (res.statusCode == 401) {
      throw Exception('No autorizado (401). Vuelva a iniciar sesión.');
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('Error al crear entrada: ${res.statusCode}');
    }
  }
}
