// Para desarrollo local, usa el mismo servidor que la web Angular
// Cambia a la IP de tu máquina si pruebas desde dispositivo físico
// Para emulador Android: 10.0.2.2:8088
// Para iOS simulator o web: localhost:8088
// Para producción: https://granja.improvement-solution.com

import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;

const String apiBaseUrlAndroidEmulator = 'http://10.0.2.2:8088';
const String apiBaseUrlLocalhost = 'http://localhost:8088';
const String apiBaseUrlLAN = 'http://192.168.0.100:8088';
const bool forceLAN = false;

String _decideBaseUrl() {
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
