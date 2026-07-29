import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';

import '../api/api.dart';
import '../models/models.dart';
import '../theme/app_colors.dart';
import '../theme/tokens.dart';

class NoteEditorScreen extends StatefulWidget {
  final Note? note; // null => creating
  final List<String> existingCategories; // for quick-pick chips
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

  bool get _isNew => widget.note == null;

  @override
  void initState() {
    super.initState();
    _title = TextEditingController(text: widget.note?.title ?? '');
    _body = TextEditingController(text: widget.note?.body ?? '');
    _category = TextEditingController(
      text: widget.note?.category ?? kUncategorized,
    );
  }

  @override
  void dispose() {
    _title.dispose();
    _body.dispose();
    _category.dispose();
    super.dispose();
  }

  Future<void> _handleSave() async {
    // The backend requires a non-empty title.
    final finalTitle =
        _title.text.trim().isEmpty ? 'Untitled note' : _title.text.trim();
    final category =
        _category.text.trim().isEmpty ? kUncategorized : _category.text.trim();
    setState(() => _busy = true);
    try {
      if (_isNew) {
        await createNote(finalTitle, _body.text, category);
      } else {
        await updateNote(widget.note!.id, finalTitle, _body.text, category);
      }
      if (mounted) Navigator.pop(context);
    } catch (e) {
      _snack('Could not save: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _handleShare() async {
    final t = _title.text.trim().isEmpty ? 'Untitled note' : _title.text.trim();
    try {
      await Share.share('$t\n\n${_body.text}', subject: t);
    } catch (e) {
      _snack('Could not share: $e');
    }
  }

  Future<void> _handleDelete() async {
    final colors = context.colors;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: colors.surface,
        title: Text('Delete note?', style: TextStyle(color: colors.text)),
        content: Text('This cannot be undone.',
            style: TextStyle(color: colors.textMuted)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('Cancel', style: TextStyle(color: colors.textMuted)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text('Delete', style: TextStyle(color: colors.error)),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await deleteNote(widget.note!.id);
      if (mounted) Navigator.pop(context);
    } catch (e) {
      _snack('Error: $e');
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
    return Scaffold(
      backgroundColor: colors.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top bar
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: Text('Cancel',
                        style: TextStyle(
                            color: colors.textMuted, fontSize: 16)),
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
                                strokeWidth: 2, color: colors.primary),
                          )
                        : Text('Save',
                            style: TextStyle(
                                color: colors.primary,
                                fontSize: 16,
                                fontWeight: FontWeight.w700)),
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
                  contentPadding: const EdgeInsets.symmetric(vertical: 8),
                ),
              ),
              // Category: free-text name (shared with web), with quick-pick
              // chips of categories that already exist.
              Padding(
                padding: const EdgeInsets.only(top: 6, bottom: 2),
                child: Row(
                  children: [
                    Text('Category',
                        style: TextStyle(
                          fontFamilyFallback: AppFonts.mono,
                          fontSize: 11,
                          letterSpacing: 1.4,
                          fontWeight: FontWeight.w600,
                          color: colors.textMuted,
                        )),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextField(
                        controller: _category,
                        cursorColor: colors.primary,
                        textCapitalization: TextCapitalization.words,
                        style: TextStyle(color: colors.text, fontSize: 14),
                        decoration: InputDecoration(
                          isDense: true,
                          hintText: kUncategorized,
                          hintStyle: TextStyle(color: colors.textMuted),
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 8),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: BorderSide(color: colors.border),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide:
                                BorderSide(color: colors.primary, width: 1.4),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              if (widget.existingCategories.isNotEmpty)
                SizedBox(
                  height: 34,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: [
                      for (final name in widget.existingCategories)
                        _chip(name, _category.text.trim() == name,
                            () => setState(() => _category.text = name)),
                    ],
                  ),
                ),
              const SizedBox(height: 4),
              // Body
              Expanded(
                child: TextField(
                  controller: _body,
                  cursorColor: colors.primary,
                  maxLines: null,
                  expands: true,
                  textAlignVertical: TextAlignVertical.top,
                  style: TextStyle(
                      fontSize: 16, height: 1.45, color: colors.text),
                  decoration: InputDecoration(
                    hintText: 'Start writing...',
                    hintStyle: TextStyle(color: colors.textMuted),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.only(top: 8),
                  ),
                ),
              ),
              // Footer
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 18),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    GestureDetector(
                      onTap: _handleShare,
                      child: Text('Share / Export',
                          style: TextStyle(
                              color: colors.primary,
                              fontSize: 15,
                              fontWeight: FontWeight.w600)),
                    ),
                    if (!_isNew)
                      GestureDetector(
                        onTap: _handleDelete,
                        child: Text('Delete note',
                            style: TextStyle(
                                color: colors.error, fontSize: 15)),
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

  Widget _chip(String label, bool active, VoidCallback onTap) {
    final colors = context.colors;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          alignment: Alignment.center,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
          decoration: BoxDecoration(
            color: active ? colors.primary : colors.surface,
            border:
                Border.all(color: active ? colors.primary : colors.border),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: active ? colors.onPrimary : colors.text,
              fontWeight: active ? FontWeight.w700 : FontWeight.w500,
              fontSize: 13,
            ),
          ),
        ),
      ),
    );
  }
}