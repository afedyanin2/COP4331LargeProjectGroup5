import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import { useTheme } from '../theme';
import {
  getNotes,
  deleteNote,
  setPinned,
  getCategories,
  createCategory,
} from '../api';

export default function NotesScreen({ onOpenNote, onNewNote, onOpenSettings }) {
  const { colors } = useTheme();

  const [notes, setNotes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filter, setFilter] = useState(null); // null = All
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [savingCat, setSavingCat] = useState(false);

  const load = useCallback(async (categoryId) => {
    setError('');
    try {
      const data = await getNotes(categoryId || undefined);
      setNotes(data);
    } catch (e) {
      setError(e.message || 'Could not load notes.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Categories are optional — if the endpoint isn't available we just
  // hide the filter row rather than breaking the notes list.
  const loadCategories = useCallback(async () => {
    try {
      setCategories(await getCategories());
    } catch {
      setCategories([]);
    }
  }, []);

  useEffect(() => {
    load(filter);
  }, [load, filter]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Search runs on whatever the server returned for the active filter.
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        (n.title || '').toLowerCase().includes(q) ||
        (n.body || '').toLowerCase().includes(q),
    );
  }, [notes, search]);

  const catName = useCallback(
    (id) => categories.find((c) => String(c._id) === String(id))?.name,
    [categories],
  );

  async function togglePin(note) {
    const next = !note.isPinned;
    // Optimistic flip, then reload so the server's pinned-first order applies.
    setNotes((cur) =>
      cur.map((n) => (n._id === note._id ? { ...n, isPinned: next } : n)),
    );
    try {
      await setPinned(note._id, next);
      load(filter);
    } catch (e) {
      Alert.alert('Could not update pin', e.message);
      load(filter);
    }
  }

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

  async function handleCreateCategory() {
    const name = newCatName.trim();
    if (!name) return;
    setSavingCat(true);
    try {
      await createCategory(name);
      setNewCatName('');
      setShowNewCat(false);
      loadCategories();
    } catch (e) {
      Alert.alert('Could not create category', e.message);
    } finally {
      setSavingCat(false);
    }
  }

  function Chip({ label, active, onPress }) {
    return (
      <Pressable
        onPress={onPress}
        style={[
          styles.chip,
          {
            backgroundColor: active ? colors.primary : colors.surface,
            borderColor: active ? colors.primary : colors.border,
          },
        ]}
      >
        <Text
          style={{
            color: active ? colors.onPrimary : colors.text,
            fontWeight: active ? '700' : '500',
            fontSize: 13,
          }}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  function renderNote({ item }) {
    const name = catName(item.categoryId);
    return (
      <Pressable
        onPress={() => onOpenNote(item)}
        onLongPress={() => confirmDelete(item)}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: item.isPinned ? colors.surfaceAlt : colors.surface,
            borderColor: item.isPinned ? colors.primary : colors.border,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            {item.isPinned && (
              <Text style={[styles.pinnedTag, { color: colors.primary }]}>
                PINNED
              </Text>
            )}
            <Text
              style={[styles.cardTitle, { color: colors.text }]}
              numberOfLines={1}
            >
              {item.title || 'Untitled note'}
            </Text>
          </View>

          <Pressable onPress={() => togglePin(item)} hitSlop={12} style={styles.pinBtn}>
            <Text style={{ fontSize: 18, opacity: item.isPinned ? 1 : 0.35 }}>
              {item.isPinned ? '★' : '☆'}
            </Text>
          </Pressable>
        </View>

        <Text style={[styles.cardBody, { color: colors.textMuted }]} numberOfLines={2}>
          {item.body || 'This note has no content.'}
        </Text>

        {name ? (
          <Text style={[styles.cardCat, { color: colors.textMuted }]}>{name}</Text>
        ) : null}
      </Pressable>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.heading, { color: colors.text }]}>My Notes</Text>
        <Pressable onPress={onOpenSettings} hitSlop={10}>
          <Text style={{ color: colors.primary, fontSize: 15, fontWeight: '600' }}>
            Settings
          </Text>
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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipRow}
        contentContainerStyle={{ gap: 8, paddingRight: 20 }}
      >
        <Chip label="All" active={!filter} onPress={() => setFilter(null)} />
        <Chip
          label="Uncategorized"
          active={filter === 'uncategorized'}
          onPress={() => setFilter('uncategorized')}
        />
        {categories.map((c) => (
          <Chip
            key={String(c._id)}
            label={c.name}
            active={String(filter) === String(c._id)}
            onPress={() => setFilter(String(c._id))}
          />
        ))}
        <Chip label="+ New" active={false} onPress={() => setShowNewCat(true)} />
      </ScrollView>

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
                load(filter);
              }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>
                {search ? 'No matching notes' : 'No notes here'}
              </Text>
              <Text style={{ color: colors.textMuted, marginTop: 6 }}>
                {search ? 'Try another search.' : 'Tap + to create a note.'}
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

      <Modal visible={showNewCat} transparent animationType="fade">
        <View style={styles.modalWrap}>
          <View
            style={[
              styles.modal,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>
              New category
            </Text>
            <TextInput
              value={newCatName}
              onChangeText={setNewCatName}
              placeholder="e.g. School"
              placeholderTextColor={colors.textMuted}
              autoFocus
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
            />
            <View style={styles.modalBtns}>
              <Pressable
                onPress={() => {
                  setShowNewCat(false);
                  setNewCatName('');
                }}
                style={styles.modalBtn}
              >
                <Text style={{ color: colors.textMuted, fontWeight: '600' }}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleCreateCategory}
                disabled={savingCat}
                style={[
                  styles.modalBtn,
                  { backgroundColor: colors.primary, borderRadius: 8 },
                ]}
              >
                {savingCat ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>
                    Create
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  },
  chipRow: { marginTop: 12, marginBottom: 12, flexGrow: 0 },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  pinnedTag: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardBody: { fontSize: 14, marginTop: 4, lineHeight: 19 },
  cardCat: { fontSize: 12, marginTop: 8, fontWeight: '600' },
  pinBtn: { paddingLeft: 10 },
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
  modalWrap: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  modal: { width: '100%', borderWidth: 1, borderRadius: 14, padding: 18 },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 16,
    marginTop: 14,
  },
  modalBtns: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 18 },
});
