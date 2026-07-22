import { useEffect, useRef } from "react";

function Canvas() 
{
    const canvasRef = useRef(null);
    const ctxRef = useRef(null);

    const strokes = useRef([]);
    const redoStrokes = useRef([]);
    const currStroke = useRef([]);

    function undo()
    {
        const canvas = canvasRef.current;
        const ctx = ctxRef.current;


        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const removedStroke = strokes.current.pop()

        if (removedStroke)
        {
            redoStrokes.current.push(removedStroke);
        }

        for (const stroke of strokes.current)
        {
            for (const point of stroke)
            {
                drawPoint(ctx, point);
            }
        }
    }

    function redo()
    {
        const canvas = canvasRef.current;
        const ctx = ctxRef.current;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const removedStroke = redoStrokes.current.pop();

        if (removedStroke)
        {
            strokes.current.push(removedStroke)
        }

        for (const stroke of strokes.current)
        {
            for (const point of stroke)
            {
                drawPoint(ctx, point);
            }
        }           
    }

    function drawPoint(ctx, point)
    {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, Math.PI*2);
        ctx.fillStyle = "green";
        ctx.fill();
    }

    useEffect(() => 
    {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        ctxRef.current = ctx;

        let prevX = 0;
        let prevY = 0;

        let firstPoint = true;
        let drawing = false;

        function startDrawing(obj)
        {
            drawing = true;
            prevX = obj.offsetX;
            prevY = obj.offsetY;
            redoStrokes.current = [];
        }

        function stopDrawing()
        {
            drawing = false;
            ctx.beginPath();

            if (currStroke.current.length > 0)
            {
                strokes.current.push(currStroke.current);
            }

            currStroke.current = [];
        }

        function mouseenter(obj)
        {
            if (obj.buttons === 1)
            {
                startDrawing(obj);
            }
        }

        function draw(obj)
        {

            if (!drawing) return;
            const dx = obj.offsetX - prevX;
            const dy = obj.offsetY - prevY;

            const distance = Math.sqrt(dx*dx + dy*dy);
            for (let i = 0; i < distance; i+=3)
            {
                const x = prevX + dx * (i / distance);
                const y = prevY + dy * (i / distance);

                const point = {x: x, y: y};

                drawPoint(ctx, point);
                currStroke.current.push(point);
            }

            prevX = obj.offsetX;
            prevY = obj.offsetY;
        }

        canvas.addEventListener("mousedown", startDrawing);
        canvas.addEventListener("mousemove", draw);
        canvas.addEventListener("mouseup", stopDrawing);
        canvas.addEventListener("mouseleave", stopDrawing);
        canvas.addEventListener("mouseenter", mouseenter);

    }, []);

    return(
        <div className = "canvas-container">
            <canvas
                className="canvas"
                ref={canvasRef}
                width={500}
                height={500}
            />

            <div className = "canvas-buttons">
                <button onClick={undo}>Undo</button>
                <button onClick={redo}>Redo</button>
            </div>
       </div>  
    );
}

export default Canvas;