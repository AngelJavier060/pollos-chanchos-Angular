import 'package:flutter/material.dart';
import 'package:carousel_slider/carousel_slider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  int _currentImageIndex = 0;
  
  final List<String> imgList = [
    'assets/images/Granja Prin1.jpg',
    'assets/images/Granja1.jpg',
    'assets/images/Granja2.jpg',
    'assets/images/Granja3.jpg',
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Carrusel de imágenes de fondo a pantalla completa
          SizedBox.expand(
            child: CarouselSlider(
              options: CarouselOptions(
                height: MediaQuery.of(context).size.height,
                viewportFraction: 1.0,
                autoPlay: true,
                autoPlayInterval: const Duration(seconds: 5),
                autoPlayAnimationDuration: const Duration(milliseconds: 800),
                autoPlayCurve: Curves.fastOutSlowIn,
                enableInfiniteScroll: true,
                enlargeCenterPage: false,
                onPageChanged: (index, reason) {
                  setState(() {
                    _currentImageIndex = index;
                  });
                },
              ),
              items: imgList.map((item) => Image.asset(
                item,
                fit: BoxFit.cover,
                width: MediaQuery.of(context).size.width,
                errorBuilder: (context, error, stackTrace) {
                  print('Error loading image: $item');
                  return Container(
                    color: Colors.green[700],
                    child: const Center(
                      child: Text(
                        'Error al cargar la imagen',
                        style: TextStyle(color: Colors.white),
                      ),
                    ),
                  );
                },
              )).toList(),
            ),
          ),

          // Capa oscura semitransparente
          Container(
            color: Colors.black.withOpacity(0.5),
          ),

          // Contenido de login
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const SizedBox(height: 180),

                // Indicadores del carrusel
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: imgList.asMap().entries.map((entry) {
                    return Container(
                      width: 12.0,
                      height: 12.0,
                      margin: const EdgeInsets.symmetric(horizontal: 6.0),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.white.withOpacity(
                          _currentImageIndex == entry.key ? 0.9 : 0.4,
                        ),
                      ),
                    );
                  }).toList(),
                ),

                const SizedBox(height: 50),

                // Fila de iconos
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Icono de usuario
                    _buildCircularIcon(Icons.person, () {
                      _showLoginDialog(context);
                    }),
                    const SizedBox(width: 60),

                    // Icono de huella
                    _buildCircularIcon(Icons.fingerprint, () {
                      _showFingerprintDialog(context);
                    }),
                  ],
                ),

                const SizedBox(height: 50),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCircularIcon(IconData icon, VoidCallback onPressed) {
    return Container(
      width: 70,
      height: 70,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 2),
      ),
      child: IconButton(
        icon: Icon(icon, size: 35),
        color: Colors.white,
        onPressed: onPressed,
      ),
    );
  }

  void _showLoginDialog(BuildContext context) {
    final TextEditingController usernameController = TextEditingController();
    final TextEditingController passwordController = TextEditingController();

    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(15),
          ),
          title: const Text(
            'Iniciar Sesión',
            style: TextStyle(
              color: Colors.black,
              fontWeight: FontWeight.bold,
            ),
            textAlign: TextAlign.center,
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: usernameController,
                decoration: InputDecoration(
                  labelText: 'Usuario',
                  labelStyle: TextStyle(color: Color(0xFF2E7D32)), // Verde más natural
                  prefixIcon: Icon(Icons.person, color: Color(0xFF2E7D32)),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderSide: BorderSide(color: Color(0xFF2E7D32)),
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              TextField(
                controller: passwordController,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: 'Contraseña',
                  labelStyle: TextStyle(color: Color(0xFF2E7D32)),
                  prefixIcon: Icon(Icons.lock, color: Color(0xFF2E7D32)),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderSide: BorderSide(color: Color(0xFF2E7D32)),
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
              },
              child: Text(
                'Cancelar',
                style: TextStyle(color: Colors.grey[600]),
              ),
            ),
            ElevatedButton(
              onPressed: () {
                // TODO: Implementar lógica de autenticación
                String username = usernameController.text;
                String password = passwordController.text;

                if (username.isNotEmpty && password.isNotEmpty) {
                  // Aquí iría la lógica de login
                  Navigator.of(context).pop();
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Inicio de sesión exitoso'),
                      backgroundColor: Color(0xFF2E7D32),
                    ),
                  );
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Por favor complete todos los campos'),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Color(0xFF2E7D32), // Verde más natural para combinar con imágenes de granja
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              child: const Text(
                'Iniciar Sesión',
                style: TextStyle(color: Colors.white),
              ),
            ),
          ],
        );
      },
    );
  }

  void _showFingerprintDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(15),
          ),
          title: const Text(
            'Autenticación por Huella',
            style: TextStyle(
              color: Colors.black,
              fontWeight: FontWeight.bold,
            ),
            textAlign: TextAlign.center,
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.fingerprint,
                size: 80,
                color: Color(0xFF2E7D32),
              ),
              const SizedBox(height: 20),
              const Text(
                'Coloque su dedo en el sensor de huella dactilar',
                style: TextStyle(
                  color: Colors.black87,
                  fontSize: 16,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 10),
              const Text(
                'O configure su huella si es la primera vez',
                style: TextStyle(
                  color: Colors.grey,
                  fontSize: 14,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
              },
              child: Text(
                'Cancelar',
                style: TextStyle(color: Colors.grey[600]),
              ),
            ),
            ElevatedButton(
              onPressed: () {
                // TODO: Implementar lógica de autenticación por huella
                Navigator.of(context).pop();
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Autenticación por huella exitosa'),
                    backgroundColor: Color(0xFF2E7D32),
                  ),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Color(0xFF2E7D32),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              child: const Text(
                'Configurar Huella',
                style: TextStyle(color: Colors.white),
              ),
            ),
          ],
        );
      },
    );
  }
}