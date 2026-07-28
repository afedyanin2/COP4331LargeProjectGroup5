import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

class PrimaryButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool busy;
  final EdgeInsetsGeometry? margin;

  const PrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.busy = false,
    this.margin,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return Container(
      margin: margin,
      width: double.infinity,
      child: Opacity(
        opacity: busy ? 0.7 : 1,
        child: Material(
          color: colors.primary,
          borderRadius: BorderRadius.circular(10),
          child: InkWell(
            borderRadius: BorderRadius.circular(10),
            onTap: busy ? null : onPressed,
            child: Container(
              constraints: const BoxConstraints(minHeight: 50),
              alignment: Alignment.center,
              padding: const EdgeInsets.symmetric(vertical: 15, horizontal: 18),
              child: busy
                  ? SizedBox(
                      height: 22,
                      width: 22,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.4,
                        valueColor:
                            AlwaysStoppedAnimation<Color>(colors.onPrimary),
                      ),
                    )
                  : Text(
                      label,
                      style: TextStyle(
                        color: colors.onPrimary,
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
            ),
          ),
        ),
      ),
    );
  }
}

/// The bordered text field used on every form. Centralizes the RN input
/// styling (surface bg, border, 10-radius, 16pt).
class AppTextField extends StatelessWidget {
  final TextEditingController controller;
  final String? hint;
  final bool obscure;
  final bool autofocus;
  final TextInputType? keyboardType;
  final TextCapitalization capitalization;
  final int? maxLines;
  final double minHeight;

  const AppTextField({
    super.key,
    required this.controller,
    this.hint,
    this.obscure = false,
    this.autofocus = false,
    this.keyboardType,
    this.capitalization = TextCapitalization.sentences,
    this.maxLines = 1,
    this.minHeight = 0,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return TextField(
      controller: controller,
      obscureText: obscure,
      autofocus: autofocus,
      keyboardType: keyboardType,
      textCapitalization: capitalization,
      autocorrect: capitalization != TextCapitalization.none,
      maxLines: obscure ? 1 : maxLines,
      style: TextStyle(color: colors.text, fontSize: 16),
      cursorColor: colors.primary,
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(color: colors.textMuted),
        filled: true,
        fillColor: colors.surface,
        isDense: true,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        constraints: BoxConstraints(minHeight: minHeight),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: colors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: colors.primary, width: 1.6),
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: colors.border),
        ),
      ),
    );
  }
}
