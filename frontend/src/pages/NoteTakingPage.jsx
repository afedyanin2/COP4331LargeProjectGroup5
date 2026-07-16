import { useEffect, useState } from 'react';

function getStoredNotes() {
  try {
    const storedNotes = localStorage.getItem('noterietyNotes');

    return storedNotes ? JSON.parse(storedNotes) : [];
  } catch {
    return [];
  }
}

function NoteTakingPage() {
  const [notes, setNotes] = useState(getStoredNotes);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    localStorage.setItem('noterietyNotes', JSON.stringify(notes));
  }, [notes]);

  function handleSubmit(event) {
    event.preventDefault();

    if (!title.trim() && !content.trim()) {
      return;
    }

    const newNote = {
      id: Date.now(),
      title: title.trim() || 'Untitled Note',
      content: content.trim(),
    };

    setNotes((currentNotes) => [newNote, ...currentNotes]);
    setTitle('');
    setContent('');
  }

  function deleteNote(noteId) {
    setNotes((currentNotes) =>
      currentNotes.filter((note) => note.id !== noteId)
    );
  }

  return (
    <section className="page">
      <h1>My Notes</h1>

      <form className="basic-form note-form" onSubmit={handleSubmit}>
        <label htmlFor="note-title">Note Title</label>
        <input
          id="note-title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Enter a title"
        />

        <label htmlFor="note-content">Note</label>
        <textarea
          id="note-content"
          rows="8"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Write your note here"
        />

        <button type="submit">Save Note</button>
      </form>

      <section className="content-section">
        <h2>Saved Notes</h2>

        {notes.length === 0 ? (
          <p>You have not created any notes yet.</p>
        ) : (
          <div className="notes-list">
            {notes.map((note) => (
              <article className="note-card" key={note.id}>
                <h3>{note.title}</h3>
                <p>{note.content || 'This note has no content.'}</p>

                <button
                  type="button"
                  className="delete-button"
                  onClick={() => deleteNote(note.id)}
                >
                  Delete
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

export default NoteTakingPage;