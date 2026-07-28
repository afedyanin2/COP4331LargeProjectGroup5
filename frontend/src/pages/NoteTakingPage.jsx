import {
  useEffect,
  useMemo,
  useState
} from 'react';

import CanvasWorkspace from '../components/CanvasWorkspace.jsx';
import ShownCanvas from '../components/ShownCanvas.jsx';

const DEFAULT_CATEGORY = 'Uncategorized';
const LEGACY_NOTES_KEY = 'noterietyNotes';

/*
 * Safely reads JSON returned by the backend.
 */
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

/*
 * Makes an authenticated request using the JWT that was saved
 * when the user logged in.
 */
async function apiRequest(path, options = {}) {
  const token = localStorage.getItem(
    'noterietyToken'
  );

  if (!token) {
    throw new Error(
      'Your login session is missing. Please log in again.'
    );
  }

  const response = await fetch(path, {
    ...options,

    headers: {
      ...(options.body
        ? {
            'Content-Type': 'application/json'
          }
        : {}),

      ...options.headers,

      Authorization: `Bearer ${token}`
    }
  });

  const data = await readJsonResponse(response);

  if (!response.ok || data.error) {
    throw new Error(
      data.error ||
        `Request failed (${response.status}).`
    );
  }

  return data;
}

function toTimestamp(value, fallback = Date.now()) {
  if (!value) {
    return fallback;
  }

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp)
    ? fallback
    : timestamp;
}

/*
 * Converts MongoDB note objects into the shape expected by
 * this React page.
 */
function normalizeNote(note) {
  return {
    id: String(
      note?._id ||
      note?.id ||
      ''
    ),

    title: String(
      note?.title ||
      'Untitled Note'
    ),

    content: String(
      note?.body ??
      note?.content ??
      ''
    ),

    category: String(
      note?.category ||
      DEFAULT_CATEGORY
    ),

    tags: Array.isArray(note?.tags)
      ? note.tags
      : [],

    pinned: Boolean(
      note?.isPinned ??
      note?.pinned
    ),

    drawing: Array.isArray(note?.drawing)
      ? note.drawing
      : [],

    createdAt: toTimestamp(
      note?.createdAt
    ),

    updatedAt: toTimestamp(
      note?.updatedAt
    )
  };
}

/*
 * Reads notes created by the previous browser-only version.
 *
 * These notes are not automatically assigned to an account.
 * The user must import them while logged into the correct account.
 */
function getLegacyStoredNotes() {
  try {
    const storedNotes =
      localStorage.getItem(
        LEGACY_NOTES_KEY
      );

    const parsedNotes = storedNotes
      ? JSON.parse(storedNotes)
      : [];

    if (!Array.isArray(parsedNotes)) {
      return [];
    }

    return parsedNotes.map((note) => ({
      title:
        note.title ||
        'Untitled Note',

      content:
        note.content ||
        note.body ||
        '',

      category:
        note.category ||
        DEFAULT_CATEGORY,

      tags: Array.isArray(note.tags)
        ? note.tags
        : [],

      pinned: Boolean(note.pinned),

      drawing: Array.isArray(note.drawing)
        ? note.drawing
        : [],

      createdAt:
        note.createdAt ||
        note.id ||
        Date.now(),

      updatedAt:
        note.updatedAt ||
        note.id ||
        Date.now()
    }));
  } catch {
    return [];
  }
}

function NoteTakingPage() {
  const [notes, setNotes] =
    useState([]);

  const [legacyNotes, setLegacyNotes] =
    useState(getLegacyStoredNotes);

  const [
    selectedNoteId,
    setSelectedNoteId
  ] = useState(null);

  const [activeView, setActiveView] =
    useState('all');

  const [searchTerm, setSearchTerm] =
    useState('');

  const [openMenuId, setOpenMenuId] =
    useState(null);

  const [
    noteToDelete,
    setNoteToDelete
  ] = useState(null);

  const [editorMode, setEditorMode] =
    useState('text');

  const [isEditing, setIsEditing] =
    useState(false);

  const [isCreating, setIsCreating] =
    useState(false);

  const [drawing, setDrawing] =
    useState([]);

  const [
    isLoadingNotes,
    setIsLoadingNotes
  ] = useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [
    isImportingLegacy,
    setIsImportingLegacy
  ] = useState(false);

  const [notesError, setNotesError] =
    useState('');

  const [formData, setFormData] =
    useState({
      title: '',
      content: '',
      category: DEFAULT_CATEGORY,
      tags: ''
    });

  /*
   * Load notes from MongoDB when the page opens.
   *
   * The backend gets the current user from the JWT.
   */
  useEffect(() => {
    let isMounted = true;

    async function loadNotes() {
      setNotesError('');
      setIsLoadingNotes(true);

      try {
        const data =
          await apiRequest(
            '/api/notes'
          );

        if (!isMounted) {
          return;
        }

        setNotes(
          Array.isArray(data.notes)
            ? data.notes.map(
                normalizeNote
              )
            : []
        );
      } catch (error) {
        console.error(
          'Load notes failed:',
          error
        );

        if (isMounted) {
          setNotesError(
            error.message ||
              'Unable to load your notes.'
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

  /*
   * Close note menus when clicking elsewhere.
   */
  useEffect(() => {
    function closeMenu(event) {
      if (
        !event.target.closest(
          '.workspace-note-menu'
        )
      ) {
        setOpenMenuId(null);
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setOpenMenuId(null);
        setNoteToDelete(null);
      }
    }

    document.addEventListener(
      'click',
      closeMenu
    );

    document.addEventListener(
      'keydown',
      handleEscape
    );

    return () => {
      document.removeEventListener(
        'click',
        closeMenu
      );

      document.removeEventListener(
        'keydown',
        handleEscape
      );
    };
  }, []);

  const categories = useMemo(() => {
    const noteCategories =
      notes.map(
        (note) => note.category
      );

    return [
      ...new Set([
        DEFAULT_CATEGORY,
        ...noteCategories
      ])
    ].sort(
      (
        firstCategory,
        secondCategory
      ) =>
        firstCategory.localeCompare(
          secondCategory
        )
    );
  }, [notes]);

  const categoryCounts =
    useMemo(() => {
      return notes.reduce(
        (counts, note) => {
          counts[note.category] =
            (
              counts[note.category] ||
              0
            ) + 1;

          return counts;
        },
        {}
      );
    }, [notes]);

  const selectedNote =
    useMemo(() => {
      return (
        notes.find(
          (note) =>
            note.id ===
            selectedNoteId
        ) || null
      );
    }, [
      notes,
      selectedNoteId
    ]);

  const visibleNotes =
    useMemo(() => {
      const normalizedSearch =
        searchTerm
          .trim()
          .toLowerCase();

      return notes
        .filter((note) => {
          const matchesSearch =
            !normalizedSearch ||
            note.title
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            note.content
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            note.category
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            note.tags.some(
              (tag) =>
                String(tag)
                  .toLowerCase()
                  .includes(
                    normalizedSearch
                  )
            );

          if (!matchesSearch) {
            return false;
          }

          if (
            activeView ===
            'pinned'
          ) {
            return note.pinned;
          }

          if (
            activeView.startsWith(
              'category:'
            )
          ) {
            return (
              note.category ===
              activeView.slice(9)
            );
          }

          return true;
        })
        .sort(
          (
            firstNote,
            secondNote
          ) => {
            if (
              activeView !==
                'recent' &&
              firstNote.pinned !==
                secondNote.pinned
            ) {
              return firstNote.pinned
                ? -1
                : 1;
            }

            return (
              secondNote.updatedAt -
              firstNote.updatedAt
            );
          }
        );
    }, [
      notes,
      activeView,
      searchTerm
    ]);

  function resetForm() {
    setFormData({
      title: '',
      content: '',
      category:
        DEFAULT_CATEGORY,
      tags: ''
    });

    setDrawing([]);
    setEditorMode('text');
  }

  function handleFormChange(event) {
    const {
      name,
      value
    } = event.target;

    setFormData(
      (currentData) => ({
        ...currentData,
        [name]: value
      })
    );
  }

  function beginNewNote() {
    resetForm();

    setSelectedNoteId(null);
    setIsCreating(true);
    setIsEditing(true);
    setOpenMenuId(null);
  }

  function openNote(note) {
    setSelectedNoteId(note.id);
    setIsCreating(false);
    setIsEditing(false);
    setOpenMenuId(null);
  }

  function beginEditing(note) {
    setSelectedNoteId(note.id);

    setDrawing(
      Array.isArray(note.drawing)
        ? note.drawing
        : []
    );

    setFormData({
      title: note.title,
      content: note.content,
      category: note.category,
      tags: note.tags.join(', ')
    });

    setIsCreating(false);
    setIsEditing(true);
    setOpenMenuId(null);
  }

  function cancelEditing() {
    resetForm();
    setIsEditing(false);

    if (isCreating) {
      setIsCreating(false);
      setSelectedNoteId(null);
    }
  }

  /*
   * Creates or updates a MongoDB note.
   */
  async function handleSaveNote(event) {
    event.preventDefault();

    setNotesError('');

    if (
      !formData.title.trim() &&
      !formData.content.trim() &&
      drawing.length === 0
    ) {
      setNotesError(
        'Enter a title, text, or drawing before saving.'
      );

      return;
    }

    const tags = [
      ...new Set(
        formData.tags
          .split(',')
          .map(
            (tag) =>
              tag.trim()
          )
          .filter(Boolean)
      )
    ];

    const payload = {
      title:
        formData.title.trim() ||
        'Untitled Note',

      body:
        formData.content.trim(),

      category:
        formData.category.trim() ||
        DEFAULT_CATEGORY,

      tags,

      drawing
    };

    setIsSaving(true);

    try {
      const data =
        await apiRequest(
          isCreating
            ? '/api/notes'
            : `/api/notes/${encodeURIComponent(
                selectedNoteId
              )}`,

          {
            method: isCreating
              ? 'POST'
              : 'PUT',

            body:
              JSON.stringify(
                payload
              )
          }
        );

      const savedNote =
        normalizeNote(data.note);

      if (isCreating) {
        setNotes(
          (currentNotes) => [
            savedNote,
            ...currentNotes
          ]
        );
      } else {
        setNotes(
          (currentNotes) =>
            currentNotes.map(
              (note) =>
                note.id ===
                selectedNoteId
                  ? savedNote
                  : note
            )
        );
      }

      setSelectedNoteId(
        savedNote.id
      );

      resetForm();
      setIsCreating(false);
      setIsEditing(false);
    } catch (error) {
      console.error(
        'Save note failed:',
        error
      );

      setNotesError(
        error.message ||
          'Unable to save the note.'
      );
    } finally {
      setIsSaving(false);
    }
  }

  /*
   * Changes pinned status in MongoDB.
   */
  async function togglePin(noteId) {
    const note = notes.find(
      (currentNote) =>
        currentNote.id === noteId
    );

    if (!note) {
      return;
    }

    setNotesError('');

    try {
      const data =
        await apiRequest(
          `/api/notes/${encodeURIComponent(
            noteId
          )}/pin`,

          {
            method: 'PUT',

            body:
              JSON.stringify({
                isPinned:
                  !note.pinned
              })
          }
        );

      const updatedNote =
        normalizeNote(data.note);

      setNotes(
        (currentNotes) =>
          currentNotes.map(
            (currentNote) =>
              currentNote.id ===
              noteId
                ? updatedNote
                : currentNote
          )
      );
    } catch (error) {
      console.error(
        'Pin note failed:',
        error
      );

      setNotesError(
        error.message ||
          'Unable to update the note.'
      );
    } finally {
      setOpenMenuId(null);
    }
  }

  function requestDelete(note) {
    setNoteToDelete(note);
    setOpenMenuId(null);
  }

  /*
   * Deletes only a note owned by the authenticated user.
   */
  async function confirmDelete() {
    if (!noteToDelete) {
      return;
    }

    setNotesError('');

    try {
      await apiRequest(
        `/api/notes/${encodeURIComponent(
          noteToDelete.id
        )}`,

        {
          method: 'DELETE'
        }
      );

      setNotes(
        (currentNotes) =>
          currentNotes.filter(
            (note) =>
              note.id !==
              noteToDelete.id
          )
      );

      if (
        selectedNoteId ===
        noteToDelete.id
      ) {
        setSelectedNoteId(null);
        setIsEditing(false);
        setIsCreating(false);
      }

      setNoteToDelete(null);
    } catch (error) {
      console.error(
        'Delete note failed:',
        error
      );

      setNotesError(
        error.message ||
          'Unable to delete the note.'
      );
    }
  }

  /*
   * Imports notes from the old shared localStorage.
   *
   * Only click this while logged in as the account that owns
   * the old notes.
   */
  async function importLegacyNotes() {
    if (
      legacyNotes.length === 0
    ) {
      return;
    }

    setNotesError('');
    setIsImportingLegacy(true);

    try {
      const data =
        await apiRequest(
          '/api/notes/import',
          {
            method: 'POST',

            body:
              JSON.stringify({
                notes:
                  legacyNotes
              })
          }
        );

      const importedNotes =
        Array.isArray(data.notes)
          ? data.notes.map(
              normalizeNote
            )
          : [];

      setNotes(
        (currentNotes) => [
          ...importedNotes,
          ...currentNotes
        ]
      );

      /*
       * Remove the old shared notes only after MongoDB import succeeds.
       */
      localStorage.removeItem(
        LEGACY_NOTES_KEY
      );

      setLegacyNotes([]);
    } catch (error) {
      console.error(
        'Import notes failed:',
        error
      );

      setNotesError(
        error.message ||
          'Unable to import the browser notes.'
      );
    } finally {
      setIsImportingLegacy(false);
    }
  }

  function selectView(view) {
    setActiveView(view);
    setSelectedNoteId(null);
    setIsEditing(false);
    setIsCreating(false);
    setOpenMenuId(null);
  }

  function formatDate(timestamp) {
    return new Intl.DateTimeFormat(
      undefined,
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }
    ).format(
      new Date(timestamp)
    );
  }

  function getViewTitle() {
    if (
      activeView === 'pinned'
    ) {
      return 'Pinned';
    }

    if (
      activeView === 'recent'
    ) {
      return 'Recent';
    }

    if (
      activeView.startsWith(
        'category:'
      )
    ) {
      return activeView.slice(9);
    }

    return 'All Notes';
  }

  function downloadNote(note) {
    const contents = [
      note.title,
      '',
      `Category: ${note.category}`,
      note.tags.length > 0
        ? `Tags: ${note.tags.join(
            ', '
          )}`
        : 'Tags: None',
      '',
      note.content
    ].join('\n');

    const file = new Blob(
      [contents],
      {
        type:
          'text/plain;charset=utf-8'
      }
    );

    const fileUrl =
      URL.createObjectURL(file);

    const link =
      document.createElement('a');

    const safeName =
      note.title
        .replace(
          /[<>:"/\\|?*]+/g,
          ''
        )
        .trim()
        .replace(/\s+/g, '-')
        .toLowerCase();

    link.href = fileUrl;

    link.download =
      `${safeName ||
        'noteriety-note'}.txt`;

    document.body.appendChild(
      link
    );

    link.click();
    link.remove();

    URL.revokeObjectURL(
      fileUrl
    );

    setOpenMenuId(null);
  }

  if (isLoadingNotes) {
    return (
      <section className="page centered-page">
        <h1>My Notes</h1>

        <p>
          Loading your notes...
        </p>
      </section>
    );
  }

  return (
    <section className="notes-workspace-page">
      {notesError && (
        <div className="content-section">
          <p className="error-message">
            {notesError}
          </p>
        </div>
      )}

      {legacyNotes.length > 0 && (
        <div className="content-section">
          <h2>
            Browser notes found
          </h2>

          <p>
            These notes came from the old
            browser-only version. Log in to
            the account that owns them before
            importing them.
          </p>

          <button
            type="button"
            onClick={
              importLegacyNotes
            }
            disabled={
              isImportingLegacy
            }
          >
            {isImportingLegacy
              ? 'Importing...'
              : `Import ${
                  legacyNotes.length
                } browser note${
                  legacyNotes.length ===
                  1
                    ? ''
                    : 's'
                } into this account`}
          </button>
        </div>
      )}

      <div className="notes-workspace">
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

          <nav
            className="notes-sidebar-navigation"
            aria-label="Notes"
          >
            <button
              type="button"
              className={
                activeView === 'all'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                selectView('all')
              }
            >
              <span>All Notes</span>
              <span>{notes.length}</span>
            </button>

            <button
              type="button"
              className={
                activeView === 'pinned'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                selectView('pinned')
              }
            >
              <span>Pinned</span>

              <span>
                {
                  notes.filter(
                    (note) =>
                      note.pinned
                  ).length
                }
              </span>
            </button>

            <button
              type="button"
              className={
                activeView === 'recent'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                selectView('recent')
              }
            >
              <span>Recent</span>
              <span>{notes.length}</span>
            </button>

            <div className="notes-sidebar-label">
              Categories
            </div>

            {categories.map(
              (category) => (
                <button
                  type="button"
                  className={
                    activeView ===
                    `category:${category}`
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    selectView(
                      `category:${category}`
                    )
                  }
                  key={category}
                >
                  <span>
                    {category}
                  </span>

                  <span>
                    {
                      categoryCounts[
                        category
                      ] || 0
                    }
                  </span>
                </button>
              )
            )}
          </nav>
        </aside>

        <section className="notes-list-panel">
          <div className="notes-list-heading">
            <div>
              <span>Browse</span>
              <h2>
                {getViewTitle()}
              </h2>
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
              onChange={(event) =>
                setSearchTerm(
                  event.target.value
                )
              }
              placeholder="Search notes, categories, or tags"
              aria-label="Search notes"
            />

            {searchTerm && (
              <button
                type="button"
                onClick={() =>
                  setSearchTerm('')
                }
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <p className="notes-result-count">
            {visibleNotes.length}{' '}

            {visibleNotes.length === 1
              ? 'note'
              : 'notes'}
          </p>

          <div className="workspace-notes-list">
            {visibleNotes.length === 0 ? (
              <div className="notes-empty-list">
                <h3>
                  No notes found
                </h3>

                <p>
                  Create a new note or try
                  another search.
                </p>

                <button
                  type="button"
                  onClick={beginNewNote}
                >
                  New Note
                </button>
              </div>
            ) : (
              visibleNotes.map(
                (note) => (
                  <article
                    className={`workspace-note-card ${
                      selectedNoteId ===
                      note.id
                        ? 'selected'
                        : ''
                    } ${
                      openMenuId ===
                      note.id
                        ? 'menu-open'
                        : ''
                    }`}
                    key={note.id}
                    onClick={() =>
                      openNote(note)
                    }
                  >
                    <div className="workspace-note-card-heading">
                      <div>
                        {note.pinned && (
                          <span className="note-pinned-label">
                            Pinned
                          </span>
                        )}

                        <h3>
                          {note.title}
                        </h3>
                      </div>

                      <div className="workspace-note-menu">
                        <button
                          type="button"
                          className="workspace-note-menu-button"
                          aria-label={`Options for ${note.title}`}
                          onClick={(event) => {
                            event.stopPropagation();

                            setOpenMenuId(
                              openMenuId ===
                                note.id
                                ? null
                                : note.id
                            );
                          }}
                        >
                          ⋮
                        </button>

                        {openMenuId ===
                          note.id && (
                          <div
                            className="workspace-note-menu-popup"
                            onClick={(
                              event
                            ) =>
                              event.stopPropagation()
                            }
                          >
                            <button
                              type="button"
                              onClick={() =>
                                beginEditing(
                                  note
                                )
                              }
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                togglePin(
                                  note.id
                                )
                              }
                            >
                              {note.pinned
                                ? 'Unpin'
                                : 'Pin'}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                downloadNote(
                                  note
                                )
                              }
                            >
                              Download
                            </button>

                            <button
                              type="button"
                              className="danger-menu-option"
                              onClick={() =>
                                requestDelete(
                                  note
                                )
                              }
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <p
                      className={`workspace-note-preview ${
                        note.content
                          ? ''
                          : 'is-empty'
                      }`}
                    >
                      {note.content ||
                        'This note has no text content.'}
                    </p>

                    <div className="workspace-note-meta">
                      <span>
                        {note.category}
                      </span>

                      <time>
                        {formatDate(
                          note.updatedAt
                        )}
                      </time>
                    </div>

                    {note.tags.length >
                      0 && (
                      <div className="workspace-note-tags">
                        {note.tags
                          .slice(0, 3)
                          .map((tag) => (
                            <span
                              key={tag}
                            >
                              {tag}
                            </span>
                          ))}
                      </div>
                    )}
                  </article>
                )
              )
            )}
          </div>
        </section>

        <section className="note-editor-panel">
          {isEditing ? (
            <form
              className="note-editor-form"
              onSubmit={
                handleSaveNote
              }
            >
              <div className="note-editor-top">
                <div>
                  <span>
                    {isCreating
                      ? 'Creating'
                      : 'Editing'}
                  </span>

                  <h2>
                    {isCreating
                      ? 'New Note'
                      : 'Edit Note'}
                  </h2>
                </div>

                <div className="note-editor-actions">
                  <button
                    type="button"
                    className="editor-secondary-button"
                    onClick={
                      cancelEditing
                    }
                    disabled={isSaving}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="editor-primary-button"
                    disabled={isSaving}
                  >
                    {isSaving
                      ? 'Saving...'
                      : 'Save'}
                  </button>
                </div>
              </div>

              <div className="note-editor-fields">
                <label htmlFor="workspace-title">
                  Title
                </label>

                <input
                  id="workspace-title"
                  name="title"
                  type="text"
                  value={
                    formData.title
                  }
                  onChange={
                    handleFormChange
                  }
                  placeholder="Untitled note"
                />

                <div className="note-editor-details">
                  <div>
                    <label htmlFor="workspace-category">
                      Category
                    </label>

                    <input
                      id="workspace-category"
                      name="category"
                      type="text"
                      list="category-options"
                      value={
                        formData.category
                      }
                      onChange={
                        handleFormChange
                      }
                    />

                    <datalist id="category-options">
                      {categories.map(
                        (category) => (
                          <option
                            value={
                              category
                            }
                            key={category}
                          />
                        )
                      )}
                    </datalist>
                  </div>

                  <div>
                    <label htmlFor="workspace-tags">
                      Tags
                    </label>

                    <input
                      id="workspace-tags"
                      name="tags"
                      type="text"
                      value={
                        formData.tags
                      }
                      onChange={
                        handleFormChange
                      }
                      placeholder="Exam, Work, Important"
                    />
                  </div>
                </div>

                <div className="edit-mode-buttons">
                  <button
                    type="button"
                    onClick={() =>
                      setEditorMode(
                        'text'
                      )
                    }
                  >
                    Note
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setEditorMode(
                        'canvas'
                      )
                    }
                  >
                    Canvas
                  </button>
                </div>

                {editorMode ===
                'text' ? (
                  <div>
                    <label htmlFor="workspace-content">
                      Text
                    </label>

                    <textarea
                      id="workspace-content"
                      name="content"
                      value={
                        formData.content
                      }
                      onChange={
                        handleFormChange
                      }
                      placeholder="Start writing your note..."
                    />
                  </div>
                ) : (
                  <div className="canvas-container">
                    <label className="canvas-title">
                      Canvas
                    </label>

                    <CanvasWorkspace
                      drawing={drawing}
                      setDrawing={
                        setDrawing
                      }
                    />
                  </div>
                )}
              </div>
            </form>
          ) : selectedNote ? (
            <article className="note-reader">
              <div className="note-reader-heading">
                <div>
                  {selectedNote.pinned && (
                    <span className="note-pinned-label">
                      Pinned
                    </span>
                  )}

                  <h2>
                    {selectedNote.title}
                  </h2>

                  <p>
                    Updated{' '}
                    {formatDate(
                      selectedNote.updatedAt
                    )}
                  </p>
                </div>

                <div className="note-reader-actions">
                  <button
                    type="button"
                    className={`icon-button ${
                      selectedNote.pinned
                        ? 'is-active'
                        : ''
                    }`}
                    onClick={() =>
                      togglePin(
                        selectedNote.id
                      )
                    }
                  >
                    Pin
                  </button>

                  <button
                    type="button"
                    className="editor-secondary-button"
                    onClick={() =>
                      downloadNote(
                        selectedNote
                      )
                    }
                  >
                    Download
                  </button>

                  <button
                    type="button"
                    className="editor-primary-button"
                    onClick={() =>
                      beginEditing(
                        selectedNote
                      )
                    }
                  >
                    Edit
                  </button>
                </div>
              </div>

              <div className="note-reader-tags">
                <button
                  type="button"
                  onClick={() =>
                    selectView(
                      `category:${selectedNote.category}`
                    )
                  }
                >
                  {
                    selectedNote.category
                  }
                </button>

                {selectedNote.tags.map(
                  (tag) => (
                    <span key={tag}>
                      {tag}
                    </span>
                  )
                )}
              </div>

              <div
                className={`note-reader-content ${
                  selectedNote.content
                    ? ''
                    : 'is-empty'
                }`}
              >
                {selectedNote.content ? (
                  <p>
                    {
                      selectedNote.content
                    }
                  </p>
                ) : (
                  <>
                    <h3>
                      No text content
                    </h3>

                    <p>
                      Edit this note to add
                      text.
                    </p>
                  </>
                )}

                <ShownCanvas
                  drawing={
                    selectedNote.drawing ||
                    []
                  }
                />
              </div>
            </article>
          ) : (
            <div className="note-editor-empty">
              <div>+</div>

              <h2>
                Select a note
              </h2>

              <p>
                Choose a note from the list
                or create a new one.
              </p>

              <button
                type="button"
                onClick={beginNewNote}
              >
                Create New Note
              </button>
            </div>
          )}
        </section>
      </div>

      {noteToDelete && (
        <div
          className="delete-modal-backdrop"
          onClick={() =>
            setNoteToDelete(null)
          }
        >
          <section
            className="delete-modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <h2>Delete Note?</h2>

            <p>
              Delete{' '}
              <strong>
                {noteToDelete.title}
              </strong>
              ? This cannot be undone.
            </p>

            <div className="delete-modal-actions">
              <button
                type="button"
                className="editor-secondary-button"
                onClick={() =>
                  setNoteToDelete(null)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="confirm-delete-button"
                onClick={
                  confirmDelete
                }
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