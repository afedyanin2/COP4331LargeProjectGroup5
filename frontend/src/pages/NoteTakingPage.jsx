import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const DEFAULT_CATEGORY = 'Uncategorized';

function getStoredNotes() {
  try {
    const storedNotes = localStorage.getItem('noterietyNotes');
    const parsedNotes = storedNotes ? JSON.parse(storedNotes) : [];

    if (!Array.isArray(parsedNotes)) {
      return [];
    }

    return parsedNotes.map((note) => ({
      ...note,
      category: note.category || DEFAULT_CATEGORY,
      tags: Array.isArray(note.tags) ? note.tags : [],
      pinned: Boolean(note.pinned),
      createdAt: note.createdAt || note.id || Date.now(),
      updatedAt: note.updatedAt || note.id || Date.now()
    }));
  } catch {
    return [];
  }
}

function NoteTakingPage() {
  const [notes, setNotes] = useState(getStoredNotes);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [activeView, setActiveView] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [mobileView, setMobileView] = useState('list');

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: DEFAULT_CATEGORY,
    tags: ''
  });

  useEffect(() => {
    localStorage.setItem('noterietyNotes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    function closeMenu(event) {
      if (!event.target.closest('.workspace-note-menu')) {
        setOpenMenuId(null);
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setOpenMenuId(null);
        setNoteToDelete(null);
      }
    }

    document.addEventListener('click', closeMenu);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('click', closeMenu);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const categories = useMemo(() => {
    const storedCategories = notes.map((note) => note.category);

    return [...new Set([DEFAULT_CATEGORY, ...storedCategories])].sort(
      (firstCategory, secondCategory) =>
        firstCategory.localeCompare(secondCategory)
    );
  }, [notes]);

  const categoryCounts = useMemo(() => {
    return notes.reduce((counts, note) => {
      counts[note.category] = (counts[note.category] || 0) + 1;
      return counts;
    }, {});
  }, [notes]);

  const selectedNote = useMemo(() => {
    return notes.find((note) => note.id === selectedNoteId) || null;
  }, [notes, selectedNoteId]);

  const visibleNotes = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return notes
      .filter((note) => {
        const matchesSearch =
          !normalizedSearch ||
          note.title.toLowerCase().includes(normalizedSearch) ||
          note.content.toLowerCase().includes(normalizedSearch) ||
          note.category.toLowerCase().includes(normalizedSearch) ||
          note.tags.some((tag) =>
            tag.toLowerCase().includes(normalizedSearch)
          );

        if (!matchesSearch) {
          return false;
        }

        if (activeView === 'pinned') {
          return note.pinned;
        }

        if (activeView.startsWith('category:')) {
          return note.category === activeView.slice(9);
        }

        return true;
      })
      .sort((firstNote, secondNote) => {
        if (activeView !== 'recent' && firstNote.pinned !== secondNote.pinned) {
          return firstNote.pinned ? -1 : 1;
        }

        return secondNote.updatedAt - firstNote.updatedAt;
      });
  }, [notes, activeView, searchTerm]);

  function resetForm() {
    setFormData({
      title: '',
      content: '',
      category: DEFAULT_CATEGORY,
      tags: ''
    });
  }

  function handleFormChange(event) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value
    }));
  }

  function beginNewNote() {
    resetForm();
    setSelectedNoteId(null);
    setIsCreating(true);
    setIsEditing(true);
    setOpenMenuId(null);
    setMobileView('editor');
  }

  function openNote(note) {
    setSelectedNoteId(note.id);
    setIsCreating(false);
    setIsEditing(false);
    setOpenMenuId(null);
    setMobileView('editor');
  }

  function beginEditing(note) {
    setSelectedNoteId(note.id);
    setFormData({
      title: note.title,
      content: note.content,
      category: note.category,
      tags: note.tags.join(', ')
    });
    setIsCreating(false);
    setIsEditing(true);
    setOpenMenuId(null);
    setMobileView('editor');
  }

  function cancelEditing() {
    resetForm();
    setIsEditing(false);

    if (isCreating) {
      setIsCreating(false);
      setSelectedNoteId(null);
      setMobileView('list');
    }
  }

  function handleSaveNote(event) {
    event.preventDefault();

    if (!formData.title.trim() && !formData.content.trim()) {
      return;
    }

    const currentTime = Date.now();
    const tags = [
      ...new Set(
        formData.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      )
    ];

    const noteData = {
      title: formData.title.trim() || 'Untitled Note',
      content: formData.content.trim(),
      category: formData.category.trim() || DEFAULT_CATEGORY,
      tags,
      updatedAt: currentTime
    };

    if (isCreating) {
      const newNote = {
        id: currentTime,
        ...noteData,
        pinned: false,
        createdAt: currentTime
      };

      setNotes((currentNotes) => [newNote, ...currentNotes]);
      setSelectedNoteId(newNote.id);
    } else {
      setNotes((currentNotes) =>
        currentNotes.map((note) =>
          note.id === selectedNoteId
            ? {
                ...note,
                ...noteData
              }
            : note
        )
      );
    }

    resetForm();
    setIsCreating(false);
    setIsEditing(false);
  }

  function togglePin(noteId) {
    setNotes((currentNotes) =>
      currentNotes.map((note) =>
        note.id === noteId
          ? {
              ...note,
              pinned: !note.pinned,
              updatedAt: Date.now()
            }
          : note
      )
    );

    setOpenMenuId(null);
  }

  function requestDelete(note) {
    setNoteToDelete(note);
    setOpenMenuId(null);
  }

  function confirmDelete() {
    if (!noteToDelete) {
      return;
    }

    setNotes((currentNotes) =>
      currentNotes.filter((note) => note.id !== noteToDelete.id)
    );

    if (selectedNoteId === noteToDelete.id) {
      setSelectedNoteId(null);
      setIsEditing(false);
      setIsCreating(false);
      setMobileView('list');
    }

    setNoteToDelete(null);
  }

  function downloadNote(note) {
    const fileContents = [
      note.title,
      '',
      `Category: ${note.category}`,
      note.tags.length > 0
        ? `Tags: ${note.tags.join(', ')}`
        : 'Tags: None',
      '',
      note.content
    ].join('\n');

    const file = new Blob([fileContents], {
      type: 'text/plain;charset=utf-8'
    });

    const fileUrl = URL.createObjectURL(file);
    const downloadLink = document.createElement('a');

    const safeFileName = note.title
      .replace(/[<>:"/\\|?*]+/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .toLowerCase();

    downloadLink.href = fileUrl;
    downloadLink.download = `${safeFileName || 'noteriety-note'}.txt`;

    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();

    URL.revokeObjectURL(fileUrl);
    setOpenMenuId(null);
  }

  function selectView(view) {
    setActiveView(view);
    setSelectedNoteId(null);
    setIsEditing(false);
    setIsCreating(false);
    setOpenMenuId(null);
    setMobileView('list');
  }

  function formatDate(timestamp) {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(timestamp));
  }

  function getViewTitle() {
    if (activeView === 'pinned') {
      return 'Pinned';
    }

    if (activeView === 'recent') {
      return 'Recent';
    }

    if (activeView.startsWith('category:')) {
      return activeView.slice(9);
    }

    return 'All Notes';
  }

  return (
    <section className="notes-workspace-page">
      <div
        className={`notes-workspace ${
          mobileView === 'editor' ? 'show-mobile-editor' : ''
        }`}
      >
        <aside className="notes-sidebar">
          <div className="notes-sidebar-heading">
            <div>
              <span>Workspace</span>
              <h1>My Notes</h1>
            </div>
          </div>

          <button
            type="button"
            className="new-note-button"
            onClick={beginNewNote}
          >
            <span>+</span>
            New Note
          </button>

          <nav className="notes-sidebar-navigation" aria-label="Notes">
            <button
              type="button"
              className={activeView === 'all' ? 'active' : ''}
              onClick={() => selectView('all')}
            >
              <span>All Notes</span>
              <span>{notes.length}</span>
            </button>

            <button
              type="button"
              className={activeView === 'pinned' ? 'active' : ''}
              onClick={() => selectView('pinned')}
            >
              <span>Pinned</span>
              <span>{notes.filter((note) => note.pinned).length}</span>
            </button>

            <button
              type="button"
              className={activeView === 'recent' ? 'active' : ''}
              onClick={() => selectView('recent')}
            >
              <span>Recent</span>
              <span>{notes.length}</span>
            </button>

            <div className="notes-sidebar-label">Categories</div>

            {categories.map((category) => (
              <button
                type="button"
                className={
                  activeView === `category:${category}` ? 'active' : ''
                }
                onClick={() => selectView(`category:${category}`)}
                key={category}
              >
                <span>{category}</span>
                <span>{categoryCounts[category] || 0}</span>
              </button>
            ))}
          </nav>
        </aside>

        <section className="notes-list-panel">
          <div className="notes-list-heading">
            <div>
              <span>Browse</span>
              <h2>{getViewTitle()}</h2>
            </div>

            <button
              type="button"
              className="mobile-new-note-button"
              onClick={beginNewNote}
            >
              + New
            </button>
          </div>

          <div className="notes-search">
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search notes, categories, or tags"
              aria-label="Search notes"
            />

            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                aria-label="Clear search"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          <p className="notes-result-count">
            {visibleNotes.length}{' '}
            {visibleNotes.length === 1 ? 'note' : 'notes'}
          </p>

          <div className="workspace-notes-list">
            {visibleNotes.length === 0 ? (
              <div className="notes-empty-list">
                <h3>No notes found</h3>
                <p>Create a new note or try another search.</p>
                <button type="button" onClick={beginNewNote}>
                  New Note
                </button>
              </div>
            ) : (
              visibleNotes.map((note) => (
                <article
                  className={`workspace-note-card ${
                    selectedNoteId === note.id ? 'selected' : ''
                  }`}
                  key={note.id}
                  onClick={() => openNote(note)}
                >
                  <div className="workspace-note-card-heading">
                    <div>
                      {note.pinned && (
                        <span className="note-pinned-label">Pinned</span>
                      )}
                      <h3>{note.title}</h3>
                    </div>

                    <div className="workspace-note-menu">
                      <button
                        type="button"
                        className="workspace-note-menu-button"
                        aria-label={`Options for ${note.title}`}
                        aria-expanded={openMenuId === note.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenMenuId(
                            openMenuId === note.id ? null : note.id
                          );
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <circle cx="12" cy="5" r="1.8" />
                          <circle cx="12" cy="12" r="1.8" />
                          <circle cx="12" cy="19" r="1.8" />
                        </svg>
                      </button>

                      {openMenuId === note.id && (
                        <div
                          className="workspace-note-menu-popup"
                          role="menu"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => beginEditing(note)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => togglePin(note.id)}
                          >
                            {note.pinned ? 'Unpin' : 'Pin'}
                          </button>

                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => downloadNote(note)}
                          >
                            Download
                          </button>

                          <button
                            type="button"
                            role="menuitem"
                            className="danger-menu-option"
                            onClick={() => requestDelete(note)}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <p
                    className={`workspace-note-preview ${
                      note.content ? '' : 'is-empty'
                    }`}
                  >
                    {note.content || 'This note has no content.'}
                  </p>

                  <div className="workspace-note-meta">
                    <span>{note.category}</span>
                    <time dateTime={new Date(note.updatedAt).toISOString()}>
                      {formatDate(note.updatedAt)}
                    </time>
                  </div>

                  {note.tags.length > 0 && (
                    <div className="workspace-note-tags">
                      {note.tags.slice(0, 3).map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        </section>

        <section className="note-editor-panel">
          {isEditing ? (
            <form className="note-editor-form" onSubmit={handleSaveNote}>
              <div className="mobile-editor-heading">
                <button type="button" onClick={cancelEditing}>
                  Back
                </button>
                <span>{isCreating ? 'New Note' : 'Edit Note'}</span>
              </div>

              <div className="note-editor-top">
                <div>
                  <span>{isCreating ? 'Creating' : 'Editing'}</span>
                  <h2>{isCreating ? 'New Note' : 'Edit Note'}</h2>
                </div>

                <div className="note-editor-actions">
                  <button
                    type="button"
                    className="editor-secondary-button"
                    onClick={cancelEditing}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="editor-primary-button"
                  >
                    Save
                  </button>
                </div>
              </div>

              <div className="note-editor-fields">
                <label htmlFor="workspace-title">Title</label>
                <input
                  id="workspace-title"
                  name="title"
                  type="text"
                  value={formData.title}
                  onChange={handleFormChange}
                  placeholder="Untitled note"
                />

                <div className="note-editor-details">
                  <div>
                    <label htmlFor="workspace-category">Category</label>
                    <input
                      id="workspace-category"
                      name="category"
                      type="text"
                      list="category-options"
                      value={formData.category}
                      onChange={handleFormChange}
                      placeholder="Choose a category"
                    />

                    <datalist id="category-options">
                      {categories.map((category) => (
                        <option value={category} key={category} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label htmlFor="workspace-tags">Tags</label>
                    <input
                      id="workspace-tags"
                      name="tags"
                      type="text"
                      value={formData.tags}
                      onChange={handleFormChange}
                      placeholder="Exam, Work, Important"
                    />
                  </div>
                </div>

                <label htmlFor="workspace-content">Note</label>
                <textarea
                  id="workspace-content"
                  name="content"
                  value={formData.content}
                  onChange={handleFormChange}
                  placeholder="Start writing your note..."
                />
              </div>

              <div className="mobile-editor-actions">
                <button
                  type="button"
                  className="editor-secondary-button"
                  onClick={cancelEditing}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="editor-primary-button"
                >
                  Save Note
                </button>
              </div>
            </form>
          ) : selectedNote ? (
            <article className="note-reader">
              <div className="mobile-editor-heading">
                <button
                  type="button"
                  onClick={() => setMobileView('list')}
                >
                  Back
                </button>
                <span>Note</span>
              </div>

              <div className="note-reader-heading">
                <div>
                  <div className="note-reader-badges">
                    {selectedNote.pinned && (
                      <span className="note-pinned-label">Pinned</span>
                    )}
                    <span className="note-category-label">
                      {selectedNote.category}
                    </span>
                  </div>
                  <h2>{selectedNote.title}</h2>
                  <p>Updated {formatDate(selectedNote.updatedAt)}</p>
                </div>

                <div className="note-reader-actions">
                  <button
                    type="button"
                    className={`icon-button ${
                      selectedNote.pinned ? 'is-active' : ''
                    }`}
                    aria-label={selectedNote.pinned ? 'Unpin note' : 'Pin note'}
                    onClick={() => togglePin(selectedNote.id)}
                  >
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    className="editor-secondary-button"
                    onClick={() => downloadNote(selectedNote)}
                  >
                    Download
                  </button>

                  <button
                    type="button"
                    className="editor-primary-button"
                    onClick={() => beginEditing(selectedNote)}
                  >
                    Edit
                  </button>
                </div>
              </div>

              <div className="note-reader-tags">
                <button
                  type="button"
                  onClick={() =>
                    selectView(`category:${selectedNote.category}`)
                  }
                >
                  {selectedNote.category}
                </button>

                {selectedNote.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>

              <div
                className={`note-reader-content ${
                  selectedNote.content ? '' : 'is-empty'
                }`}
              >
                {selectedNote.content ? (
                  <p>{selectedNote.content}</p>
                ) : (
                  <>
                    <svg
                      width="26"
                      height="26"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <path d="M14 2v6h6" />
                      <path d="M12 12v6M9 15h6" />
                    </svg>
                    <h3>No content yet</h3>
                    <p>Add some text and it&rsquo;ll show up here.</p>
                    <button
                      type="button"
                      className="editor-primary-button"
                      onClick={() => beginEditing(selectedNote)}
                    >
                      Add content
                    </button>
                  </>
                )}
              </div>
            </article>
          ) : (
            <div className="note-editor-empty">
              <div>
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                </svg>
              </div>
              <h2>Select a note</h2>
              <p>Choose a note from the list or create a new one.</p>
              <button type="button" onClick={beginNewNote}>
                Create New Note
              </button>
            </div>
          )}
        </section>
      </div>

      {noteToDelete && (
        <div
          className="delete-modal-backdrop"
          role="presentation"
          onClick={() => setNoteToDelete(null)}
        >
          <section
            className="delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="delete-modal-title">Delete Note?</h2>

            <p>
              Are you sure you want to delete{' '}
              <strong>{noteToDelete.title}</strong>? This action cannot be
              undone.
            </p>

            <div className="delete-modal-actions">
              <button
                type="button"
                className="editor-secondary-button"
                onClick={() => setNoteToDelete(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="confirm-delete-button"
                onClick={confirmDelete}
              >
                Delete Note
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

export default NoteTakingPage;
