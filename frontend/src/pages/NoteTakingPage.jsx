import { useRef, useEffect, useMemo, useState } from 'react';
import CanvasWorkspace from '../components/CanvasWorkspace.jsx';
import ShownCanvas from '../components/ShownCanvas.jsx';
import {
  decodeCanvasBody,
  drawStroke,
  encodeCanvasBody,
  normalizeDrawing
} from '../utils/canvasData.js';

const DEFAULT_CATEGORY = 'Uncategorized';
const LEGACY_NOTES_KEY = 'noterietyNotes';

async function readJsonResponse(response) {
  const responseText = await response.text();

  if (!responseText) {
    throw new Error(
      `Server returned an empty response (${response.status}).`
    );
  }

  try {
    return JSON.parse(responseText);
  } catch {
    throw new Error(
      `Server returned an invalid response (${response.status}).`
    );
  }
}

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('noterietyToken');

  if (!token) {
    throw new Error(
      'Your login session is missing. Please log in again.'
    );
  }

  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...options.headers,
      Authorization: `Bearer ${token}`
    }
  });

  const data = await readJsonResponse(response);

  if (!response.ok || data.error) {
    throw new Error(
      data.error || `Request failed (${response.status}).`
    );
  }

  return data;
}

function toTimestamp(value, fallback = Date.now()) {
  if (!value) {
    return fallback;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? fallback : timestamp;
}

function normalizeNote(note) {
  const id = String(note?._id || note?.id || '');
  const body = String(note?.body ?? note?.content ?? '');
  const bodyDrawing = decodeCanvasBody(body);
  const storedDrawing = normalizeDrawing(note?.drawing);
  const drawing =
    bodyDrawing && bodyDrawing.length > 0
      ? bodyDrawing
      : storedDrawing;

  return {
    id,
    title: String(note?.title || 'Untitled Note'),
    content: bodyDrawing ? '' : body,
    category: String(note?.category || DEFAULT_CATEGORY),
    tags: Array.isArray(note?.tags) ? note.tags : [],
    pinned: Boolean(note?.isPinned ?? note?.pinned),
    drawing,
    isCanvas: Boolean(bodyDrawing) || drawing.length > 0,
    createdAt: toTimestamp(note?.createdAt),
    updatedAt: toTimestamp(note?.updatedAt)
  };
}

function getLegacyStoredNotes() {
  try {
    const storedNotes = localStorage.getItem(LEGACY_NOTES_KEY);
    const parsedNotes = storedNotes ? JSON.parse(storedNotes) : [];

    if (!Array.isArray(parsedNotes)) {
      return [];
    }

    return parsedNotes.map((note) => ({
      ...note,
      category: note.category || DEFAULT_CATEGORY,
      tags: Array.isArray(note.tags) ? note.tags : [],
      pinned: Boolean(note.pinned),
      drawing: Array.isArray(note.drawing) ? note.drawing : [],
      createdAt: note.createdAt || note.id || Date.now(),
      updatedAt: note.updatedAt || note.id || Date.now()
    }));
  } catch {
    return [];
  }
}

function NoteTakingPage() {
  const [notes, setNotes] = useState([]);
  const [legacyNotes, setLegacyNotes] = useState(getLegacyStoredNotes);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isImportingLegacy, setIsImportingLegacy] = useState(false);
  const [notesError, setNotesError] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [activeView, setActiveView] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [editorMode, setEditorMode] = useState('text');
  const [mobileView, setMobileView] = useState('list');
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [drawing, setDrawing] = useState([]);
  const canvasWorkspaceRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: DEFAULT_CATEGORY,
    tags: ''
  });

  // Load this user's notes from the server once, on mount.
  useEffect(() => {
    let isMounted = true;

    async function loadNotes() {
      setNotesError('');
      setIsLoadingNotes(true);

      try {
        const data = await apiRequest('/api/notes');

        if (isMounted) {
          setNotes(
            Array.isArray(data.notes)
              ? data.notes.map(normalizeNote)
              : []
          );
        }
      } catch (error) {
        console.error('Load notes failed:', error);

        if (isMounted) {
          setNotesError(
            error.message || 'Unable to load your notes.'
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingNotes(false);
        }
      }
    }

    loadNotes();

    return () => {
      isMounted = false;
    };
  }, []);

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
            String(tag).toLowerCase().includes(normalizedSearch)
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
    setDrawing([]);
    setEditorMode('text');
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
    setDrawing(normalizeDrawing(note.drawing));
    setEditorMode(note.isCanvas || note.drawing.length > 0 ? 'canvas' : 'text');
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

  async function handleSaveNote(event) {

    event.preventDefault();
    setNotesError('');

    if (
      !formData.title.trim() &&
      !formData.content.trim() &&
      drawing.length === 0
    ) {
      return;
    }

    const tags = [
      ...new Set(
        formData.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      )
    ];

    const normalizedDrawing = normalizeDrawing(drawing);
    // const savingCanvas = editorMode === 'canvas';

    const payload = {
      title: formData.title.trim() || 'Untitled Note',
      // body: savingCanvas
      //   ? encodeCanvasBody(normalizedDrawing)
      //   : formData.content.trim(),
      // category: formData.category.trim() || DEFAULT_CATEGORY,
      // tags,
      // drawing: savingCanvas ? normalizedDrawing : []

      title: formData.title.trim() || "Untitled Note",
      body: formData.content.trim(),
      category: formData.category.trim() || DEFAULT_CATEGORY,
      tags,
      drawing: normalizedDrawing,
    };

    setIsSaving(true);

    try {
      const data = await apiRequest(
        isCreating
          ? '/api/notes'
          : `/api/notes/${encodeURIComponent(selectedNoteId)}`,
        {
          method: isCreating ? 'POST' : 'PUT',
          body: JSON.stringify(payload)
        }
      );

      const savedNote = normalizeNote(data.note);

      if (isCreating) {
        setNotes((currentNotes) => [savedNote, ...currentNotes]);
      } else {
        setNotes((currentNotes) =>
          currentNotes.map((note) =>
            note.id === selectedNoteId ? savedNote : note
          )
        );
      }

      setSelectedNoteId(savedNote.id);
      resetForm();
      setIsCreating(false);
      setIsEditing(false);
    } catch (error) {
      console.error('Save note failed:', error);
      setNotesError(error.message || 'Unable to save the note.');
    } finally {
      setIsSaving(false);
    }
  }

  async function togglePin(noteId) {
    const note = notes.find((item) => item.id === noteId);

    if (!note) {
      return;
    }

    setNotesError('');

    try {
      const data = await apiRequest(
        `/api/notes/${encodeURIComponent(noteId)}/pin`,
        {
          method: 'PUT',
          body: JSON.stringify({
            isPinned: !note.pinned
          })
        }
      );

      const updatedNote = normalizeNote(data.note);

      setNotes((currentNotes) =>
        currentNotes.map((currentNote) =>
          currentNote.id === noteId ? updatedNote : currentNote
        )
      );
    } catch (error) {
      console.error('Pin note failed:', error);
      setNotesError(error.message || 'Unable to update the note.');
    } finally {
      setOpenMenuId(null);
    }
  }

  function requestDelete(note) {
    setNoteToDelete(note);
    setOpenMenuId(null);
  }

  async function confirmDelete() {
    if (!noteToDelete) {
      return;
    }

    setNotesError('');

    try {
      await apiRequest(
        `/api/notes/${encodeURIComponent(noteToDelete.id)}`,
        {
          method: 'DELETE'
        }
      );

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
    } catch (error) {
      console.error('Delete note failed:', error);
      setNotesError(error.message || 'Unable to delete the note.');
    }
  }

  async function importLegacyNotes() {
    if (legacyNotes.length === 0) {
      return;
    }

    setNotesError('');
    setIsImportingLegacy(true);

    try {
      const data = await apiRequest('/api/notes/import', {
        method: 'POST',
        body: JSON.stringify({
          notes: legacyNotes.map((note) => ({
            title: note.title || 'Untitled Note',
            body: note.content || '',
            category: note.category || DEFAULT_CATEGORY,
            tags: note.tags || [],
            drawing: note.drawing || [],
            pinned: Boolean(note.pinned),
            createdAt: note.createdAt,
            updatedAt: note.updatedAt
          }))
        })
      });

      const importedNotes = Array.isArray(data.notes)
        ? data.notes.map(normalizeNote)
        : [];

      setNotes((currentNotes) => [...importedNotes, ...currentNotes]);
      localStorage.removeItem(LEGACY_NOTES_KEY);
      setLegacyNotes([]);
    } catch (error) {
      console.error('Import browser notes failed:', error);
      setNotesError(
        error.message || 'Unable to import the browser notes.'
      );
    } finally {
      setIsImportingLegacy(false);
    }
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

  function downloadCanvas(note) {
    const drawingToDownload = normalizeDrawing(note.drawing);

    if (drawingToDownload.length === 0) {
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 500;

    const context = canvas.getContext('2d');
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (const stroke of drawingToDownload) {
      drawStroke(context, stroke);
    }

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${note.title || 'canvas'}.png`;
    link.click();
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

  if (isLoadingNotes) {
    return (
      <section className="page centered-page">
        <h1>My Notes</h1>
        <p>Loading your notes...</p>
      </section>
    );
  }

  return (
    <section className="notes-workspace-page">
      {notesError && (
        <div className="content-section">
          <p className="error-message">{notesError}</p>
        </div>
      )}

      {legacyNotes.length > 0 && (
        <div className="content-section">
          <h2>Browser notes found</h2>
          <p>
            These are notes from the old browser-only storage. Log in to the
            account that owns them, then import them once.
          </p>
          <button
            type="button"
            onClick={importLegacyNotes}
            disabled={isImportingLegacy}
          >
            {isImportingLegacy
              ? 'Importing...'
              : `Import ${legacyNotes.length} browser note${
                  legacyNotes.length === 1 ? '' : 's'
                } into this account`}
          </button>
        </div>
      )}

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
                  } ${openMenuId === note.id ? 'menu-open' : ''}`}
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
                            onClick=
                            {
                              () =>
                                {
                                  downloadNote(note);
                                  downloadCanvas(note);
                                }
                            }
                          >
                            Download
                          </button>

                          <button
                            type="button"
                            role="menuitem"
                            className="danger-menu-option"
                            onClick=
                            {() => requestDelete(note)}
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
                    {note.isCanvas
                      ? 'Canvas drawing'
                      : note.content || 'This note has no content.'}
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
                
                <div className="edit-mode-buttons">
                  <button type="button" 
                  onClick={() => setEditorMode("text")}
                  >
                    Note
                  </button>

                  <button type="button" 
                  onClick={() => setEditorMode("canvas")}
                  >
                    Canvas
                  </button>
                </div>
                
                {editorMode === "text" ? 
                (
                  <div>
                    <label htmlFor="workspace-content">Text</label>
                      <textarea
                        id="workspace-content"
                        name="content"
                        value={formData.content}
                        onChange={handleFormChange}
                        placeholder="Start writing your note..."
                      />
                  </div>
                ) : 
                (
                  <div className="canvas-container">
                    <label className="canvas-title">Canvas</label>

                    <CanvasWorkspace
                      drawing={drawing} 
                      setDrawing={setDrawing}
                      ref={canvasWorkspaceRef} 
                    />

                  </div>
                )}  
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
                  {selectedNote.pinned && (
                    <span className="note-pinned-label">Pinned</span>
                  )}
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
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M9 4v6l-3 4v2h12v-2l-3-4V4" />
                      <path d="M12 16v5" />
                      <path d="M7 4h10" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    className="editor-secondary-button"
                    onClick=
                    {
                      () => 
                        {
                          downloadNote(selectedNote);
                          downloadCanvas(selectedNote);
                        }
                    }
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
                className={`note-reader-content`} 
              //     ${
              //     selectedNote.content || selectedNote.isCanvas
              //       ? ''
              //       : 'is-empty'
              //   }`
              >
              
              {selectedNote.content ? 
              (
                <p>{selectedNote.content}</p>
              ) : 
              (
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
                    <path d="M12 12v6M9 15h6" />
                  </svg>

                <h3>No text yet</h3>

                <p>
                  Edit note and it&rsquo;ll show up here.
                </p>

                <>
                  <button
                    type="button"
                    className="editor-primary-button"
                    onClick={() => beginEditing(selectedNote)}
                  >
                  Edit note
                  </button>
                </>
              </div>
              )}

              {selectedNote.drawing.length > 0 ? 
              (
                <ShownCanvas drawing={selectedNote.drawing}/>
              ) : 
              (
                <>
                  <h3>Empty canvas</h3>

                  <p>
                    Edit this note to add a drawing.
                  </p>

                  <button
                    type="button"
                    className="editor-primary-button"
                    onClick={() => beginEditing(selectedNote)}
                  >
                    Edit note
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