import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";

const Canvas = forwardRef(function Canvas({drawing = [], onStroke}, ref) 
{
    const canvasRef = useRef(null);
    const ctxRef = useRef(null);
    const currentStroke = useRef([]);

    useImperativeHandle(ref, () => ({
        getImage() 
        {
            return canvasRef.current.toDataURL("image/png");
        }
    }));

    function drawPoint(ctx, point)
    {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, Math.PI*2);
        ctx.fillStyle = "green";
        ctx.fill();
    }

    function redraw()
    {
        const canvas = canvasRef.current;

        if (!canvas) return;

        const ctx = ctxRef.current;

        if (!canvas || !ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (const stroke of drawing)
        {
            for (const point of stroke)
            {
                drawPoint(ctx, point);
            }
        }
    }

    useEffect(() => 
    {
        const canvas = canvasRef.current;

        if (!canvas) return;

        const ctx = canvas.getContext("2d");

        ctxRef.current = ctx;

        let prevX = 0;
        let prevY = 0;
        let isDrawing = false;

        function startDrawing(obj)
        {
            isDrawing = true;

            prevX = obj.offsetX;
            prevY = obj.offsetY;

            currentStroke.current = [];
        }

        function stopDrawing()
        {
            if (currentStroke.current.length > 0) 
            {
                onStroke(currentStroke.current);
            }

            currentStroke.current = [];
            isDrawing = false;
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

            if (!isDrawing) return;

            const dx = obj.offsetX - prevX;
            const dy = obj.offsetY - prevY;

            const distance = Math.sqrt(dx*dx + dy*dy);

            for (let i = 0; i < distance; i+=3)
            {
                const x = prevX + dx * (i / distance);
                const y = prevY + dy * (i / distance);

                const point = {x: x, y: y};

                drawPoint(ctx, point);

                currentStroke.current.push(point);
            }

            prevX = obj.offsetX;
            prevY = obj.offsetY;
        }

        canvas.addEventListener("mousedown", startDrawing);
        canvas.addEventListener("mousemove", draw);
        canvas.addEventListener("mouseup", stopDrawing);
        canvas.addEventListener("mouseleave", stopDrawing);
        canvas.addEventListener("mouseenter", mouseenter);

        return () => {
            canvas.removeEventListener("mousedown", startDrawing);
            canvas.removeEventListener("mousemove", draw);
            canvas.removeEventListener("mouseup", stopDrawing);
            canvas.removeEventListener("mouseleave", stopDrawing);
            canvas.removeEventListener("mouseenter", mouseenter);
        };
    }, [onStroke]);

    useEffect(() =>
    {
        redraw();
    }, [drawing]);

    return(
        <canvas
            className="canvas"
            ref={canvasRef}
            width={800}
            height={500}
        />
    );
}
)

export default Canvas;