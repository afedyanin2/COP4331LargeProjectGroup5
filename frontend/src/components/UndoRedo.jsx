import {useState, useEffect} from "react";

function UndoRedo({drawing = [], setDrawing, redoStrokes, setRedoStrokes})
{
    function undo()
    {
        if (drawing.length === 0) return;

        const removedStroke = drawing[drawing.length - 1];

        setDrawing(prev => 
        {
            const next = prev.slice(0, -1);
            return next;
        });
        
        setRedoStrokes(prev => 
        {
            const next = [...prev, removedStroke];
            return next;
        });
    }

    function redo()
    {
        if (redoStrokes.length === 0) return;

        const restoredStroke = redoStrokes[redoStrokes.length - 1];

        setRedoStrokes(prev => 
        {
            const next = prev.slice(0, -1);
            return next;
        });

        setDrawing(prev => 
        {
            const next = [...prev, restoredStroke];
            return next;
        });
    }

    return (
        <div className="canvas-buttons">
            <button type="button" onClick={undo}>
                Undo
            </button>

            <button type="button" onClick={redo}>
                Redo
            </button>
        </div>
    );
}

export default UndoRedo;