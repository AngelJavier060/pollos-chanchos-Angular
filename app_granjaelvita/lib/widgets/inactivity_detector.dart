import 'dart:async';
import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import '../main.dart';

/// Widget que detecta inactividad del usuario y cierra sesión automáticamente.
/// El tiempo de inactividad por defecto es 7 minutos (entre 5 y 10 minutos).
class InactivityDetector extends StatefulWidget {
  final Widget child;
  final Duration inactivityTimeout;
  final VoidCallback? onTimeout;

  const InactivityDetector({
    super.key,
    required this.child,
    this.inactivityTimeout = const Duration(minutes: 7),
    this.onTimeout,
  });

  @override
  State<InactivityDetector> createState() => _InactivityDetectorState();
}

class _InactivityDetectorState extends State<InactivityDetector> with WidgetsBindingObserver {
  Timer? _inactivityTimer;
  bool _showingWarning = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _resetTimer();
  }

  @override
  void dispose() {
    _inactivityTimer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Si la app pasa a background o se pausa, mantenemos el timer
    // Si vuelve a foreground, verificamos si pasó el tiempo
    if (state == AppLifecycleState.resumed) {
      _resetTimer();
    }
  }

  void _resetTimer() {
    _inactivityTimer?.cancel();
    _inactivityTimer = Timer(widget.inactivityTimeout - const Duration(minutes: 1), () {
      // Mostrar advertencia 1 minuto antes del cierre
      _showWarningDialog();
    });
  }

  void _showWarningDialog() {
    if (_showingWarning || !mounted) return;
    _showingWarning = true;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        // Iniciar cuenta regresiva de 60 segundos
        return _CountdownDialog(
          onContinue: () {
            _showingWarning = false;
            Navigator.of(ctx).pop();
            _resetTimer();
          },
          onTimeout: () {
            _showingWarning = false;
            Navigator.of(ctx).pop();
            _handleTimeout();
          },
        );
      },
    ).then((_) {
      _showingWarning = false;
    });
  }

  void _handleTimeout() async {
    if (widget.onTimeout != null) {
      widget.onTimeout!();
    } else {
      // Comportamiento por defecto: cerrar sesión y volver al login
      await AuthService.logout();
      if (mounted) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const LoginPage()),
          (route) => false,
        );
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Sesión cerrada por inactividad'),
            backgroundColor: Colors.orange,
            duration: Duration(seconds: 4),
          ),
        );
      }
    }
  }

  void _onUserActivity() {
    if (!_showingWarning) {
      _resetTimer();
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.translucent,
      onTap: _onUserActivity,
      onPanDown: (_) => _onUserActivity(),
      onScaleStart: (_) => _onUserActivity(),
      child: Listener(
        behavior: HitTestBehavior.translucent,
        onPointerDown: (_) => _onUserActivity(),
        onPointerMove: (_) => _onUserActivity(),
        child: widget.child,
      ),
    );
  }
}

/// Diálogo de cuenta regresiva antes del cierre de sesión
class _CountdownDialog extends StatefulWidget {
  final VoidCallback onContinue;
  final VoidCallback onTimeout;

  const _CountdownDialog({
    required this.onContinue,
    required this.onTimeout,
  });

  @override
  State<_CountdownDialog> createState() => _CountdownDialogState();
}

class _CountdownDialogState extends State<_CountdownDialog> {
  int _secondsRemaining = 60;
  Timer? _countdownTimer;

  @override
  void initState() {
    super.initState();
    _startCountdown();
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    super.dispose();
  }

  void _startCountdown() {
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      setState(() {
        _secondsRemaining--;
      });
      if (_secondsRemaining <= 0) {
        timer.cancel();
        widget.onTimeout();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.orange.shade50,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(Icons.timer_off, color: Colors.orange.shade700, size: 24),
          ),
          const SizedBox(width: 12),
          const Text('Sesión por expirar'),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text(
            'Tu sesión se cerrará por inactividad.',
            style: TextStyle(fontSize: 14),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.orange.shade50,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              children: [
                Text(
                  '$_secondsRemaining',
                  style: TextStyle(
                    fontSize: 42,
                    fontWeight: FontWeight.bold,
                    color: Colors.orange.shade700,
                  ),
                ),
                Text(
                  'segundos',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.orange.shade600,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            '¿Desea continuar trabajando?',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: widget.onTimeout,
          child: Text('Cerrar sesión', style: TextStyle(color: Colors.grey.shade600)),
        ),
        FilledButton(
          onPressed: widget.onContinue,
          style: FilledButton.styleFrom(backgroundColor: const Color(0xFF2E7D32)),
          child: const Text('Continuar'),
        ),
      ],
    );
  }
}
