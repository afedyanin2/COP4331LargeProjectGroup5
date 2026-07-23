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
import { commonStyles, createThemedStyles, shadows, typography } from '../styles';
import { createNote, updateNote, deleteNote } from '../api';

export default function NoteEditorScreen({ note, onDone, onCancel }) {
  const { colors } = useTheme();
  const themed = createThemedStyles(colors);
  const isNew = !note;
  const [title, setTitle] = useState(note?.title || '');
  const [body, setBody] = useState(note?.body || '');
  const [busy, setBusy] = useState(false);
  async function handleSave() {
    if (!title.trim() && !body.trim())
      return Alert.alert('Empty note', 'Add a title or some content first.');
    setBusy(true);
    try {
      if (isNew) await createNote(title.trim() || 'Untitled note', body);
      else await updateNote(note._id, title.trim() || 'Untitled note', body);
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
      style={themed.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[commonStyles.headerRow, styles.bar]}>
        <Pressable onPress={onCancel} style={styles.barAction}>
          <Text style={[styles.barText, themed.mutedText]}>Cancel</Text>
        </Pressable>
        <View style={styles.barCenter}>
          <Text style={[typography.label, themed.primaryText]}>
            {isNew ? 'CREATING' : 'EDITING'}
          </Text>
          <Text style={[styles.barTitle, themed.text]}>{isNew ? 'New Note' : 'Edit Note'}</Text>
        </View>
        <Pressable onPress={handleSave} disabled={busy} style={styles.barAction}>
          {busy ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={[styles.saveText, themed.primaryText]}>Save</Text>
          )}
        </Pressable>
      </View>
      <View style={[commonStyles.card, themed.surfaceCard, shadows.small, styles.editorCard]}>
        <Text style={[styles.label, themed.text]}>TITLE</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Untitled note"
          placeholderTextColor={colors.textMuted}
          style={[commonStyles.input, themed.input, styles.title]}
        />
        <Text style={[styles.label, themed.text]}>NOTE</Text>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Start writing your note..."
          placeholderTextColor={colors.textMuted}
          multiline
          textAlignVertical="top"
          style={[commonStyles.input, commonStyles.multilineInput, themed.input, styles.body]}
        />
      </View>
      {!isNew ? (
        <Pressable
          onPress={handleDelete}
          style={[commonStyles.secondaryButton, styles.deleteButton, { borderColor: colors.error }]}
        >
          <Text style={[styles.deleteText, themed.errorText]}>Delete note</Text>
        </Pressable>
      ) : null}
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  bar: { paddingTop: 52, paddingHorizontal: 16, paddingBottom: 16 },
  barAction: { width: 62, minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  barText: { fontSize: 15, fontWeight: '600' },
  saveText: { fontSize: 15, fontWeight: '800' },
  barCenter: { alignItems: 'center' },
  barTitle: { marginTop: 2, fontSize: 17, fontWeight: '700' },
  editorCard: { flex: 1, marginHorizontal: 18, marginBottom: 18, padding: 18 },
  label: { marginBottom: 7, ...typography.label },
  title: { marginBottom: 20, fontSize: 18, fontWeight: '600' },
  body: { flex: 1, minHeight: 280, lineHeight: 24 },
  deleteButton: { marginHorizontal: 18, marginBottom: 28 },
  deleteText: { fontSize: 15, fontWeight: '700' },
});