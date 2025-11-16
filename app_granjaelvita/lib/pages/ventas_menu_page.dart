import 'package:flutter/material.dart';

class VentasMenuPage extends StatelessWidget {
  const VentasMenuPage({super.key});

  @override
  Widget build(BuildContext context) {
    final items = [
      {'label': 'Venta de Huevo', 'icon': Icons.egg, 'color': Colors.amber},
      {'label': 'Venta de Animales', 'icon': Icons.pets, 'color': Colors.green},
    ];

    void onTapItem(String label) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(label + ' próximamente')));
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Ventas')),
      body: GridView.count(
        padding: const EdgeInsets.all(16),
        crossAxisCount: 2,
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
                  CircleAvatar(backgroundColor: e['color'] as Color, radius: 30, child: Icon(e['icon'] as IconData, color: Colors.white)),
                  const SizedBox(height: 10),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    child: Text(e['label'] as String, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w600)),
                  ),
                ]),
              ),
            ),
        ],
      ),
    );
  }
}
