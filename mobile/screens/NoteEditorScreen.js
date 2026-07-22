import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useTheme } from '../theme';
import { createNote, updateNote, deleteNote } from '../api';

// One screen for both cases:
//   note === null  -> creating
//   note !== null  -> editing
export default function NoteEditorScreen({ note, onDone, onCancel }) {
  const { colors } = useTheme();
  const isNew = !note;

  const [title, setTitle] = useState(note?.title || '');
  const [body, setBody] = useState(note?.body || '');
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    if (!title.trim() && !body.trim()) {
      Alert.alert('Empty note', 'Add a title or some content first.');
      return;
    }

    setBusy(true);
    try {
      if (isNew) {
        await createNote(title.trim() || 'Untitled note', body);
      } else {
        await updateNote(note._id, title.trim() || 'Untitled note', body);
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
    marginBottom: 18,
  },
  title: { fontSize: 24, fontWeight: '700', paddingVertical: 8 },
  body: { flex: 1, fontSize: 16, lineHeight: 23, paddingTop: 8 },
  deleteWrap: { paddingVertical: 18, alignItems: 'center' },
});
