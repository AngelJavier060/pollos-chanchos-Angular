// Configuración de API — app móvil Granja Elviata
//
// Cambia [useProduction] para alternar entre producción y desarrollo local.
// Después de cambiar: flutter clean && flutter pub get (recomendado en release).

import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;

/// true = servidor en producción | false = backend local (puerto 8088)
const bool useProduction = true;

/// Producción (mismo dominio que la web Angular en servidor)
const String apiBaseUrlProduction = 'https://granja.improvement-solution.com';

/// Desarrollo local
const String apiBaseUrlAndroidEmulator = 'http://10.0.2.2:8088';
const String apiBaseUrlLocalhost = 'http://localhost:8088';
const String apiBaseUrlLAN = 'http://192.168.0.100:8088';

/// Forzar IP de tu PC en red Wi‑Fi (solo si useProduction = false)
const bool forceLAN = false;

String _decideBaseUrl() {
  if (useProduction) {
    return apiBaseUrlProduction;
  }
  if (forceLAN) return apiBaseUrlLAN;
  if (kIsWeb) return apiBaseUrlLocalhost;
  try {
    if (Platform.isAndroid) return apiBaseUrlAndroidEmulator;
    return apiBaseUrlLocalhost;
  } catch (_) {
    return apiBaseUrlLocalhost;
  }
}

final String apiBaseUrl = _decideBaseUrl();

const String authLoginPath = '/api/auth/login';
