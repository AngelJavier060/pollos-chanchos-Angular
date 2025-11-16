import 'package:flutter/material.dart';
import 'package:carousel_slider/carousel_slider.dart';
import 'services/auth_service.dart';
import 'pages/alimentacion_page.dart';
import 'pages/admin_menu_page.dart';

void main() => runApp(const GranjaElviataApp());

class GranjaElviataApp extends StatelessWidget {
  const GranjaElviataApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Granja Elviata',
      theme: ThemeData(colorScheme: ColorScheme.fromSeed(seedColor: Colors.green), useMaterial3: true),
      home: const LoginPage(),
      debugShowCheckedModeBanner: false,
    );
  }
}

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});
  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _userCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _auth = AuthService();
  bool _loading = false;
  String? _error;

  final List<String> _images = const [
    'assets/images/Granja Prin1.jpg',
    'assets/images/Granja1.jpg',
    'assets/images/Granja2.jpg',
    'assets/images/Granja3.jpg',
  ];

  Future<void> _doLogin(VoidCallback closeSheet) async {
    setState(() { _loading = true; _error = null; });
    try {
      final res = await _auth.login(_userCtrl.text.trim(), _passCtrl.text);
      closeSheet();
      if (!mounted) return;
      if (res.roles.contains('ROLE_ADMIN')) {
        Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => AdminMenuPage(result: res)));
      } else {
        Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => HomePage(result: res)));
      }
    } catch (e) {
      setState(() { _error = e.toString(); });
    } finally {
      if (mounted) setState(() { _loading = false; });
    }
  }

  void _openLoginSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text('Iniciar sesión', textAlign: TextAlign.center, style: Theme.of(ctx).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  TextField(controller: _userCtrl, decoration: const InputDecoration(labelText: 'Usuario')),
                  const SizedBox(height: 12),
                  TextField(controller: _passCtrl, decoration: const InputDecoration(labelText: 'Contraseña'), obscureText: true),
                  const SizedBox(height: 12),
                  if (_error != null) Text(_error!, style: const TextStyle(color: Colors.red)),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: _loading ? null : () => _doLogin(() => Navigator.of(ctx).pop()),
                    child: _loading
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Text('Ingresar'),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    return Scaffold(
      body: Stack(
        children: [
          CarouselSlider(
            options: CarouselOptions(
              height: size.height,
              viewportFraction: 1.0,
              enlargeCenterPage: false,
              autoPlay: true,
              autoPlayInterval: const Duration(seconds: 4),
            ),
            items: _images.map((path) => Builder(
              builder: (context) => SizedBox(
                width: size.width,
                height: size.height,
                child: Image.asset(path, fit: BoxFit.cover),
              ),
            )).toList(),
          ),
          Container(
            width: double.infinity,
            height: double.infinity,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Colors.black.withOpacity(0.15), Colors.black.withOpacity(0.15)],
              ),
            ),
          ),
          Center(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                OutlinedButton.icon(
                  onPressed: _openLoginSheet,
                  icon: const Icon(Icons.password_rounded, color: Colors.white),
                  label: const Text('Usuario\nContraseña', textAlign: TextAlign.center, style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Colors.white, width: 1.6),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    backgroundColor: Colors.black26,
                  ),
                ),
                const SizedBox(width: 16),
                OutlinedButton.icon(
                  onPressed: () { },
                  icon: const Icon(Icons.fingerprint, color: Colors.white),
                  label: const Text('Huella', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Colors.white, width: 1.6),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                    backgroundColor: Colors.black26,
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

class HomePage extends StatelessWidget {
  final LoginResult result;
  const HomePage({super.key, required this.result});

  String _subTitle() {
    if (result.roles.contains('ROLE_ADMIN')) return 'Administrador';
    if (result.roles.contains('ROLE_POULTRY')) return 'Usuario Pollos';
    if (result.roles.contains('ROLE_PORCINE')) return 'Usuario Chanchos';
    return 'Usuario';
  }

  @override
  Widget build(BuildContext context) {
    final bannerImages = const [
      'assets/images/Granja Prin1.jpg',
      'assets/images/Granja1.jpg',
      'assets/images/Granja2.jpg',
      'assets/images/Granja3.jpg',
    ];

    final items = [
      {'label':'Dashboard','icon': Icons.dashboard_customize_rounded,'color': Colors.blue},
      {'label':'Alimentación','icon': Icons.restaurant_menu,'color': Colors.green},
      {'label':'Lotes','icon': Icons.inventory_2_rounded,'color': Colors.deepPurple},
      {'label':'Histórico','icon': Icons.history,'color': Colors.orange},
      {'label':'Mortalidad','icon': Icons.warning_amber_rounded,'color': Colors.red},
      {'label':'Morbilidad','icon': Icons.medical_information_rounded,'color': Colors.pink},
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('Granja Elviata')),
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
                Text('¡' + (result.greeting) + '!', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text(result.name.isNotEmpty ? result.name : result.username, style: Theme.of(context).textTheme.bodyMedium),
                const SizedBox(height: 4),
                Text(_subTitle(), style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey[700])),
              ],
            ),
          ),
          const SizedBox(height: 16),
          CarouselSlider(
            options: CarouselOptions(
              height: 160,
              viewportFraction: 0.9,
              enlargeCenterPage: true,
              autoPlay: true,
              autoPlayInterval: const Duration(seconds: 4),
            ),
            items: bannerImages.map((path) => Builder(
              builder: (context) => ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  decoration: const BoxDecoration(boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 8, offset: Offset(0,2))]),
                  child: Image.asset(path, fit: BoxFit.cover, width: double.infinity),
                ),
              ),
            )).toList(),
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
                    onTap: () { final label = e['label'] as String; if (label == 'Alimentación') { Navigator.of(context).push(MaterialPageRoute(builder: (_) => const AlimentacionPage())); } },
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


