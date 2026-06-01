const int diasGestacionTotal = 114;

class EtapaGestacion {
  final String nombre;
  final int inicio;
  final int fin;
  const EtapaGestacion(this.nombre, this.inicio, this.fin);
}

const List<EtapaGestacion> etapasGestacion = [
  EtapaGestacion('Confirmación', 1, 21),
  EtapaGestacion('Gestación temprana', 22, 35),
  EtapaGestacion('Gestación media', 36, 85),
  EtapaGestacion('Pre-parto', 86, 107),
  EtapaGestacion('Parto', 108, 114),
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

StatsGestacion calcularStats(List<String> fechasInseminacion) {
  var gestando = 0;
  var preParto = 0;
  var paridas = 0;
  for (final f in fechasInseminacion) {
    final d = diasTranscurridos(f);
    if (d >= 0 && d <= diasGestacionTotal) gestando++;
    if (d >= 86 && d <= diasGestacionTotal) preParto++;
    if (d > diasGestacionTotal) paridas++;
  }
  return StatsGestacion(
    total: fechasInseminacion.length,
    gestando: gestando,
    preParto: preParto,
    paridas: paridas,
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
