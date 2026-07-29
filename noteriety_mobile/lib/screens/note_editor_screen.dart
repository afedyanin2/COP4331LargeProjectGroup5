import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';

import '../api/api.dart';
import '../models/models.dart';
import '../theme/app_colors.dart';
import '../theme/tokens.dart';
import '../widgets/note_canvas.dart';

class NoteEditorScreen extends StatefulWidget {
  final Note? note;

  // Categories already used by other notes.
  final List<String> existingCategories;

  const NoteEditorScreen({
    super.key,
    this.note,
    this.existingCategories = const [],
  });

  @override
  State<NoteEditorScreen> createState() => _NoteEditorScreenState();
}

class _NoteEditorScreenState extends State<NoteEditorScreen> {
  late final TextEditingController _title;
  late final TextEditingController _body;
  late final TextEditingController _category;

  bool _busy = false;

  // Either "text" or "canvas".
  String _editorMode = 'text';

  List<Stroke> _drawing = [];

  bool get _isNew => widget.note == null;

  @override
  void initState() {
    super.initState();

    _title = TextEditingController(
      text: widget.note?.title ?? '',
    );

    _category = TextEditingController(
      text: widget.note?.category ?? kUncategorized,
    );

    /*
     * Canvas notes are stored inside the normal body field.
     *
     * If the body can be decoded as canvas data, open the note
     * in canvas mode. Otherwise, treat it as a regular text note.
     */
    final existingBody = widget.note?.body ?? '';
    final decodedDrawing = decodeCanvasBody(existingBody);

    if (decodedDrawing != null) {
      _editorMode = 'canvas';
      _drawing = decodedDrawing;
      _body = TextEditingController(text: '');
    } else {
      _editorMode = 'text';
      _body = TextEditingController(text: existingBody);
    }
  }

  @override
  void dispose() {
    _title.dispose();
    _body.dispose();
    _category.dispose();
    super.dispose();
  }

  Future<void> _handleSave() async {
    final finalTitle = _title.text.trim().isEmpty
        ? 'Untitled note'
        : _title.text.trim();

    /*
     * Canvas notes encode their strokes into the body field.
     * Text notes use the text-field contents normally.
     */
    final finalBody = _editorMode == 'canvas'
        ? encodeCanvasBody(_drawing)
        : _body.text;

    final category = _category.text.trim().isEmpty
        ? kUncategorized
        : _category.text.trim();

    setState(() => _busy = true);

    try {
      if (_isNew) {
        await createNote(
          finalTitle,
          finalBody,
          category,
        );
      } else {
        await updateNote(
          widget.note!.id,
          finalTitle,
          finalBody,
          category,
        );
      }

      if (mounted) {
        Navigator.pop(context);
      }
    } catch (e) {
      _snack('Could not save: $e');
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _handleShare() async {
    final title = _title.text.trim().isEmpty
        ? 'Untitled note'
        : _title.text.trim();

    if (_editorMode == 'canvas') {
      try {
        await Share.share(
          '$title\n\n(Canvas note — open in Noteriety to view.)',
          subject: title,
        );
      } catch (e) {
        _snack('Could not share: $e');
      }

      return;
    }

    try {
      await Share.share(
        '$title\n\n${_body.text}',
        subject: title,
      );
    } catch (e) {
      _snack('Could not share: $e');
    }
  }

  Future<void> _handleDelete() async {
    if (_isNew) {
      return;
    }

    final colors = context.colors;

    final shouldDelete = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: colors.surface,
        title: Text(
          'Delete note?',
          style: TextStyle(color: colors.text),
        ),
        content: Text(
          'This cannot be undone.',
          style: TextStyle(color: colors.textMuted),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(dialogContext, false);
            },
            child: Text(
              'Cancel',
              style: TextStyle(color: colors.textMuted),
            ),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(dialogContext, true);
            },
            child: Text(
              'Delete',
              style: TextStyle(color: colors.error),
            ),
          ),
        ],
      ),
    );

    if (shouldDelete != true) {
      return;
    }

    try {
      await deleteNote(widget.note!.id);

      if (mounted) {
        Navigator.pop(context);
      }
    } catch (e) {
      _snack('Error: $e');
    }
  }

  void _snack(String message) {
    if (!mounted) {
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;

    return Scaffold(
      backgroundColor: colors.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            20,
            12,
            20,
            0,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top bar
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: Text(
                      'Cancel',
                      style: TextStyle(
                        color: colors.textMuted,
                        fontSize: 16,
                      ),
                    ),
                  ),
                  Text(
                    _isNew ? 'NEW NOTE' : 'EDIT NOTE',
                    style: TextStyle(
                      fontFamilyFallback: AppFonts.mono,
                      fontSize: 11,
                      letterSpacing: 1.4,
                      fontWeight: FontWeight.w600,
                      color: colors.textMuted,
                    ),
                  ),
                  GestureDetector(
                    onTap: _busy ? null : _handleSave,
                    child: _busy
                        ? SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: colors.primary,
                            ),
                          )
                        : Text(
                            'Save',
                            style: TextStyle(
                              color: colors.primary,
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                  ),
                ],
              ),

              const SizedBox(height: 14),

              // Title
              TextField(
                controller: _title,
                cursorColor: colors.primary,
                style: TextStyle(
                  fontFamilyFallback: AppFonts.serif,
                  fontSize: 27,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.5,
                  color: colors.text,
                ),
                decoration: InputDecoration(
                  hintText: 'Title',
                  hintStyle: TextStyle(
                    fontFamilyFallback: AppFonts.serif,
                    fontSize: 27,
                    fontWeight: FontWeight.w700,
                    color: colors.textMuted,
                  ),
                  border: InputBorder.none,
                  isDense: true,
                  contentPadding: const EdgeInsets.symmetric(
                    vertical: 8,
                  ),
                ),
              ),

              // Category input
              Padding(
                padding: const EdgeInsets.only(
                  top: 6,
                  bottom: 2,
                ),
                child: Row(
                  children: [
                    Text(
                      'Category',
                      style: TextStyle(
                        fontFamilyFallback: AppFonts.mono,
                        fontSize: 11,
                        letterSpacing: 1.4,
                        fontWeight: FontWeight.w600,
                        color: colors.textMuted,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextField(
                        controller: _category,
                        cursorColor: colors.primary,
                        textCapitalization: TextCapitalization.words,
                        onChanged: (_) {
                          setState(() {});
                        },
                        style: TextStyle(
                          color: colors.text,
                          fontSize: 14,
                        ),
                        decoration: InputDecoration(
                          isDense: true,
                          hintText: kUncategorized,
                          hintStyle: TextStyle(
                            color: colors.textMuted,
                          ),
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: BorderSide(
                              color: colors.border,
                            ),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: BorderSide(
                              color: colors.primary,
                              width: 1.4,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // Existing category quick-pick chips
              if (widget.existingCategories.isNotEmpty)
                SizedBox(
                  height: 34,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: [
                      for (final categoryName
                          in widget.existingCategories)
                        _chip(
                          categoryName,
                          _category.text.trim() == categoryName,
                          () {
                            setState(() {
                              _category.text = categoryName;
                            });
                          },
                        ),
                    ],
                  ),
                ),

              // Text/Canvas mode selector
              Padding(
                padding: const EdgeInsets.only(
                  top: 4,
                  bottom: 10,
                ),
                child: Row(
                  children: [
                    _modeButton(
                      colors,
                      'Note',
                      _editorMode == 'text',
                      () {
                        setState(() {
                          _editorMode = 'text';
                        });
                      },
                    ),
                    const SizedBox(width: 10),
                    _modeButton(
                      colors,
                      'Canvas',
                      _editorMode == 'canvas',
                      () {
                        setState(() {
                          _editorMode = 'canvas';
                        });
                      },
                    ),
                  ],
                ),
              ),

              // Text editor or drawing canvas
              Expanded(
                child: _editorMode == 'text'
                    ? TextField(
                        controller: _body,
                        cursorColor: colors.primary,
                        maxLines: null,
                        expands: true,
                        textAlignVertical: TextAlignVertical.top,
                        style: TextStyle(
                          fontSize: 16,
                          height: 1.45,
                          color: colors.text,
                        ),
                        decoration: InputDecoration(
                          hintText: 'Start writing...',
                          hintStyle: TextStyle(
                            color: colors.textMuted,
                          ),
                          border: InputBorder.none,
                          contentPadding: const EdgeInsets.only(
                            top: 8,
                          ),
                        ),
                      )
                    : SingleChildScrollView(
                        child: CanvasWorkspace(
                          drawing: _drawing,
                          onChanged: (nextDrawing) {
                            setState(() {
                              _drawing = nextDrawing;
                            });
                          },
                        ),
                      ),
              ),

              // Footer
              Padding(
                padding: const EdgeInsets.symmetric(
                  vertical: 18,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    GestureDetector(
                      onTap: _handleShare,
                      child: Text(
                        'Share / Export',
                        style: TextStyle(
                          color: colors.primary,
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    if (!_isNew)
                      GestureDetector(
                        onTap: _handleDelete,
                        child: Text(
                          'Delete note',
                          style: TextStyle(
                            color: colors.error,
                            fontSize: 15,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _chip(
    String label,
    bool active,
    VoidCallback onTap,
  ) {
    final colors = context.colors;

    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          alignment: Alignment.center,
          padding: const EdgeInsets.symmetric(
            horizontal: 14,
            vertical: 7,
          ),
          decoration: BoxDecoration(
            color: active ? colors.primary : colors.surface,
            border: Border.all(
              color: active ? colors.primary : colors.border,
            ),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: active ? colors.onPrimary : colors.text,
              fontWeight:
                  active ? FontWeight.w700 : FontWeight.w500,
              fontSize: 13,
            ),
          ),
        ),
      ),
    );
  }

  Widget _modeButton(
    AppColors colors,
    String label,
    bool active,
    VoidCallback onTap,
  ) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 9,
        ),
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
            fontSize: 14,
          ),
        ),
      ),
    );
  }
}