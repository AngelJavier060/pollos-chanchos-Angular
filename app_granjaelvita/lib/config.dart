// Configuración de API — app móvil Granja Elvita
//
// Cambia [useProduction] para alternar entre producción y desarrollo local.
// Compatible con Android, iOS, Windows y Web (Chrome) — no usa dart:io.

import 'package:flutter/foundation.dart'
    show TargetPlatform, defaultTargetPlatform, kIsWeb;

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
  // Emulador Android: 10.0.2.2 apunta al localhost de la PC
  if (defaultTargetPlatform == TargetPlatform.android) {
    return apiBaseUrlAndroidEmulator;
  }
  return apiBaseUrlLocalhost;
}

final String apiBaseUrl = _decideBaseUrl();

const String authLoginPath = '/api/auth/login';
