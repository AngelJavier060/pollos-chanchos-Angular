import 'package:flutter/material.dart';
import 'productos_page.dart';
import 'gastos_operacion_dashboard_clean_page.dart';
import 'mano_obra_dashboard_page.dart';
import 'logistica_dashboard_page.dart';
import 'gastos_fijos_dashboard_page.dart';
import 'stock_real_page.dart';
import 'entradas_inventario_page.dart';
import 'alertas_inventario_page.dart';

class InventarioMenuPage extends StatelessWidget {
  const InventarioMenuPage({super.key});

  @override
  Widget build(BuildContext context) {
    final items = [
      {'label': 'Producto', 'icon': Icons.category, 'color': Colors.blue},
      {'label': 'Stock Real', 'icon': Icons.inventory_2, 'color': Colors.teal},
      {'label': 'Entradas', 'icon': Icons.login, 'color': Colors.indigo},
      {'label': 'Alertas', 'icon': Icons.warning_amber, 'color': Colors.orange},
      {'label': 'Sanidad y Cuidado Animal', 'icon': Icons.medical_services, 'color': Colors.red},
      {'label': 'Gastos de Operación', 'icon': Icons.receipt_long, 'color': Colors.pink},
      {'label': 'Mano de Obra', 'icon': Icons.engineering, 'color': Colors.deepPurple},
      {'label': 'Movilización y Logística', 'icon': Icons.local_shipping, 'color': Colors.brown},
      {'label': 'Costos Fijos', 'icon': Icons.attach_money, 'color': Colors.green},
    ];

    void onTapItem(String label) {
      if (label == 'Producto') {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const ProductosPage()),
        );
      } else if (label == 'Stock Real') {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const StockRealPage()),
        );
      } else if (label == 'Entradas') {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const EntradasInventarioPage()),
        );
      } else if (label == 'Alertas') {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const AlertasInventarioPage()),
        );
      } else if (label == 'Gastos de Operación') {
        Navigator.push(
          context,
          MaterialPageRoute(
              builder: (context) => const GastosOperacionDashboardPage()),
        );
      } else if (label == 'Mano de Obra') {
        Navigator.push(
          context,
          MaterialPageRoute(
              builder: (context) => const ManoObraDashboardPage()),
        );
      } else if (label == 'Movilización y Logística') {
        Navigator.push(
          context,
          MaterialPageRoute(
              builder: (context) => const LogisticaDashboardPage()),
        );
      } else if (label == 'Costos Fijos') {
        Navigator.push(
          context,
          MaterialPageRoute(
              builder: (context) => const GastosFijosDashboardPage()),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(label + ' próximamente')));
      }
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Inventario')),
      body: Stack(
        children: [
          Positioned.fill(
            child: Image.asset(
              'assets/images/Iconos_inventario.jpg',
              fit: BoxFit.cover,
            ),
          ),
          Container(
            color: Colors.white.withOpacity(0.0),
            child: GridView.count(
              padding: const EdgeInsets.all(16),
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              children: [
                for (final e in items)
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.9),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: const [
                        BoxShadow(
                          color: Colors.black12,
                          blurRadius: 8,
                          offset: Offset(0, 2),
                        ),
                      ],
                    ),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(16),
                      onTap: () => onTapItem(e['label'] as String),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          CircleAvatar(
                            backgroundColor: e['color'] as Color,
                            radius: 30,
                            child: Icon(
                              e['icon'] as IconData,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 10),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                            child: Text(
                              e['label'] as String,
                              textAlign: TextAlign.center,
                              style: const TextStyle(fontWeight: FontWeight.w600),
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
    );
  }
}
