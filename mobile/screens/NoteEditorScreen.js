import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useTheme } from '../theme';
import { createNote, updateNote, deleteNote, getCategories } from '../api';

// One screen for both cases:
//   note === null  -> creating
//   note !== null  -> editing
export default function NoteEditorScreen({ note, onDone, onCancel }) {
  const { colors } = useTheme();
  const isNew = !note;

  const [title, setTitle] = useState(note?.title || '');
  const [body, setBody] = useState(note?.body || '');
  const [categoryId, setCategoryId] = useState(
    note?.categoryId ? String(note.categoryId) : '',
  );
  const [categories, setCategories] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  async function handleSave() {
    // The backend requires a non-empty title.
    const finalTitle = title.trim() || 'Untitled note';

    setBusy(true);
    try {
      if (isNew) {
        await createNote(finalTitle, body, categoryId);
      } else {
        await updateNote(note._id, finalTitle, body, categoryId);
      }
      onDone();
    } catch (e) {
      Alert.alert('Could not save', e.message);
    } finally {
      setBusy(false);
    }
  }

  function handleDelete() {
    Alert.alert('Delete note?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteNote(note._id);
            onDone();
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
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

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.bar}>
        <Pressable onPress={onCancel} hitSlop={10}>
          <Text style={{ color: colors.textMuted, fontSize: 16 }}>Cancel</Text>
        </Pressable>

        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>
          {isNew ? 'New Note' : 'Edit Note'}
        </Text>

        <Pressable onPress={handleSave} disabled={busy} hitSlop={10}>
          {busy ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '700' }}>
              Save
            </Text>
          )}
        </Pressable>
      </View>

      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Title"
        placeholderTextColor={colors.textMuted}
        style={[styles.title, { color: colors.text }]}
      />

      {categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipRow}
          contentContainerStyle={{ gap: 8, paddingRight: 20 }}
        >
          <Chip
            label="No category"
            active={!categoryId}
            onPress={() => setCategoryId('')}
          />
          {categories.map((c) => (
            <Chip
              key={String(c._id)}
              label={c.name}
              active={categoryId === String(c._id)}
              onPress={() => setCategoryId(String(c._id))}
            />
          ))}
        </ScrollView>
      )}

      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder="Start writing..."
        placeholderTextColor={colors.textMuted}
        multiline
        textAlignVertical="top"
        style={[styles.body, { color: colors.text }]}
      />

      {!isNew && (
        <Pressable onPress={handleDelete} style={styles.deleteWrap}>
          <Text style={{ color: colors.error, fontSize: 15 }}>Delete note</Text>
        </Pressable>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 60, paddingHorizontal: 20 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: { fontSize: 24, fontWeight: '700', paddingVertical: 8 },
  chipRow: { marginTop: 6, marginBottom: 6, flexGrow: 0 },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  body: { flex: 1, fontSize: 16, lineHeight: 23, paddingTop: 8 },
  deleteWrap: { paddingVertical: 18, alignItems: 'center' },
});
