import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';

import '../api/api.dart';
import '../models/models.dart';
import '../theme/app_colors.dart';
import '../theme/tokens.dart';
import '../widgets/brand.dart';
import 'note_editor_screen.dart';
import 'settings_screen.dart';

class NotesScreen extends StatefulWidget {
  final VoidCallback onLogout;
  const NotesScreen({super.key, required this.onLogout});

  @override
  State<NotesScreen> createState() => _NotesScreenState();
}

class _NotesScreenState extends State<NotesScreen> {
  List<Note> _notes = [];
  List<Category> _categories = [];
  String? _filter; // null = All; 'uncategorized'; or a category id
  String _search = '';
  bool _loading = true;
  String _error = '';

  final _searchCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load(_filter);
    _loadCategories();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _load(String? categoryId) async {
    setState(() => _error = '');
    try {
      final data = await getNotes(
          (categoryId != null && categoryId.isNotEmpty) ? categoryId : null);
      if (mounted) setState(() => _notes = data);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not load notes.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  // Categories are optional — if the endpoint fails we just hide the row.
  Future<void> _loadCategories() async {
    try {
      final cats = await getCategories();
      if (mounted) setState(() => _categories = cats);
    } catch (_) {
      if (mounted) setState(() => _categories = []);
    }
  }

  List<Note> get _visible {
    final q = _search.trim().toLowerCase();
    if (q.isEmpty) return _notes;
    return _notes
        .where((n) =>
            n.title.toLowerCase().contains(q) ||
            n.body.toLowerCase().contains(q))
        .toList();
  }

  String? _catName(String? id) {
    if (id == null) return null;
    for (final c in _categories) {
      if (c.id == id) return c.name;
    }
    return null;
  }

  Future<void> _togglePin(Note note) async {
    final next = !note.isPinned;
    // Optimistic flip, then reload so the server's pinned-first order applies.
    setState(() {
      _notes = _notes
          .map((n) => n.id == note.id ? n.copyWith(isPinned: next) : n)
          .toList();
    });
    try {
      await setPinned(note.id, next);
      await _load(_filter);
    } catch (e) {
      _snack('Could not update pin: $e');
      await _load(_filter);
    }
  }

  Future<void> _shareNote(Note note) async {
    try {
      await Share.share(
        '${note.title.isEmpty ? 'Untitled note' : note.title}\n\n${note.body}',
        subject: note.title.isEmpty ? 'Untitled note' : note.title,
      );
    } catch (e) {
      _snack('Could not share: $e');
    }
  }

  Future<void> _confirmDelete(Note note) async {
    final colors = context.colors;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: colors.surface,
        title: Text('Delete note?', style: TextStyle(color: colors.text)),
        content: Text(
          '"${note.title.isEmpty ? 'Untitled' : note.title}" will be removed.',
          style: TextStyle(color: colors.textMuted),
        ),
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
      await deleteNote(note.id);
      if (mounted) setState(() => _notes.removeWhere((n) => n.id == note.id));
    } catch (e) {
      _snack('Error: $e');
    }
  }

  Future<void> _openEditor(Note? note) async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => NoteEditorScreen(note: note)),
    );
    // Refresh on return (matches RN's remount-after-save).
    await _load(_filter);
    await _loadCategories();
  }

  Future<void> _openSettings() async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => SettingsScreen(onLogout: widget.onLogout),
      ),
    );
  }

  Future<void> _newCategory() async {
    final colors = context.colors;
    final ctrl = TextEditingController();
    bool saving = false;

    await showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => AlertDialog(
          backgroundColor: colors.surface,
          title: Text('New category',
              style: TextStyle(
                  color: colors.text, fontWeight: FontWeight.w700)),
          content: TextField(
            controller: ctrl,
            autofocus: true,
            style: TextStyle(color: colors.text),
            cursorColor: colors.primary,
            decoration: InputDecoration(
              hintText: 'e.g. School',
              hintStyle: TextStyle(color: colors.textMuted),
              filled: true,
              fillColor: colors.surfaceAlt,
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(color: colors.border),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(color: colors.primary),
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: saving ? null : () => Navigator.pop(ctx),
              child: Text('Cancel', style: TextStyle(color: colors.textMuted)),
            ),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: colors.primary),
              onPressed: saving
                  ? null
                  : () async {
                      final name = ctrl.text.trim();
                      if (name.isEmpty) return;
                      setLocal(() => saving = true);
                      try {
                        await createCategory(name);
                        if (ctx.mounted) Navigator.pop(ctx);
                        await _loadCategories();
                      } catch (e) {
                        setLocal(() => saving = false);
                        _snack('Could not create category: $e');
                      }
                    },
              child: saving
                  ? SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor:
                            AlwaysStoppedAnimation<Color>(colors.onPrimary),
                      ),
                    )
                  : Text('Create',
                      style: TextStyle(color: colors.onPrimary)),
            ),
          ],
        ),
      ),
    );
  }

  void _openNoteMenu(Note note) {
    final colors = context.colors;
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        decoration: BoxDecoration(
          color: colors.surface,
          border: Border.all(color: colors.border),
          borderRadius:
              const BorderRadius.vertical(top: Radius.circular(18)),
        ),
        padding: const EdgeInsets.only(top: 8, bottom: 34),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(22, 10, 22, 6),
              child: Text(
                note.title.isEmpty ? 'Untitled note' : note.title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.6,
                  color: colors.textMuted,
                ),
              ),
            ),
            _sheetItem(ctx, 'Edit', colors.text, () => _openEditor(note)),
            _sheetItem(ctx, note.isPinned ? 'Unpin' : 'Pin to top', colors.text,
                () => _togglePin(note)),
            _sheetItem(ctx, 'Share / Export', colors.text,
                () => _shareNote(note)),
            _sheetItem(ctx, 'Delete', colors.error, () => _confirmDelete(note)),
          ],
        ),
      ),
    );
  }

  Widget _sheetItem(
      BuildContext ctx, String label, Color color, VoidCallback onTap) {
    return InkWell(
      onTap: () {
        Navigator.pop(ctx);
        onTap();
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 15),
        child: Text(label, style: TextStyle(color: color, fontSize: 16)),
      ),
    );
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
      floatingActionButton: FloatingActionButton(
        onPressed: () => _openEditor(null),
        backgroundColor: colors.primary,
        foregroundColor: colors.onPrimary,
        child: const Icon(Icons.add, size: 28),
      ),
      body: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Eyebrow('WORKSPACE'),
                        SizedBox(height: 8),
                        Display('My Notes', size: 30),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: GestureDetector(
                      onTap: _openSettings,
                      child: Text(
                        'SETTINGS',
                        style: TextStyle(
                          fontFamilyFallback: AppFonts.mono,
                          fontSize: 11,
                          letterSpacing: 1.4,
                          fontWeight: FontWeight.w600,
                          color: colors.primary,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              // Search
              TextField(
                controller: _searchCtrl,
                onChanged: (v) => setState(() => _search = v),
                style: TextStyle(color: colors.text, fontSize: 15),
                cursorColor: colors.primary,
                decoration: InputDecoration(
                  hintText: 'Search notes',
                  hintStyle: TextStyle(color: colors.textMuted),
                  filled: true,
                  fillColor: colors.surface,
                  isDense: true,
                  contentPadding: const EdgeInsets.symmetric(
                      horizontal: 14, vertical: 10),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: BorderSide(color: colors.border),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: BorderSide(color: colors.primary, width: 1.4),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              // Category chips
              SizedBox(
                height: 34,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: [
                    _chip('All', _filter == null, () {
                      setState(() => _filter = null);
                      _load(null);
                    }),
                    _chip('Uncategorized', _filter == 'uncategorized', () {
                      setState(() => _filter = 'uncategorized');
                      _load('uncategorized');
                    }),
                    for (final c in _categories)
                      _chip(c.name, _filter == c.id, () {
                        setState(() => _filter = c.id);
                        _load(c.id);
                      }),
                    _chip('+ New', false, _newCategory),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              if (!_loading)
                Text(
                  '${_visible.length} ${_visible.length == 1 ? 'note' : 'notes'}',
                  style: TextStyle(
                    fontFamilyFallback: AppFonts.mono,
                    fontSize: 10,
                    letterSpacing: 1.4,
                    fontWeight: FontWeight.w600,
                    color: colors.textMuted,
                  ),
                ),
              if (_error.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 10),
                  child: Text(_error,
                      style: TextStyle(color: colors.error, fontSize: 14)),
                ),
              const SizedBox(height: 10),
              Expanded(
                child: _loading
                    ? Center(
                        child: CircularProgressIndicator(color: colors.primary))
                    : RefreshIndicator(
                        color: colors.primary,
                        onRefresh: () => _load(_filter),
                        child: _visible.isEmpty
                            ? _emptyState(colors)
                            : ListView.builder(
                                padding: const EdgeInsets.only(bottom: 100),
                                itemCount: _visible.length,
                                itemBuilder: (_, i) =>
                                    _noteCard(_visible[i], colors),
                              ),
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
            border: Border.all(
                color: active ? colors.primary : colors.border),
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

  Widget _emptyState(AppColors colors) {
    return ListView(
      children: [
        const SizedBox(height: 60),
        Center(
          child: Column(
            children: [
              Text(
                _search.isNotEmpty ? 'No matching notes' : 'No notes here',
                style: TextStyle(
                    color: colors.text,
                    fontSize: 17,
                    fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 6),
              Text(
                _search.isNotEmpty
                    ? 'Try another search.'
                    : 'Tap + to create a note.',
                style: TextStyle(color: colors.textMuted),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _noteCard(Note note, AppColors colors) {
    final name = _catName(note.categoryId);
    final date = _formatDate(note.updatedAt ?? note.createdAt);
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () => _openEditor(note),
        onLongPress: () => _openNoteMenu(note),
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: note.isPinned ? colors.surfaceAlt : colors.surface,
            border: Border.all(
                color: note.isPinned ? colors.primary : colors.border),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  if (note.isPinned)
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 9, vertical: 3),
                      decoration: BoxDecoration(
                        color: colors.primary,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        'PINNED',
                        style: TextStyle(
                          fontFamilyFallback: AppFonts.mono,
                          color: colors.onPrimary,
                          fontSize: 9,
                          letterSpacing: 1.4,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    )
                  else
                    const SizedBox(height: 24),
                  Row(
                    children: [
                      GestureDetector(
                        onTap: () => _togglePin(note),
                        child: Padding(
                          padding: const EdgeInsets.only(left: 12),
                          child: Text(
                            note.isPinned ? '\u2605' : '\u2606',
                            style: TextStyle(
                              fontSize: 17,
                              color: colors.text
                                  .withOpacity(note.isPinned ? 1 : 0.3),
                            ),
                          ),
                        ),
                      ),
                      GestureDetector(
                        onTap: () => _openNoteMenu(note),
                        child: Padding(
                          padding: const EdgeInsets.only(left: 12),
                          child: Text('\u22EE',
                              style: TextStyle(
                                  fontSize: 18, color: colors.textMuted)),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text(
                  note.title.isEmpty ? 'Untitled note' : note.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontFamilyFallback: AppFonts.serif,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.3,
                    color: colors.text,
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(top: 5),
                child: Text(
                  note.body.isEmpty ? 'This note has no content.' : note.body,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                      fontSize: 14, height: 1.4, color: colors.textMuted),
                ),
              ),
              Container(
                margin: const EdgeInsets.only(top: 12),
                padding: const EdgeInsets.only(top: 10),
                decoration: BoxDecoration(
                  border:
                      Border(top: BorderSide(color: colors.border)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Flexible(
                      child: Text(
                        name ?? 'Uncategorized',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: _meta(colors),
                      ),
                    ),
                    Text(date, style: _meta(colors)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  TextStyle _meta(AppColors colors) => TextStyle(
        fontFamilyFallback: AppFonts.mono,
        fontSize: 9.5,
        letterSpacing: 1.4,
        fontWeight: FontWeight.w600,
        color: colors.textMuted,
      );
}

String _formatDate(DateTime? value) {
  if (value == null) return '';
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', //
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  final local = value.toLocal();
  return '${months[local.month - 1]} ${local.day}, ${local.year}';
}
