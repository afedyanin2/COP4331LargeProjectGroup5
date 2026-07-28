// main.dart — app entry point. Wires up ThemeController (light/dark/system,
// persisted via SharedPreferences) and a lightweight screen switcher, since
// the screens themselves use plain callbacks (onLoggedIn, onGoToRegister,
// etc.) rather than named routes.

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'api/api.dart';
import 'theme/theme_controller.dart';
import 'screens/splash_screen.dart';
import 'screens/login_screen.dart';
import 'screens/register_screen.dart';
import 'screens/forgot_password_screen.dart';
import 'screens/notes_screen.dart';

void main() {
  runApp(
    ChangeNotifierProvider(
      create: (_) => ThemeController()..load(),
      child: const NoterietyApp(),
    ),
  );
}

class NoterietyApp extends StatelessWidget {
  const NoterietyApp({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<ThemeController>();
    return MaterialApp(
      title: 'Noteriety',
      debugShowCheckedModeBanner: false,
      themeMode: controller.mode,
      theme: lightTheme,
      darkTheme: darkTheme,
      home: const AppRoot(),
    );
  }
}

enum _Screen { splash, login, register, forgotPassword, notes }

/// Top-level screen switcher. Checks for a saved login token while the
/// splash screen holds (matching the "minimum-hold timing lives in
/// main.dart" note in splash_screen.dart), then routes to Notes or Login.
class AppRoot extends StatefulWidget {
  const AppRoot({super.key});

  @override
  State<AppRoot> createState() => _AppRootState();
}

class _AppRootState extends State<AppRoot> {
  _Screen _screen = _Screen.splash;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    final results = await Future.wait([
      getToken(),
      Future.delayed(const Duration(milliseconds: 1100)),
    ]);
    final token = results[0] as String?;
    if (!mounted) return;
    setState(() {
      _screen =
          (token != null && token.isNotEmpty) ? _Screen.notes : _Screen.login;
    });
  }

  void _goTo(_Screen next) => setState(() => _screen = next);

  @override
  Widget build(BuildContext context) {
    switch (_screen) {
      case _Screen.splash:
        return const SplashScreen();

      case _Screen.login:
        return LoginScreen(
          onLoggedIn: () => _goTo(_Screen.notes),
          onGoToRegister: () => _goTo(_Screen.register),
          onForgotPassword: () => _goTo(_Screen.forgotPassword),
        );

      case _Screen.register:
        return RegisterScreen(
          onRegistered: () => _goTo(_Screen.notes),
          onGoToLogin: () => _goTo(_Screen.login),
        );

      case _Screen.forgotPassword:
        return ForgotPasswordScreen(
          onBack: () => _goTo(_Screen.login),
        );

      case _Screen.notes:
        return NotesScreen(
          onLogout: () async {
            await clearToken();
            if (!mounted) return;
            _goTo(_Screen.login);
          },
        );
    }
  }
}