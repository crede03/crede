// Retro Screensaver Engine
(function() {
    let mode = 'starfield'; // 'starfield', 'matrix', 'bouncing', 'none'
    let timeoutSeconds = 60;
    let idleTimer = null;
    let isRunning = false;
    let animFrame = null;
    let canvas = null;
    let ctx = null;
    let overlay = null;
    let lastMouseMove = { x: 0, y: 0 };

    // Load persisted settings
    try {
        const storedMode = localStorage.getItem('crede_screensaver_mode');
        if (storedMode) mode = storedMode;
        const storedTimeout = localStorage.getItem('crede_screensaver_timeout');
        if (storedTimeout) timeoutSeconds = parseInt(storedTimeout, 10) || 60;
    } catch(e) {}

    function init() {
        overlay = document.getElementById('screensaver-overlay');
        canvas = document.getElementById('screensaver-canvas');
        if (!overlay || !canvas) return;
        ctx = canvas.getContext('2d');

        // Reset timer on user activity
        const resetActivity = (e) => {
            if (isRunning) {
                // If mouse event, require movement to wake
                if (e.type === 'mousemove') {
                    const dx = Math.abs(e.clientX - lastMouseMove.x);
                    const dy = Math.abs(e.clientY - lastMouseMove.y);
                    if (dx < 5 && dy < 5) return;
                }
                stopScreensaver();
            }
            if (e.type === 'mousemove') {
                lastMouseMove.x = e.clientX;
                lastMouseMove.y = e.clientY;
            }
            startIdleTimer();
        };

        window.addEventListener('mousemove', resetActivity, { passive: true });
        window.addEventListener('keydown', resetActivity, { passive: true });
        window.addEventListener('touchstart', resetActivity, { passive: true });
        window.addEventListener('resize', onResize);

        startIdleTimer();
    }

    function onResize() {
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function startIdleTimer() {
        clearTimeout(idleTimer);
        if (mode === 'none' || window.innerWidth <= 768) return; // Disable screensaver on mobile by default
        idleTimer = setTimeout(() => {
            startScreensaver();
        }, timeoutSeconds * 1000);
    }

    // Helper to reset canvas context
    function getFreshCanvas(canvasElement) {
        if (!canvasElement) return null;
        const newCanvas = canvasElement.cloneNode(true);
        newCanvas.id = canvasElement.id;
        if (canvasElement.parentNode) {
            canvasElement.parentNode.replaceChild(newCanvas, canvasElement);
        }
        return newCanvas;
    }

    function startScreensaver(customMode) {
        if (!overlay) overlay = document.getElementById('screensaver-overlay');
        let currentCanvas = document.getElementById('screensaver-canvas');
        if (!overlay || !currentCanvas) return;

        const currentMode = customMode || mode;
        if (currentMode === 'none') return;

        isRunning = true;
        document.body.classList.add('screensaver-active');
        overlay.classList.add('active');

        // Hide clippy balloon and suppress tooltips
        const clippyBalloon = document.getElementById('clippy-interactive-balloon');
        if (clippyBalloon) clippyBalloon.style.display = 'none';
        document.querySelectorAll('.clippy-interactive-balloon, [class*="clippy-balloon"]').forEach(b => {
            b.style.display = 'none';
        });
        window.ClippySystem?.hideBalloon?.();

        // Always get a fresh canvas to avoid context conflicts between 2D and WebGL
        canvas = getFreshCanvas(currentCanvas);
        ctx = null;
        if (currentMode !== 'flowerbox' && currentMode !== '3dflowerbox') {
            ctx = canvas.getContext('2d');
        }

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        if (animFrame) cancelAnimationFrame(animFrame);
        runScreensaver(canvas, ctx, currentMode, () => isRunning);
    }

    function stopScreensaver() {
        if (!isRunning) return;
        isRunning = false;
        document.body.classList.remove('screensaver-active');
        if (overlay) overlay.classList.remove('active');
        if (animFrame) cancelAnimationFrame(animFrame);
        startIdleTimer();
    }

    // Exported renderers for both full screen and mini preview in Display Properties
    function runScreensaver(targetCanvas, targetCtx, targetMode, getIsRunning) {
        if (targetMode === 'flowerbox' || targetMode === '3dflowerbox') {
            if (window.FlowerBoxEngine) {
                window.FlowerBoxEngine.run(targetCanvas, getIsRunning);
            }
        } else if (targetMode === 'starfield') {
            runStarfield(targetCanvas, targetCtx, getIsRunning);
        } else if (targetMode === 'matrix') {
            runMatrix(targetCanvas, targetCtx, getIsRunning);
        } else if (targetMode === 'bouncing') {
            runBouncingLogo(targetCanvas, targetCtx, getIsRunning);
        }
    }

    // 1. Starfield Simulator
    function runStarfield(c, cx, getIsRunning) {
        const numStars = 400;
        const stars = [];
        for (let i = 0; i < numStars; i++) {
            stars.push({
                x: (Math.random() - 0.5) * c.width * 2,
                y: (Math.random() - 0.5) * c.height * 2,
                z: Math.random() * c.width,
                pz: 0
            });
            stars[i].pz = stars[i].z;
        }

        function draw() {
            if (getIsRunning && !getIsRunning()) return;
            cx.fillStyle = 'rgba(0, 0, 0, 0.25)';
            cx.fillRect(0, 0, c.width, c.height);

            const cxMid = c.width / 2;
            const cyMid = c.height / 2;
            const speed = 12;

            for (let i = 0; i < numStars; i++) {
                const s = stars[i];
                s.z -= speed;
                if (s.z <= 0) {
                    s.x = (Math.random() - 0.5) * c.width * 2;
                    s.y = (Math.random() - 0.5) * c.height * 2;
                    s.z = c.width;
                    s.pz = s.z;
                }

                const k = 128 / s.z;
                const px = s.x * k + cxMid;
                const py = s.y * k + cyMid;

                if (px >= 0 && px <= c.width && py >= 0 && py <= c.height) {
                    const pk = 128 / s.pz;
                    const prevX = s.x * pk + cxMid;
                    const prevY = s.y * pk + cyMid;
                    const shade = Math.min(255, Math.floor((1 - s.z / c.width) * 255));

                    cx.strokeStyle = `rgb(${shade},${shade},${shade})`;
                    cx.lineWidth = Math.max(1, (1 - s.z / c.width) * 3);
                    cx.beginPath();
                    cx.moveTo(prevX, prevY);
                    cx.lineTo(px, py);
                    cx.stroke();
                }
                s.pz = s.z;
            }
            animFrame = requestAnimationFrame(draw);
        }
        draw();
    }

    // 2. Matrix Digital Rain
    function runMatrix(c, cx, getIsRunning) {
        const fontSize = 14;
        const columns = Math.floor(c.width / fontSize);
        const drops = [];
        for (let i = 0; i < columns; i++) drops[i] = Math.floor(Math.random() * -50);
        const chars = '01CREDEVIP98XP7ABCDEF¥$+-*/<>:~';

        function draw() {
            if (getIsRunning && !getIsRunning()) return;
            cx.fillStyle = 'rgba(0, 0, 0, 0.08)';
            cx.fillRect(0, 0, c.width, c.height);

            cx.font = `${fontSize}px monospace`;

            for (let i = 0; i < drops.length; i++) {
                const text = chars.charAt(Math.floor(Math.random() * chars.length));
                const x = i * fontSize;
                const y = drops[i] * fontSize;

                cx.fillStyle = '#00ff66';
                cx.fillText(text, x, y);

                // Lead character glows white
                cx.fillStyle = '#ffffff';
                cx.fillText(text, x, y);

                if (y > c.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
            animFrame = requestAnimationFrame(draw);
        }
        draw();
    }

    // 3. Bouncing DVD-style 3D CREDE.VIP Logo
    function runBouncingLogo(c, cx, getIsRunning) {
        let x = 50, y = 50;
        let vx = 3.5, vy = 2.8;
        const logoWidth = Math.min(260, c.width * 0.6);
        const logoHeight = 70;
        const colors = ['#00ffff', '#ff00ff', '#ffff00', '#00ff00', '#ff3333', '#3388ff'];
        let colorIdx = 0;

        function draw() {
            if (getIsRunning && !getIsRunning()) return;
            cx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            cx.fillRect(0, 0, c.width, c.height);

            x += vx;
            y += vy;

            let hit = false;
            if (x <= 0 || x + logoWidth >= c.width) {
                vx = -vx;
                hit = true;
            }
            if (y <= 0 || y + logoHeight >= c.height) {
                vy = -vy;
                hit = true;
            }
            if (hit) {
                colorIdx = (colorIdx + 1) % colors.length;
            }

            // Draw bevel box
            cx.strokeStyle = colors[colorIdx];
            cx.lineWidth = 3;
            cx.strokeRect(x, y, logoWidth, logoHeight);

            // Draw text
            cx.fillStyle = colors[colorIdx];
            cx.font = 'bold 24px "Segoe UI", Tahoma, sans-serif';
            cx.textAlign = 'center';
            cx.textBaseline = 'middle';
            cx.fillText('CREDE.VIP', x + logoWidth / 2, y + logoHeight / 2);

            animFrame = requestAnimationFrame(draw);
        }
        draw();
    }

    window.ScreensaverEngine = {
        init: init,
        start: startScreensaver,
        stop: stopScreensaver,
        isRunning: function() { return isRunning; },
        setMode: function(m) {
            mode = m;
            try { localStorage.setItem('crede_screensaver_mode', m); } catch(e){}
            startIdleTimer();
        },
        getMode: function() { return mode; },
        setTimeout: function(s) {
            timeoutSeconds = Math.max(10, s);
            try { localStorage.setItem('crede_screensaver_timeout', String(timeoutSeconds)); } catch(e){}
            startIdleTimer();
        },
        getTimeout: function() { return timeoutSeconds; },
        previewOnCanvas: function(targetCanvas, targetMode) {
            // First stop existing animation if any
            if (targetCanvas._previewIsRunning) {
                targetCanvas._previewIsRunning.value = false;
            }
            const isRunningRef = { value: true };
            
            const freshCanvas = getFreshCanvas(targetCanvas);
            freshCanvas._previewIsRunning = isRunningRef;
            
            if (targetMode === 'flowerbox' || targetMode === '3dflowerbox') {
                runScreensaver(freshCanvas, null, targetMode, () => isRunningRef.value);
            } else {
                const previewCtx = freshCanvas.getContext('2d');
                previewCtx.fillStyle = '#000';
                previewCtx.fillRect(0, 0, freshCanvas.width, freshCanvas.height);
                runScreensaver(freshCanvas, previewCtx, targetMode, () => isRunningRef.value);
            }
        }
    };
})();
