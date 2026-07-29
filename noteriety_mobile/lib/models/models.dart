DateTime? _parseDate(dynamic v) {
  if (v == null) return null;
  if (v is String) return DateTime.tryParse(v);
  return null;
}

String _asId(dynamic v) {
  if (v == null) return '';
  return v.toString();
}

/// The category name used when a note has none — matches the web app.
const String kUncategorized = 'Uncategorized';

class Note {
  final String id;
  final String title;
  final String body;
  final String? categoryId; // legacy; unused since categories moved to names
  final String category; // free-text category name, shared with the web app
  final bool isPinned;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const Note({
    required this.id,
    required this.title,
    required this.body,
    required this.categoryId,
    required this.category,
    required this.isPinned,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Note.fromJson(Map<String, dynamic> json) {
    final rawCat = json['categoryId'];
    final rawName = (json['category'] ?? '').toString().trim();
    return Note(
      id: _asId(json['_id'] ?? json['id']),
      title: (json['title'] ?? '') as String,
      body: (json['body'] ?? '') as String,
      categoryId: (rawCat == null || rawCat == '') ? null : rawCat.toString(),
      category: rawName.isEmpty ? kUncategorized : rawName,
      isPinned: json['isPinned'] == true,
      createdAt: _parseDate(json['createdAt']),
      updatedAt: _parseDate(json['updatedAt']),
    );
  }

  Note copyWith({bool? isPinned}) => Note(
        id: id,
        title: title,
        body: body,
        categoryId: categoryId,
        category: category,
        isPinned: isPinned ?? this.isPinned,
        createdAt: createdAt,
        updatedAt: updatedAt,
      );
}

class Category {
  final String id;
  final String name;

  const Category({required this.id, required this.name});

  factory Category.fromJson(Map<String, dynamic> json) => Category(
        id: _asId(json['_id'] ?? json['id']),
        name: (json['name'] ?? '') as String,
      );
}

class User {
  final String firstName;
  final String lastName;
  final String username;
  final String email;
  final bool emailVerified;

  const User({
    required this.firstName,
    required this.lastName,
    required this.username,
    required this.email,
    required this.emailVerified,
  });

  factory User.fromJson(Map<String, dynamic> json) => User(
        firstName: (json['firstName'] ?? '') as String,
        lastName: (json['lastName'] ?? '') as String,
        username: (json['username'] ?? '') as String,
        email: (json['email'] ?? '') as String,
        emailVerified: json['emailVerified'] == true,
      );

  String get displayName =>
      [firstName, lastName].where((s) => s.isNotEmpty).join(' ');
}