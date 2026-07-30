import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/tokens.dart';
import '../widgets/brand.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c;
  late final Animation<double> _fade;
  late final Animation<double> _rise;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    _fade = CurvedAnimation(parent: _c, curve: Curves.easeOut);
    _rise = Tween<double>(begin: 14, end: 0)
        .animate(CurvedAnimation(parent: _c, curve: Curves.easeOut));
    _c.forward();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return Scaffold(
      backgroundColor: colors.background,
      body: Center(
        child: AnimatedBuilder(
          animation: _c,
          builder: (context, child) => Opacity(
            opacity: _fade.value,
            child: Transform.translate(
              offset: Offset(0, _rise.value),
              child: child,
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Logo(size: 'lg'),
              const SizedBox(height: 22),
              Text(
                'NOTES MADE SIMPLE',
                style: TextStyle(
                  fontFamilyFallback: AppFonts.mono,
                  fontSize: 11,
                  letterSpacing: 1.6,
                  color: colors.textMuted,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
