class ProductoModel {
  final String? id;
  final String nombre;
  final String? descripcion;
  final String animalTipo; // 'pollos', 'chanchos', 'ambos'
  final int? animalId;
  final int? providerId;
  final int? typeFoodId;
  final int? unitMeasurementId;
  final int? stageId;
  final int? subcategoryId;
  final String categoriaPrincipal;
  final String? subcategoria;
  final String? etapaAplicacion;
  final String unidadMedida;
  final double cantidadActual;
  final double nivelMinimo;
  final double? nivelMaximo;
  final String? usoPrincipal;
  final String? dosisRecomendada;
  final String? viaAplicacion;
  final double precioUnitario;
  final String? fechaCompra;
  final String? proveedor;
  final String? numeroFactura;
  final String? fechaVencimiento;
  final String? loteFabricante;
  final bool? incluirEnBotiquin;
  final int? tiempoRetiro;
  final String? observacionesMedicas;
  final String? presentacion;
  final String? infoNutricional;

  ProductoModel({
    this.id,
    required this.nombre,
    this.descripcion,
    required this.animalTipo,
    this.animalId,
    this.providerId,
    this.typeFoodId,
    this.unitMeasurementId,
    this.stageId,
    this.subcategoryId,
    required this.categoriaPrincipal,
    this.subcategoria,
    this.etapaAplicacion,
    required this.unidadMedida,
    required this.cantidadActual,
    required this.nivelMinimo,
    this.nivelMaximo,
    this.usoPrincipal,
    this.dosisRecomendada,
    this.viaAplicacion,
    required this.precioUnitario,
    this.fechaCompra,
    this.proveedor,
    this.numeroFactura,
    this.fechaVencimiento,
    this.loteFabricante,
    this.incluirEnBotiquin,
    this.tiempoRetiro,
    this.observacionesMedicas,
    this.presentacion,
    this.infoNutricional,
  });

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'nombre': nombre,
      'descripcion': descripcion,
      'animalTipo': animalTipo,
      'animalId': animalId,
      'providerId': providerId,
      'typeFoodId': typeFoodId,
      'unitMeasurementId': unitMeasurementId,
      'stageId': stageId,
      'subcategoryId': subcategoryId,
      'categoriaPrincipal': categoriaPrincipal,
      'subcategoria': subcategoria,
      'etapaAplicacion': etapaAplicacion,
      'unidadMedida': unidadMedida,
      'cantidadActual': cantidadActual,
      'nivelMinimo': nivelMinimo,
      'nivelMaximo': nivelMaximo,
      'usoPrincipal': usoPrincipal,
      'dosisRecomendada': dosisRecomendada,
      'viaAplicacion': viaAplicacion,
      'precioUnitario': precioUnitario,
      'fechaCompra': fechaCompra,
      'proveedor': proveedor,
      'numeroFactura': numeroFactura,
      'fechaVencimiento': fechaVencimiento,
      'loteFabricante': loteFabricante,
      'incluirEnBotiquin': incluirEnBotiquin,
      'tiempoRetiro': tiempoRetiro,
      'observacionesMedicas': observacionesMedicas,
      'presentacion': presentacion,
      'infoNutricional': infoNutricional,
    };
  }

  factory ProductoModel.fromJson(Map<String, dynamic> json) {
    return ProductoModel(
      id: json['id']?.toString(),
      nombre: json['nombre'] ?? '',
      descripcion: json['descripcion'],
      animalTipo: json['animalTipo'] ?? 'pollos',
      animalId: json['animalId'] == null
          ? null
          : int.tryParse(json['animalId'].toString()),
      providerId: json['providerId'] == null
          ? null
          : int.tryParse(json['providerId'].toString()),
      typeFoodId: json['typeFoodId'] == null
          ? null
          : int.tryParse(json['typeFoodId'].toString()),
      unitMeasurementId: json['unitMeasurementId'] == null
          ? null
          : int.tryParse(json['unitMeasurementId'].toString()),
      stageId: json['stageId'] == null
          ? null
          : int.tryParse(json['stageId'].toString()),
      subcategoryId: json['subcategoryId'] == null
          ? null
          : int.tryParse(json['subcategoryId'].toString()),
      categoriaPrincipal: json['categoriaPrincipal'] ?? '',
      subcategoria: json['subcategoria'],
      etapaAplicacion: json['etapaAplicacion'],
      unidadMedida: json['unidadMedida'] ?? '',
      cantidadActual: (json['cantidadActual'] ?? 0).toDouble(),
      nivelMinimo: (json['nivelMinimo'] ?? 0).toDouble(),
      nivelMaximo: json['nivelMaximo']?.toDouble(),
      usoPrincipal: json['usoPrincipal'],
      dosisRecomendada: json['dosisRecomendada'],
      viaAplicacion: json['viaAplicacion'],
      precioUnitario: (json['precioUnitario'] ?? 0).toDouble(),
      fechaCompra: json['fechaCompra'],
      proveedor: json['proveedor'],
      numeroFactura: json['numeroFactura'],
      fechaVencimiento: json['fechaVencimiento'],
      loteFabricante: json['loteFabricante'],
      incluirEnBotiquin: json['incluirEnBotiquin'],
      tiempoRetiro: json['tiempoRetiro'],
      observacionesMedicas: json['observacionesMedicas'],
      presentacion: json['presentacion'],
      infoNutricional: json['infoNutricional'],
    );
  }
}
