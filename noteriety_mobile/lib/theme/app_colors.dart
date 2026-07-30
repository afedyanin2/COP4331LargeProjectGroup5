import 'package:flutter/material.dart';

@immutable
class AppColors extends ThemeExtension<AppColors> {
  final Color background;
  final Color surface;
  final Color surfaceAlt;
  final Color text;
  final Color textMuted;
  final Color primary;
  final Color onPrimary; // text/icon color that sits ON a primary fill
  final Color success;
  final Color warning;
  final Color error;
  final Color border;

  const AppColors({
    required this.background,
    required this.surface,
    required this.surfaceAlt,
    required this.text,
    required this.textMuted,
    required this.primary,
    required this.onPrimary,
    required this.success,
    required this.warning,
    required this.error,
    required this.border,
  });

  static const AppColors light = AppColors(
    background: Color(0xFFF6FAF7),
    surface: Color(0xFFFFFFFF),
    surfaceAlt: Color(0xFFE9F5EE),
    text: Color(0xFF1A2B22),
    textMuted: Color(0xFF38765F),
    primary: Color(0xFF2A7F55), // ~4.9:1 on white
    onPrimary: Color(0xFFFFFFFF),
    success: Color(0xFF52C41A),
    warning: Color(0xFFF5A623),
    error: Color(0xFFE74C3C),
    border: Color(0xFFDCEBE2),
  );

  static const AppColors dark = AppColors(
    background: Color(0xFF08140E),
    surface: Color(0xFF0F1E16),
    surfaceAlt: Color(0xFF173125),
    text: Color(0xFFE9F7EF),
    textMuted: Color(0xFF9CC5A6),
    primary: Color(0xFF6FD8A8),
    onPrimary: Color(0xFF08140E), // dark text on a light primary fill
    success: Color(0xFF7BD97B),
    warning: Color(0xFFFFC857),
    error: Color(0xFFFF7B6F),
    border: Color(0xFF173125),
  );

  @override
  AppColors copyWith({
    Color? background,
    Color? surface,
    Color? surfaceAlt,
    Color? text,
    Color? textMuted,
    Color? primary,
    Color? onPrimary,
    Color? success,
    Color? warning,
    Color? error,
    Color? border,
  }) {
    return AppColors(
      background: background ?? this.background,
      surface: surface ?? this.surface,
      surfaceAlt: surfaceAlt ?? this.surfaceAlt,
      text: text ?? this.text,
      textMuted: textMuted ?? this.textMuted,
      primary: primary ?? this.primary,
      onPrimary: onPrimary ?? this.onPrimary,
      success: success ?? this.success,
      warning: warning ?? this.warning,
      error: error ?? this.error,
      border: border ?? this.border,
    );
  }

  @override
  AppColors lerp(ThemeExtension<AppColors>? other, double t) {
    if (other is! AppColors) return this;
    return AppColors(
      background: Color.lerp(background, other.background, t)!,
      surface: Color.lerp(surface, other.surface, t)!,
      surfaceAlt: Color.lerp(surfaceAlt, other.surfaceAlt, t)!,
      text: Color.lerp(text, other.text, t)!,
      textMuted: Color.lerp(textMuted, other.textMuted, t)!,
      primary: Color.lerp(primary, other.primary, t)!,
      onPrimary: Color.lerp(onPrimary, other.onPrimary, t)!,
      success: Color.lerp(success, other.success, t)!,
      warning: Color.lerp(warning, other.warning, t)!,
      error: Color.lerp(error, other.error, t)!,
      border: Color.lerp(border, other.border, t)!,
    );
  }
}

/// Convenience: `context.colors.primary`.
extension AppColorsContext on BuildContext {
  AppColors get colors =>
      Theme.of(this).extension<AppColors>() ?? AppColors.light;

  bool get isDark => Theme.of(this).brightness == Brightness.dark;
}
