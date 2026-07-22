import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useTheme } from '../theme';
import { getNotes, deleteNote } from '../api';

export default function NotesScreen({ onOpenNote, onNewNote, onLogout }) {
  const { colors } = useTheme();

  const [notes, setNotes] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await getNotes();
      setNotes(data);
    } catch (e) {
      setError(e.message || 'Could not load notes.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Client-side search across title and body.
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        (n.title || '').toLowerCase().includes(q) ||
        (n.body || '').toLowerCase().includes(q),
    );
  }, [notes, search]);

  function confirmDelete(note) {
    Alert.alert('Delete note?', `"${note.title || 'Untitled'}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteNote(note._id);
            setNotes((cur) => cur.filter((n) => n._id !== note._id));
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  }

  function renderNote({ item }) {
    return (
      <Pressable
        onPress={() => onOpenNote(item)}
        onLongPress={() => confirmDelete(item)}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
          {item.title || 'Untitled note'}
        </Text>
        <Text
          style={[styles.cardBody, { color: colors.textMuted }]}
          numberOfLines={2}
        >
          {item.body || 'This note has no content.'}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.heading, { color: colors.text }]}>My Notes</Text>
        <Pressable onPress={onLogout} hitSlop={10}>
          <Text style={{ color: colors.textMuted, fontSize: 14 }}>Log out</Text>
        </Pressable>
      </View>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search notes"
        placeholderTextColor={colors.textMuted}
        style={[
          styles.search,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            color: colors.text,
          },
        ]}
      />

      {error ? (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      ) : null}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => String(item._id)}
          renderItem={renderNote}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>
                {search ? 'No matching notes' : 'No notes yet'}
              </Text>
              <Text style={{ color: colors.textMuted, marginTop: 6 }}>
                {search ? 'Try another search.' : 'Tap + to create your first note.'}
              </Text>
            </View>
          }
        />
      )}

      <Pressable
        onPress={onNewNote}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Text style={{ color: colors.onPrimary, fontSize: 30, lineHeight: 34 }}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 60, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  heading: { fontSize: 28, fontWeight: '700' },
  search: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 14,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardBody: { fontSize: 14, marginTop: 4, lineHeight: 19 },
  empty: { alignItems: 'center', marginTop: 60 },
  error: { fontSize: 14, marginBottom: 10 },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 36,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
