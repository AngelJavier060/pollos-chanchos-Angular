// Para desarrollo local, usa el mismo servidor que la web Angular
// Cambia a la IP de tu máquina si pruebas desde dispositivo físico
// Para emulador Android: 10.0.2.2:8088
// Para iOS simulator o web: localhost:8088
// Para producción: https://granja.improvement-solution.com

 const String apiBaseUrl = 'http://10.0.2.2:8088'; // Desarrollo Android emulador
//const String apiBaseUrl = 'http://localhost:8088'; // Desarrollo web/iOS
// const String apiBaseUrl = 'https://granja.improvement-solution.com'; // Producción

const String authLoginPath = '/api/auth/login';
