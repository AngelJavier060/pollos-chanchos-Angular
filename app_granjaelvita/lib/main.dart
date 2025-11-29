import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:carousel_slider/carousel_slider.dart';
import 'package:local_auth/local_auth.dart';

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
      // Soporte para español en DatePickers y otros widgets
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('es', 'ES'),
        Locale('en', 'US'),
      ],
      locale: const Locale('es', 'ES'),
    );
  }
}

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});
  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> with SingleTickerProviderStateMixin {
  final _userCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _auth = AuthService();
  final LocalAuthentication _localAuth = LocalAuthentication();

  final List<String> _images = const [
    'assets/images/Granja Prin1.jpg',
    'assets/images/Granja1.jpg',
    'assets/images/Granja2.jpg',
    'assets/images/Granja3.jpg',
  ];

  bool _biometricEnabled = false;
  bool _checkingBiometric = true;
  bool _hasSavedSession = false;

  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    )..repeat(reverse: true);
    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.15).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
    _initBiometrics();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _userCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  Future<void> _initBiometrics() async {
    try {
      final hasSession = await AuthService.hasSavedSession();
      final enabledFlag = await AuthService.isBiometricEnabled();

      if (!mounted) return;
      setState(() {
        _hasSavedSession = hasSession;
        _biometricEnabled = enabledFlag && hasSession;
        _checkingBiometric = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _biometricEnabled = false;
        _checkingBiometric = false;
      });
    }
  }

  Future<void> _doLogin(VoidCallback closeSheet, void Function(String) setError, void Function(bool) setLoading) async {
    setLoading(true);
    setError('');
    try {
      final res = await _auth.login(_userCtrl.text.trim(), _passCtrl.text);
      closeSheet();
      // Navegar directamente sin mostrar diálogo de huella
      if (!mounted) return;
      _navigateToHome(res);
    } catch (e) {
      setError(e.toString().replaceFirst('Exception: ', ''));
    } finally {
      setLoading(false);
    }
  }

  void _navigateToHome(LoginResult res) {
    if (res.roles.contains('ROLE_ADMIN')) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => AdminMenuPage(result: res)),
      );
    } else {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => HomePage(result: res)),
      );
    }
  }

  void _openLoginSheet() {
    _userCtrl.clear();
    _passCtrl.clear();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            bool obscurePassword = true;
            bool loading = false;
            String errorMsg = '';

            return Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
              child: SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(24, 20, 24, 32),
                  child: StatefulBuilder(
                    builder: (ctx2, setInnerState) {
                      return Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // Handle bar
                          Center(
                            child: Container(
                              width: 40,
                              height: 4,
                              decoration: BoxDecoration(
                                color: Colors.grey[300],
                                borderRadius: BorderRadius.circular(2),
                              ),
                            ),
                          ),
                          const SizedBox(height: 20),
                          // Título
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF2E7D32).withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Icon(Icons.lock_outline, color: Color(0xFF2E7D32), size: 24),
                              ),
                              const SizedBox(width: 12),
                              const Text(
                                'Iniciar Sesión',
                                style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF1B5E20)),
                              ),
                            ],
                          ),
                          const SizedBox(height: 24),
                          // Campo Usuario
                          Container(
                            height: 56,
                            decoration: BoxDecoration(
                              color: Colors.grey[50],
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.grey[300]!),
                            ),
                            child: TextField(
                              controller: _userCtrl,
                              decoration: const InputDecoration(
                                labelText: 'Usuario',
                                prefixIcon: Icon(Icons.person_outline, color: Color(0xFF2E7D32)),
                                border: InputBorder.none,
                                contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                          // Campo Contraseña
                          Container(
                            height: 56,
                            decoration: BoxDecoration(
                              color: Colors.grey[50],
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.grey[300]!),
                            ),
                            child: TextField(
                              controller: _passCtrl,
                              obscureText: obscurePassword,
                              decoration: InputDecoration(
                                labelText: 'Contraseña',
                                prefixIcon: const Icon(Icons.lock_outline, color: Color(0xFF2E7D32)),
                                suffixIcon: IconButton(
                                  icon: Icon(
                                    obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                                    color: Colors.grey[600],
                                  ),
                                  onPressed: () {
                                    setInnerState(() {
                                      obscurePassword = !obscurePassword;
                                    });
                                  },
                                ),
                                border: InputBorder.none,
                                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                          // Error message
                          if (errorMsg.isNotEmpty)
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.red[50],
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: Colors.red[200]!),
                              ),
                              child: Row(
                                children: [
                                  Icon(Icons.error_outline, color: Colors.red[700], size: 20),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      errorMsg,
                                      style: TextStyle(color: Colors.red[700], fontSize: 13),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          const SizedBox(height: 20),
                          // Botón Ingresar
                          SizedBox(
                            height: 56,
                            child: FilledButton(
                              onPressed: loading
                                  ? null
                                  : () => _doLogin(
                                        () => Navigator.of(ctx).pop(),
                                        (err) => setInnerState(() => errorMsg = err),
                                        (val) => setInnerState(() => loading = val),
                                      ),
                              style: FilledButton.styleFrom(
                                backgroundColor: const Color(0xFF2E7D32),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              child: loading
                                  ? const SizedBox(
                                      width: 24,
                                      height: 24,
                                      child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
                                    )
                                  : const Text('Ingresar', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  void _openBiometricConfig() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 20, 24, 32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Handle bar
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.grey[300],
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  // Icono de huella
                  Container(
                    width: 100,
                    height: 100,
                    decoration: BoxDecoration(
                      color: const Color(0xFF2E7D32).withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.fingerprint, size: 60, color: Color(0xFF2E7D32)),
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'Configurar Huella Digital',
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF1B5E20)),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    _hasSavedSession
                        ? 'Tu sesión ya está guardada. Activa la huella para acceder más rápido.'
                        : 'Primero debes iniciar sesión con usuario y contraseña para guardar tu sesión y poder configurar la huella.',
                    style: TextStyle(fontSize: 15, color: Colors.grey[600]),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 32),
                  if (_hasSavedSession) ...[
                    // Botón para activar huella
                    SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: FilledButton.icon(
                        onPressed: () async {
                          Navigator.of(ctx).pop();
                          await _activateBiometric();
                        },
                        icon: const Icon(Icons.fingerprint),
                        label: const Text('Activar Huella Digital', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                        style: FilledButton.styleFrom(
                          backgroundColor: const Color(0xFF2E7D32),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ),
                  ] else ...[
                    // Botón para ir a login con credenciales
                    SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: FilledButton.icon(
                        onPressed: () {
                          Navigator.of(ctx).pop();
                          _openLoginSheet();
                        },
                        icon: const Icon(Icons.login),
                        label: const Text('Iniciar Sesión Primero', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                        style: FilledButton.styleFrom(
                          backgroundColor: const Color(0xFF2E7D32),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 12),
                  TextButton(
                    onPressed: () => Navigator.of(ctx).pop(),
                    child: const Text('Cancelar', style: TextStyle(color: Colors.grey)),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Future<void> _activateBiometric() async {
    try {
      // Verificar que puede usar biometría
      final didAuthenticate = await _localAuth.authenticate(
        localizedReason: 'Confirma tu identidad para activar el acceso con huella',
        options: const AuthenticationOptions(biometricOnly: true, stickyAuth: true),
      );

      if (!didAuthenticate) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No se pudo verificar tu identidad'), backgroundColor: Colors.orange),
        );
        return;
      }

      // Activar huella
      await AuthService.setBiometricEnabled(true);
      await _initBiometrics();

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Row(
            children: [
              Icon(Icons.check_circle, color: Colors.white),
              SizedBox(width: 8),
              Text('¡Huella activada! Ahora puedes usarla para ingresar.'),
            ],
          ),
          backgroundColor: Color(0xFF2E7D32),
          duration: Duration(seconds: 3),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
      );
    }
  }

  void _openFingerprintAuth() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      isDismissible: false,
      builder: (ctx) {
        // Iniciar autenticación automáticamente
        Future.delayed(const Duration(milliseconds: 300), () {
          _performBiometricAuth(ctx);
        });

        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 20, 24, 32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Handle bar
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.grey[300],
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),
                  // Animación de huella
                  ScaleTransition(
                    scale: _pulseAnimation,
                    child: Container(
                      width: 120,
                      height: 120,
                      decoration: BoxDecoration(
                        color: const Color(0xFF2E7D32).withValues(alpha: 0.1),
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF2E7D32).withValues(alpha: 0.2),
                            blurRadius: 20,
                            spreadRadius: 5,
                          ),
                        ],
                      ),
                      child: const Icon(Icons.fingerprint, size: 70, color: Color(0xFF2E7D32)),
                    ),
                  ),
                  const SizedBox(height: 32),
                  const Text(
                    'Coloca tu dedo',
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF1B5E20)),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Usa el sensor de huella de tu dispositivo',
                    style: TextStyle(fontSize: 15, color: Colors.grey[600]),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 32),
                  TextButton(
                    onPressed: () => Navigator.of(ctx).pop(),
                    child: const Text('Cancelar', style: TextStyle(color: Colors.grey, fontSize: 16)),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Future<void> _performBiometricAuth(BuildContext sheetContext) async {
    try {
      final didAuthenticate = await _localAuth.authenticate(
        localizedReason: 'Autentícate con tu huella para entrar',
        options: const AuthenticationOptions(biometricOnly: true, stickyAuth: true),
      );

      if (!didAuthenticate) {
        if (sheetContext.mounted) Navigator.of(sheetContext).pop();
        return;
      }

      final saved = await AuthService.loadSavedSession();
      if (sheetContext.mounted) Navigator.of(sheetContext).pop();

      if (!mounted) return;
      if (saved == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Sesión expirada. Inicia sesión con usuario y contraseña.')),
        );
        return;
      }

      _navigateToHome(saved);
    } catch (e) {
      if (sheetContext.mounted) Navigator.of(sheetContext).pop();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error de autenticación: $e'), backgroundColor: Colors.red),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    // Tamaño uniforme para botones
    const double buttonWidth = 140;
    const double buttonHeight = 80;

    return Scaffold(
      body: Stack(
        children: [
          // Carrusel de fondo
          CarouselSlider(
            options: CarouselOptions(
              height: size.height,
              viewportFraction: 1.0,
              enlargeCenterPage: false,
              autoPlay: true,
              autoPlayInterval: const Duration(seconds: 4),
            ),
            items: _images
                .map((path) => SizedBox(
                      width: size.width,
                      height: size.height,
                      child: Image.asset(path, fit: BoxFit.cover),
                    ))
                .toList(),
          ),
          // Capa oscura
          Container(
            width: double.infinity,
            height: double.infinity,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.black.withValues(alpha: 0.3),
                  Colors.black.withValues(alpha: 0.5),
                ],
              ),
            ),
          ),
          // Logo y título
          Positioned(
            top: size.height * 0.12,
            left: 0,
            right: 0,
            child: Column(
              children: [
                Container(
                  width: 90,
                  height: 90,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.3),
                        blurRadius: 15,
                        offset: const Offset(0, 5),
                      ),
                    ],
                  ),
                  child: const Icon(Icons.agriculture, size: 50, color: Color(0xFF2E7D32)),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Granja Elviata',
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                    shadows: [Shadow(blurRadius: 10, color: Colors.black54)],
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Sistema de Gestión',
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.white.withValues(alpha: 0.9),
                    letterSpacing: 1.2,
                  ),
                ),
              ],
            ),
          ),
          // Botones de acceso
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const SizedBox(height: 120), // Espacio para el logo
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Botón Usuario/Contraseña
                    _buildAccessButton(
                      width: buttonWidth,
                      height: buttonHeight,
                      icon: Icons.person_outline,
                      label: 'Usuario',
                      sublabel: 'Contraseña',
                      onTap: _openLoginSheet,
                    ),
                    const SizedBox(width: 20),
                    // Botón Huella
                    _buildAccessButton(
                      width: buttonWidth,
                      height: buttonHeight,
                      icon: Icons.fingerprint,
                      label: 'Huella',
                      sublabel: _biometricEnabled ? 'Activada' : 'Configurar',
                      onTap: _checkingBiometric
                          ? null
                          : (_biometricEnabled ? _openFingerprintAuth : _openBiometricConfig),
                      isEnabled: !_checkingBiometric,
                      showBadge: _biometricEnabled,
                    ),
                  ],
                ),
              ],
            ),
          ),
          // Versión
          Positioned(
            bottom: 20,
            left: 0,
            right: 0,
            child: Text(
              'v1.0.0 • Producción',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white.withValues(alpha: 0.6), fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAccessButton({
    required double width,
    required double height,
    required IconData icon,
    required String label,
    required String sublabel,
    required VoidCallback? onTap,
    bool isEnabled = true,
    bool showBadge = false,
  }) {
    return GestureDetector(
      onTap: isEnabled ? onTap : null,
      child: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withValues(alpha: 0.5), width: 1.5),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.2),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Stack(
          children: [
            Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(icon, size: 32, color: Colors.white),
                  const SizedBox(height: 6),
                  Text(
                    label,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                    ),
                  ),
                  Text(
                    sublabel,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.8),
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
            if (showBadge)
              Positioned(
                top: 8,
                right: 8,
                child: Container(
                  width: 10,
                  height: 10,
                  decoration: const BoxDecoration(
                    color: Color(0xFF4CAF50),
                    shape: BoxShape.circle,
                  ),
                ),
              ),
          ],
        ),
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


