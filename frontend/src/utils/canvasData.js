const OLD_CANVAS_PREFIX = '__NOTERIETY_CANVAS_V1__';
const CANVAS_PREFIX = '__NOTERIETY_CANVAS_V2__';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 500;
export const DEFAULT_STROKE_COLOR = '#008000';
export const DEFAULT_STROKE_WIDTH = 10;

export function isCanvasBody(body) {
  return (
    typeof body === 'string' &&
    (body.startsWith(OLD_CANVAS_PREFIX) ||
      body.startsWith(CANVAS_PREFIX))
  );
}

export function flutterColorToCss(value) {
  const color = Number(value);

  if (!Number.isFinite(color)) {
    return DEFAULT_STROKE_COLOR;
  }

  const unsigned = color >>> 0;
  const alpha = ((unsigned >>> 24) & 255) / 255;
  const red = (unsigned >>> 16) & 255;
  const green = (unsigned >>> 8) & 255;
  const blue = unsigned & 255;

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function cssColorToFlutter(color) {
  if (typeof color !== 'string') {
    return 0xff008000;
  }

  const normalized = color.trim();

  const hex = normalized.match(
    /^#([0-9a-f]{6}|[0-9a-f]{8})$/i
  );

  if (hex) {
    const value = hex[1];

    return Number.parseInt(
      value.length === 6 ? `ff${value}` : value,
      16
    ) >>> 0;
  }

  const rgba = normalized.match(
    /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i
  );

  if (!rgba) {
    return 0xff008000;
  }

  const red = Math.max(0, Math.min(255, Number(rgba[1])));
  const green = Math.max(0, Math.min(255, Number(rgba[2])));
  const blue = Math.max(0, Math.min(255, Number(rgba[3])));
  const alpha = Math.round(
    Math.max(0, Math.min(1, Number(rgba[4] ?? 1))) * 255
  );

  return (
    ((alpha << 24) |
      (red << 16) |
      (green << 8) |
      blue) >>>
    0
  );
}

function normalizePoint(point) {
  if (Array.isArray(point)) {
    return {
      x: Number(point[0]) || 0,
      y: Number(point[1]) || 0
    };
  }

  return {
    x: Number(point?.x) || 0,
    y: Number(point?.y) || 0
  };
}

export function normalizeStroke(stroke) {
  if (Array.isArray(stroke)) {
    return {
      points: stroke.map(normalizePoint),
      color: DEFAULT_STROKE_COLOR,
      width: DEFAULT_STROKE_WIDTH
    };
  }

  return {
    points: Array.isArray(stroke?.points)
      ? stroke.points.map(normalizePoint)
      : [],
    color:
      typeof stroke?.color === 'number'
        ? flutterColorToCss(stroke.color)
        : stroke?.color || DEFAULT_STROKE_COLOR,
    width: Number(stroke?.width) || DEFAULT_STROKE_WIDTH
  };
}

export function normalizeDrawing(drawing) {
  if (!Array.isArray(drawing)) {
    return [];
  }

  return drawing
    .map(normalizeStroke)
    .filter((stroke) => stroke.points.length > 0);
}

export function copyDrawing(drawing) {
  return normalizeDrawing(drawing).map((stroke) => ({
    ...stroke,
    points: stroke.points.map((point) => ({ ...point }))
  }));
}

export function decodeCanvasBody(body) {
  if (!isCanvasBody(body)) {
    return null;
  }

  try {
    const prefix = body.startsWith(CANVAS_PREFIX)
      ? CANVAS_PREFIX
      : OLD_CANVAS_PREFIX;

    return normalizeDrawing(
      JSON.parse(body.slice(prefix.length))
    );
  } catch {
    return null;
  }
}

export function encodeCanvasBody(drawing) {
  const encoded = normalizeDrawing(drawing).map((stroke) => ({
    points: stroke.points.map((point) => [
      point.x,
      point.y
    ]),
    color: cssColorToFlutter(stroke.color),
    width: stroke.width
  }));

  return CANVAS_PREFIX + JSON.stringify(encoded);
}

export function drawStroke(context, stroke) {
  const normalized = normalizeStroke(stroke);

  if (normalized.points.length === 0) {
    return;
  }

  context.beginPath();
  context.strokeStyle = normalized.color;
  context.fillStyle = normalized.color;
  context.lineWidth = normalized.width;
  context.lineCap = 'round';
  context.lineJoin = 'round';

  if (normalized.points.length === 1) {
    const point = normalized.points[0];

    context.arc(
      point.x,
      point.y,
      normalized.width / 2,
      0,
      Math.PI * 2
    );
    context.fill();
    return;
  }

  context.moveTo(
    normalized.points[0].x,
    normalized.points[0].y
  );

  for (const point of normalized.points.slice(1)) {
    context.lineTo(point.x, point.y);
  }

  context.stroke();
}

export function drawingsEqual(first, second) {
  const a = normalizeDrawing(first);
  const b = normalizeDrawing(second);

  if (a.length !== b.length) {
    return false;
  }

  return a.every((stroke, strokeIndex) => {
    const other = b[strokeIndex];

    if (
      stroke.color !== other.color ||
      stroke.width !== other.width ||
      stroke.points.length !== other.points.length
    ) {
      return false;
    }

    return stroke.points.every((point, pointIndex) => {
      const otherPoint = other.points[pointIndex];

      return (
        point.x === otherPoint.x &&
        point.y === otherPoint.y
      );
    });
  });
}

export function erasePartialStrokes(
  drawing,
  eraserPath,
  radius
) {
  const result = [];

  for (const stroke of normalizeDrawing(drawing)) {
    let currentSegment = [];
    const eraseDistance = radius + stroke.width / 2;

    for (const point of stroke.points) {
      const shouldErase = eraserPath.some((eraserPoint) => {
        const dx = point.x - eraserPoint.x;
        const dy = point.y - eraserPoint.y;

        return Math.sqrt(dx * dx + dy * dy) <= eraseDistance;
      });

      if (shouldErase) {
        if (currentSegment.length >= 2) {
          result.push({
            ...stroke,
            points: currentSegment
          });
        }

        currentSegment = [];
      } else {
        currentSegment.push(point);
      }
    }

    if (currentSegment.length >= 2) {
      result.push({
        ...stroke,
        points: currentSegment
      });
    }
  }

  return result;
}
