import { useEffect, useRef } from "react";

function SavedCanvas({drawing})
{
    const canvasRef = useRef(null);

    useEffect(() =>
    {
        const canvas = canvasRef.current;

        if (!canvas) return;

        const ctx = canvas.getContext("2d");

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (const stroke of drawing)
        {
            for (const point of stroke)
            {
                ctx.beginPath();
                ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
                ctx.fillStyle = "green";
                ctx.fill();
            }
        }
    }, [drawing])

    return(
        <canvas
            ref={canvasRef}
            width={500}
            height={500}
        />
    );
}

export default SavedCanvas;