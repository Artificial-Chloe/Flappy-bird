class Game {
    constructor() {
        this.canvas = document.getElementById("gameCanvas");
        this.ctx = this.canvas.getContext("2d");
        
        // Logic Dimensions (Resolution independent)
        this.LOGICAL_HEIGHT = 600; 
        this.scale = 1;
        
        this.audio = new SoundManager();
        this.bird = new Bird();
        this.bg = null; // Initialized in resize
        
        // Game State
        this.states = { GET_READY: 'GET_READY', PLAYING: 'PLAYING', GAME_OVER: 'GAME_OVER' };
        this.currentState = this.states.GET_READY;
        this.frames = 0;
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('flappy_masterpiece_best')) || 0;
        this.flashOpacity = 0;
        
        // Objects
        this.pipes = [];
        this.particles = [];
        this.groundX = 0;
        this.groundY = 0;
        
        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // Input Handling
        const handleInput = (e) => {
            if (e.type === 'keydown' && e.code !== 'Space') return;
            if (e.type === 'keydown') e.preventDefault(); // Stop scrolling
            this.action();
        };

        window.addEventListener('keydown', handleInput);
        window.addEventListener('touchstart', (e) => { e.preventDefault(); this.action(); }, {passive: false});
        window.addEventListener('mousedown', handleInput);

        this.loop();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Calculate scale based on height to maintain gameplay verticality
        this.scale = this.canvas.height / this.LOGICAL_HEIGHT;
        
        // Re-initialize background to cover new width
        this.bg = new Background(this.canvas.width / this.scale, this.LOGICAL_HEIGHT);
        this.groundY = this.LOGICAL_HEIGHT - 112;
    }

    action() {
        switch (this.currentState) {
            case this.states.GET_READY:
                this.currentState = this.states.PLAYING;
                this.audio.play('jump');
                this.bird.flap();
                this.createParticles(this.bird.x, this.bird.y, 'feather', 3);
                break;
                
            case this.states.PLAYING:
                if (this.bird.y > -50) { // Don't flap above screen too much
                    this.bird.flap();
                    this.audio.play('jump');
                    this.createParticles(this.bird.x, this.bird.y, 'feather', 2);
                }
                break;
                
            case this.states.GAME_OVER:
                // Cooldown to prevent accidental restarts
                if (this.frames - this.deathFrame > 30) {
                    this.reset();
                }
                break;
        }
    }

    reset() {
        this.currentState = this.states.GET_READY;
        this.bird.reset(150);
        this.pipes = [];
        this.score = 0;
        this.frames = 0;
        this.flashOpacity = 0;
        this.audio.play('swoosh');
    }

    createParticles(x, y, type, count) {
        for(let i=0; i<count; i++) {
            this.particles.push(new Particle(x, y, type));
        }
    }

    update() {
        // Speed scaling based on width is not needed for Flappy Bird, const speed is fine
        const speed = 3;

        // Background
        if (this.currentState === this.states.PLAYING) {
            this.bg.update(speed * 0.5);
            this.groundX = (this.groundX + speed) % (this.canvas.width / this.scale);
        }

        // Bird
        this.bird.update(this.currentState);

        // Ground Collision
        if (this.bird.y + this.bird.radius >= this.groundY) {
            this.bird.y = this.groundY - this.bird.radius;
            if (this.currentState === this.states.PLAYING) {
                this.gameOver();
            }
        }

        // Pipes Logic
        if (this.currentState === this.states.PLAYING) {
            // Spawn Pipe
            // Spawn logical coordinate X is the right edge of the visible screen area
            const spawnX = (this.canvas.width / this.scale);
            
            if (this.frames % 100 === 0) {
                const gap = 120;
                const minPipeH = 50;
                // Calculate max Y for top pipe
                // groundY (488) - gap (100) - minPipeH (50) = 338
                const maxPos = this.groundY - gap - minPipeH; 
                const topY = Utils.randomInt(minPipeH, maxPos);
                
                this.pipes.push({
                    x: spawnX,
                    y: topY, // Bottom of top pipe
                    w: 52,
                    gap: gap,
                    passed: false
                });
            }

            // Update Pipes
            for (let i = 0; i < this.pipes.length; i++) {
                let p = this.pipes[i];
                p.x -= speed;

                // Collision
                // Top Pipe Rect: x: p.x, y: 0, w: p.w, h: p.y
                // Bottom Pipe Rect: x: p.x, y: p.y + p.gap, w: p.w, h: ...
                
                const birdLeft = this.bird.x - this.bird.radius + 5; // +5 hitbox buffer
                const birdRight = this.bird.x + this.bird.radius - 5;
                const birdTop = this.bird.y - this.bird.radius + 5;
                const birdBottom = this.bird.y + this.bird.radius - 5;

                // Simple AABB check for efficiency first, can use circleRect if needed
                if (
                    birdRight > p.x && birdLeft < p.x + p.w &&
                    (birdTop < p.y || birdBottom > p.y + p.gap)
                ) {
                    this.gameOver();
                }

                // Score
                if (p.x + p.w < this.bird.x && !p.passed) {
                    this.score++;
                    this.audio.play('score');
                    p.passed = true;
                    this.bestScore = Math.max(this.score, this.bestScore);
                    localStorage.setItem('flappy_masterpiece_best', this.bestScore);
                }

                // Remove off-screen
                if (p.x + p.w < -100) {
                    this.pipes.shift();
                    i--;
                }
            }
        }

        // Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].life <= 0) this.particles.splice(i, 1);
        }

        this.frames++;
    }

    gameOver() {
        this.currentState = this.states.GAME_OVER;
        this.audio.play('hit');
        this.flashOpacity = 1.0;
        this.deathFrame = this.frames;
        // Screenshake effect could be added here by offsetting canvas momentarily
        this.createParticles(this.bird.x, this.bird.y, 'dust', 10);
    }

    draw() {
        // Clear Background
        this.ctx.fillStyle = "#333";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.scale(this.scale, this.scale);

        // Draw Background Layers
        this.bg.draw(this.ctx);

        // Draw Pipes
        for (let p of this.pipes) {
            // Top Pipe
            this.drawPipe(p.x, 0, p.w, p.y, true);
            // Bottom Pipe
            this.drawPipe(p.x, p.y + p.gap, p.w, this.groundY - (p.y + p.gap), false);
        }

        // Draw Ground
        this.drawGround();

        // Draw Bird
        this.bird.draw(this.ctx);

        // Draw Particles
        for (let p of this.particles) {
            p.draw(this.ctx);
        }

        // Draw UI
        this.drawUI();

        // Flash Effect
        if (this.flashOpacity > 0) {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${this.flashOpacity})`;
            this.ctx.fillRect(0, 0, this.canvas.width / this.scale, this.LOGICAL_HEIGHT);
            this.flashOpacity -= 0.05;
        }

        this.ctx.restore();
    }

    drawPipe(x, y, w, h, isTop) {
        this.ctx.fillStyle = "#73bf2e";
        this.ctx.fillRect(x, y, w, h);
        
        // Light border
        this.ctx.strokeStyle = "#558c22"; // darker green border
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, w, h);
        
        // Highlight
        this.ctx.fillStyle = "#9ce659"; // light green
        this.ctx.fillRect(x + 2, y, 4, h);
        this.ctx.fillRect(x + 10, y, 2, h);

        // Cap
        const capH = 24;
        const capY = isTop ? y + h - capH : y;
        this.ctx.fillStyle = "#73bf2e";
        this.ctx.fillRect(x - 2, capY, w + 4, capH);
        this.ctx.strokeRect(x - 2, capY, w + 4, capH);
        
        // Cap Highlight
        this.ctx.fillStyle = "#9ce659"; 
        this.ctx.fillRect(x, capY, 4, capH);
    }

    drawGround() {
        const h = this.LOGICAL_HEIGHT - this.groundY;
        const w = this.canvas.width / this.scale; // Width in logical pixels
        
        this.ctx.fillStyle = "#ded895";
        this.ctx.fillRect(0, this.groundY, w, h);
        
        // Grass Top
        this.ctx.fillStyle = "#73bf2e";
        this.ctx.fillRect(0, this.groundY, w, 12);
        this.ctx.strokeStyle = "#558c22";
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.groundY+12);
        this.ctx.lineTo(w, this.groundY+12);
        this.ctx.stroke();

        // Pattern
        this.ctx.strokeStyle = "#cbb968";
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        // Shift pattern by groundX
        const shift = this.groundX % 20;
        for(let i = -20; i < w + 20; i+= 20) {
             this.ctx.moveTo(i - shift, this.groundY + 16);
             this.ctx.lineTo(i - 10 - shift, this.LOGICAL_HEIGHT);
        }
        this.ctx.stroke();
    }

    drawUI() {
        const w = this.canvas.width / this.scale;
        const center = w / 2;

        if (this.currentState === this.states.GET_READY) {
            this.ctx.fillStyle = "#fff";
            this.ctx.strokeStyle = "#000";
            this.ctx.lineWidth = 4;
            this.ctx.font = "40px 'Press Start 2P'";
            this.ctx.textAlign = "center";
            this.ctx.strokeText("Get Ready!", center, 200);
            this.ctx.fillText("Get Ready!", center, 200);

            this.ctx.font = "20px 'Press Start 2P'";
            this.ctx.fillText("Press Space or Click", center, 250);
        } else if (this.currentState === this.states.PLAYING) {
            this.ctx.fillStyle = "#fff";
            this.ctx.strokeStyle = "#000";
            this.ctx.lineWidth = 4;
            this.ctx.font = "50px 'Press Start 2P'";
            this.ctx.textAlign = "center";
            this.ctx.strokeText(this.score, center, 100);
            this.ctx.fillText(this.score, center, 100);
        } else if (this.currentState === this.states.GAME_OVER) {
            // Panel
            const panelW = 250;
            const panelH = 170;
            const panelX = center - panelW/2;
            const panelY = 180;

            // Box
            this.ctx.fillStyle = "#ded895";
            this.ctx.fillRect(panelX, panelY, panelW, panelH);
            this.ctx.strokeStyle = "#e86101";
            this.ctx.lineWidth = 4;
            this.ctx.strokeRect(panelX, panelY, panelW, panelH);

            // Title
            this.ctx.fillStyle = "#e86101";
            this.ctx.strokeStyle = "#fff";
            this.ctx.lineWidth = 4;
            this.ctx.font = "35px 'Press Start 2P'";
            this.ctx.textAlign = "center";
            this.ctx.strokeText("Game Over", center, 150);
            this.ctx.fillText("Game Over", center, 150);

            // Scores
            this.ctx.fillStyle = "#e86101";
            this.ctx.textAlign = "right";
            this.ctx.font = "20px 'Press Start 2P'";
            this.ctx.fillText("Score", panelX + 220, panelY + 50);
            this.ctx.fillStyle = "#fff";
            this.ctx.strokeStyle = "#000";
            this.ctx.lineWidth = 3;
            this.ctx.strokeText(this.score, panelX + 220, panelY + 80);
            this.ctx.fillText(this.score, panelX + 220, panelY + 80);

            this.ctx.fillStyle = "#e86101";
            this.ctx.fillText("Best", panelX + 220, panelY + 110);
            this.ctx.fillStyle = "#fff";
            this.ctx.strokeText(this.bestScore, panelX + 220, panelY + 140);
            this.ctx.fillText(this.bestScore, panelX + 220, panelY + 140);
            
            // Medal
            this.drawMedal(panelX + 40, panelY + 65);
        }
    }
    
    drawMedal(x, y) {
        let color = "#cd7f32"; // Bronze default
        if(this.score >= 10) color = "#C0C0C0"; // Silver
        if(this.score >= 20) color = "#FFD700"; // Gold
        if(this.score >= 40) color = "#e5e4e2"; // Platinum
        
        if(this.score >= 5) {
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(x + 25, y + 25, 25, 0, Math.PI*2);
            this.ctx.fill();
            this.ctx.stroke();
            this.ctx.fillStyle = "#fff";
            this.ctx.font = "10px sans-serif";
            this.ctx.textAlign = "center";
            this.ctx.fillText("MEDAL", x+25, y+30);
        }
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }
}

// Start Game
window.onload = () => {
    new Game();
};