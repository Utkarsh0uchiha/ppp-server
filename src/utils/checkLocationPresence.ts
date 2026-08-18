interface Point {
    x: number;
    y: number;
}

function isPointInQuadrilateral(point: Point, quadrilateral: [Point, Point, Point, Point]): boolean {
    // Ray casting algorithm
    let inside = false;
    const [p1, p2, p3, p4] = quadrilateral;
    const vertices = [p1, p2, p3, p4];

    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        const vi = vertices[i];
        const vj = vertices[j];

        // Check if the ray crosses the edge
        if (
            ((vi.y > point.y) !== (vj.y > point.y)) &&
            (point.x < (vj.x - vi.x) * (point.y - vi.y) / (vj.y - vi.y) + vi.x)
        ) {
            inside = !inside;
        }
    }

    return inside;
}

const quadrilateral: [Point, Point, Point, Point] = [
    { x: 30.2183969, y: 75.6987946 },
    { x: 30.2177920, y: 75.6987651 },
    { x: 30.2177734, y: 75.6997468 },
    { x: 30.2183946, y: 75.6997146 }
];

const checkLocationPresence = (point: Point): boolean => {
    return isPointInQuadrilateral(point, quadrilateral);
}

export default checkLocationPresence;
