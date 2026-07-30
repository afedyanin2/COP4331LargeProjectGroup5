import 'package:flutter/material.dart';

import '../api/api.dart';
import '../theme/app_colors.dart';
import '../widgets/brand.dart';
import '../widgets/password_rules.dart';
import '../widgets/primary_button.dart';

class RegisterScreen extends StatefulWidget {
  final VoidCallback onRegistered; // token path (unused by this backend)
  final void Function(String email) onNeedsVerification; // -> code screen
  final VoidCallback onGoToLogin;

  const RegisterScreen({
    super.key,
    required this.onRegistered,
    required this.onNeedsVerification,
    required this.onGoToLogin,
  });

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _first = TextEditingController();
  final _last = TextEditingController();
  final _email = TextEditingController();
  final _username = TextEditingController();
  final _password = TextEditingController();

  String _error = '';
  bool _busy = false;

  @override
  void dispose() {
    for (final c in [_first, _last, _email, _username, _password]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _handleRegister() async {
    setState(() => _error = '');
    final email = _email.text.trim();
    final username = _username.text.trim();
    final password = _password.text;

    if (username.isEmpty || password.trim().isEmpty || email.isEmpty) {
      setState(() => _error = 'Username, email, and password are required.');
      return;
    }
    if (!email.contains('@')) {
      setState(() => _error = 'Please enter a valid email address.');
      return;
    }
    if (!isPasswordValid(password)) {
      setState(() =>
          _error = 'Password must be at least $minPasswordLength characters.');
      return;
    }

    setState(() => _busy = true);
    try {
      final data = await register(
        username: username,
        password: password,
        firstName: _first.text.trim(),
        lastName: _last.text.trim(),
        email: email,
      );
      final token = data['token'];
      if (token is String && token.isNotEmpty) {
        await saveToken(token);
        if (!mounted) return;
        widget.onRegistered();
      } else {
        // Expected path: no token — the backend emailed a six-digit code and
        // staged a pending registration. Hand off to the verify screen.
        if (mounted) widget.onNeedsVerification(email);
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not create account.');
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
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(28, 40, 28, 40),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Logo(),
              const Eyebrow('GET STARTED', padding: EdgeInsets.only(top: 26)),
              const SizedBox(height: 10),
              const Display('Create your\naccount.', size: 30),
              const SizedBox(height: 6),
              if (_error.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(
                    _error,
                    textAlign: TextAlign.center,
                    style: TextStyle(color: colors.error, fontSize: 14),
                  ),
                ),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _label('First name'),
                        AppTextField(controller: _first, hint: 'First'),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _label('Last name'),
                        AppTextField(controller: _last, hint: 'Last'),
                      ],
                    ),
                  ),
                ],
              ),
              _label('Email'),
              AppTextField(
                controller: _email,
                hint: 'you@example.com',
                keyboardType: TextInputType.emailAddress,
                capitalization: TextCapitalization.none,
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
                hint: 'At least 8 characters',
                obscure: true,
                capitalization: TextCapitalization.none,
              ),
              // Live rules react to typing.
              ValueListenableBuilder(
                valueListenable: _password,
                builder: (_, value, __) =>
                    PasswordRules(password: value.text),
              ),
              PrimaryButton(
                label: 'Create Account',
                busy: _busy,
                onPressed: _handleRegister,
                margin: const EdgeInsets.only(top: 26),
              ),
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Center(
                  child: Text(
                    "We'll email you a six-digit code.",
                    style: TextStyle(fontSize: 12, color: colors.textMuted),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Center(
                child: GestureDetector(
                  onTap: widget.onGoToLogin,
                  child: Text.rich(
                    TextSpan(
                      text: 'Already have an account? ',
                      style: TextStyle(color: colors.textMuted, fontSize: 14),
                      children: [
                        TextSpan(
                          text: 'Log in',
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