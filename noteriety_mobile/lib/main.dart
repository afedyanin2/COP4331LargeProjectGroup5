// main.dart — app entry point. Wires up ThemeController (light/dark/system,
// persisted via SharedPreferences) and a lightweight screen switcher, since
// the screens themselves use plain callbacks (onLoggedIn, onGoToRegister,
// etc.) rather than named routes.

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'api/api.dart';
import 'screens/forgot_password_screen.dart';
import 'screens/login_screen.dart';
import 'screens/notes_screen.dart';
import 'screens/register_screen.dart';
import 'screens/splash_screen.dart';
import 'theme/theme_controller.dart';

const int splashMs = 1400;

void main() {
  runApp(const NoterietyApp());
}

class NoterietyApp extends StatelessWidget {
  const NoterietyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => ThemeController()..load(),
      child: Consumer<ThemeController>(
        builder: (context, theme, _) => MaterialApp(
          title: 'Noteriety',
          debugShowCheckedModeBanner: false,
          theme: lightTheme,
          darkTheme: darkTheme,
          themeMode: theme.mode,
          home: const RootGate(),
        ),
      ),
    );
  }
}

class RootGate extends StatefulWidget {
  const RootGate({super.key});

  @override
  State<RootGate> createState() => _RootGateState();
}

class _RootGateState extends State<RootGate> {
  bool _booting = true;
  bool _authed = false;

  @override
  void initState() {
    super.initState();
    _boot();
  }

  Future<void> _boot() async {
    final started = DateTime.now();
    String? token;
    try {
      token = await getToken();
    } catch (_) {
      token = null;
    }
    final elapsed = DateTime.now().difference(started).inMilliseconds;
    final wait = splashMs - elapsed;
    if (wait > 0) {
      await Future.delayed(Duration(milliseconds: wait));
    }
    if (!mounted) return;
    setState(() {
      _authed = token != null && token.isNotEmpty;
      _booting = false;
    });
  }

  Future<void> _handleLogout() async {
    await clearToken();
    if (mounted) setState(() => _authed = false);
  }

  @override
  Widget build(BuildContext context) {
    if (_booting) return const SplashScreen();
    if (!_authed) {
      return AuthFlow(onAuthed: () => setState(() => _authed = true));
    }
    return NotesScreen(onLogout: _handleLogout);
  }
}

/// The logged-out flow: switches between login / register / forgot, exactly
/// like the RN authView state did.
class AuthFlow extends StatefulWidget {
  final VoidCallback onAuthed;
  const AuthFlow({super.key, required this.onAuthed});

  @override
  State<AuthFlow> createState() => _AuthFlowState();
}

class _AuthFlowState extends State<AuthFlow> {
  String _view = 'login'; // 'login' | 'register' | 'forgot'

  @override
  Widget build(BuildContext context) {
    switch (_view) {
      case 'register':
        return RegisterScreen(
          onRegistered: widget.onAuthed,
          onGoToLogin: () => setState(() => _view = 'login'),
        );
      case 'forgot':
        return ForgotPasswordScreen(
          onBack: () => setState(() => _view = 'login'),
        );
      default:
        return LoginScreen(
          onLoggedIn: widget.onAuthed,
          onGoToRegister: () => setState(() => _view = 'register'),
          onForgotPassword: () => setState(() => _view = 'forgot'),
        );
    }
  }
}