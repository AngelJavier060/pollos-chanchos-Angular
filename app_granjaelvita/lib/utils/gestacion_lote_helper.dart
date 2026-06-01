import '../models/gestacion_chancha_model.dart';
import '../services/lote_service.dart';

bool esLoteElegibleGestacion(LoteDto lote) {
  if (!lote.esChancho) return false;
  if (lote.quantity <= 0) return false;
  final hembras = lote.femaleCount ?? 0;
  final proposito = (lote.femalePurpose ?? '').toLowerCase();
  if (hembras > 0) return true;
  if (proposito.contains('reproduc')) return true;
  return lote.quantity > 0;
}

int hembrasVivasEnLote(LoteDto lote) {
  final cantidadViva = lote.quantity.clamp(0, 999999);
  final hembrasRegistradas = (lote.femaleCount ?? 0).clamp(0, 999999);
  if (hembrasRegistradas > 0) {
    return hembrasRegistradas < cantidadViva ? hembrasRegistradas : cantidadViva;
  }
  return cantidadViva;
}

int cuposHembrasLote(LoteDto lote) {
  final hembras = (lote.femaleCount ?? 0).clamp(0, 999999);
  if (hembras > 0) return hembras;
  return hembrasVivasEnLote(lote);
}

String nombreChancha(int numero) => 'Chancha-${numero.toString().padLeft(2, '0')}';

String etiquetaLote(LoteDto lote) {
  final nom = lote.name.trim();
  if (nom.isNotEmpty) return nom;
  return lote.codigo.trim().isNotEmpty ? lote.codigo.trim() : 'Sin nombre';
}

bool ocupaCupo(GestacionChancha registro, String loteId, int numero, {String? excluirId}) {
  if (excluirId != null && registro.id == excluirId) return false;
  if (registro.loteId != loteId || registro.numeroEnLote != numero) return false;
  return registro.activa;
}

class OpcionChanchaLote {
  final int numero;
  final String etiqueta;
  final bool disponible;
  final String? motivoNoDisponible;
  const OpcionChanchaLote({
    required this.numero,
    required this.etiqueta,
    required this.disponible,
    this.motivoNoDisponible,
  });
}

List<OpcionChanchaLote> opcionesChanchasLote({
  required LoteDto lote,
  required List<GestacionChancha> registros,
  String? excluirRegistroId,
}) {
  final cupos = cuposHembrasLote(lote);
  final opciones = <OpcionChanchaLote>[];
  for (var n = 1; n <= cupos; n++) {
    final ocupado = registros.any((r) => ocupaCupo(r, lote.id, n, excluirId: excluirRegistroId));
    opciones.add(OpcionChanchaLote(
      numero: n,
      etiqueta: nombreChancha(n),
      disponible: !ocupado,
      motivoNoDisponible: ocupado ? 'Ya tiene gestación activa' : null,
    ));
  }
  return opciones;
}
