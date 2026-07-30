import 'package:flutter/material.dart';

import '../api/api.dart';
import '../theme/app_colors.dart';
import '../widgets/brand.dart';
import '../widgets/primary_button.dart';

class LoginScreen extends StatefulWidget {
  final VoidCallback onLoggedIn;
  final VoidCallback onGoToRegister;
  final VoidCallback onForgotPassword;

  const LoginScreen({
    super.key,
    required this.onLoggedIn,
    required this.onGoToRegister,
    required this.onForgotPassword,
  });

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _username = TextEditingController();
  final _password = TextEditingController();
  String _error = '';
  bool _busy = false;

  @override
  void dispose() {
    _username.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    setState(() => _error = '');
    final u = _username.text.trim();
    final p = _password.text;
    if (u.isEmpty || p.trim().isEmpty) {
      setState(() => _error = 'Please enter your username and password.');
      return;
    }
    setState(() => _busy = true);
    try {
      final data = await login(u, p);
      final token = data['token'];
      if (token is String && token.isNotEmpty) {
        await saveToken(token);
      }
      if (!mounted) return;
      widget.onLoggedIn();
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not log in. Try again.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return Scaffold(
      backgroundColor: colors.background,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Logo(),
                const Eyebrow('WELCOME BACK',
                    padding: EdgeInsets.only(top: 30)),
                const SizedBox(height: 10),
                const Display('Sign in to\nyour notes.', size: 32),
                const SizedBox(height: 22),
                if (_error.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Text(
                      _error,
                      textAlign: TextAlign.center,
                      style: TextStyle(color: colors.error, fontSize: 14),
                    ),
                  ),
                _label('Username'),
                AppTextField(
                  controller: _username,
                  hint: 'username',
                  capitalization: TextCapitalization.none,
                ),
                _label('Password'),
                AppTextField(
                  controller: _password,
                  hint: 'password',
                  obscure: true,
                  capitalization: TextCapitalization.none,
                ),
                PrimaryButton(
                  label: 'Log In',
                  busy: _busy,
                  onPressed: _handleLogin,
                  margin: const EdgeInsets.only(top: 28),
                ),
                Center(
                  child: TextButton(
                    onPressed: widget.onForgotPassword,
                    child: Text(
                      'Forgot password?',
                      style: TextStyle(color: colors.primary, fontSize: 14),
                    ),
                  ),
                ),
                Center(
                  child: GestureDetector(
                    onTap: widget.onGoToRegister,
                    child: Text.rich(
                      TextSpan(
                        text: "Don't have an account? ",
                        style: TextStyle(color: colors.textMuted, fontSize: 14),
                        children: [
                          TextSpan(
                            text: 'Sign up',
                            style: TextStyle(color: colors.primary),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _label(String text) => Padding(
        padding: const EdgeInsets.only(top: 14, bottom: 6),
        child: Text(
          text,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: context.colors.text,
          ),
        ),
      );
}
