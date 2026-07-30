import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/api.dart';
import '../models/models.dart';
import '../theme/app_colors.dart';
import '../theme/theme_controller.dart';
import '../theme/tokens.dart';

class SettingsScreen extends StatefulWidget {
  final VoidCallback onLogout;
  const SettingsScreen({super.key, required this.onLogout});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  User? _me;
  bool _loading = true;
  String _error = '';

  final _email = TextEditingController();
  bool _sending = false;
  bool _sent = false;

  @override
  void initState() {
    super.initState();
    getMe().then((data) {
      if (!mounted) return;
      setState(() {
        _me = data;
        if (data.email.isNotEmpty) _email.text = data.email;
      });
    }).catchError((e) {
      if (mounted) {
        setState(() => _error = e is ApiException
            ? e.message
            : 'Could not load account.');
      }
    }).whenComplete(() {
      if (mounted) setState(() => _loading = false);
    });

    // Fallback if /api/me doesn't include the email.
    getEmail().then((saved) {
      if (mounted && _email.text.isEmpty && saved != null) {
        _email.text = saved;
      }
    });
  }

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _handleResend() async {
    final email = _email.text.trim();
    if (email.isEmpty || !email.contains('@')) {
      _snack('Enter the email you signed up with.');
      return;
    }
    setState(() => _sending = true);
    try {
      await resendVerification(email);
      if (mounted) setState(() => _sent = true);
    } catch (e) {
      _snack('Could not send: $e');
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  void _snack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(msg)));
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final verified = _me?.emailVerified ?? false;

    return Scaffold(
      backgroundColor: colors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 50),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top bar
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: Text('Back',
                        style:
                            TextStyle(color: colors.primary, fontSize: 16)),
                  ),
                  Text(
                    'Settings',
                    style: TextStyle(
                      fontFamilyFallback: AppFonts.serif,
                      color: colors.text,
                      fontWeight: FontWeight.w700,
                      fontSize: 19,
                    ),
                  ),
                  const SizedBox(width: 44),
                ],
              ),
              const SizedBox(height: 24),
              if (_loading)
                Padding(
                  padding: const EdgeInsets.only(top: 40),
                  child: Center(
                      child:
                          CircularProgressIndicator(color: colors.primary)),
                )
              else ...[
                if (_error.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text(_error,
                        style:
                            TextStyle(color: colors.error, fontSize: 14)),
                  ),
                _sectionLabel('ACCOUNT', colors),
                _card(colors, [
                  _row('Name',
                      _me?.displayName.isNotEmpty == true
                          ? _me!.displayName
                          : '—',
                      colors),
                  _divider(colors),
                  _row('Username', _me?.username ?? '—', colors),
                  _divider(colors),
                  Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 14),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Email status',
                            style: TextStyle(
                                color: colors.textMuted, fontSize: 15)),
                        Text(
                          verified ? 'Verified' : 'Not verified',
                          style: TextStyle(
                            color:
                                verified ? colors.success : colors.warning,
                            fontWeight: FontWeight.w700,
                            fontSize: 15,
                          ),
                        ),
                      ],
                    ),
                  ),
                ]),
                if (!verified) _resendCard(colors),
                _sectionLabel('APPEARANCE', colors),
                _appearanceCard(colors),
                const SizedBox(height: 8),
                _logoutButton(colors),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _resendCard(AppColors colors) {
    return _cardRaw(
      colors,
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            child: Text('Verify your email to secure your account.',
                style: TextStyle(color: colors.textMuted, fontSize: 14)),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: TextField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              textCapitalization: TextCapitalization.none,
              autocorrect: false,
              style: TextStyle(color: colors.text, fontSize: 15),
              cursorColor: colors.primary,
              decoration: InputDecoration(
                hintText: 'you@example.com',
                hintStyle: TextStyle(color: colors.textMuted),
                filled: true,
                fillColor: colors.surfaceAlt,
                isDense: true,
                contentPadding: const EdgeInsets.symmetric(
                    horizontal: 14, vertical: 11),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide(color: colors.border),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide(color: colors.primary),
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: SizedBox(
              width: double.infinity,
              child: Material(
                color: colors.primary,
                borderRadius: BorderRadius.circular(10),
                child: InkWell(
                  borderRadius: BorderRadius.circular(10),
                  onTap: _sending ? null : _handleResend,
                  child: Container(
                    constraints: const BoxConstraints(minHeight: 46),
                    alignment: Alignment.center,
                    padding: const EdgeInsets.symmetric(vertical: 13),
                    child: _sending
                        ? SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation<Color>(
                                  colors.onPrimary),
                            ),
                          )
                        : Text(
                            _sent
                                ? 'Sent — check your inbox'
                                : 'Resend verification email',
                            style: TextStyle(
                                color: colors.onPrimary,
                                fontWeight: FontWeight.w700),
                          ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _appearanceCard(AppColors colors) {
    final controller = context.watch<ThemeController>();
    final current = controller.modeName;
    return _cardRaw(
      colors,
      Padding(
        padding: const EdgeInsets.all(8),
        child: Row(
          children: [
            for (final option in const ['system', 'light', 'dark'])
              Expanded(
                child: Padding(
                  padding: EdgeInsets.only(
                      right: option != 'dark' ? 8 : 0),
                  child: GestureDetector(
                    onTap: () =>
                        context.read<ThemeController>().setModeName(option),
                    child: Container(
                      alignment: Alignment.center,
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        color: current == option
                            ? colors.primary
                            : Colors.transparent,
                        border: Border.all(color: colors.border),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '${option[0].toUpperCase()}${option.substring(1)}',
                        style: TextStyle(
                          color: current == option
                              ? colors.onPrimary
                              : colors.text,
                          fontWeight: current == option
                              ? FontWeight.w700
                              : FontWeight.w500,
                          fontSize: 14,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _logoutButton(AppColors colors) {
    return GestureDetector(
      onTap: () {
        Navigator.pop(context); // leave settings first
        widget.onLogout();
      },
      child: Container(
        alignment: Alignment.center,
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          border: Border.all(color: colors.border),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text('Log Out',
            style: TextStyle(
                color: colors.error,
                fontWeight: FontWeight.w700,
                fontSize: 15)),
      ),
    );
  }

  // --- small building blocks ---

  Widget _sectionLabel(String text, AppColors colors) => Padding(
        padding: const EdgeInsets.only(top: 8, bottom: 8),
        child: Text(
          text,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.8,
            color: colors.textMuted,
          ),
        ),
      );

  Widget _card(AppColors colors, List<Widget> children) => Container(
        margin: const EdgeInsets.only(bottom: 20),
        decoration: BoxDecoration(
          color: colors.surface,
          border: Border.all(color: colors.border),
          borderRadius: BorderRadius.circular(12),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(children: children),
      );

  Widget _cardRaw(AppColors colors, Widget child) => Container(
        margin: const EdgeInsets.only(bottom: 20),
        decoration: BoxDecoration(
          color: colors.surface,
          border: Border.all(color: colors.border),
          borderRadius: BorderRadius.circular(12),
        ),
        clipBehavior: Clip.antiAlias,
        child: child,
      );

  Widget _row(String label, String value, AppColors colors) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label,
                style: TextStyle(color: colors.textMuted, fontSize: 15)),
            Flexible(
              child: Text(
                value,
                textAlign: TextAlign.right,
                style: TextStyle(
                    color: colors.text,
                    fontSize: 15,
                    fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
      );

  Widget _divider(AppColors colors) =>
      Container(height: 1, color: colors.border);
}
