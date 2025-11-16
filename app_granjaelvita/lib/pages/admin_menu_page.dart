import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import 'inventario_menu_page.dart';
import 'ventas_menu_page.dart';

class AdminMenuPage extends StatelessWidget {
  final LoginResult result;
  const AdminMenuPage({super.key, required this.result});

  @override
  Widget build(BuildContext context) {
    final items = [
      {'label': 'Usuarios', 'icon': Icons.group, 'color': Colors.blue},
      {'label': 'Registro de Lotes', 'icon': Icons.playlist_add, 'color': Colors.deepPurple},
      {'label': 'Inventario', 'icon': Icons.inventory_2_rounded, 'color': Colors.teal},
      {'label': 'Plan Nutricional', 'icon': Icons.restaurant_menu, 'color': Colors.green},
      {'label': 'Análisis Financiero', 'icon': Icons.analytics, 'color': Colors.orange},
      {'label': 'Ventas', 'icon': Icons.point_of_sale, 'color': Colors.pink},
    ];

    void onTapItem(String label) {
      if (label == 'Inventario') {
        Navigator.of(context).push(MaterialPageRoute(builder: (_) => const InventarioMenuPage()));
      } else if (label == 'Ventas') {
        Navigator.of(context).push(MaterialPageRoute(builder: (_) => const VentasMenuPage()));
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(label + ' próximamente')));
      }
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Administrador')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: [Colors.greenAccent.shade100, Colors.green.shade100]),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                Text('Bienvenido Administrador', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text(result.name.isNotEmpty ? result.name : result.username, style: Theme.of(context).textTheme.bodyMedium),
              ],
            ),
          ),
          const SizedBox(height: 16),
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 3,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            children: [
              for (final e in items)
                Container(
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 8, offset: Offset(0,2))]),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: () => onTapItem(e['label'] as String),
                    child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                      CircleAvatar(backgroundColor: e['color'] as Color, radius: 26, child: Icon(e['icon'] as IconData, color: Colors.white)),
                      const SizedBox(height: 8),
                      Text(e['label'] as String, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
                    ]),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
