// --- PARTICLES ---
class Particle {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'feather' or 'dust'
        this.vx = Utils.randomFloat(-2, 2);
        this.vy = Utils.randomFloat(-2, 2);
        this.life = 1.0;
        this.decay = Utils.randomFloat(0.02, 0.05);
        this.size = Utils.randomFloat(2, 5);
        this.color = type === 'feather' ? '#fff' : '#e86101';
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
        // Gravity
        this.vy += 0.1;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        if(this.type === 'feather') {
             ctx.ellipse(this.x, this.y, this.size, this.size/2, this.life * 10, 0, Math.PI*2);
        } else {
             ctx.rect(this.x, this.y, this.size, this.size);
        }
        ctx.fill();
        ctx.restore();
    }
}

// --- BIRD ---
class Bird {
    constructor() {
        this.x = 50;
        this.y = 150;
        this.w = 34;
        this.h = 24;
        this.radius = 12;
        this.velocity = 0;
        this.gravity = 0.25;
        this.jumpStrength = 4.6;
        this.rotation = 0;
        this.frame = 0;
        this.animTimer = 0;
    }

    reset(startY) {
        this.y = startY;
        this.velocity = 0;
        this.rotation = 0;
    }

    flap() {
        this.velocity = -this.jumpStrength;
    }

    update(state) {
        // Animation
        this.animTimer++;
        if (this.animTimer % 5 === 0) {
            this.frame = (this.frame + 1) % 4; // 0, 1, 2, 1 pattern mapped in draw
        }

        if (state === 'GET_READY') {
            // Bobbing effect
            this.y = 150 + Math.cos(Date.now() / 300) * 5;
            this.rotation = 0;
        } else if (state === 'PLAYING' || state === 'GAME_OVER') {
            this.velocity += this.gravity;
            this.y += this.velocity;

            // Rotation logic
            if (this.velocity < this.jumpStrength) {
                this.rotation = -25 * Utils.DEGREE;
            } else {
                this.rotation += 5 * Utils.DEGREE;
                if (this.rotation > 90 * Utils.DEGREE) {
                    this.rotation = 90 * Utils.DEGREE;
                }
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Procedural Bird Drawing
        // Body
        ctx.fillStyle = "#f8e75a";
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#000";
        ctx.stroke();

        // Eye
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(6, -6, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Pupil
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(8, -6, 2, 0, Math.PI * 2);
        ctx.fill();

        // Wing (Animated slightly based on frame)
        let wingY = (this.frame % 2 === 0) ? 2 : -2;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.ellipse(-4, 4 + wingY, 8, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Beak
        ctx.fillStyle = "#f48c34";
        ctx.beginPath();
        ctx.moveTo(8, 2);
        ctx.lineTo(16, 6);
        ctx.lineTo(8, 10);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }
}

// --- BACKGROUND ---
class Background {
    constructor(gameWidth, gameHeight) {
        this.gameWidth = gameWidth;
        this.gameHeight = gameHeight;
        this.skyColor = "#70c5ce";
        this.cloudOffset = 0;
        this.cityOffset = 0;
    }

    update(speed) {
        this.cloudOffset = (this.cloudOffset + speed * 0.2) % (this.gameWidth);
        this.cityOffset = (this.cityOffset + speed * 0.5) % (this.gameWidth);
    }

    draw(ctx) {
        // Sky
        let grad = ctx.createLinearGradient(0, 0, 0, this.gameHeight);
        grad.addColorStop(0, "#70c5ce");
        grad.addColorStop(1, "#cfffff");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, ctx.canvas.width / ctx.getTransform().a, this.gameHeight); // Draw across full width

        // Clouds (Procedural)
        ctx.fillStyle = "#eeffff";
        this.drawClouds(ctx, this.cloudOffset);
        this.drawClouds(ctx, this.cloudOffset - this.gameWidth); // Seamless loop
        this.drawClouds(ctx, this.cloudOffset - this.gameWidth * 2);

        // Cityscape
        ctx.fillStyle = "#a3d8bf";
        this.drawCity(ctx, this.cityOffset);
        this.drawCity(ctx, this.cityOffset - this.gameWidth);
        this.drawCity(ctx, this.cityOffset - this.gameWidth * 2);
    }

    drawClouds(ctx, offset) {
        const yBase = this.gameHeight - 150;
        const w = this.gameWidth;
        
        ctx.save();
        ctx.translate(-offset, 0);
        
        // Simple cloud clusters
        ctx.beginPath();
        ctx.arc(100, yBase, 30, 0, Math.PI*2);
        ctx.arc(140, yBase - 10, 35, 0, Math.PI*2);
        ctx.arc(180, yBase, 30, 0, Math.PI*2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(w/2, yBase - 50, 40, 0, Math.PI*2);
        ctx.arc(w/2 + 50, yBase - 40, 45, 0, Math.PI*2);
        ctx.arc(w/2 + 90, yBase - 50, 30, 0, Math.PI*2);
        ctx.fill();
        
        ctx.restore();
    }

    drawCity(ctx, offset) {
        const yBase = this.gameHeight - 112; // Top of ground
        const w = this.gameWidth;
        
        ctx.save();
        ctx.translate(-offset, 0);
        
        // Procedural buildings
        // We use a pseudo-random generator based on x position to keep buildings static-looking
        for(let i = 0; i < w; i += 30) {
            let h = Math.abs(Math.sin(i * 132.1)) * 100 + 20;
            ctx.fillRect(i, yBase - h, 28, h);
            
            // Windows
            ctx.fillStyle = "#8bc1a8";
            for(let wy = yBase - h + 5; wy < yBase; wy+= 15) {
                ctx.fillRect(i + 5, wy, 8, 8);
                ctx.fillRect(i + 15, wy, 8, 8);
            }
            ctx.fillStyle = "#a3d8bf"; // Reset for next building
        }
        ctx.restore();
    }
}