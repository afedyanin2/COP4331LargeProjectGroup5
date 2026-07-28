import {useState, useRef, useEffect, forwardRef, useImperativeHandle} from 'react';
import Canvas from './Canvas.jsx'
import UndoRedo from './UndoRedo.jsx';

const CanvasWorkspace = forwardRef(function CanvasWorkspace({ drawing = [], setDrawing}, ref) 
{
    const [redoStrokes, setRedoStrokes] = useState([]);
    const drawingRef = useRef(drawing);

    function handleStroke(stroke) 
    {
        setDrawing(prev => 
            {
                const next = [...prev, stroke];
                return next;
            });
        setRedoStrokes([]);

    }

    useEffect(() => 
    {
        drawingRef.current = drawing;
    }, [drawing]);

    return (
        <div>
            <Canvas
                drawing={drawing}
                onStroke={handleStroke}
            />

            <UndoRedo
                drawing={drawing}
                setDrawing={setDrawing}
                redoStrokes={redoStrokes}
                setRedoStrokes={setRedoStrokes}
            />
        </div>
    );
});

export default CanvasWorkspace;