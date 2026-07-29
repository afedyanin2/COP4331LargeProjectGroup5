import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

const double kCanvasWidth = 800;
const double kCanvasHeight = 500;
const String oldCanvasPrefix = '__NOTERIETY_CANVAS_V1__';
const String canvasPrefix = '__NOTERIETY_CANVAS_V2__';

const Color kDefaultStrokeColor = Color(0xFF008000);
const double kDefaultStrokeWidth = 10;

class Stroke {
  final List<Offset> points;
  final Color color;
  final double width;

  const Stroke({
    required this.points,
    this.color = kDefaultStrokeColor,
    this.width = kDefaultStrokeWidth,
  });

  Stroke copyWith({
    List<Offset>? points,
    Color? color,
    double? width,
  }) {
    return Stroke(
      points: points ?? this.points,
      color: color ?? this.color,
      width: width ?? this.width,
    );
  }
}

/// True if this note's body contains canvas data instead of text.
bool isCanvasBody(String body) {
  return body.startsWith(oldCanvasPrefix) ||
      body.startsWith(canvasPrefix);
}

/// Encodes the current canvas format
String encodeCanvasBody(List<Stroke> strokes) {
  final raw = strokes
      .map(
        (stroke) => {
          'points': stroke.points.map((p) => [p.dx, p.dy]).toList(),
          'color': stroke.color.toARGB32(),
          'width': stroke.width,
        },
      )
      .toList();

  return canvasPrefix + jsonEncode(raw);
}

/// V1 still supported
List<Stroke>? decodeCanvasBody(String body) {
  if (!isCanvasBody(body)) return null;

  try {
    if (body.startsWith(canvasPrefix)) {
      final raw = jsonDecode(
        body.substring(canvasPrefix.length),
      ) as List;

      return raw.map<Stroke>((value) {
        final map = value as Map<String, dynamic>;
        final rawPoints = (map['points'] as List?) ?? const [];
        final colorValue = (map['color'] as num?)?.toInt() ??
            kDefaultStrokeColor.toARGB32();
        final width = (map['width'] as num?)?.toDouble() ??
            kDefaultStrokeWidth;

        return Stroke(
          points: rawPoints.map<Offset>((value) {
            final point = value as List;
            return Offset(
              (point[0] as num).toDouble(),
              (point[1] as num).toDouble(),
            );
          }).toList(),
          color: Color(colorValue),
          width: width,
        );
      }).toList();
    }

    final raw = jsonDecode(
      body.substring(oldCanvasPrefix.length),
    ) as List;

    return raw.map<Stroke>((value) {
      final rawPoints = value as List;
      return Stroke(
        points: rawPoints.map<Offset>((value) {
          final point = value as List;
          return Offset(
            (point[0] as num).toDouble(),
            (point[1] as num).toDouble(),
          );
        }).toList(),
      );
    }).toList();
  } catch (_) {
    return null;
  }
}

class _StrokePainter extends CustomPainter {
  final List<Stroke> strokes;

  const _StrokePainter(this.strokes);

  @override
  void paint(Canvas canvas, Size size) {
    final scaleX = size.width / kCanvasWidth;
    final scaleY = size.height / kCanvasHeight;

    canvas.save();
    canvas.scale(scaleX, scaleY);

    for (final stroke in strokes) {
      if (stroke.points.isEmpty) continue;

      final paint = Paint()
        ..color = stroke.color
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke.width
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..isAntiAlias = true;

      if (stroke.points.length == 1) {
        canvas.drawCircle(
          stroke.points.first,
          stroke.width / 2,
          paint..style = PaintingStyle.fill,
        );
        continue;
      }

      final path = Path()
        ..moveTo(
          stroke.points.first.dx,
          stroke.points.first.dy,
        );

      for (final point in stroke.points.skip(1)) {
        path.lineTo(point.dx, point.dy);
      }

      canvas.drawPath(path, paint);
    }

    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _StrokePainter oldDelegate) => true;
}

class ShownNoteCanvas extends StatelessWidget {
  final List<Stroke> drawing;

  const ShownNoteCanvas({
    super.key,
    this.drawing = const [],
  });

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
          painter: _StrokePainter(drawing),
          child: const SizedBox.expand(),
        ),
      ),
    );
  }
}

enum CanvasTool { pen, eraser }

class NoteCanvas extends StatefulWidget {
  final List<Stroke> drawing;
  final CanvasTool tool;
  final Color strokeColor;
  final double strokeWidth;
  final double eraserRadius;
  final ValueChanged<Stroke> onStroke;
  final ValueChanged<List<Offset>> onErase;

  const NoteCanvas({
    super.key,
    required this.drawing,
    required this.tool,
    required this.strokeColor,
    required this.strokeWidth,
    required this.eraserRadius,
    required this.onStroke,
    required this.onErase,
  });

  @override
  State<NoteCanvas> createState() => _NoteCanvasState();
}

class _NoteCanvasState extends State<NoteCanvas> {
  Offset? _previousPoint;
  final List<Offset> _livePoints = [];

  void _startGesture(Offset point) {
    _previousPoint = point;
    _livePoints
      ..clear()
      ..add(point);
    setState(() {});
  }

  void _extendGesture(Offset point) {
    final previous = _previousPoint;
    if (previous == null) return;

    final dx = point.dx - previous.dx;
    final dy = point.dy - previous.dy;
    final distance = math.sqrt(dx * dx + dy * dy);

    if (distance == 0) return;

    // Sampling closely makes both drawing and the partial eraser feel smooth.
    for (double i = 3; i <= distance; i += 3) {
      final t = math.min(i / distance, 1.0);
      _livePoints.add(
        Offset(
          previous.dx + dx * t,
          previous.dy + dy * t,
        ),
      );
    }

    if (_livePoints.last != point) {
      _livePoints.add(point);
    }

    _previousPoint = point;
    setState(() {});
  }

  void _endGesture() {
    _previousPoint = null;

    if (_livePoints.isNotEmpty) {
      if (widget.tool == CanvasTool.pen) {
        widget.onStroke(
          Stroke(
            points: List<Offset>.from(_livePoints),
            color: widget.strokeColor,
            width: widget.strokeWidth,
          ),
        );
      } else {
        widget.onErase(List<Offset>.from(_livePoints));
      }
    }

    _livePoints.clear();
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

          final preview = widget.tool == CanvasTool.pen &&
                  _livePoints.isNotEmpty
              ? [
                  ...widget.drawing,
                  Stroke(
                    points: _livePoints,
                    color: widget.strokeColor,
                    width: widget.strokeWidth,
                  ),
                ]
              : widget.drawing;

          return Container(
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: colors.border),
              borderRadius: BorderRadius.circular(8),
            ),
            clipBehavior: Clip.antiAlias,
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onPanStart: (details) {
                _startGesture(toCanvasSpace(details.localPosition));
              },
              onPanUpdate: (details) {
                _extendGesture(toCanvasSpace(details.localPosition));
              },
              onPanEnd: (_) => _endGesture(),
              onPanCancel: _endGesture,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  CustomPaint(
                    painter: _StrokePainter(preview),
                    child: const SizedBox.expand(),
                  ),
                  if (widget.tool == CanvasTool.eraser &&
                      _livePoints.isNotEmpty)
                    CustomPaint(
                      painter: _EraserPreviewPainter(
                        _livePoints.last,
                        widget.eraserRadius,
                      ),
                    ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _EraserPreviewPainter extends CustomPainter {
  final Offset position;
  final double radius;

  const _EraserPreviewPainter(this.position, this.radius);

  @override
  void paint(Canvas canvas, Size size) {
    final scaleX = size.width / kCanvasWidth;
    final scaleY = size.height / kCanvasHeight;

    canvas.save();
    canvas.scale(scaleX, scaleY);

    final paint = Paint()
      ..color = Colors.black54
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;

    canvas.drawCircle(position, radius, paint);
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _EraserPreviewPainter oldDelegate) => true;
}

class CanvasWorkspace extends StatefulWidget {
  final List<Stroke> drawing;
  final ValueChanged<List<Stroke>> onChanged;

  const CanvasWorkspace({
    super.key,
    required this.drawing,
    required this.onChanged,
  });

  @override
  State<CanvasWorkspace> createState() => _CanvasWorkspaceState();
}

class _CanvasWorkspaceState extends State<CanvasWorkspace> {
  static const List<Color> _palette = [
    Color(0xFF111111),
    Color(0xFF008000),
    Color(0xFF1976D2),
    Color(0xFFD32F2F),
    Color(0xFF7B1FA2),
    Color(0xFFF57C00),
  ];

  static const List<double> _brushWidths = [4, 8, 14];

  final List<List<Stroke>> _undoHistory = [];
  final List<List<Stroke>> _redoHistory = [];

  CanvasTool _tool = CanvasTool.pen;
  Color _selectedColor = kDefaultStrokeColor;
  double _selectedWidth = 8;
  double _eraserRadius = 22;

  List<Stroke> _copyDrawing(List<Stroke> source) {
    return source
        .map(
          (stroke) => stroke.copyWith(
            points: List<Offset>.from(stroke.points),
          ),
        )
        .toList();
  }

  void _commit(List<Stroke> next) {
    _undoHistory.add(_copyDrawing(widget.drawing));
    _redoHistory.clear();
    widget.onChanged(next);
    setState(() {});
  }

  void _handleStroke(Stroke stroke) {
    _commit([...widget.drawing, stroke]);
  }

  void _handleErase(List<Offset> eraserPath) {
    final erased = _erasePartialStrokes(
      widget.drawing,
      eraserPath,
      _eraserRadius,
    );

    if (_sameDrawing(erased, widget.drawing)) return;
    _commit(erased);
  }

  List<Stroke> _erasePartialStrokes(
    List<Stroke> strokes,
    List<Offset> eraserPath,
    double radius,
  ) {
    final result = <Stroke>[];

    for (final stroke in strokes) {
      var currentSegment = <Offset>[];

      for (final point in stroke.points) {
        final eraseDistance = radius + stroke.width / 2;
        final shouldErase = eraserPath.any(
          (eraserPoint) =>
              (point - eraserPoint).distance <= eraseDistance,
        );

        if (shouldErase) {
          if (currentSegment.length >= 2) {
            result.add(stroke.copyWith(points: currentSegment));
          }
          currentSegment = <Offset>[];
        } else {
          currentSegment.add(point);
        }
      }

      if (currentSegment.length >= 2) {
        result.add(stroke.copyWith(points: currentSegment));
      }
    }

    return result;
  }

  bool _sameDrawing(List<Stroke> first, List<Stroke> second) {
    if (first.length != second.length) {
      return false;
    }

    for (var i = 0; i < first.length; i++) {
      final firstStroke = first[i];
      final secondStroke = second[i];

      if (firstStroke.color.toARGB32() !=
              secondStroke.color.toARGB32() ||
          firstStroke.width != secondStroke.width ||
          firstStroke.points.length != secondStroke.points.length) {
        return false;
      }

      for (var j = 0; j < firstStroke.points.length; j++) {
        if (firstStroke.points[j] != secondStroke.points[j]) {
          return false;
        }
      }
    }

    return true;
  }

  void _undo() {
    if (_undoHistory.isEmpty) return;

    final previous = _undoHistory.removeLast();
    _redoHistory.add(_copyDrawing(widget.drawing));
    widget.onChanged(previous);
    setState(() {});
  }

  void _redo() {
    if (_redoHistory.isEmpty) return;

    final next = _redoHistory.removeLast();
    _undoHistory.add(_copyDrawing(widget.drawing));
    widget.onChanged(next);
    setState(() {});
  }

  Future<void> _clearCanvas() async {
    if (widget.drawing.isEmpty) return;

    final colors = context.colors;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: colors.surface,
        title: Text(
          'Clear canvas?',
          style: TextStyle(color: colors.text),
        ),
        content: Text(
          'Every stroke on this canvas will be removed.',
          style: TextStyle(color: colors.textMuted),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: Text(
              'Cancel',
              style: TextStyle(color: colors.textMuted),
            ),
          ),
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: Text(
              'Clear',
              style: TextStyle(color: colors.error),
            ),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      _commit([]);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 8,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            _toolButton(
              colors,
              icon: Icons.edit_outlined,
              label: 'Pen',
              active: _tool == CanvasTool.pen,
              onTap: () => setState(() => _tool = CanvasTool.pen),
            ),
            _toolButton(
              colors,
              icon: Icons.auto_fix_normal_outlined,
              label: 'Eraser',
              active: _tool == CanvasTool.eraser,
              onTap: () => setState(() => _tool = CanvasTool.eraser),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: Wrap(
                spacing: 10,
                runSpacing: 8,
                children: [
                  for (final color in _palette)
                    _colorButton(colors, color),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            for (final width in _brushWidths)
              _widthButton(colors, width),
            if (_tool == CanvasTool.eraser) ...[
              const SizedBox(width: 4),
              Text(
                'Eraser',
                style: TextStyle(
                  color: colors.textMuted,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
              SizedBox(
                width: 120,
                child: Slider(
                  value: _eraserRadius,
                  min: 12,
                  max: 40,
                  divisions: 7,
                  onChanged: (value) {
                    setState(() => _eraserRadius = value);
                  },
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: 10),
        NoteCanvas(
          drawing: widget.drawing,
          tool: _tool,
          strokeColor: _selectedColor,
          strokeWidth: _selectedWidth,
          eraserRadius: _eraserRadius,
          onStroke: _handleStroke,
          onErase: _handleErase,
        ),
        Padding(
          padding: const EdgeInsets.only(top: 10),
          child: Wrap(
            spacing: 10,
            runSpacing: 8,
            children: [
              _smallButton(
                colors,
                'Undo',
                _undoHistory.isNotEmpty ? _undo : null,
              ),
              _smallButton(
                colors,
                'Redo',
                _redoHistory.isNotEmpty ? _redo : null,
              ),
              _smallButton(
                colors,
                'Clear',
                widget.drawing.isNotEmpty ? _clearCanvas : null,
                destructive: true,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _toolButton(
    AppColors colors, {
    required IconData icon,
    required String label,
    required bool active,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
        decoration: BoxDecoration(
          color: active ? colors.primary : colors.surface,
          border: Border.all(
            color: active ? colors.primary : colors.border,
          ),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 17,
              color: active ? colors.onPrimary : colors.text,
            ),
            const SizedBox(width: 7),
            Text(
              label,
              style: TextStyle(
                color: active ? colors.onPrimary : colors.text,
                fontWeight: FontWeight.w600,
                fontSize: 13,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _colorButton(AppColors colors, Color color) {
    final active = _selectedColor.toARGB32() == color.toARGB32();

    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedColor = color;
          _tool = CanvasTool.pen;
        });
      },
      child: Container(
        width: 31,
        height: 31,
        padding: const EdgeInsets.all(3),
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(
            color: active ? colors.primary : colors.border,
            width: active ? 2.5 : 1,
          ),
        ),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
        ),
      ),
    );
  }

  Widget _widthButton(AppColors colors, double width) {
    final active = _selectedWidth == width;
    final label = switch (width) {
      <= 4 => 'Thin',
      <= 8 => 'Medium',
      _ => 'Thick',
    };

    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedWidth = width;
          _tool = CanvasTool.pen;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 8),
        decoration: BoxDecoration(
          color: active ? colors.primary : colors.surface,
          border: Border.all(
            color: active ? colors.primary : colors.border,
          ),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: active ? colors.onPrimary : colors.text,
            fontWeight: FontWeight.w600,
            fontSize: 12,
          ),
        ),
      ),
    );
  }

  Widget _smallButton(
    AppColors colors,
    String label,
    VoidCallback? onTap, {
    bool destructive = false,
  }) {
    final enabled = onTap != null;
    final textColor = destructive && enabled
        ? colors.error
        : enabled
            ? colors.text
            : colors.textMuted;

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
            color: textColor,
            fontWeight: FontWeight.w600,
            fontSize: 13,
          ),
        ),
      ),
    );
  }
}
