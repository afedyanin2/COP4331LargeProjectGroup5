import {
  useEffect,
  useRef
} from 'react';

import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  drawStroke,
  normalizeDrawing
} from '../utils/canvasData.js';

function ShownCanvas({ drawing = [] }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (const stroke of normalizeDrawing(drawing)) {
      drawStroke(context, stroke);
    }
  }, [drawing]);

  return (
    <canvas
      className="canvas shown-canvas"
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
    />
  );
}

export default ShownCanvas;
