
import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

typedef Stroke = List<Offset>;

const double kCanvasWidth = 800;
const double kCanvasHeight = 500;
const Color kCanvasDotColor = Color(0xFF008000);
const double kCanvasDotRadius = 5;

const String kCanvasBodyMarker = '__NOTERIETY_CANVAS_V1__';

/// True if this note's body holds canvas data rather than plain text.
bool isCanvasBody(String body) => body.startsWith(kCanvasBodyMarker);

String encodeCanvasBody(List<Stroke> strokes) {
  final raw = strokes
      .map((stroke) => stroke.map((p) => [p.dx, p.dy]).toList())
      .toList();
  return kCanvasBodyMarker + jsonEncode(raw);
}

/// Returns null if `body` isn't canvas data.
List<Stroke>? decodeCanvasBody(String body) {
  if (!isCanvasBody(body)) return null;
  try {
    final raw = jsonDecode(body.substring(kCanvasBodyMarker.length)) as List;
    return raw
        .map<Stroke>((stroke) => (stroke as List)
            .map<Offset>((pt) {
              final p = pt as List;
              return Offset(
                  (p[0] as num).toDouble(), (p[1] as num).toDouble());
            })
            .toList())
        .toList();
  } catch (_) {
    return null;
  }
}

class _DotsPainter extends CustomPainter {
  final List<Stroke> strokes;
  const _DotsPainter(this.strokes);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = kCanvasDotColor
      ..style = PaintingStyle.fill;
    for (final stroke in strokes) {
      for (final point in stroke) {
        canvas.drawCircle(point, kCanvasDotRadius, paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant _DotsPainter oldDelegate) => true;
}

class ShownNoteCanvas extends StatelessWidget {
  final List<Stroke> drawing;
  const ShownNoteCanvas({super.key, this.drawing = const []});

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return AspectRatio(
      aspectRatio: kCanvasWidth / kCanvasHeight,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: colors.border),
          borderRadius: BorderRadius.circular(8),
        ),
        clipBehavior: Clip.antiAlias,
        child: CustomPaint(
          painter: _DotsPainter(drawing),
          child: const SizedBox.expand(),
        ),
      ),
    );
  }
}

class NoteCanvas extends StatefulWidget {
  final List<Stroke> drawing;
  final ValueChanged<Stroke> onStroke;
  const NoteCanvas(
      {super.key, required this.drawing, required this.onStroke});

  @override
  State<NoteCanvas> createState() => _NoteCanvasState();
}

class _NoteCanvasState extends State<NoteCanvas> {
  Offset? _prev;
  Stroke _current = [];
  final List<Offset> _live = [];

  void _startStroke(Offset canvasPoint) {
    _prev = canvasPoint;
    _current = [];
    _live.clear();
  }

  void _extendStroke(Offset canvasPoint) {
    final prev = _prev;
    if (prev == null) return;
    final dx = canvasPoint.dx - prev.dx;
    final dy = canvasPoint.dy - prev.dy;
    final distance = math.sqrt(dx * dx + dy * dy);
    if (distance == 0) return;
    for (double i = 0; i < distance; i += 3) {
      final t = i / distance;
      final point = Offset(prev.dx + dx * t, prev.dy + dy * t);
      _current.add(point);
      _live.add(point);
    }
    _prev = canvasPoint;
    setState(() {});
  }

  void _endStroke() {
    _prev = null;
    if (_current.isNotEmpty) {
      widget.onStroke(List<Offset>.from(_current));
    }
    _current = [];
    _live.clear();
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return AspectRatio(
      aspectRatio: kCanvasWidth / kCanvasHeight,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final scale = constraints.maxWidth / kCanvasWidth;
          Offset toCanvasSpace(Offset local) => local / scale;

          return Container(
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: colors.border),
              borderRadius: BorderRadius.circular(8),
            ),
            clipBehavior: Clip.antiAlias,
            child: GestureDetector(
              onPanStart: (d) => _startStroke(toCanvasSpace(d.localPosition)),
              onPanUpdate: (d) =>
                  _extendStroke(toCanvasSpace(d.localPosition)),
              onPanEnd: (_) => _endStroke(),
              child: CustomPaint(
                painter: _DotsPainter([...widget.drawing, _live]),
                child: const SizedBox.expand(),
              ),
            ),
          );
        },
      ),
    );
  }
}

/// Wraps Undo/Redo controls — mirrors

class CanvasWorkspace extends StatefulWidget {
  final List<Stroke> drawing;
  final ValueChanged<List<Stroke>> onChanged;
  const CanvasWorkspace(
      {super.key, required this.drawing, required this.onChanged});

  @override
  State<CanvasWorkspace> createState() => _CanvasWorkspaceState();
}

class _CanvasWorkspaceState extends State<CanvasWorkspace> {
  final List<Stroke> _redo = [];

  void _handleStroke(Stroke stroke) {
    widget.onChanged([...widget.drawing, stroke]);
    _redo.clear();
  }

  void _undo() {
    if (widget.drawing.isEmpty) return;
    final next = List<Stroke>.from(widget.drawing);
    final removed = next.removeLast();
    setState(() => _redo.add(removed));
    widget.onChanged(next);
  }

  void _redoStroke() {
    if (_redo.isEmpty) return;
    final restored = _redo.removeLast();
    setState(() {});
    widget.onChanged([...widget.drawing, restored]);
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        NoteCanvas(drawing: widget.drawing, onStroke: _handleStroke),
        Padding(
          padding: const EdgeInsets.only(top: 10),
          child: Row(
            children: [
              _smallButton(
                  colors, 'Undo', widget.drawing.isNotEmpty ? _undo : null),
              const SizedBox(width: 10),
              _smallButton(
                  colors, 'Redo', _redo.isNotEmpty ? _redoStroke : null),
            ],
          ),
        ),
      ],
    );
  }

  Widget _smallButton(AppColors colors, String label, VoidCallback? onTap) {
    final enabled = onTap != null;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
        decoration: BoxDecoration(
          color: enabled ? colors.surface : colors.surfaceAlt,
          border: Border.all(color: colors.border),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: enabled ? colors.text : colors.textMuted,
            fontWeight: FontWeight.w600,
            fontSize: 13,
          ),
        ),
      ),
    );
  }
}
