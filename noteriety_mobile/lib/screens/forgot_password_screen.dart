import 'package:flutter/material.dart';

import '../api/api.dart';
import '../theme/app_colors.dart';
import '../widgets/brand.dart';
import '../widgets/primary_button.dart';

class ForgotPasswordScreen extends StatefulWidget {
  final VoidCallback onBack;
  const ForgotPasswordScreen({super.key, required this.onBack});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _email = TextEditingController();
  String _error = '';
  bool _busy = false;
  bool _sent = false;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _handleSend() async {
    setState(() => _error = '');
    final email = _email.text.trim();
    if (email.isEmpty || !email.contains('@')) {
      setState(() => _error = 'Please enter a valid email address.');
      return;
    }
    setState(() => _busy = true);
    try {
      await forgotPassword(email);
      if (mounted) setState(() => _sent = true);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not send reset email.');
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
            child: _sent ? _sentView(colors) : _formView(colors),
          ),
        ),
      ),
    );
  }

  Widget _formView(AppColors colors) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Eyebrow('ACCOUNT RECOVERY'),
        const SizedBox(height: 10),
        const Display('Reset your\npassword.', size: 30),
        Padding(
          padding: const EdgeInsets.only(top: 10, bottom: 20),
          child: Text(
            "Enter the email on your account and we'll send you a reset link.",
            style: TextStyle(fontSize: 15, height: 1.4, color: colors.textMuted),
          ),
        ),
        if (_error.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Text(
              _error,
              textAlign: TextAlign.center,
              style: TextStyle(color: colors.error, fontSize: 14),
            ),
          ),
        AppTextField(
          controller: _email,
          hint: 'you@example.com',
          keyboardType: TextInputType.emailAddress,
          capitalization: TextCapitalization.none,
        ),
        PrimaryButton(
          label: 'Send reset link',
          busy: _busy,
          onPressed: _handleSend,
          margin: const EdgeInsets.only(top: 22),
        ),
        Center(
          child: TextButton(
            onPressed: widget.onBack,
            child: Text(
              'Back to log in',
              style: TextStyle(color: colors.textMuted, fontSize: 14),
            ),
          ),
        ),
      ],
    );
  }

  Widget _sentView(AppColors colors) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Eyebrow('EMAIL SENT'),
        const SizedBox(height: 10),
        const Display('Check your inbox.', size: 30),
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Text(
            "If an account exists for ${_email.text.trim()}, we've sent a link "
            'to reset your password. Open it on this device or your computer.',
            style: TextStyle(fontSize: 15, height: 1.4, color: colors.textMuted),
          ),
        ),
        PrimaryButton(
          label: 'Back to log in',
          onPressed: widget.onBack,
          margin: const EdgeInsets.only(top: 10),
        ),
      ],
    );
  }
}
