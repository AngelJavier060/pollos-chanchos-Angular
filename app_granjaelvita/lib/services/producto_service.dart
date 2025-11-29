import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config.dart';
import '../models/producto_model.dart';
import '../models/tipo_alimento_model.dart';
import '../models/subcategoria_inventario_model.dart';
import '../models/stage_model.dart';
import '../models/unidad_medida_model.dart';
import '../models/proveedor_model.dart';
import '../models/animal_model.dart';
import 'auth_service.dart';

class ProductoService {
  static const String _endpoint = '/api/inventario/productos';
  static const String _fallbackEndpoint = '/api/inventario-producto';

  static Map<String, String> _buildHeaders() {
    final token = AuthService.token;
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer ' + token;
    }
    return headers;
  }

  /// Obtiene todos los productos
  static Future<List<ProductoModel>> listarProductos() async {
    try {
      // 1) Intentar el endpoint móvil principal (/api/inventario/productos)
      final primaryUrl = Uri.parse('$apiBaseUrl$_endpoint');
      final primaryResponse = await http.get(primaryUrl, headers: _buildHeaders());

      if (primaryResponse.statusCode == 200) {
        final List<dynamic> data = json.decode(primaryResponse.body);
        return data.map((json) => ProductoModel.fromJson(json)).toList();
      }

      // 2) Si en producción el endpoint aún no existe (404), usar fallback
      if (primaryResponse.statusCode == 404) {
        final fallbackUrl = Uri.parse('$apiBaseUrl$_fallbackEndpoint');
        final fallbackResponse = await http.get(fallbackUrl, headers: _buildHeaders());

        if (fallbackResponse.statusCode == 200) {
          final List<dynamic> data = json.decode(fallbackResponse.body);
          return data
              .map<ProductoModel?>(_fromInventarioProductoJson)
              .whereType<ProductoModel>()
              .toList();
        } else if (fallbackResponse.statusCode == 401) {
          throw Exception('No autorizado (401). Vuelva a iniciar sesión.');
        } else {
          throw Exception('Error al cargar productos (fallback): ${fallbackResponse.statusCode}');
        }
      }

      if (primaryResponse.statusCode == 401) {
        throw Exception('No autorizado (401). Vuelva a iniciar sesión.');
      }

      throw Exception('Error al cargar productos: ${primaryResponse.statusCode}');
    } catch (e) {
      throw Exception('Error de conexión: $e');
    }
  }

  /// Mapea la respuesta de /api/inventario-producto (InventarioProducto + Product)
  /// al modelo unificado ProductoModel usado en Flutter.
  static ProductoModel? _fromInventarioProductoJson(dynamic jsonRaw) {
    if (jsonRaw is! Map<String, dynamic>) return null;
    final Map<String, dynamic> json = jsonRaw;

    final dynamic productRaw = json['product'];
    if (productRaw is! Map<String, dynamic>) return null;
    final Map<String, dynamic> product = productRaw;

    String _mapAnimalTipo(String? name) {
      if (name == null) return 'ambos';
      final n = name.toLowerCase();
      if (n.contains('pollo') || n.contains('ave') || n.contains('broiler')) return 'pollos';
      if (n.contains('chancho') || n.contains('cerdo') || n.contains('porcino')) return 'chanchos';
      return 'ambos';
    }

    final animal = product['animal'] as Map<String, dynamic>?;
    final typeFood = product['typeFood'] as Map<String, dynamic>?;
    final unitMeasurement = product['unitMeasurement'] as Map<String, dynamic>?;
    final provider = product['provider'] as Map<String, dynamic>?;
    final stage = product['stage'] as Map<String, dynamic>?;
    final subcategory = product['subcategory'] as Map<String, dynamic>?;

    String unidadMedida = '';
    final dynamic unidadJson = json['unidadMedida'];
    if (unidadJson is String && unidadJson.isNotEmpty) {
      unidadMedida = unidadJson;
    } else if (unitMeasurement != null) {
      final shortName = unitMeasurement['name_short'] as String?;
      final name = unitMeasurement['name'] as String?;
      if (shortName != null && shortName.trim().isNotEmpty) {
        unidadMedida = shortName;
      } else if (name != null && name.trim().isNotEmpty) {
        unidadMedida = name;
      }
    }
    if (unidadMedida.isEmpty) {
      unidadMedida = 'unidad';
    }

    double _toDouble(dynamic value) {
      if (value == null) return 0.0;
      if (value is num) return value.toDouble();
      return double.tryParse(value.toString()) ?? 0.0;
    }

    final double cantidadActual = _toDouble(json['cantidadStock'] ?? product['quantity']);

    return ProductoModel(
      id: product['id']?.toString(),
      nombre: (product['name'] ?? '') as String,
      descripcion: product['description'] as String?,
      animalTipo: _mapAnimalTipo(animal != null ? animal['name'] as String? : null),
      animalId: animal != null ? (animal['id'] as num?)?.toInt() : null,
      providerId: provider != null ? (provider['id'] as num?)?.toInt() : null,
      typeFoodId: typeFood != null ? (typeFood['id'] as num?)?.toInt() : null,
      unitMeasurementId: unitMeasurement != null ? (unitMeasurement['id'] as num?)?.toInt() : null,
      stageId: stage != null ? (stage['id'] as num?)?.toInt() : null,
      subcategoryId: subcategory != null ? (subcategory['id'] as num?)?.toInt() : null,
      categoriaPrincipal: (typeFood != null ? (typeFood['name'] ?? '') : '') as String,
      subcategoria: subcategory != null ? subcategory['name'] as String? : null,
      etapaAplicacion: product['name_stage'] as String?,
      unidadMedida: unidadMedida,
      cantidadActual: cantidadActual,
      nivelMinimo: _toDouble(product['level_min']),
      nivelMaximo: product['level_max'] != null ? _toDouble(product['level_max']) : null,
      usoPrincipal: product['usoPrincipal'] as String?,
      dosisRecomendada: product['dosisRecomendada'] as String?,
      viaAplicacion: product['viaAdministracion'] as String?,
      precioUnitario: _toDouble(product['price_unit']),
      fechaCompra: product['date_compra']?.toString(),
      proveedor: provider != null ? provider['name'] as String? : null,
      numeroFactura: product['number_facture']?.toString(),
      fechaVencimiento: product['fechaVencimiento']?.toString(),
      loteFabricante: null,
      incluirEnBotiquin: product['incluirEnBotiquin'] as bool?,
      tiempoRetiro: (product['tiempoRetiro'] as num?)?.toInt(),
      observacionesMedicas: product['observacionesMedicas'] as String?,
      presentacion: product['presentacion'] as String?,
      infoNutricional: product['infoNutricional'] as String?,
    );
  }

  /// Crea un nuevo producto
  static Future<ProductoModel> crearProducto(ProductoModel producto) async {
    try {
      final url = Uri.parse('$apiBaseUrl$_endpoint');
      final jsonData = producto.toJson();
      print('========== ENVIANDO PRODUCTO AL BACKEND ==========');
      print('JSON a enviar: ${json.encode(jsonData)}');
      print('animalId: ${jsonData['animalId']}');
      print('providerId: ${jsonData['providerId']}');
      print('typeFoodId: ${jsonData['typeFoodId']}');
      print('unitMeasurementId: ${jsonData['unitMeasurementId']}');
      print('stageId: ${jsonData['stageId']}');
      print('infoNutricional: ${jsonData['infoNutricional']}');
      
      final response = await http.post(
        url,
        headers: _buildHeaders(),
        body: json.encode(jsonData),
      );
      
      print('Response status: ${response.statusCode}');
      print('Response body: ${response.body}');

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = json.decode(response.body);
        return ProductoModel.fromJson(data);
      } else {
        throw Exception('Error al crear producto: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error de conexión: $e');
    }
  }

  /// Actualiza un producto existente
  static Future<ProductoModel> actualizarProducto(
      String id, ProductoModel producto) async {
    try {
      final url = Uri.parse('$apiBaseUrl$_endpoint/$id');
      final response = await http.put(
        url,
        headers: _buildHeaders(),
        body: json.encode(producto.toJson()),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return ProductoModel.fromJson(data);
      } else {
        throw Exception('Error al actualizar producto: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error de conexión: $e');
    }
  }

  /// Elimina un producto
  static Future<void> eliminarProducto(String id) async {
    try {
      final url = Uri.parse('$apiBaseUrl$_endpoint/$id');
      final response = await http.delete(
        url,
        headers: _buildHeaders(),
      );

      if (response.statusCode != 200 && response.statusCode != 204) {
        throw Exception('Error al eliminar producto: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error de conexión: $e');
    }
  }

  /// Obtiene un producto por ID
  static Future<ProductoModel> obtenerProducto(String id) async {
    try {
      final url = Uri.parse('$apiBaseUrl$_endpoint/$id');
      final response = await http.get(
        url,
        headers: _buildHeaders(),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return ProductoModel.fromJson(data);
      } else {
        throw Exception('Error al obtener producto: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error de conexión: $e');
    }
  }

  static Future<List<TipoAlimentoModel>> listarTiposAlimento() async {
    try {
      final url = Uri.parse('$apiBaseUrl/api/typefood');
      final response = await http.get(url, headers: _buildHeaders());

      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        return data
            .map((json) => TipoAlimentoModel.fromJson(json))
            .toList();
      } else if (response.statusCode == 401) {
        throw Exception('No autorizado (401) al cargar categorías. Vuelva a iniciar sesión.');
      } else {
        throw Exception('Error al cargar categorías: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error de conexión al cargar categorías: $e');
    }
  }

  static Future<List<SubcategoriaInventarioModel>> listarSubcategoriasPorTipo(
      int typeFoodId) async {
    try {
      final url =
          Uri.parse('$apiBaseUrl/api/subcategory/by-category/$typeFoodId');
      final response = await http.get(url, headers: _buildHeaders());

      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        return data
            .map((json) => SubcategoriaInventarioModel.fromJson(json))
            .toList();
      } else if (response.statusCode == 401) {
        throw Exception('No autorizado (401) al cargar subcategorías. Vuelva a iniciar sesión.');
      } else {
        throw Exception('Error al cargar subcategorías: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error de conexión al cargar subcategorías: $e');
    }
  }

  static Future<List<StageModel>> listarEtapas() async {
    try {
      final url = Uri.parse('$apiBaseUrl/api/stage');
      final response = await http.get(url, headers: _buildHeaders());

      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        return data.map((json) => StageModel.fromJson(json)).toList();
      } else if (response.statusCode == 401) {
        throw Exception(
            'No autorizado (401) al cargar etapas. Vuelva a iniciar sesión.');
      } else {
        throw Exception('Error al cargar etapas: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error de conexión al cargar etapas: $e');
    }
  }

  static Future<List<UnidadMedidaModel>> listarUnidadesMedida() async {
    try {
      final url = Uri.parse('$apiBaseUrl/api/unitmeasurement');
      final response = await http.get(url, headers: _buildHeaders());

      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        return data.map((json) => UnidadMedidaModel.fromJson(json)).toList();
      } else if (response.statusCode == 401) {
        throw Exception(
            'No autorizado (401) al cargar unidades de medida. Vuelva a iniciar sesión.');
      } else {
        throw Exception(
            'Error al cargar unidades de medida: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error de conexión al cargar unidades de medida: $e');
    }
  }

  static Future<List<ProveedorModel>> listarProveedores() async {
    try {
      final url = Uri.parse('$apiBaseUrl/api/provider');
      final response = await http.get(url, headers: _buildHeaders());

      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        return data.map((json) => ProveedorModel.fromJson(json)).toList();
      } else if (response.statusCode == 401) {
        throw Exception(
            'No autorizado (401) al cargar proveedores. Vuelva a iniciar sesión.');
      } else {
        throw Exception('Error al cargar proveedores: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error de conexión al cargar proveedores: $e');
    }
  }

  static Future<List<AnimalModel>> listarAnimales() async {
    try {
      final url = Uri.parse('$apiBaseUrl/api/animal');
      final response = await http.get(url, headers: _buildHeaders());

      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        return data.map((json) => AnimalModel.fromJson(json)).toList();
      } else if (response.statusCode == 401) {
        throw Exception(
            'No autorizado (401) al cargar animales. Vuelva a iniciar sesión.');
      } else {
        throw Exception('Error al cargar animales: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error de conexión al cargar animales: $e');
    }
  }
}
