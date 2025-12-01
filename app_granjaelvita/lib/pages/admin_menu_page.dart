import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/auth_service.dart';
import '../main.dart';
import '../widgets/inactivity_detector.dart';
import 'inventario_menu_page.dart';
import 'ventas_menu_page.dart';
import 'usuarios_dashboard_page.dart';
import 'lotes_dashboard_page.dart';

// Paleta de colores corporativa - Verde, Azul, Tierra (inspirada en Menu_Iconos)
class AppColors {
  // Colores principales
  static const Color primaryGreen = Color(0xFF2E7D32);      // Verde bosque
  static const Color primaryGreenLight = Color(0xFF4CAF50); // Verde claro
  static const Color primaryBlue = Color(0xFF1565C0);       // Azul corporativo
  static const Color primaryBlueLight = Color(0xFF42A5F5);  // Azul claro
  static const Color primaryEarth = Color(0xFF8D6E63);      // Tierra/marrón
  static const Color primaryEarthLight = Color(0xFFBCAAA4); // Tierra claro
  
  // Colores de acento para módulos
  static const Color accentOrange = Color(0xFFE65100);      // Naranja cálido
  static const Color accentTeal = Color(0xFF00796B);        // Verde azulado
  static const Color accentAmber = Color(0xFFFF8F00);       // Ámbar
  
  // Fondos
  static const Color background = Color(0xFFF5F7F0);        // Fondo crema suave
  static const Color cardBg = Color(0xFFFFFFFF);
  
  // Texto
  static const Color textDark = Color(0xFF2E3A2F);
  static const Color textMuted = Color(0xFF5D6D5E);
}

class AdminMenuPage extends StatelessWidget {
  final LoginResult result;
  const AdminMenuPage({super.key, required this.result});

  void _cerrarSesion(BuildContext context) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(Icons.logout, color: Colors.red.shade600, size: 22),
            ),
            const SizedBox(width: 12),
            const Text('Cerrar Sesión', style: TextStyle(fontSize: 18)),
          ],
        ),
        content: const Text('¿Está seguro que desea cerrar sesión?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: FilledButton.styleFrom(backgroundColor: Colors.red.shade600),
            child: const Text('Salir'),
          ),
        ],
      ),
    );

    if (confirm == true && context.mounted) {
      await AuthService.logout();
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const LoginPage()),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    // Módulos del sistema con iconos profesionales y colores individuales
    final items = [
      {
        'label': 'Usuarios',
        'icon': Icons.people_alt_rounded,
        'colorLight': AppColors.primaryBlueLight,
        'colorDark': AppColors.primaryBlue,
      },
      {
        'label': 'Lotes',
        'icon': Icons.assignment_rounded,
        'colorLight': AppColors.primaryGreenLight,
        'colorDark': AppColors.primaryGreen,
      },
      {
        'label': 'Inventario',
        'icon': Icons.inventory_2_rounded,
        'colorLight': AppColors.primaryEarthLight,
        'colorDark': AppColors.primaryEarth,
      },
      {
        'label': 'Plan Nutricional',
        'icon': Icons.restaurant_menu_rounded,
        'colorLight': const Color(0xFF81C784),
        'colorDark': AppColors.accentTeal,
      },
      {
        'label': 'Análisis',
        'icon': Icons.bar_chart_rounded,
        'colorLight': const Color(0xFFFFB74D),
        'colorDark': AppColors.accentOrange,
      },
      {
        'label': 'Ventas',
        'icon': Icons.shopping_cart_rounded,
        'colorLight': const Color(0xFFFFD54F),
        'colorDark': AppColors.accentAmber,
      },
    ];

    void onTapItem(String label) {
      if (label == 'Inventario') {
        Navigator.of(context).push(MaterialPageRoute(builder: (_) => const InventarioMenuPage()));
      } else if (label == 'Ventas') {
        Navigator.of(context).push(MaterialPageRoute(builder: (_) => const VentasMenuPage()));
      } else if (label == 'Usuarios') {
        Navigator.of(context).push(MaterialPageRoute(builder: (_) => const UsuariosDashboardPage()));
      } else if (label == 'Lotes') {
        Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LotesDashboardPage()));
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$label próximamente')));
      }
    }

    // URL de la foto del usuario (si existe)
    final userPhotoUrl = result.photoUrl;

    return InactivityDetector(
      inactivityTimeout: const Duration(minutes: 7),
      child: Scaffold(
        backgroundColor: AppColors.background,
        body: Stack(
          fit: StackFit.expand,
          children: [
            // Fondo con imagen de menú e overlay suave
            ColorFiltered(
              colorFilter: ColorFilter.mode(
                Colors.black.withOpacity(0.08),
                BlendMode.darken,
              ),
              child: Image.asset(
                'assets/images/Menu_Iconos.jpg',
                fit: BoxFit.cover,
              ),
            ),
            Container(
              color: AppColors.background.withOpacity(0.85),
            ),
            SafeArea(
              child: Column(
                children: [
                  // Header compacto
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.96),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.04),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        // Foto del administrador
                        Container(
                          width: 50,
                          height: 50,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: const LinearGradient(
                              colors: [AppColors.primaryGreenLight, AppColors.primaryGreen],
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.primaryGreen.withOpacity(0.3),
                                blurRadius: 8,
                                offset: const Offset(0, 3),
                              ),
                            ],
                          ),
                          child: ClipOval(
                            child: userPhotoUrl != null && userPhotoUrl.isNotEmpty
                                ? Image.network(
                                    userPhotoUrl,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) => const Icon(
                                      Icons.person,
                                      color: Colors.white,
                                      size: 28,
                                    ),
                                  )
                                : const Icon(
                                    Icons.person,
                                    color: Colors.white,
                                    size: 28,
                                  ),
                          ),
                        ),
                        const SizedBox(width: 14),
                        // Nombre y rol
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                result.name.isNotEmpty ? result.name : result.username,
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF1F2937),
                                ),
                              ),
                              Container(
                                margin: const EdgeInsets.only(top: 4),
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                                decoration: BoxDecoration(
                                  color: AppColors.primaryGreenLight.withOpacity(0.2),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Text(
                                  'Administrador',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.primaryGreen,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        // Botón de logout
                        IconButton(
                          onPressed: () => _cerrarSesion(context),
                          icon: const Icon(Icons.logout_rounded, color: Color(0xFF6B7280)),
                          tooltip: 'Cerrar sesión',
                        ),
                      ],
                    ),
                  ),
                  
                  // Contenido principal
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Título de sección
                          const Padding(
                            padding: EdgeInsets.only(left: 4, bottom: 16),
                            child: Text(
                              'Módulos del Sistema',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF4B5563),
                              ),
                            ),
                          ),
                          
                          // Grid de módulos 3x2 - Diseño compacto con colores individuales
                          Expanded(
                            child: GridView.count(
                              crossAxisCount: 3,
                              crossAxisSpacing: 12,
                              mainAxisSpacing: 12,
                              childAspectRatio: 0.95,
                              children: [
                                for (final e in items)
                                  _buildModuleCard(
                                    label: e['label'] as String,
                                    icon: e['icon'] as IconData,
                                    colorLight: e['colorLight'] as Color,
                                    colorDark: e['colorDark'] as Color,
                                    onTap: () => onTapItem(e['label'] as String),
                                  ),
                              ],
                            ),
                          ),
                          
                          const SizedBox(height: 12),
                          
                          // Botón de cerrar sesión (estilo tierra/marrón suave)
                          SizedBox(
                            width: double.infinity,
                            child: OutlinedButton.icon(
                              onPressed: () => _cerrarSesion(context),
                              icon: const Icon(Icons.logout_rounded, size: 18),
                              label: const Text('Cerrar Sesión'),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: AppColors.primaryEarth,
                                side: BorderSide(color: AppColors.primaryEarthLight),
                                backgroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildModuleCard({
    required String label,
    required IconData icon,
    required Color colorLight,
    required Color colorDark,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: colorDark.withOpacity(0.12),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Ícono con fondo circular y gradiente individual
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [colorLight, colorDark],
                ),
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: colorDark.withOpacity(0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Icon(icon, color: Colors.white, size: 26),
            ),
            const SizedBox(height: 10),
            // Nombre del módulo
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: Text(
                label,
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: colorDark,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
