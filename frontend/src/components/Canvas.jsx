import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef
} from 'react';

import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  drawStroke,
  normalizeDrawing
} from '../utils/canvasData.js';

const Canvas = forwardRef(function Canvas(
  {
    drawing = [],
    tool = 'pen',
    strokeColor,
    strokeWidth,
    eraserRadius,
    onStroke,
    onErase
  },
  ref
) {
  const canvasRef = useRef(null);
  const gesturePoints = useRef([]);
  const drawingRef = useRef(drawing);
  const toolRef = useRef(tool);
  const strokeColorRef = useRef(strokeColor);
  const strokeWidthRef = useRef(strokeWidth);
  const eraserRadiusRef = useRef(eraserRadius);

  useEffect(() => {
    drawingRef.current = drawing;
  }, [drawing]);

  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  useEffect(() => {
    strokeColorRef.current = strokeColor;
  }, [strokeColor]);

  useEffect(() => {
    strokeWidthRef.current = strokeWidth;
  }, [strokeWidth]);

  useEffect(() => {
    eraserRadiusRef.current = eraserRadius;
  }, [eraserRadius]);

  useImperativeHandle(ref, () => ({
    getImage() {
      return canvasRef.current?.toDataURL('image/png') || '';
    }
  }));

  function redraw(previewPoints = []) {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (const stroke of normalizeDrawing(drawingRef.current)) {
      drawStroke(context, stroke);
    }

    if (
      toolRef.current === 'pen' &&
      previewPoints.length > 0
    ) {
      drawStroke(context, {
        points: previewPoints,
        color: strokeColorRef.current,
        width: strokeWidthRef.current
      });
    }

    if (
      toolRef.current === 'eraser' &&
      previewPoints.length > 0
    ) {
      const point = previewPoints[previewPoints.length - 1];

      context.beginPath();
      context.strokeStyle = 'rgba(0, 0, 0, 0.55)';
      context.lineWidth = 2;
      context.arc(
        point.x,
        point.y,
        eraserRadiusRef.current,
        0,
        Math.PI * 2
      );
      context.stroke();
    }
  }

  useEffect(() => {
    redraw();
  }, [drawing, tool, strokeColor, strokeWidth, eraserRadius]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return undefined;
    }

    let pointerDown = false;
    let previousPoint = null;

    function toCanvasPoint(event) {
      const bounds = canvas.getBoundingClientRect();

      return {
        x:
          (event.clientX - bounds.left) *
          (canvas.width / bounds.width),
        y:
          (event.clientY - bounds.top) *
          (canvas.height / bounds.height)
      };
    }

    function startGesture(event) {
      event.preventDefault();
      canvas.setPointerCapture?.(event.pointerId);

      pointerDown = true;
      previousPoint = toCanvasPoint(event);
      gesturePoints.current = [previousPoint];

      redraw(gesturePoints.current);
    }

    function extendGesture(event) {
      if (!pointerDown || !previousPoint) {
        return;
      }

      event.preventDefault();

      const point = toCanvasPoint(event);
      const dx = point.x - previousPoint.x;
      const dy = point.y - previousPoint.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0) {
        for (let i = 3; i <= distance; i += 3) {
          const progress = Math.min(i / distance, 1);

          gesturePoints.current.push({
            x: previousPoint.x + dx * progress,
            y: previousPoint.y + dy * progress
          });
        }

        const last = gesturePoints.current[
          gesturePoints.current.length - 1
        ];

        if (last.x !== point.x || last.y !== point.y) {
          gesturePoints.current.push(point);
        }
      }

      previousPoint = point;
      redraw(gesturePoints.current);
    }

    function endGesture(event) {
      if (!pointerDown) {
        return;
      }

      event?.preventDefault();
      pointerDown = false;
      previousPoint = null;

      const completed = [...gesturePoints.current];
      gesturePoints.current = [];

      if (completed.length > 0) {
        if (toolRef.current === 'pen') {
          onStroke({
            points: completed,
            color: strokeColorRef.current,
            width: strokeWidthRef.current
          });
        } else {
          onErase(completed);
        }
      }

      redraw();
    }

    canvas.addEventListener('pointerdown', startGesture);
    canvas.addEventListener('pointermove', extendGesture);
    canvas.addEventListener('pointerup', endGesture);
    canvas.addEventListener('pointercancel', endGesture);
    canvas.addEventListener('pointerleave', endGesture);

    return () => {
      canvas.removeEventListener('pointerdown', startGesture);
      canvas.removeEventListener('pointermove', extendGesture);
      canvas.removeEventListener('pointerup', endGesture);
      canvas.removeEventListener('pointercancel', endGesture);
      canvas.removeEventListener('pointerleave', endGesture);
    };
  }, [onStroke, onErase]);

  return (
    <canvas
      className="canvas"
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
    />
  );
});

export default Canvas;
