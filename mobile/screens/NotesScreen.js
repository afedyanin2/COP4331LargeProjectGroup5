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
import { commonStyles, createThemedStyles, shadows, typography } from '../styles';
import { getNotes, deleteNote } from '../api';

export default function NotesScreen({ onOpenNote, onNewNote, onOpenSettings }) {
  const { colors } = useTheme();
  const themed = createThemedStyles(colors);
  const [notes, setNotes] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setNotes(await getNotes());
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
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? notes.filter(
          (n) =>
            (n.title || '').toLowerCase().includes(q) || (n.body || '').toLowerCase().includes(q)
        )
      : notes;
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
          commonStyles.compactCard,
          themed.surfaceCard,
          shadows.small,
          styles.card,
          { opacity: pressed ? 0.76 : 1 },
        ]}
      >
        <View style={styles.cardTop}>
          <Text style={[typography.cardTitle, themed.text, styles.cardTitle]} numberOfLines={1}>
            {item.title || 'Untitled note'}
          </Text>
          <Text style={[typography.meta, themed.primaryText]}>•••</Text>
        </View>
        <Text style={[typography.bodySmall, themed.mutedText, styles.cardBody]} numberOfLines={2}>
          {item.body || 'This note has no content.'}
        </Text>
        <Text style={[typography.meta, themed.mutedText, styles.cardMeta]}>
          Tap to open · Hold to delete
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={[styles.screen, themed.screen]}>
      <View style={[commonStyles.headerRow, styles.header]}>
        <View>
          <Text style={[typography.label, themed.primaryText]}>YOUR WORKSPACE</Text>
          <Text style={[typography.pageTitle, themed.text, styles.heading]}>My Notes</Text>
        </View>
        <Pressable
          onPress={onOpenSettings}
          style={[commonStyles.secondaryButton, themed.secondaryButton]}
        >
          <Text style={[styles.settingsText, themed.secondaryButtonText]}>Settings</Text>
        </Pressable>
      </View>
      <View style={styles.searchWrap}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search notes"
          placeholderTextColor={colors.textMuted}
          style={[commonStyles.input, themed.input, styles.search]}
        />
        {search ? (
          <Pressable onPress={() => setSearch('')} style={styles.clear}>
            <Text style={[styles.clearText, themed.mutedText]}>×</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={[typography.meta, themed.mutedText, styles.count]}>
        {visible.length} {visible.length === 1 ? 'note' : 'notes'}
      </Text>
      {error ? <Text style={[styles.error, themed.errorText]}>{error}</Text> : null}
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => String(item._id)}
          renderItem={renderNote}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
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
            <View style={[commonStyles.card, themed.alternateCard, styles.empty]}>
              <Text style={[typography.sectionTitle, themed.text]}>
                {search ? 'No matching notes' : 'No notes yet'}
              </Text>
              <Text style={[typography.bodySmall, themed.mutedText, styles.emptyText]}>
                {search ? 'Try another search.' : 'Tap New Note to create your first note.'}
              </Text>
            </View>
          }
        />
      )}
      <Pressable
        onPress={onNewNote}
        style={({ pressed }) => [
          styles.fab,
          themed.primaryButton,
          shadows.button,
          { opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Text style={[styles.fabPlus, themed.primaryButtonText]}>+</Text>
        <Text style={[styles.fabLabel, themed.primaryButtonText]}>New Note</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: 54, paddingHorizontal: 20 },
  header: { marginBottom: 18 },
  heading: { marginTop: 4 },
  settingsText: { fontSize: 14, fontWeight: '700' },
  searchWrap: { position: 'relative' },
  search: { paddingRight: 46 },
  clear: {
    position: 'absolute',
    right: 5,
    top: 5,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: { fontSize: 24 },
  count: { marginTop: 12, marginBottom: 12 },
  list: { paddingBottom: 116 },
  card: { marginBottom: 11 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  cardTitle: { flex: 1 },
  cardBody: { marginTop: 7 },
  cardMeta: { marginTop: 13 },
  empty: { marginTop: 20, alignItems: 'center' },
  emptyText: { marginTop: 7, textAlign: 'center' },
  error: { marginBottom: 10, fontSize: 14 },
  fab: {
    position: 'absolute',
    right: 22,
    bottom: 28,
    minHeight: 56,
    paddingHorizontal: 18,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  fabPlus: { fontSize: 27, lineHeight: 30 },
  fabLabel: { fontSize: 15, fontWeight: '700' },
});