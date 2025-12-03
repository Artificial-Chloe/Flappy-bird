// Utility Functions

const Utils = {
    // Convert degrees to radians
    DEGREE: Math.PI / 180,

    // Random integer between min and max (inclusive)
    randomInt: (min, max) => {
        return Math.floor(Math.random() * (max - min + 1) + min);
    },

    // Random float between min and max
    randomFloat: (min, max) => {
        return Math.random() * (max - min) + min;
    },

    // Circle - Rectangle Collision
    // cx, cy: Circle center; cr: Circle radius
    // rx, ry: Rect top-left; rw, rh: Rect dimensions
    circleRectCollision: (cx, cy, cr, rx, ry, rw, rh) => {
        // Find the closest point to the circle within the rectangle
        let testX = cx;
        let testY = cy;

        if (cx < rx) testX = rx;      // Left edge
        else if (cx > rx + rw) testX = rx + rw;   // Right edge

        if (cy < ry) testY = ry;      // Top edge
        else if (cy > ry + rh) testY = ry + rh;   // Bottom edge

        // Calculate distance between closest point and circle center
        let distX = cx - testX;
        let distY = cy - testY;
        let distance = Math.sqrt((distX * distX) + (distY * distY));

        return distance <= cr;
    },

    // Ease out function for smooth UI movements
    easeOutCubic: (x) => {
        return 1 - Math.pow(1 - x, 3);
    }
};