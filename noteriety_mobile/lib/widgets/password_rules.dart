import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

const int minPasswordLength = 8;

class PasswordChecks {
  final bool length;
  final bool upper;
  final bool number;
  final bool symbol;
  const PasswordChecks(this.length, this.upper, this.number, this.symbol);

  int get strength =>
      [length, upper, number, symbol].where((b) => b).length;
}

PasswordChecks checkPassword(String password) {
  return PasswordChecks(
    password.length >= minPasswordLength,
    RegExp(r'[A-Z]').hasMatch(password),
    RegExp(r'[0-9]').hasMatch(password),
    RegExp(r'[^A-Za-z0-9]').hasMatch(password),
  );
}

bool isPasswordValid(String password) => checkPassword(password).length;

class PasswordRules extends StatelessWidget {
  final String password;
  const PasswordRules({super.key, required this.password});

  @override
  Widget build(BuildContext context) {
    if (password.isEmpty) return const SizedBox.shrink();
    final colors = context.colors;
    final c = checkPassword(password);
    final strength = c.strength;

    Color barColor(int i) {
      if (i >= strength) return colors.border;
      if (strength <= 1) return colors.error;
      if (strength <= 2) return colors.warning;
      return colors.success;
    }

    return Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colors.surfaceAlt,
        border: Border.all(color: colors.border),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Row(
              children: List.generate(4, (i) {
                return Expanded(
                  child: Container(
                    height: 4,
                    margin: EdgeInsets.only(right: i < 3 ? 5 : 0),
                    decoration: BoxDecoration(
                      color: barColor(i),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                );
              }),
            ),
          ),
          _Rule(
            met: c.length,
            required: true,
            label: 'At least $minPasswordLength characters',
          ),
          _Rule(met: c.upper, label: 'An uppercase letter'),
          _Rule(met: c.number, label: 'A number'),
          _Rule(met: c.symbol, label: 'A symbol'),
        ],
      ),
    );
  }
}

class _Rule extends StatelessWidget {
  final bool met;
  final bool required;
  final String label;
  const _Rule({required this.met, required this.label, this.required = false});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final markColor =
        met ? colors.success : (required ? colors.error : colors.textMuted);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 18,
            child: Text(
              met ? '\u2713' : '\u2717',
              style: TextStyle(fontSize: 13, color: markColor),
            ),
          ),
          Expanded(
            child: Text(
              required ? label : '$label  (recommended)',
              style: TextStyle(
                fontSize: 13,
                color: met ? colors.text : colors.textMuted,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
