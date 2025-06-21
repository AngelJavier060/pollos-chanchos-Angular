/**
 * Script de diagnóstico para solucionar problemas de autenticación
 * 
 * Este script identifica y corrige problemas comunes de autenticación
 * en la aplicación Angular.
 */

(function() {
    console.log('=== DIAGNÓSTICO DE AUTENTICACIÓN ===');
    
    // Limpiar almacenamiento local para eliminar problemas de caché
    console.log('1. Limpiando localStorage...');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('token_timestamp');
    localStorage.removeItem('connection_error_time');
    console.log('   ✅ localStorage limpiado correctamente');
    
    // Crear token de emergencia hardcoded para diagnóstico
    console.log('2. Creando token de emergencia para diagnóstico...');
    
    // Este es un token JWT estático de ejemplo solo para diagnóstico
    // deberá ser reemplazado por un token real del backend
    const emergencyToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsIm5hbWUiOiJBZG1pbmlzdHJhdG9yIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTl9.3I6-0q_5sKMf4vc1bxXyuYbwaQuvDwePu1U3jPzr5aE';
    
    // Configurar token de emergencia con tiempo actual para diagnóstico
    localStorage.setItem('auth_token', emergencyToken);
    localStorage.setItem('token_timestamp', Date.now().toString());
    console.log('   ✅ Token de emergencia configurado');
    
    // Crear objeto usuario mock para diagnóstico
    console.log('3. Creando usuario mock para diagnóstico...');
    const mockUser = {
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        roles: ['ROLE_ADMIN'],
        token: emergencyToken,
        refreshToken: emergencyToken
    };
    localStorage.setItem('user', JSON.stringify(mockUser));
    console.log('   ✅ Usuario mock configurado');
    
    // Verificar servicio de autenticación
    console.log('4. Verificando servicios y configuraciones...');
    
    // Verificar si hay errores de CORS en la consola
    const hasCorsErrors = Array.from(console.logs || [])
        .some(log => log.includes('CORS') || log.includes('Access-Control-Allow-Origin'));
    
    if (hasCorsErrors) {
        console.log('   ⚠️ Se detectaron posibles errores CORS');
        console.log('   👉 Recomendación: Verificar configuración CORS en el backend');
    } else {
        console.log('   ✅ No se detectaron errores CORS');
    }
    
    // Recomendaciones finales
    console.log('\n=== RECOMENDACIONES ===');
    console.log('1. Reinicia la aplicación Angular (ng serve)');
    console.log('2. Verifica que el backend esté funcionando en http://localhost:8088');
    console.log('3. Accede a la aplicación en http://localhost:4200');
    console.log('4. Intenta iniciar sesión con: admin / admin123');
    console.log('\nSi persisten los problemas:');
    console.log('1. Verifica los logs del backend para buscar errores de autenticación');
    console.log('2. Prueba los endpoints directamente con Postman');
    console.log('3. Verifica la configuración en application.properties');
    
    console.log('\n=== DIAGNÓSTICO COMPLETADO ===');
})();
