import {
  forwardRef,
  useState
} from 'react';

import Canvas from './Canvas.jsx';
import {
  copyDrawing,
  drawingsEqual,
  erasePartialStrokes
} from '../utils/canvasData.js';

const COLORS = [
  '#111111',
  '#008000',
  '#1976d2',
  '#d32f2f',
  '#7b1fa2',
  '#f57c00'
];

const BRUSH_WIDTHS = [
  { label: 'Thin', value: 4 },
  { label: 'Medium', value: 8 },
  { label: 'Thick', value: 14 }
];

const CanvasWorkspace = forwardRef(function CanvasWorkspace(
  {
    drawing = [],
    setDrawing
  },
  ref
) {
  const [tool, setTool] = useState('pen');
  const [strokeColor, setStrokeColor] = useState('#008000');
  const [strokeWidth, setStrokeWidth] = useState(8);
  const [eraserRadius, setEraserRadius] = useState(22);
  const [undoHistory, setUndoHistory] = useState([]);
  const [redoHistory, setRedoHistory] = useState([]);

  function commit(nextDrawing) {
    setUndoHistory((history) => [
      ...history,
      copyDrawing(drawing)
    ]);
    setRedoHistory([]);
    setDrawing(copyDrawing(nextDrawing));
  }

  function handleStroke(stroke) {
    commit([...drawing, stroke]);
  }

  function handleErase(eraserPath) {
    const erased = erasePartialStrokes(
      drawing,
      eraserPath,
      eraserRadius
    );

    if (!drawingsEqual(erased, drawing)) {
      commit(erased);
    }
  }

  function undo() {
    if (undoHistory.length === 0) {
      return;
    }

    const previous = undoHistory[undoHistory.length - 1];

    setUndoHistory((history) => history.slice(0, -1));
    setRedoHistory((history) => [
      ...history,
      copyDrawing(drawing)
    ]);
    setDrawing(copyDrawing(previous));
  }

  function redo() {
    if (redoHistory.length === 0) {
      return;
    }

    const next = redoHistory[redoHistory.length - 1];

    setRedoHistory((history) => history.slice(0, -1));
    setUndoHistory((history) => [
      ...history,
      copyDrawing(drawing)
    ]);
    setDrawing(copyDrawing(next));
  }

  function clearCanvas() {
    if (
      drawing.length > 0 &&
      window.confirm(
        'Clear canvas? Every stroke will be removed.'
      )
    ) {
      commit([]);
    }
  }

  return (
    <div className="canvas-workspace">
      <div className="canvas-toolbar">
        <div className="canvas-tool-group">
          <button
            type="button"
            className={tool === 'pen' ? 'is-active' : ''}
            onClick={() => setTool('pen')}
          >
            Pen
          </button>

          <button
            type="button"
            className={tool === 'eraser' ? 'is-active' : ''}
            onClick={() => setTool('eraser')}
          >
            Eraser
          </button>
        </div>

        <div
          className="canvas-color-picker"
          aria-label="Stroke color"
        >
          {COLORS.map((color) => (
            <button
              type="button"
              key={color}
              className={
                strokeColor === color ? 'is-active' : ''
              }
              style={{ '--canvas-swatch': color }}
              aria-label={`Use ${color}`}
              onClick={() => {
                setStrokeColor(color);
                setTool('pen');
              }}
            />
          ))}
        </div>

        <div className="canvas-width-picker">
          {BRUSH_WIDTHS.map((option) => (
            <button
              type="button"
              key={option.value}
              className={
                strokeWidth === option.value
                  ? 'is-active'
                  : ''
              }
              onClick={() => {
                setStrokeWidth(option.value);
                setTool('pen');
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        {tool === 'eraser' && (
          <label className="canvas-eraser-size">
            <span>Eraser</span>
            <input
              type="range"
              min="12"
              max="40"
              step="4"
              value={eraserRadius}
              onChange={(event) =>
                setEraserRadius(Number(event.target.value))
              }
            />
          </label>
        )}
      </div>

      <Canvas
        ref={ref}
        drawing={drawing}
        tool={tool}
        strokeColor={strokeColor}
        strokeWidth={strokeWidth}
        eraserRadius={eraserRadius}
        onStroke={handleStroke}
        onErase={handleErase}
      />

      <div className="canvas-buttons">
        <button
          type="button"
          onClick={undo}
          disabled={undoHistory.length === 0}
        >
          Undo
        </button>

        <button
          type="button"
          onClick={redo}
          disabled={redoHistory.length === 0}
        >
          Redo
        </button>

        <button
          type="button"
          className="canvas-clear-button"
          onClick={clearCanvas}
          disabled={drawing.length === 0}
        >
          Clear
        </button>
      </div>
    </div>
  );
});

export default CanvasWorkspace;
