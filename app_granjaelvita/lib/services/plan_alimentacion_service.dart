import '../api_client.dart';
import '../config.dart';

class PlanAlimentacionServiceMobile {
  final ApiClient _api = ApiClient(baseUrl: apiBaseUrl);
  Future<Map<String, dynamic>> registrarConsumo({
    required String loteId,
    required double cantidadKg,
    String? nombreProducto,
    String? observaciones,
  }) async {
    final body = {
      'loteId': loteId,
      'cantidadKg': cantidadKg,
      if (nombreProducto != null && nombreProducto.trim().isNotEmpty) 'nombreProducto': nombreProducto.trim(),
      if (observaciones != null && observaciones.trim().isNotEmpty) 'observaciones': observaciones.trim(),
    };
    final res = await _api.post('/api/plan-alimentacion/registrar-consumo', body);
    return res is Map<String, dynamic> ? res : {'success': true, 'data': res};
  }
}
