import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/tokens.dart';

class Logo extends StatelessWidget {
  final String size; // 'md' | 'lg'
  final bool tile; // draw the rounded background square behind the logo
  const Logo({super.key, this.size = 'md', this.tile = false});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final isDark = context.isDark;
    final bool lg = size == 'lg';
    final double box = lg ? 76 : 44;
    final double radius = lg ? 20 : 12;
    final double art = (box * (tile ? 0.62 : 1)).roundToDouble();
    final double word = lg ? 34 : 22;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: box,
          height: box,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: tile ? colors.surfaceAlt : Colors.transparent,
            borderRadius: BorderRadius.circular(radius),
            border: tile ? Border.all(color: colors.border) : null,
          ),
          child: Image.asset(

            // import logos
            isDark
                ? 'assets/images/dark-theme.webp'
                : 'assets/images/light-theme.webp',
            width: art,
            height: art,
            fit: BoxFit.contain,
          ),
        ),
        const SizedBox(width: 12),
        Text(
          'Noteriety',
          style: TextStyle(
            fontFamilyFallback: AppFonts.serif,
            fontSize: word,
            fontWeight: FontWeight.w700,
            color: colors.text,
            letterSpacing: -0.4,
          ),
        ),
      ],
    );
  }
}

/// The small monospace label with a leading rule, e.g. "—— WORKSPACE".
class Eyebrow extends StatelessWidget {
  final String text;
  final EdgeInsetsGeometry? padding;
  const Eyebrow(this.text, {super.key, this.padding});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return Padding(
      padding: padding ?? EdgeInsets.zero,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 22,
            height: 2,
            margin: const EdgeInsets.only(right: 8),
            decoration: BoxDecoration(
              color: colors.primary,
              borderRadius: BorderRadius.circular(1),
            ),
          ),
          Text(
            text,
            style: TextStyle(
              fontFamilyFallback: AppFonts.mono,
              fontSize: 11,
              letterSpacing: 1.4,
              fontWeight: FontWeight.w600,
              color: colors.primary,
            ),
          ),
        ],
      ),
    );
  }
}

/// Serif page heading.
class Display extends StatelessWidget {
  final String text;
  final double size;
  final TextAlign? align;
  const Display(this.text, {super.key, this.size = 30, this.align});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return Text(
      text,
      textAlign: align,
      style: TextStyle(
        fontFamilyFallback: AppFonts.serif,
        fontSize: size,
        fontWeight: FontWeight.w700,
        color: colors.text,
        letterSpacing: -0.6,
        height: 1.15,
      ),
    );
  }
}