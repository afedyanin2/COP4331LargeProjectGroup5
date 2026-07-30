import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app_colors.dart';
import 'tokens.dart';

const String _modeKey = 'noteriety_theme_mode';

class ThemeController extends ChangeNotifier {
  ThemeMode _mode = ThemeMode.system;
  ThemeMode get mode => _mode;

  /// 'system' | 'light' | 'dark' — matches the RN segmented control values.
  String get modeName => switch (_mode) {
        ThemeMode.light => 'light',
        ThemeMode.dark => 'dark',
        ThemeMode.system => 'system',
      };

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_modeKey);
    _mode = switch (saved) {
      'light' => ThemeMode.light,
      'dark' => ThemeMode.dark,
      _ => ThemeMode.system,
    };
    notifyListeners();
  }

  Future<void> setModeName(String next) async {
    _mode = switch (next) {
      'light' => ThemeMode.light,
      'dark' => ThemeMode.dark,
      _ => ThemeMode.system,
    };
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_modeKey, next);
  }
}

ThemeData buildTheme(AppColors c, Brightness brightness) {
  final base = ThemeData(brightness: brightness, useMaterial3: true);
  return base.copyWith(
    scaffoldBackgroundColor: c.background,
    canvasColor: c.background,
    primaryColor: c.primary,
    colorScheme: base.colorScheme.copyWith(
      brightness: brightness,
      primary: c.primary,
      onPrimary: c.onPrimary,
      surface: c.surface,
      onSurface: c.text,
      error: c.error,
    ),
    textSelectionTheme: TextSelectionThemeData(
      cursorColor: c.primary,
      selectionColor: c.primary.withOpacity(0.25),
      selectionHandleColor: c.primary,
    ),
    splashColor: c.primary.withOpacity(0.10),
    highlightColor: c.primary.withOpacity(0.06),
    extensions: <ThemeExtension<dynamic>>[c],
  );
}

ThemeData get lightTheme => buildTheme(AppColors.light, Brightness.light);
ThemeData get darkTheme => buildTheme(AppColors.dark, Brightness.dark);

// Shared text-style helpers (serif display + mono eyebrow), used by the
// Brand widgets and a few screens directly, mirroring the RN Brand.js.
TextStyle serifStyle({
  required double size,
  Color? color,
  FontWeight weight = FontWeight.w700,
  double letterSpacing = -0.6,
  double? height,
}) {
  return TextStyle(
    fontFamilyFallback: AppFonts.serif,
    fontSize: size,
    fontWeight: weight,
    color: color,
    letterSpacing: letterSpacing,
    height: height,
  );
}

TextStyle eyebrowStyle(Color color) {
  return TextStyle(
    fontFamilyFallback: AppFonts.mono,
    fontSize: 11,
    letterSpacing: 1.4,
    fontWeight: FontWeight.w600,
    color: color,
  );
}
