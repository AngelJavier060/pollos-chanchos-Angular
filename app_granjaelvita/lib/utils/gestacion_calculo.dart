const int diasGestacionTotal = 114;

class EtapaGestacion {
  final String nombre;
  final String nombreCorto;
  final String diasLabel;
  final int inicio;
  final int fin;
  const EtapaGestacion(this.nombre, this.nombreCorto, this.diasLabel, this.inicio, this.fin);
}

const List<EtapaGestacion> etapasGestacion = [
  EtapaGestacion('Confirmación', 'Confirmación', 'Días 1-21', 1, 21),
  EtapaGestacion('Gestación temprana', 'Temprana', 'Días 22-35', 22, 35),
  EtapaGestacion('Gestación media', 'Media', 'Días 36-85', 36, 85),
  EtapaGestacion('Pre-parto', 'Pre-parto', 'Días 86-107', 86, 107),
  EtapaGestacion('Parto', 'Parto', 'Días 108-114', 108, 114),
];

DateTime parseFechaLocal(String fechaISO) {
  final parts = fechaISO.split('-');
  return DateTime(int.parse(parts[0]), int.parse(parts[1]), int.parse(parts[2]));
}

int diasTranscurridos(String fechaISO) {
  final hoy = DateTime.now();
  final hoyLocal = DateTime(hoy.year, hoy.month, hoy.day);
  final ins = parseFechaLocal(fechaISO);
  return hoyLocal.difference(ins).inDays;
}

DateTime fechaPartoEstimada(String fechaISO) {
  return parseFechaLocal(fechaISO).add(const Duration(days: diasGestacionTotal));
}

String formatFechaEs(String fechaISO) {
  final d = parseFechaLocal(fechaISO);
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return '${d.day.toString().padLeft(2, '0')} ${meses[d.month - 1]} ${d.year}';
}

String formatFechaDesdeDate(DateTime date) {
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return '${date.day.toString().padLeft(2, '0')} ${meses[date.month - 1]} ${date.year}';
}

int getEtapaIdx(String fechaISO) {
  final d = diasTranscurridos(fechaISO);
  for (var i = 0; i < etapasGestacion.length; i++) {
    final e = etapasGestacion[i];
    if (d >= e.inicio && d <= e.fin) return i;
  }
  return -1;
}

int etapaIdxFicha(String fechaISO) {
  final idx = getEtapaIdx(fechaISO);
  if (idx >= 0) return idx;
  if (diasTranscurridos(fechaISO) > diasGestacionTotal) return etapasGestacion.length - 1;
  return -1;
}

String getEtapaNombre(String fechaISO) {
  final idx = getEtapaIdx(fechaISO);
  final d = diasTranscurridos(fechaISO);
  if (idx >= 0) return etapasGestacion[idx].nombre;
  if (d > diasGestacionTotal) return 'Completado';
  return 'Sin iniciar';
}

class EstadoGestacionBadge {
  final String label;
  final ColorKind colorKind;
  const EstadoGestacionBadge(this.label, this.colorKind);
}

enum ColorKind { gray, info, success, warning, danger }

EstadoGestacionBadge getEstadoGestacion(String fechaISO) {
  final d = diasTranscurridos(fechaISO);
  if (d < 0) return const EstadoGestacionBadge('Pendiente', ColorKind.gray);
  if (d <= 21) return const EstadoGestacionBadge('Confirmación', ColorKind.info);
  if (d <= 85) return const EstadoGestacionBadge('Gestando', ColorKind.success);
  if (d <= 107) return const EstadoGestacionBadge('Pre-parto', ColorKind.warning);
  if (d <= 114) return const EstadoGestacionBadge('¡Parto próximo!', ColorKind.danger);
  return const EstadoGestacionBadge('Parida', ColorKind.gray);
}

int progresoPorcentaje(String fechaISO) {
  final p = (diasTranscurridos(fechaISO) / diasGestacionTotal * 100).round();
  return p.clamp(0, 100);
}

int diasRestantes(String fechaISO) {
  return (diasGestacionTotal - diasTranscurridos(fechaISO)).clamp(0, diasGestacionTotal);
}

class StatsGestacion {
  final int total;
  final int gestando;
  final int preParto;
  final int paridas;
  const StatsGestacion({
    required this.total,
    required this.gestando,
    required this.preParto,
    required this.paridas,
  });
}

/// [paridasHistorial] = partos registrados (no se infiere solo por días > 114).
StatsGestacion calcularStats(
  List<String> fechasInseminacionActivas, {
  int paridasHistorial = 0,
}) {
  var gestando = 0;
  var preParto = 0;
  for (final f in fechasInseminacionActivas) {
    final d = diasTranscurridos(f);
    // Ciclo activo = gestando (incluye pre-parto y parto próximo)
    if (d >= 0) gestando++;
    if (d >= 86 && d <= diasGestacionTotal) preParto++;
  }
  return StatsGestacion(
    total: fechasInseminacionActivas.length + paridasHistorial,
    gestando: gestando,
    preParto: preParto,
    paridas: paridasHistorial,
  );
}

enum TipoAlertaGestacion { warning, danger }

class AlertaGestacion {
  final String nombre;
  final TipoAlertaGestacion tipo;
  const AlertaGestacion({required this.nombre, required this.tipo});
}

List<AlertaGestacion> calcularAlertas(List<({String nombre, String fechaInseminacion})> chanchas) {
  final alertas = <AlertaGestacion>[];
  for (final c in chanchas) {
    final d = diasTranscurridos(c.fechaInseminacion);
    if (d >= 108 && d <= diasGestacionTotal) {
      alertas.add(AlertaGestacion(nombre: c.nombre, tipo: TipoAlertaGestacion.danger));
    } else if (d >= 86 && d < 108) {
      alertas.add(AlertaGestacion(nombre: c.nombre, tipo: TipoAlertaGestacion.warning));
    }
  }
  return alertas;
}
