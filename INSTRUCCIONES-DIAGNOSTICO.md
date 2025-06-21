# Instrucciones para Probar la Herramienta de Diagnóstico

## Preparación

1. **Inicia los servidores**:
   - Ejecuta el archivo `iniciar-diagnostico.bat` para iniciar automáticamente tanto el backend como el frontend.
   - Este script verificará si los servidores ya están en ejecución, y si no lo están, los iniciará en ventanas separadas.

2. **Espera a que los servidores se inicien**:
   - El backend Java puede tardar unos segundos en iniciar completamente.
   - El servidor Angular también necesita tiempo para compilar la aplicación.

## Modo 1: Diagnóstico Completo

1. **Accede a la herramienta**:
   - Se abrirá automáticamente el navegador con la URL `http://localhost:4200/diagnostico`
   - Podrás ver la interfaz de diagnóstico completo que hemos creado.

2. **Ejecuta las pruebas**:
   - Haz clic en el botón "Ejecutar Todas las Pruebas" para realizar un diagnóstico completo.
   - Cada sección mostrará los resultados y recomendaciones específicas.

3. **Analiza los resultados**:
   - Revisa cada sección para identificar dónde puede estar fallando el sistema.
   - Presta especial atención a las secciones "Prueba de API Usuarios" y "Simulación de Navegación".

## Modo 2: Depurador de Flujo de Autenticación

1. **Accede a la herramienta de depuración específica**:
   - Navega a `http://localhost:4200/debug-auth`
   - Esta herramienta está diseñada específicamente para analizar el flujo de autenticación.

2. **Ingresa tus credenciales**:
   - Utiliza las credenciales de administrador (por defecto: admin/admin123)
   - Haz clic en "Iniciar Análisis"

3. **Revisa el diagnóstico paso a paso**:
   - El sistema analizará cada etapa del proceso de autenticación y acceso.
   - Identificará exactamente en qué punto está fallando el flujo.
   - Mostrará recomendaciones específicas para resolver el problema.

## Uso de la Herramienta Flotante de Diagnóstico

- En cualquier momento, puedes hacer clic en el botón flotante azul con el ícono 🔧 que aparece en la esquina inferior derecha de la aplicación.
- Este botón te dará acceso rápido a todas las herramientas de diagnóstico disponibles.

## Probando el Componente de Usuarios Directo

- Accede a `http://localhost:4200/admin/usuarios-directo`
- Este componente utiliza un enfoque simplificado para conectarse a la API de usuarios.
- Si este componente funciona correctamente pero el original no, el problema está en el flujo de componentes original.

## ¿Qué Buscar?

1. **Errores de conexión al backend**:
   - Indica que el servidor Java no está en ejecución o no está accesible.

2. **Errores de autenticación**:
   - Revisa si las credenciales son correctas.
   - Verifica si el token JWT se está generando correctamente.

3. **Errores de acceso a la API**:
   - Revisa si el token se está enviando correctamente en la cabecera de autorización.
   - Verifica si las rutas de la API son correctas.

4. **Errores de navegación**:
   - Examina si los guards de ruta están funcionando correctamente.
   - Comprueba si la redirección tras el login está configurada adecuadamente.

Una vez que hayas ejecutado el diagnóstico, comparte los resultados para poder ofrecerte soluciones más precisas basadas en lo que se haya detectado.
