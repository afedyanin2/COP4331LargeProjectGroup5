import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../models/models.dart';

/// If the live domain isn't up, swap for your computer's LAN IP while the
/// backend runs locally, e.g. 'http://192.168.1.42:5000'
/// (localhost does NOT work from a phone — the phone's localhost is itself).
const String apiBase = 'https://noteriety-app.com';

const String _tokenKey = 'noteriety_token';
const String _emailKey = 'noteriety_email';

/// Thrown for any backend-reported failure; `message` is the server's
/// `error` string (or a friendly fallback for transport/parse failures).
class ApiException implements Exception {
  final String message;
  ApiException(this.message);
  @override
  String toString() => message;
}

// --- Token / email storage (mirrors AsyncStorage) --------------------

Future<void> saveToken(String token) async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString(_tokenKey, token);
}

Future<String?> getToken() async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getString(_tokenKey);
}

Future<void> clearToken() async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.remove(_tokenKey);
  await prefs.remove(_emailKey);
}

Future<void> saveEmail(String email) async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString(_emailKey, email);
}

Future<String?> getEmail() async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getString(_emailKey);
}

Future<Map<String, String>> _authHeaders() async {
  final token = await getToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${token ?? ''}',
  };
}

Map<String, String> get _jsonHeaders => {'Content-Type': 'application/json'};

// Decode, then throw if the server flagged an error. Returns the decoded map.
Map<String, dynamic> _handle(http.Response res) {
  late final dynamic data;
  try {
    data = jsonDecode(res.body);
  } catch (_) {
    throw ApiException('Server returned an unexpected response.');
  }
  if (data is! Map<String, dynamic>) {
    throw ApiException('Server returned an unexpected response.');
  }
  final err = data['error'];
  if (err is String && err.isNotEmpty) {
    throw ApiException(err);
  }
  return data;
}

Uri _u(String path) => Uri.parse('$apiBase$path');

// --- Auth ------------------------------------------------------------

/// Returns { id, firstName, username, email, emailVerified, token }.
Future<Map<String, dynamic>> login(String username, String password) async {
  final res = await http.post(
    _u('/api/login'),
    headers: _jsonHeaders,
    body: jsonEncode({'username': username, 'password': password}),
  );
  return _handle(res);
}

/// NOTE: the backend does NOT return a token here — it emails a six-digit
/// code and sets emailVerified:false. The caller must handle the
/// no-token case (see RegisterScreen).
Future<Map<String, dynamic>> register({
  required String username,
  required String password,
  required String firstName,
  required String lastName,
  required String email,
}) async {
  final res = await http.post(
    _u('/api/register'),
    headers: _jsonHeaders,
    body: jsonEncode({
      'username': username,
      'password': password,
      'firstName': firstName,
      'lastName': lastName,
      'email': email,
    }),
  );
  final data = _handle(res);
  await saveEmail(email);
  return data;
}

Future<Map<String, dynamic>> forgotPassword(String email) async {
  final res = await http.post(
    _u('/api/forgot-password'),
    headers: _jsonHeaders,
    body: jsonEncode({'email': email}),
  );
  return _handle(res);
}

Future<Map<String, dynamic>> resendVerification(String email) async {
  final res = await http.post(
    _u('/api/resend-verification'),
    headers: _jsonHeaders,
    body: jsonEncode({'email': email}),
  );
  return _handle(res);
}

/// Submits the emailed six-digit code. On success the backend creates the
/// real account (emailVerified: true) and returns a message — but NO token,
/// so the user still logs in afterward.
Future<Map<String, dynamic>> verifyEmail(String email, String code) async {
  final res = await http.post(
    _u('/api/verify-email'),
    headers: _jsonHeaders,
    body: jsonEncode({'email': email, 'code': code}),
  );
  return _handle(res);
}

Future<User> getMe() async {
  final res = await http.get(_u('/api/me'), headers: await _authHeaders());
  final data = _handle(res);
  return User.fromJson(data);
}

// --- Categories ------------------------------------------------------

Future<List<Category>> getCategories() async {
  final res =
      await http.get(_u('/api/categories'), headers: await _authHeaders());
  final data = _handle(res);
  final list = (data['categories'] as List?) ?? const [];
  return list
      .whereType<Map<String, dynamic>>()
      .map(Category.fromJson)
      .toList();
}

Future<Category> createCategory(String name) async {
  final res = await http.post(
    _u('/api/categories'),
    headers: await _authHeaders(),
    body: jsonEncode({'name': name}),
  );
  final data = _handle(res);
  return Category.fromJson(data['category'] as Map<String, dynamic>);
}

// --- Notes -----------------------------------------------------------

/// categoryId: null = all, 'uncategorized' = only uncategorized, or a real
/// id to filter. Server sorts pinned first, then most recent.
Future<List<Note>> getNotes([String? categoryId]) async {
  final qs = (categoryId != null && categoryId.isNotEmpty)
      ? '?categoryId=${Uri.encodeComponent(categoryId)}'
      : '';
  final res =
      await http.get(_u('/api/notes$qs'), headers: await _authHeaders());
  final data = _handle(res);
  final list = (data['notes'] as List?) ?? const [];
  return list.whereType<Map<String, dynamic>>().map(Note.fromJson).toList();
}

/// NOTE: title is required by the backend — an empty title returns an error.
Future<Map<String, dynamic>> createNote(
    String title, String body, String? categoryId) async {
  final res = await http.post(
    _u('/api/notes'),
    headers: await _authHeaders(),
    body: jsonEncode({
      'title': title,
      'body': body,
      'categoryId': categoryId ?? '',
    }),
  );
  return _handle(res);
}

Future<Map<String, dynamic>> updateNote(
    String id, String title, String body, String? categoryId) async {
  final res = await http.put(
    _u('/api/notes/$id'),
    headers: await _authHeaders(),
    body: jsonEncode({
      'title': title,
      'body': body,
      'categoryId': categoryId ?? '',
    }),
  );
  return _handle(res);
}

Future<Map<String, dynamic>> setPinned(String id, bool isPinned) async {
  final res = await http.put(
    _u('/api/notes/$id/pin'),
    headers: await _authHeaders(),
    body: jsonEncode({'isPinned': isPinned}),
  );
  return _handle(res);
}

Future<Map<String, dynamic>> deleteNote(String id) async {
  final res =
      await http.delete(_u('/api/notes/$id'), headers: await _authHeaders());
  return _handle(res);
}