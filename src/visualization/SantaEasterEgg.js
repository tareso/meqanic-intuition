/**
 * SantaEasterEgg.js
 * A rare Easter egg that shows Santa flying across the screen
 * Only appears during the holiday season (Dec 25 - Jan 2)
 * Flies by randomly every 3-10 minutes
 */

export class SantaEasterEgg {
    constructor() {
        // Animation state
        this.isActive = false;
        this.x = 0;
        this.y = 0;
        this.angle = 0;
        this.speed = 0;
        this.direction = { x: 1, y: 0 };
        this.flipX = false;

        // Timing
        this.lastAppearance = 0;
        this.nextAppearanceDelay = this._getRandomDelay();

        // Image
        this.image = null;
        this.imageLoaded = false;
        this._loadImage();

        // Animation progress (0 to 1)
        this.progress = 0;
        this.animationDuration = 0;
    }

    /**
     * Load the Santa image and make black background transparent
     * @private
     */
    _loadImage() {
        const tempImage = new Image();
        tempImage.onload = () => {
            // Create offscreen canvas to process the image
            const canvas = document.createElement('canvas');
            canvas.width = tempImage.width;
            canvas.height = tempImage.height;
            const ctx = canvas.getContext('2d');

            // Draw original image
            ctx.drawImage(tempImage, 0, 0);

            // Get image data and make black pixels transparent
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // Check if pixel is black or very dark (background)
                if (r < 25 && g < 25 && b < 25) {
                    data[i + 3] = 0; // Make transparent
                }
            }

            // Put processed data back
            ctx.putImageData(imageData, 0, 0);

            // Create final image from processed canvas
            this.image = new Image();
            this.image.onload = () => {
                this.imageLoaded = true;
            };
            this.image.src = canvas.toDataURL('image/png');
        };
        tempImage.onerror = () => {
            console.warn('Santa image failed to load');
        };
        tempImage.src = 'docs/santa-sleigh.png';
    }

    /**
     * Check if today is Christmas or the day after
     * @returns {boolean}
     */
    _isChristmasSeason() {
        const now = new Date();
        const month = now.getMonth(); // 0-indexed, December = 11, January = 0
        const day = now.getDate();

        // December 25-31 or January 1-2
        const isLateDecember = month === 11 && day >= 25;
        const isEarlyJanuary = month === 0 && day <= 2;
        return isLateDecember || isEarlyJanuary;
    }

    /**
     * Get a random delay between 3-10 minutes (in milliseconds)
     * @private
     */
    _getRandomDelay() {
        const minMinutes = 3;
        const maxMinutes = 10;
        const minutes = minMinutes + Math.random() * (maxMinutes - minMinutes);
        return minutes * 60 * 1000;
    }

    /**
     * Start a new Santa flyby animation
     * @param {number} canvasWidth
     * @param {number} canvasHeight
     * @private
     */
    _startFlyby(canvasWidth, canvasHeight) {
        this.isActive = true;
        this.progress = 0;

        // Random direction patterns
        const patterns = [
            { angle: 0, startSide: 'left' },      // Left to right, horizontal
            { angle: 0, startSide: 'right' },     // Right to left, horizontal
            { angle: -20, startSide: 'left' },    // Left to right, slight up
            { angle: 20, startSide: 'left' },     // Left to right, slight down
            { angle: -20, startSide: 'right' },   // Right to left, slight up
            { angle: 20, startSide: 'right' },    // Right to left, slight down
            { angle: -35, startSide: 'left' },    // Left to right, flying up
            { angle: -35, startSide: 'right' },   // Right to left, flying up
            { angle: 35, startSide: 'left' },     // Left to right, diving
        ];

        const pattern = patterns[Math.floor(Math.random() * patterns.length)];
        this.angle = pattern.angle;

        // Convert angle to radians for direction calculation
        const angleRad = (pattern.angle * Math.PI) / 180;

        // Set direction and starting position based on pattern
        if (pattern.startSide === 'left') {
            this.flipX = false;
            this.direction = {
                x: Math.cos(angleRad),
                y: Math.sin(angleRad)
            };
            this.x = -200; // Start off-screen left
            // Start at a height that makes sense for the angle
            if (pattern.angle < 0) {
                // Flying up - start lower
                this.y = canvasHeight * 0.7 + Math.random() * canvasHeight * 0.2;
            } else if (pattern.angle > 0) {
                // Flying down - start higher
                this.y = canvasHeight * 0.1 + Math.random() * canvasHeight * 0.2;
            } else {
                // Horizontal - random middle height
                this.y = canvasHeight * 0.2 + Math.random() * canvasHeight * 0.4;
            }
        } else {
            this.flipX = true;
            this.direction = {
                x: -Math.cos(angleRad),
                y: Math.sin(angleRad)
            };
            this.x = canvasWidth + 200; // Start off-screen right
            // Start at a height that makes sense for the angle
            if (pattern.angle < 0) {
                // Flying up - start lower
                this.y = canvasHeight * 0.7 + Math.random() * canvasHeight * 0.2;
            } else if (pattern.angle > 0) {
                // Flying down - start higher
                this.y = canvasHeight * 0.1 + Math.random() * canvasHeight * 0.2;
            } else {
                // Horizontal - random middle height
                this.y = canvasHeight * 0.2 + Math.random() * canvasHeight * 0.4;
            }
        }

        // Speed varies slightly
        this.speed = 150 + Math.random() * 100; // pixels per second

        // Calculate how long the animation should take
        const distance = canvasWidth + 500; // Approximate distance to travel
        this.animationDuration = (distance / this.speed) * 1000; // in ms
    }

    /**
     * Update the Santa animation
     * @param {number} dt - Delta time in seconds
     * @param {number} timestamp - Current timestamp
     * @param {number} canvasWidth
     * @param {number} canvasHeight
     */
    update(dt, timestamp, canvasWidth, canvasHeight) {
        // Only run during Christmas season
        if (!this._isChristmasSeason()) {
            return;
        }

        if (!this.imageLoaded) {
            return;
        }

        if (this.isActive) {
            // Update position
            this.x += this.direction.x * this.speed * dt;
            this.y += this.direction.y * this.speed * dt;

            // Check if animation is complete (off screen)
            const margin = 300;
            if (this.x < -margin || this.x > canvasWidth + margin ||
                this.y < -margin || this.y > canvasHeight + margin) {
                this.isActive = false;
                this.lastAppearance = timestamp;
                this.nextAppearanceDelay = this._getRandomDelay();
            }
        } else {
            // Check if it's time for Santa to appear
            if (timestamp - this.lastAppearance > this.nextAppearanceDelay) {
                this._startFlyby(canvasWidth, canvasHeight);
            }
        }
    }

    /**
     * Draw Santa
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
        if (!this.isActive || !this.imageLoaded) {
            return;
        }

        ctx.save();

        // Move to Santa's position
        ctx.translate(this.x, this.y);

        // Apply rotation for the flight angle
        // If flipped, we need to account for that in the rotation
        if (this.flipX) {
            ctx.scale(-1, 1);
            ctx.rotate(-this.angle * Math.PI / 180);
        } else {
            ctx.rotate(this.angle * Math.PI / 180);
        }

        // Draw the image centered
        const scale = 0.25; // Scale for pixel art Santa
        const width = this.image.width * scale;
        const height = this.image.height * scale;

        // Draw Santa (black background blends with app)
        ctx.drawImage(
            this.image,
            -width / 2,
            -height / 2,
            width,
            height
        );

        ctx.restore();
    }

    /**
     * Force Santa to appear (for testing)
     * @param {number} canvasWidth
     * @param {number} canvasHeight
     */
    forceAppear(canvasWidth, canvasHeight) {
        this._startFlyby(canvasWidth, canvasHeight);
    }
}
