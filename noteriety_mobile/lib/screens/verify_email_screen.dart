import 'package:flutter/material.dart';

import '../api/api.dart';
import '../theme/app_colors.dart';
import '../theme/tokens.dart';
import '../widgets/brand.dart';
import '../widgets/primary_button.dart';

class VerifyEmailScreen extends StatefulWidget {
  final String email;
  final VoidCallback onVerified; // -> go log in
  final VoidCallback onBack; // -> back to login

  const VerifyEmailScreen({
    super.key,
    required this.email,
    required this.onVerified,
    required this.onBack,
  });

  @override
  State<VerifyEmailScreen> createState() => _VerifyEmailScreenState();
}

class _VerifyEmailScreenState extends State<VerifyEmailScreen> {
  final _code = TextEditingController();
  String _error = '';
  bool _busy = false;
  bool _done = false;

  String _resendMsg = '';
  bool _resending = false;

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  Future<void> _handleVerify() async {
    setState(() {
      _error = '';
      _resendMsg = '';
    });
    final code = _code.text.trim();
    if (!RegExp(r'^\d{6}$').hasMatch(code)) {
      setState(() => _error = 'Enter the six-digit code from your email.');
      return;
    }
    setState(() => _busy = true);
    try {
      await verifyEmail(widget.email, code);
      if (mounted) setState(() => _done = true);
    } on ApiException catch (e) {
      // Covers wrong code, expired registration, too many attempts, etc.
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not verify. Try again.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _handleResend() async {
    setState(() {
      _error = '';
      _resendMsg = '';
      _resending = true;
    });
    try {
      await resendVerification(widget.email);
      if (mounted) setState(() => _resendMsg = 'A new code is on its way.');
    } on ApiException catch (e) {
      // e.g. cooldown ("wait N seconds") or expired registration.
      if (mounted) setState(() => _resendMsg = e.message);
    } catch (_) {
      if (mounted) setState(() => _resendMsg = 'Could not resend right now.');
    } finally {
      if (mounted) setState(() => _resending = false);
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
            child: _done ? _successView(colors) : _formView(colors),
          ),
        ),
      ),
    );
  }

  Widget _formView(AppColors colors) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Eyebrow('VERIFY EMAIL'),
        const SizedBox(height: 10),
        const Display('Enter your\ncode.', size: 30),
        Padding(
          padding: const EdgeInsets.only(top: 10, bottom: 20),
          child: Text(
            'We emailed a six-digit code to ${widget.email}. Enter it below to '
            'finish creating your account.',
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
        // Big, centered 6-digit field.
        TextField(
          controller: _code,
          autofocus: true,
          keyboardType: TextInputType.number,
          maxLength: 6,
          textAlign: TextAlign.center,
          cursorColor: colors.primary,
          style: TextStyle(
            fontFamilyFallback: AppFonts.mono,
            fontSize: 30,
            letterSpacing: 12,
            fontWeight: FontWeight.w700,
            color: colors.text,
          ),
          decoration: InputDecoration(
            counterText: '',
            hintText: '000000',
            hintStyle: TextStyle(
              fontFamilyFallback: AppFonts.mono,
              fontSize: 30,
              letterSpacing: 12,
              color: colors.border,
            ),
            filled: true,
            fillColor: colors.surface,
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(color: colors.border),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(color: colors.primary, width: 1.6),
            ),
          ),
        ),
        PrimaryButton(
          label: 'Verify',
          busy: _busy,
          onPressed: _handleVerify,
          margin: const EdgeInsets.only(top: 18),
        ),
        if (_resendMsg.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 14),
            child: Text(
              _resendMsg,
              textAlign: TextAlign.center,
              style: TextStyle(color: colors.textMuted, fontSize: 13),
            ),
          ),
        Center(
          child: TextButton(
            onPressed: _resending ? null : _handleResend,
            child: Text(
              _resending ? 'Sending...' : "Didn't get it? Resend code",
              style: TextStyle(color: colors.primary, fontSize: 14),
            ),
          ),
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

  Widget _successView(AppColors colors) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Eyebrow('VERIFIED'),
        const SizedBox(height: 10),
        const Display("You're all set.", size: 30),
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Text(
            'Your email is verified and your account is ready. Log in to start '
            'taking notes.',
            style: TextStyle(fontSize: 15, height: 1.4, color: colors.textMuted),
          ),
        ),
        PrimaryButton(
          label: 'Log in',
          onPressed: widget.onVerified,
          margin: const EdgeInsets.only(top: 10),
        ),
      ],
    );
  }
}