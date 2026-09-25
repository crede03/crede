// CREDE.VIP - Retro OS Desktop Environment (Inspired by 98.js)

let activeWindow = 'main-window';
let draggedWindow = null;
let dragOffset = { x: 0, y: 0 };
let resizingWindow = null;
let resizeDirection = '';
let resizeStartRect = null;
let resizeStartMouse = { x: 0, y: 0 };

// Initialize Desktop Environment
document.addEventListener('DOMContentLoaded', async function() {
    // 1. Load modular page content
    await loadModularPages();

    // 2. Fade in
    document.body.classList.add('page-loaded');

    // 3. Load & Apply Saved Appearance & Wallpaper
    loadSavedAppearance();
    loadSavedWallpaper();

    // 4. Ensure only welcome window is open initially
    document.querySelectorAll('.window').forEach(win => {
        win.classList.remove('active');
        win.style.display = 'none';
    });
    const mainWindow = document.getElementById('main-window');
    if (mainWindow) {
        mainWindow.classList.add('active');
        mainWindow.style.display = 'flex';
    }

    // 5. Initialize Systems
    initializeWindows();
    initializeWebamp();
    initializeTaskbar();
    initializeStartMenu();
    initializeDesktopIcons();
    initializeSelectionMarquee();
    initializeContextMenus();
    initializeSystrayVolume();
    initializePortfolioItems();
    initializeCookieNotice();
    initializeTerminal();
    initializeDisplayProperties();
    initializeMinesweeper();
    initializeBSOD();

    layoutDesktopIcons();
    updateTaskbar();

    // 6. Sound & Screensaver & Clippy engines
    window.SoundSystem?.init();
    window.ScreensaverEngine?.init();
    window.ClippySystem?.init();

    // 7. Clock
    updateClock();
    setInterval(updateClock, 1000);

    // 8. Global Escape Key Listener for Menus and Dialogs
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const startMenu = document.getElementById('start-menu');
            const startBtn = document.getElementById('start-btn');
            if (startMenu && startMenu.classList.contains('active')) {
                startMenu.classList.remove('active');
                if (startBtn) startBtn.setAttribute('aria-expanded', 'false');
            }
            document.querySelectorAll('.context-menu').forEach(menu => menu.hidden = true);
            const shutdownDialog = document.getElementById('shutdown-dialog');
            if (shutdownDialog && shutdownDialog.style.display !== 'none') {
                shutdownDialog.style.display = 'none';
                shutdownDialog.classList.remove('active');
            }
        }
    });

    // Startup Chime on first click anywhere
    const playFirstStartup = () => {
        window.SoundSystem?.playStartup();
        document.removeEventListener('click', playFirstStartup);
    };
    document.addEventListener('click', playFirstStartup);
});

// Helper: Viewport Check
function isMobileViewport() {
    return window.innerWidth <= 768;
}

// Helper: Aero Appearance Management
function setAeroTint(tint) {
    const validTints = ['blue', 'slate', 'emerald', 'ruby', 'purple'];
    const tintColors = {
        'blue': 'rgba(45, 95, 165, 0.65)',
        'slate': 'rgba(100, 120, 140, 0.65)',
        'emerald': 'rgba(40, 110, 70, 0.65)',
        'ruby': 'rgba(140, 35, 45, 0.65)',
        'purple': 'rgba(95, 45, 130, 0.65)'
    };
    validTints.forEach(t => document.body.classList.remove(`tint-${t}`));
    const activeTint = tint || 'blue';
    if (activeTint && activeTint !== 'blue') {
        document.body.classList.add(`tint-${activeTint}`);
    }
    document.documentElement.style.setProperty('--w7-w-bg', tintColors[activeTint] || tintColors['blue']);
    try {
        localStorage.setItem('crede_aero_tint', activeTint);
    } catch (e) {}
}

function setAeroTransparency(enabled) {
    if (enabled) {
        document.body.classList.remove('aero-solid');
    } else {
        document.body.classList.add('aero-solid');
    }
    try {
        localStorage.setItem('crede_aero_transparency', enabled ? 'true' : 'false');
    } catch (e) {}
}

function loadSavedAppearance() {
    try {
        const savedTint = localStorage.getItem('crede_aero_tint') || 'blue';
        const savedTrans = localStorage.getItem('crede_aero_transparency');
        setAeroTint(savedTint);
        setAeroTransparency(savedTrans !== 'false');
    } catch (e) {}
}

// Helper: Wallpaper Management
function setWallpaper(type, customUrl) {
    const isMobile = isMobileViewport();
    if (!type || type === 'default') {
        document.body.style.background = '';
        document.body.style.backgroundImage = '';
        document.body.style.backgroundSize = '';
        document.body.style.backgroundPosition = '';
        document.body.style.backgroundRepeat = '';
        document.body.style.backgroundAttachment = '';

        try {
            localStorage.setItem('crede_wallpaper_type', 'default');
            localStorage.removeItem('crede_wallpaper_url');
        } catch (e) {}
        return;
    }

    const wallpapers = {
        'bliss': 'url("https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=80")',
        'clouds': 'url("https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=1920&q=80")',
        'matrix': 'radial-gradient(circle, #001a00 0%, #000000 100%)',
        'teal': '#008080',
        'cyber': 'linear-gradient(135deg, #0d001a 0%, #1a0033 50%, #001133 100%)'
    };

    let bgStyle = wallpapers[type];
    if (type === 'custom' && customUrl) {
        bgStyle = `url("${customUrl}")`;
    }

    if (!bgStyle) {
        setWallpaper('default');
        return;
    }

    document.body.style.background = bgStyle;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = isMobile ? '18% center' : 'center center';
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.backgroundAttachment = isMobile ? 'scroll' : 'fixed';

    try {
        localStorage.setItem('crede_wallpaper_type', type);
        if (customUrl) localStorage.setItem('crede_wallpaper_url', customUrl);
    } catch (e) {}
}

function loadSavedWallpaper() {
    try {
        const type = localStorage.getItem('crede_wallpaper_type') || 'default';
        const customUrl = localStorage.getItem('crede_wallpaper_url') || '';
        setWallpaper(type, customUrl);
    } catch (e) {}
}

// Load Modular Pages
async function loadModularPages() {
    const windows = document.querySelectorAll('.window[data-page]');
    await Promise.all(Array.from(windows).map(async (win) => {
        const mount = win.querySelector('[data-page-mount]');
        const page = win.dataset.page;
        if (!mount || !page) return;

        try {
            const response = await fetch(page);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const html = await response.text();
            const parsed = new DOMParser().parseFromString(html, 'text/html');
            const content = parsed.querySelector('.page-content');
            if (!content) throw new Error('Missing .page-content');
            mount.replaceWith(content);
        } catch (error) {
            mount.innerHTML = '<p class="page-load-error">This page could not be loaded.</p>';
            console.error(`Unable to load ${page}`, error);
        }
    }));
}

// Window Management
function initializeWindows() {
    const windows = document.querySelectorAll('.window');
    windows.forEach(win => {
        const titlebar = win.querySelector('.title-bar');
        const controls = win.querySelectorAll('.title-bar-controls button');
        const closeBtn = Array.from(controls).find(btn => btn.getAttribute('aria-label') === 'Close');
        const minimizeBtn = Array.from(controls).find(btn => btn.getAttribute('aria-label') === 'Minimize');
        const maximizeBtn = Array.from(controls).find(btn => btn.getAttribute('aria-label') === 'Maximize');

        // Draggable titlebar
        if (titlebar && !isMobileViewport()) {
            titlebar.addEventListener('mousedown', (e) => {
                if (e.target.tagName === 'BUTTON') return;
                startDrag(win, e);
            });

            // Double click titlebar to toggle maximize
            titlebar.addEventListener('dblclick', (e) => {
                if (e.target.tagName === 'BUTTON') return;
                maximizeWindow(win);
            });
        }

        // Window control buttons
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                window.SoundSystem?.playClick();
                closeWindow(win);
            });
        }
        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', () => {
                window.SoundSystem?.playMinimize();
                minimizeWindow(win);
            });
        }
        if (maximizeBtn) {
            maximizeBtn.addEventListener('click', () => {
                window.SoundSystem?.playRestore();
                maximizeWindow(win);
            });
        }

        // Bring to front on click anywhere inside window
        win.addEventListener('mousedown', () => bringToFront(win));

        // Add 8-Direction Resize Handles (Desktop only)
        if (!isMobileViewport() && !win.classList.contains('is-bright')) {
            addResizeHandles(win);
        }
    });

    // Close button for About This Website / System dialog
    document.addEventListener('click', (e) => {
        if (e.target.closest('.sysprop-close-btn')) {
            window.SoundSystem?.playClick();
            const win = document.getElementById('system-properties-window');
            if (win) closeWindow(win);
        }
    });

    const main = document.getElementById('main-window');
    if (main) {
        if (isMobileViewport()) {
            maximizeWindow(main);
        } else {
            centerWindow(main);
        }
    }
}

function addResizeHandles(win) {
    if (win.querySelector('.win-resize-handle')) return;
    const directions = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
    directions.forEach(dir => {
        const handle = document.createElement('div');
        handle.className = `win-resize-handle win-resize-${dir}`;
        handle.dataset.direction = dir;
        handle.addEventListener('mousedown', (e) => startResize(win, dir, e));
        win.appendChild(handle);
    });
}

function startResize(win, dir, e) {
    e.preventDefault();
    e.stopPropagation();
    resizingWindow = win;
    resizeDirection = dir;
    resizeStartRect = win.getBoundingClientRect();
    resizeStartMouse = { x: e.clientX, y: e.clientY };
    bringToFront(win);
    document.querySelectorAll('iframe').forEach(f => f.style.pointerEvents = 'none');

    document.addEventListener('mousemove', onResize);
    document.addEventListener('mouseup', stopResize);
}

function onResize(e) {
    if (!resizingWindow) return;
    const dx = e.clientX - resizeStartMouse.x;
    const dy = e.clientY - resizeStartMouse.y;
    const comp = window.getComputedStyle(resizingWindow);
    const minW = Math.max(parseFloat(comp.minWidth) || 0, 260);
    const minH = Math.max(parseFloat(comp.minHeight) || 0, 160);

    let newWidth = resizeStartRect.width;
    let newHeight = resizeStartRect.height;
    let newLeft = resizeStartRect.left;
    let newTop = resizeStartRect.top;

    if (resizeDirection.includes('e')) newWidth = Math.max(minW, resizeStartRect.width + dx);
    if (resizeDirection.includes('s')) newHeight = Math.max(minH, resizeStartRect.height + dy);
    if (resizeDirection.includes('w')) {
        const w = resizeStartRect.width - dx;
        if (w >= minW) {
            newWidth = w;
            newLeft = resizeStartRect.left + dx;
        }
    }
    if (resizeDirection.includes('n')) {
        const h = resizeStartRect.height - dy;
        if (h >= minH) {
            newHeight = h;
            newTop = resizeStartRect.top + dy;
        }
    }

    resizingWindow.style.width = `${newWidth}px`;
    resizingWindow.style.height = `${newHeight}px`;
    resizingWindow.style.left = `${newLeft}px`;
    resizingWindow.style.top = `${newTop}px`;
}

function stopResize() {
    resizingWindow = null;
    resizeDirection = '';
    document.querySelectorAll('iframe').forEach(f => f.style.pointerEvents = '');
    document.removeEventListener('mousemove', onResize);
    document.removeEventListener('mouseup', stopResize);
}

function centerWindow(win) {
    const windowRect = win.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    let left = Math.max(10, (viewportWidth - windowRect.width) / 2);
    let top = (viewportHeight - windowRect.height) / 2 - 20;
    top = Math.max(10, Math.min(top, viewportHeight - windowRect.height - 50));
    win.style.left = `${left}px`;
    win.style.top = `${top}px`;
}

function startDrag(win, e) {
    draggedWindow = win;
    const rect = win.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
    document.querySelectorAll('iframe').forEach(f => f.style.pointerEvents = 'none');
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
    bringToFront(win);
}

function onDrag(e) {
    if (!draggedWindow) return;
    const maxX = window.innerWidth - draggedWindow.offsetWidth;
    const maxY = window.innerHeight - 50;
    let x = e.clientX - dragOffset.x;
    let y = e.clientY - dragOffset.y;
    x = Math.max(0, Math.min(x, maxX));
    y = Math.max(0, Math.min(y, maxY));
    draggedWindow.style.left = `${x}px`;
    draggedWindow.style.top = `${y}px`;
}

function stopDrag() {
    draggedWindow = null;
    document.querySelectorAll('iframe').forEach(f => f.style.pointerEvents = '');
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
}

function bringToFront(win) {
    const windows = document.querySelectorAll('.window');
    let maxZ = 10;
    windows.forEach(w => {
        w.classList.remove('active');
        const z = parseInt(w.style.zIndex) || 10;
        if (z > maxZ) maxZ = z;
    });
    win.style.zIndex = maxZ + 1;
    win.classList.add('active');
    activeWindow = win.id;
    updateTaskbar();
}

function closeWindow(win) {
    win.classList.remove('active');
    win.style.display = 'none';
    if (win.id === 'wmp-window') {
        const frame = document.getElementById('wmp-frame');
        if (frame && frame.contentWindow && typeof frame.contentWindow.pauseTrack === 'function') {
            frame.contentWindow.pauseTrack();
        }
    }
    updateTaskbar();
}

function minimizeWindow(win) {
    win.classList.remove('active');
    win.style.display = 'none';
    updateTaskbar();
}

function maximizeWindow(win) {
    if (win.classList.contains('maximized')) {
        win.classList.remove('maximized');
        win.style.width = win.dataset.preMaxWidth || '';
        win.style.height = win.dataset.preMaxHeight || '';
        win.style.left = win.dataset.preMaxLeft || '';
        win.style.top = win.dataset.preMaxTop || '';
    } else {
        win.dataset.preMaxWidth = win.style.width || `${win.offsetWidth}px`;
        win.dataset.preMaxHeight = win.style.height || `${win.offsetHeight}px`;
        win.dataset.preMaxLeft = win.style.left || `${win.offsetLeft}px`;
        win.dataset.preMaxTop = win.style.top || `${win.offsetTop}px`;
        win.classList.add('maximized');
        const margin = isMobileViewport() ? 0 : 8;
        const taskbarHeight = 44;
        win.style.left = `${margin}px`;
        win.style.top = `${margin}px`;
        win.style.width = `${window.innerWidth - margin * 2}px`;
        win.style.height = `${window.innerHeight - taskbarHeight - margin * 2}px`;
    }
}

function openWindow(windowId) {
    const win = document.getElementById(windowId);
    if (!win) return;

    if (windowId === 'wmp-window') {
        const frame = document.getElementById('wmp-frame');
        if (frame && (!frame.src || frame.src === 'about:blank' || !frame.src.includes('wmp/index.html'))) {
            frame.src = frame.getAttribute('data-src') || 'wmp/index.html';
        }
    }

    window.SoundSystem?.playClick();
    win.classList.add('active');
    win.style.display = 'flex';
    bringToFront(win);

    if (isMobileViewport()) {
        if (!win.classList.contains('maximized')) maximizeWindow(win);
    } else if (!win.classList.contains('maximized')) {
        centerWindow(win);
    }

    updateTaskbar();
}

// Window Arranging Algorithms
function cascadeWindows() {
    const visibleWindows = Array.from(document.querySelectorAll('.window')).filter(w => w.style.display !== 'none');
    let offset = 20;
    visibleWindows.forEach((w, idx) => {
        w.classList.remove('maximized');
        w.style.width = '600px';
        w.style.height = '420px';
        w.style.left = `${offset + idx * 30}px`;
        w.style.top = `${offset + idx * 30}px`;
        bringToFront(w);
    });
}

function tileWindowsHorizontally() {
    const visibleWindows = Array.from(document.querySelectorAll('.window')).filter(w => w.style.display !== 'none');
    if (!visibleWindows.length) return;
    const height = Math.floor((window.innerHeight - 50) / visibleWindows.length);
    visibleWindows.forEach((w, idx) => {
        w.classList.remove('maximized');
        w.style.left = '10px';
        w.style.top = `${10 + idx * height}px`;
        w.style.width = `${window.innerWidth - 20}px`;
        w.style.height = `${height - 10}px`;
    });
}

function tileWindowsVertically() {
    const visibleWindows = Array.from(document.querySelectorAll('.window')).filter(w => w.style.display !== 'none');
    if (!visibleWindows.length) return;
    const width = Math.floor((window.innerWidth - 20) / visibleWindows.length);
    visibleWindows.forEach((w, idx) => {
        w.classList.remove('maximized');
        w.style.top = '10px';
        w.style.left = `${10 + idx * width}px`;
        w.style.width = `${width - 10}px`;
        w.style.height = `${window.innerHeight - 60}px`;
    });
}

function minimizeAllWindows() {
    document.querySelectorAll('.window').forEach(w => {
        w.classList.remove('active');
        w.style.display = 'none';
    });
    updateTaskbar();
}

// Desktop Selection Marquee (Rubber-Band Box)
function initializeSelectionMarquee() {
    const desktop = document.getElementById('desktop');
    const marquee = document.getElementById('selection-marquee');
    if (!desktop || !marquee || isMobileViewport()) return;

    let isSelecting = false;
    let startX = 0, startY = 0;

    desktop.addEventListener('mousedown', (e) => {
        if (e.target !== desktop) return;
        isSelecting = true;
        startX = e.clientX;
        startY = e.clientY;
        marquee.style.left = `${startX}px`;
        marquee.style.top = `${startY}px`;
        marquee.style.width = '0px';
        marquee.style.height = '0px';
        marquee.hidden = false;

        document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
    });

    document.addEventListener('mousemove', (e) => {
        if (!isSelecting) return;
        const currentX = e.clientX;
        const currentY = e.clientY;
        const left = Math.min(startX, currentX);
        const top = Math.min(startY, currentY);
        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);

        marquee.style.left = `${left}px`;
        marquee.style.top = `${top}px`;
        marquee.style.width = `${width}px`;
        marquee.style.height = `${height}px`;

        const marqueeRect = marquee.getBoundingClientRect();
        document.querySelectorAll('.desktop-icon').forEach(icon => {
            const iconRect = icon.getBoundingClientRect();
            const overlap = !(marqueeRect.right < iconRect.left ||
                              marqueeRect.left > iconRect.right ||
                              marqueeRect.bottom < iconRect.top ||
                              marqueeRect.top > iconRect.bottom);
            if (overlap) icon.classList.add('selected');
            else icon.classList.remove('selected');
        });
    });

    document.addEventListener('mouseup', () => {
        if (isSelecting) {
            isSelecting = false;
            marquee.hidden = true;
        }
    });
}

// Right-Click Context Menus (Desktop & Taskbar)
function initializeContextMenus() {
    const desktopMenu = document.getElementById('desktop-context-menu');
    const taskbarMenu = document.getElementById('taskbar-context-menu');
    const desktop = document.getElementById('desktop');
    const taskbar = document.querySelector('.taskbar');

    const closeMenus = () => {
        if (desktopMenu) desktopMenu.hidden = true;
        if (taskbarMenu) taskbarMenu.hidden = true;
    };

    document.addEventListener('click', closeMenus);

    // Desktop Context Menu
    if (desktop && desktopMenu) {
        desktop.addEventListener('contextmenu', (e) => {
            if (e.target.closest('.window') || e.target.closest('.taskbar') || e.target.closest('.start-menu')) return;
            e.preventDefault();
            closeMenus();
            desktopMenu.style.left = `${Math.min(e.clientX, window.innerWidth - 180)}px`;
            desktopMenu.style.top = `${Math.min(e.clientY, window.innerHeight - 180)}px`;
            desktopMenu.hidden = false;
        });

        desktopMenu.querySelectorAll('.context-menu-item').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                const winId = item.dataset.window;
                if (action === 'arrange-icons' || action === 'lineup-icons') layoutDesktopIcons();
                else if (action === 'refresh-desktop') window.location.reload();
                else if (action === 'open-window' && winId) openWindow(winId);
                closeMenus();
            });
        });
    }

    // Taskbar Context Menu
    if (taskbar && taskbarMenu) {
        taskbar.addEventListener('contextmenu', (e) => {
            if (e.target.closest('#start-btn')) return;
            e.preventDefault();
            closeMenus();
            taskbarMenu.style.left = `${Math.min(e.clientX, window.innerWidth - 180)}px`;
            taskbarMenu.style.top = `${Math.max(10, e.clientY - 140)}px`;
            taskbarMenu.hidden = false;
        });

        taskbarMenu.querySelectorAll('.context-menu-item').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                const winId = item.dataset.window;
                if (action === 'cascade-windows') cascadeWindows();
                else if (action === 'tile-horizontal') tileWindowsHorizontally();
                else if (action === 'tile-vertical') tileWindowsVertically();
                else if (action === 'minimize-all') minimizeAllWindows();
                else if (action === 'open-window' && winId) openWindow(winId);
                closeMenus();
            });
        });
    }
}

// System Tray Volume Controller (Direct Mute Toggle)
function initializeSystrayVolume() {
    const volBtn = document.getElementById('tray-volume-btn');
    const volIcon = document.getElementById('tray-volume-icon');

    if (!volBtn) return;

    const updateIcon = () => {
        const isMuted = window.SoundSystem?.isMuted() || false;
        if (volIcon) volIcon.textContent = isMuted ? '🔇' : '🔊';
        volBtn.title = isMuted ? 'Unmute Sound' : 'Mute Sound';
    };

    updateIcon();

    volBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isMuted = window.SoundSystem?.toggleMute();
        updateIcon();
        if (!isMuted) {
            window.SoundSystem?.playClick();
        }
    });
}

// Authentic Windows 7 Command Prompt
function initializeTerminal() {
    const syncInput = () => {
        const inp = document.getElementById('terminal-input');
        const disp = document.getElementById('terminal-typed-display');
        if (inp && disp) {
            disp.textContent = inp.value;
        }
        scrollToTerminalBottom();
    };

    document.addEventListener('input', (e) => {
        if (e.target && e.target.id === 'terminal-input') syncInput();
    });
    document.addEventListener('keyup', (e) => {
        if (e.target && e.target.id === 'terminal-input') syncInput();
    });

    document.addEventListener('keydown', (e) => {
        const inp = document.getElementById('terminal-input');
        const hist = document.getElementById('terminal-history');
        const disp = document.getElementById('terminal-typed-display');
        if (!inp || document.activeElement !== inp) return;

        if (e.key === 'Enter') {
            e.preventDefault();
            const rawCmd = inp.value;
            inp.value = '';
            if (disp) disp.textContent = '';
            executeCommand(rawCmd, hist);
        }
    });

    document.addEventListener('click', (e) => {
        if (e.target && (e.target.id === 'terminal-screen' || e.target.closest('#terminal-screen') || e.target.closest('#terminal-window'))) {
            document.getElementById('terminal-input')?.focus();
        }
    });
}

function scrollToTerminalBottom() {
    const screen = document.getElementById('terminal-screen');
    const activeRow = document.getElementById('terminal-active-row');
    if (screen) {
        screen.scrollTop = screen.scrollHeight + 10000;
        requestAnimationFrame(() => {
            screen.scrollTop = screen.scrollHeight + 10000;
        });
        setTimeout(() => {
            screen.scrollTop = screen.scrollHeight + 10000;
            if (activeRow) activeRow.scrollIntoView({ block: 'nearest' });
        }, 20);
    }
}

function executeCommand(cmd, historyEl) {
    if (!historyEl) historyEl = document.getElementById('terminal-history');
    if (!historyEl) return;

    const printLine = (text, isHtml = false) => {
        const div = document.createElement('div');
        div.className = 'terminal-line';
        if (isHtml) div.innerHTML = text;
        else div.textContent = text;
        historyEl.appendChild(div);
    };

    const trimmed = (cmd || '').trim();
    if (!trimmed) {
        printLine(`C:\\Users\\Crede>`);
        scrollToTerminalBottom();
        return;
    }

    if (trimmed.toLowerCase() === 'cls' || trimmed.toLowerCase() === 'clear') {
        historyEl.innerHTML = '';
        scrollToTerminalBottom();
        return;
    }

    printLine(`C:\\Users\\Crede> ${trimmed}`);
    const parts = trimmed.split(/\s+/);
    const main = parts[0].toLowerCase();
    const arg = parts.slice(1).join(' ');

    switch (main) {
        case 'help':
            printLine("Available Commands:");
            printLine("  help              - Show this help screen");
            printLine("  dir / ls          - List files & directory contents");
            printLine("  cat / type <file> - View text document (e.g. cat bio.txt)");
            printLine("  projects          - List Crede's major portfolio works");
            printLine("  open <window>     - Open window (portfolio, paint, minesweeper, display, about)");
            printLine("  clippy [question] - Summon & talk to Clippy AI assistant");
            printLine("  flowerbox         - Launch 3D FlowerBox OpenGL screensaver");
            printLine("  matrix            - Enter the Matrix digital rain screensaver");
            printLine("  starfield         - Enter the 3D Starfield simulation screensaver");
            printLine("  contact           - Display email & social links");
            printLine("  whoami            - Display user & session identity");
            printLine("  echo <text>       - Print text to console");
            printLine("  color <0-f>       - Change console text color");
            printLine("  cls / clear       - Clear terminal screen");
            printLine("  crash             - Trigger Blue Screen of Death (BSOD)");
            printLine("  exit              - Close Command Prompt window");
            break;

        case 'dir':
        case 'ls':
            printLine(" Volume in drive C has no label.");
            printLine(" Volume Serial Number is 6176-01AF");
            printLine(" Directory of C:\\Users\\Crede\n");
            printLine("<DIR>          .");
            printLine("<DIR>          ..");
            printLine("PORTFOLIO.EXE  512,000 bytes");
            printLine("PAINT.EXE      128,400 bytes");
            printLine("WINAMP.EXE     640,000 bytes");
            printLine("WMP.EXE        890,000 bytes");
            printLine("MINESWPR.EXE    84,000 bytes");
            printLine("BIO.TXT          2,048 bytes");
            printLine("CONTACT.TXT        512 bytes");
            break;

        case 'cat':
        case 'type':
            if (arg.includes('bio') || arg.includes('about')) {
                printLine("Crede Dalton - Creative Technologist & Engineer based in London, UK.");
            } else if (arg.includes('contact')) {
                printLine("Email: crede@crede.vip | Instagram: @crede.vip | Substack: @credevip");
            } else {
                printLine(`File not found: ${arg || '(specify a file, e.g. cat bio.txt)'}`);
            }
            break;

        case 'projects':
            printLine("1. Shot by CREDE (Photography Portfolio)");
            printLine("2. Dover Marina Hotel & Spa");
            printLine("3. Sai Care Homes");
            printLine("4. Lighthouse on the Marsh");
            printLine("5. QFlooring");
            printLine("6. AI Bollocks");
            break;

        case 'open':
            if (arg.includes('portfolio')) openWindow('portfolio-window');
            else if (arg.includes('paint')) openWindow('paint-window');
            else if (arg.includes('wmp') || arg.includes('media') || arg.includes('player')) openWindow('wmp-window');
            else if (arg.includes('minesweeper')) openWindow('minesweeper-window');
            else if (arg.includes('display')) openWindow('display-properties-window');
            else if (arg.includes('system') || arg.includes('about')) openWindow('system-properties-window');
            else openWindow('main-window');
            break;

        case 'wmp':
        case 'wmplayer':
            openWindow('wmp-window');
            break;

        case 'clippy':
            if (window.ClippySystem) {
                window.ClippySystem.speak(arg || "Hello! It looks like you summoned me from the Command Prompt!");
            }
            printLine("Clippy summoned.");
            break;

        case 'flowerbox':
        case '3dflowerbox':
            printLine("Starting 3D FlowerBox OpenGL screensaver...");
            if (window.ScreensaverEngine) {
                window.ScreensaverEngine.start('flowerbox');
            }
            break;

        case 'starfield':
            printLine("Starting 3D Starfield screensaver...");
            if (window.ScreensaverEngine) {
                window.ScreensaverEngine.start('starfield');
            }
            break;

        case 'matrix':
            printLine("Starting Matrix digital rain screensaver...");
            if (window.ScreensaverEngine) {
                window.ScreensaverEngine.start('matrix');
            }
            break;

        case 'crash':
        case 'bsod':
            printLine("System halt error initiated.");
            triggerBSOD();
            break;

        case 'whoami':
            printLine("CREDE_VIP\\GuestUser (Authenticated Administrator)");
            break;

        case 'contact':
            printLine("Email: crede@crede.vip");
            printLine("LinkedIn: https://linkedin.com/in/crede-dalton-818334202");
            printLine("Substack: https://substack.com/@credevip");
            printLine("Instagram: https://instagram.com/crede.vip");
            break;

        case 'echo':
            printLine(arg);
            break;

        case 'color':
            const termEl = document.getElementById('terminal-container') || document.getElementById('terminal-screen');
            if (termEl) {
                const colorMap = {
                    'a': '#00ff66', 'b': '#00ffff', 'c': '#ff4444',
                    'd': '#ff00ff', 'e': '#ffff00', 'f': '#ffffff', '7': '#cccccc'
                };
                const picked = colorMap[arg.toLowerCase()] || '#cccccc';
                termEl.style.setProperty('color', picked, 'important');
                printLine(`Console color set to ${arg.toUpperCase() || 'DEFAULT'}.`);
            }
            break;

        case 'exit':
            const termWindow = document.getElementById('terminal-window');
            if (termWindow) minimizeWindow(termWindow);
            break;

        default:
            printLine(`'${trimmed}' is not recognized as an internal or external command,`);
            printLine(`operable program or batch file.`);
            break;
    }

    scrollToTerminalBottom();
}

// Display Properties Dialog
function initializeDisplayProperties() {
    const tabLists = document.querySelectorAll('#display-properties-window menu[role="tablist"], .tabs menu[role="tablist"]');
    tabLists.forEach(list => {
        const tabs = list.querySelectorAll('button[role="tab"]');
        tabs.forEach(tab => {
            const switchTab = () => {
                tabs.forEach(t => {
                    t.removeAttribute('aria-selected');
                    const targetId = t.getAttribute('aria-controls');
                    const targetPanel = targetId ? document.getElementById(targetId) : null;
                    if (targetPanel) {
                        targetPanel.setAttribute('hidden', '');
                    }
                });

                tab.setAttribute('aria-selected', 'true');
                const panelId = tab.getAttribute('aria-controls');
                const panel = panelId ? document.getElementById(panelId) : null;
                if (panel) {
                    panel.removeAttribute('hidden');
                }

                if (panelId === 'tab-screensaver') {
                    const ssCanvas = document.getElementById('screensaver-crt-canvas');
                    const ssSelectEl = document.getElementById('screensaver-select');
                    if (ssCanvas && ssSelectEl && window.ScreensaverEngine?.previewOnCanvas) {
                        window.ScreensaverEngine.previewOnCanvas(ssCanvas, ssSelectEl.value);
                    }
                }

                window.SoundSystem?.playClick();
            };

            tab.addEventListener('click', switchTab);

            tab.addEventListener('keydown', (e) => {
                const enabledTabs = Array.from(tabs).filter(t => !t.disabled);
                const currentIndex = enabledTabs.indexOf(tab);
                if (currentIndex === -1) return;

                let nextTab = null;
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    nextTab = enabledTabs[(currentIndex + 1) % enabledTabs.length];
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    nextTab = enabledTabs[(currentIndex - 1 + enabledTabs.length) % enabledTabs.length];
                } else if (e.key === 'Home') {
                    e.preventDefault();
                    nextTab = enabledTabs[0];
                } else if (e.key === 'End') {
                    e.preventDefault();
                    nextTab = enabledTabs[enabledTabs.length - 1];
                }

                if (nextTab) {
                    nextTab.focus();
                    nextTab.click();
                }
            });
        });
    });

    // Fallback for legacy .display-tab elements if any
    const legacyTabs = document.querySelectorAll('.display-tab');
    if (legacyTabs.length > 0) {
        legacyTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                legacyTabs.forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                const panel = document.getElementById(tab.dataset.tab);
                if (panel) panel.classList.add('active');
            });
        });
    }

    const wpSelect = document.getElementById('wallpaper-select');
    const customInput = document.getElementById('custom-wallpaper-url');
    const aeroTintSelect = document.getElementById('aero-tint-select');
    const aeroTransToggle = document.getElementById('aero-transparency-toggle');
    const okBtn = document.getElementById('display-prop-ok');
    const applyBtn = document.getElementById('display-prop-apply');
    const cancelBtn = document.getElementById('display-prop-cancel');

    // Update wallpaper preview in CRT screen
    const updateWallpaperPreview = () => {
        const screen = document.getElementById('wallpaper-crt-screen');
        if (!screen || !wpSelect) return;
        const type = wpSelect.value;
        const customUrl = customInput?.value || '';
        const wallpapers = {
            'default': 'url("img/pape.jpg")',
            'bliss': 'url("https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=80")',
            'clouds': 'url("https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=1920&q=80")',
            'matrix': 'radial-gradient(circle, #001a00 0%, #000000 100%)',
            'teal': '#008080',
            'cyber': 'linear-gradient(135deg, #0d001a 0%, #1a0033 50%, #001133 100%)'
        };
        let bgStyle = wallpapers[type] || wallpapers['default'];
        if (type === 'custom' && customUrl) {
            bgStyle = `url("${customUrl}")`;
        }
        screen.style.background = bgStyle;
        screen.style.backgroundSize = 'cover';
        screen.style.backgroundPosition = 'center';
    };
    // Populate current saved settings into controls
    try {
        const savedWp = localStorage.getItem('crede_wallpaper_type') || 'default';
        if (wpSelect) wpSelect.value = savedWp;
        const savedUrl = localStorage.getItem('crede_wallpaper_url') || '';
        if (customInput) customInput.value = savedUrl;
        const savedTint = localStorage.getItem('crede_aero_tint') || 'blue';
        if (aeroTintSelect) aeroTintSelect.value = savedTint;
        const savedTrans = localStorage.getItem('crede_aero_transparency');
        if (aeroTransToggle) aeroTransToggle.checked = (savedTrans !== 'false');
    } catch (e) {}

    wpSelect?.addEventListener('change', updateWallpaperPreview);
    customInput?.addEventListener('input', updateWallpaperPreview);
    updateWallpaperPreview();

    // Screensaver preview change listener
    const ssSelect = document.getElementById('screensaver-select');
    ssSelect?.addEventListener('change', () => {
        const ssCanvas = document.getElementById('screensaver-crt-canvas');
        if (ssCanvas && window.ScreensaverEngine?.previewOnCanvas) {
            window.ScreensaverEngine.previewOnCanvas(ssCanvas, ssSelect.value);
        }
    });

    const applyDisplay = () => {
        const type = wpSelect?.value || 'default';
        const customUrl = customInput?.value || '';
        setWallpaper(type, customUrl);

        // Aero Appearance (Tint & Transparency)
        if (aeroTintSelect) setAeroTint(aeroTintSelect.value);
        if (aeroTransToggle) setAeroTransparency(aeroTransToggle.checked);

        // Screensaver
        const ssSelect = document.getElementById('screensaver-select');
        const ssTimeout = document.getElementById('screensaver-timeout');
        if (ssSelect) window.ScreensaverEngine?.setMode(ssSelect.value);
        if (ssTimeout) window.ScreensaverEngine?.setTimeout(parseInt(ssTimeout.value, 10) || 60);

        window.SoundSystem?.playClick();
    };

    okBtn?.addEventListener('click', () => {
        applyDisplay();
        const win = document.getElementById('display-properties-window');
        if (win) closeWindow(win);
    });

    applyBtn?.addEventListener('click', applyDisplay);
    cancelBtn?.addEventListener('click', () => {
        const win = document.getElementById('display-properties-window');
        if (win) closeWindow(win);
    });

    // Test Screensaver button
    document.getElementById('screensaver-test-btn')?.addEventListener('click', () => {
        const ssSelect = document.getElementById('screensaver-select');
        window.ScreensaverEngine?.start(ssSelect?.value || 'starfield');
    });
}

// Minesweeper Game
function initializeMinesweeper() {
    let rows = 9, cols = 9, mines = 10;
    let board = [];
    let gameOver = false;
    let timer = 0;
    let timerInterval = null;
    let flaggedCount = 0;

    const boardEl = document.getElementById('minesweeper-board');
    const faceBtn = document.getElementById('ms-face-btn');
    const mineCounter = document.getElementById('ms-mine-counter');
    const timerEl = document.getElementById('ms-timer');
    const newGameBtn = document.getElementById('ms-new-game-btn');
    const diffBeg = document.getElementById('ms-diff-beginner');
    const diffInt = document.getElementById('ms-diff-intermediate');

    function startNewGame() {
        gameOver = false;
        clearInterval(timerInterval);
        timer = 0;
        if (timerEl) timerEl.textContent = '000';
        flaggedCount = 0;
        if (mineCounter) mineCounter.textContent = String(mines).padStart(3, '0');
        if (faceBtn) faceBtn.textContent = '🙂';

        // Build grid
        board = [];
        for (let r = 0; r < rows; r++) {
            board[r] = [];
            for (let c = 0; c < cols; c++) {
                board[r][c] = { mine: false, revealed: false, flagged: false, count: 0 };
            }
        }

        // Place mines
        let placed = 0;
        while (placed < mines) {
            const r = Math.floor(Math.random() * rows);
            const c = Math.floor(Math.random() * cols);
            if (!board[r][c].mine) {
                board[r][c].mine = true;
                placed++;
            }
        }

        // Compute adjacent counts
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (board[r][c].mine) continue;
                let count = 0;
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].mine) {
                            count++;
                        }
                    }
                }
                board[r][c].count = count;
            }
        }

        renderBoard();
    }

    function renderBoard() {
        if (!boardEl) return;
        boardEl.style.gridTemplateColumns = `repeat(${cols}, 20px)`;
        boardEl.innerHTML = '';

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = document.createElement('div');
                cell.className = 'ms-cell';
                cell.dataset.r = r;
                cell.dataset.c = c;

                cell.addEventListener('mousedown', () => {
                    if (!gameOver && faceBtn) faceBtn.textContent = '😮';
                });
                cell.addEventListener('mouseup', () => {
                    if (!gameOver && faceBtn) faceBtn.textContent = '🙂';
                });

                cell.addEventListener('click', () => revealCell(r, c));
                cell.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    toggleFlag(r, c);
                });

                boardEl.appendChild(cell);
            }
        }
    }

    function revealCell(r, c) {
        if (gameOver || board[r][c].flagged || board[r][c].revealed) return;

        if (!timerInterval) {
            timerInterval = setInterval(() => {
                timer = Math.min(999, timer + 1);
                if (timerEl) timerEl.textContent = String(timer).padStart(3, '0');
            }, 1000);
        }

        const cell = board[r][c];
        cell.revealed = true;
        const cellEl = boardEl?.children[r * cols + c];

        if (cell.mine) {
            // Game Over
            gameOver = true;
            clearInterval(timerInterval);
            if (faceBtn) faceBtn.textContent = '😵';
            window.SoundSystem?.playError();
            revealAllMines();
            return;
        }

        if (cellEl) {
            cellEl.classList.add('revealed');
            if (cell.count > 0) {
                cellEl.textContent = cell.count;
                const colors = ['', '#0000ff', '#008000', '#ff0000', '#000080', '#800000', '#008080', '#000', '#808080'];
                cellEl.style.color = colors[cell.count] || '#000';
            }
        }

        if (cell.count === 0) {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !board[nr][nc].revealed) {
                        revealCell(nr, nc);
                    }
                }
            }
        }

        checkWin();
    }

    function toggleFlag(r, c) {
        if (gameOver || board[r][c].revealed) return;
        const cell = board[r][c];
        cell.flagged = !cell.flagged;
        const cellEl = boardEl?.children[r * cols + c];
        if (cellEl) cellEl.textContent = cell.flagged ? '🚩' : '';
        flaggedCount += cell.flagged ? 1 : -1;
        if (mineCounter) mineCounter.textContent = String(Math.max(0, mines - flaggedCount)).padStart(3, '0');
    }

    function revealAllMines() {
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (board[r][c].mine) {
                    const el = boardEl?.children[r * cols + c];
                    if (el) {
                        el.classList.add('revealed', 'mine');
                        el.textContent = '💣';
                    }
                }
            }
        }
    }

    function checkWin() {
        let unrevealedSafe = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (!board[r][c].mine && !board[r][c].revealed) unrevealedSafe++;
            }
        }
        if (unrevealedSafe === 0) {
            gameOver = true;
            clearInterval(timerInterval);
            if (faceBtn) faceBtn.textContent = '😎';
            window.SoundSystem?.playRestore();
        }
    }

    faceBtn?.addEventListener('click', startNewGame);
    newGameBtn?.addEventListener('click', startNewGame);
    diffBeg?.addEventListener('click', () => { rows = 9; cols = 9; mines = 10; startNewGame(); });
    diffInt?.addEventListener('click', () => { rows = 16; cols = 16; mines = 40; startNewGame(); });

    startNewGame();
}

// Blue Screen of Death (BSOD) Easter Egg
function initializeBSOD() {
    const overlay = document.getElementById('bsod-overlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    overlay.hidden = true;

    // Dismiss on click or key
    overlay.addEventListener('click', dismissBSOD);
    document.addEventListener('keydown', (e) => {
        if (!overlay.hidden && overlay.classList.contains('active')) {
            e.preventDefault();
            dismissBSOD();
        }
        // Easter egg: Ctrl+Alt+Del triggers BSOD
        if (e.ctrlKey && e.altKey && (e.key === 'Delete' || e.key === 'Backspace')) {
            triggerBSOD();
        }
    });
}

function triggerBSOD() {
    const overlay = document.getElementById('bsod-overlay');
    if (overlay) {
        overlay.hidden = false;
        overlay.classList.add('active');
        window.SoundSystem?.playError();
    }
}

function dismissBSOD() {
    const overlay = document.getElementById('bsod-overlay');
    if (overlay) {
        overlay.classList.remove('active');
        overlay.hidden = true;
        window.SoundSystem?.playStartup();
    }
}

// Start Menu Functions
function initializeStartMenu() {
    const startBtn = document.getElementById('start-btn');
    const startMenu = document.getElementById('start-menu');
    if (!startBtn || !startMenu) return;

    startBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = startMenu.classList.toggle('active');
        startBtn.setAttribute('aria-expanded', String(isOpen));
        window.SoundSystem?.playClick();
    });

    document.addEventListener('click', (e) => {
        if (!startMenu.contains(e.target) && !startBtn.contains(e.target)) {
            startMenu.classList.remove('active');
            startBtn.setAttribute('aria-expanded', 'false');
        }
    });

    const menuItems = document.querySelectorAll('.start-menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const action = item.getAttribute('data-action');
            if (action) {
                e.preventDefault();
                startMenu.classList.remove('active');
                startBtn.setAttribute('aria-expanded', 'false');

                if (action === 'webamp') window.openWebamp?.();
                else if (action === 'clippy') window.ClippySystem?.openPrompt?.();
                else if (action.endsWith('-window') || document.getElementById(action)) {
                    openWindow(action);
                }
            }
        });
    });

    // Toggle Clippy menu item
    document.getElementById('menu-toggle-clippy')?.addEventListener('click', (e) => {
        e.preventDefault();
        window.ClippySystem?.toggle();
    });

    // Shutdown button
    const shutdownBtn = document.getElementById('start-menu-shutdown-btn');
    if (shutdownBtn) {
        shutdownBtn.addEventListener('click', () => {
            startMenu.classList.remove('active');
            startBtn.setAttribute('aria-expanded', 'false');
            const d = document.getElementById('shutdown-dialog');
            if (d) {
                d.style.display = 'block';
                d.classList.add('active');
                centerWindow(d);
                window.SoundSystem?.playError();
            }
        });
    }

    // Shutdown dialog cancel button
    const shutdownCancelBtn = document.querySelector('.shutdown-cancel-btn');
    if (shutdownCancelBtn) {
        shutdownCancelBtn.addEventListener('click', () => {
            const d = document.getElementById('shutdown-dialog');
            if (d) {
                d.style.display = 'none';
                d.classList.remove('active');
            }
        });
    }

    // Logoff button
    const logoffBtn = document.querySelector('.start-menu-logoff');
    if (logoffBtn) {
        logoffBtn.addEventListener('click', () => {
            startMenu.classList.remove('active');
            startBtn.setAttribute('aria-expanded', 'false');
            window.SoundSystem?.playShutdown();
            setTimeout(() => {
                const url = logoffBtn.dataset.url;
                if (url) window.location.href = url;
            }, 600);
        });
    }
}

// Taskbar Functions
function initializeTaskbar() {
    const tasks = document.querySelectorAll('.taskbar-task');
    tasks.forEach(task => {
        task.addEventListener('click', () => {
            const windowId = task.getAttribute('data-window');
            const win = document.getElementById(windowId);
            if (win && win.style.display === 'none') {
                openWindow(windowId);
            } else if (win && win.classList.contains('active')) {
                minimizeWindow(win);
            } else if (win) {
                bringToFront(win);
            }
        });
    });
}

function updateTaskbar() {
    const windows = document.querySelectorAll('.window');
    windows.forEach(win => {
        const windowId = win.id;
        const task = document.querySelector(`.taskbar-task[data-window="${windowId}"]`);
        if (!task) return;

        if (win.style.display !== 'none' && win.classList.contains('active')) {
            task.style.display = 'flex';
            task.classList.add('active');
        } else if (win.style.display !== 'none') {
            task.style.display = 'flex';
            task.classList.remove('active');
        } else {
            task.classList.remove('active');
            task.style.display = 'none';
        }
    });
}

// Desktop Icons
function initializeDesktopIcons() {
    const icons = document.querySelectorAll('.desktop-icon');
    icons.forEach(icon => {
        const type = icon.dataset.type;
        const target = icon.dataset.target;
        const url = icon.dataset.url;
        const id = icon.id;

        const openItem = () => {
            if (type === 'window' || target?.endsWith('-window')) {
                openWindow(target || id.replace('-icon', '-window'));
            } else if (type === 'url' || target?.startsWith('http') || target?.startsWith('mailto:')) {
                if (target?.startsWith('mailto:')) window.location.href = target;
                else if (target) window.open(target, '_blank');
            } else if (target === 'webamp' || (type === 'action' && target === 'webamp')) {
                window.openWebamp?.();
            } else if (target === 'clippy' || (type === 'action' && target === 'clippy')) {
                window.ClippySystem?.openPrompt?.();
            }
        };

        icon.addEventListener('dblclick', openItem);
        icon.addEventListener('click', () => {
            icons.forEach(i => i.classList.remove('selected'));
            icon.classList.add('selected');
            if (isMobileViewport()) openItem();
        });
    });
}

function layoutDesktopIcons() {
    const icons = Array.from(document.querySelectorAll('.desktop-icon'));
    if (icons.length === 0) return;

    const paddingTop = 15;
    const paddingLeft = 15;
    const columnWidth = 95;
    const rowHeight = 85;
    const maxHeight = Math.max(200, window.innerHeight - 80);

    let col = 0;
    let row = 0;

    icons.forEach(icon => {
        if (paddingTop + row * rowHeight + 70 > maxHeight && row > 0) {
            row = 0;
            col += 1;
        }
        icon.style.top = `${paddingTop + row * rowHeight}px`;
        icon.style.left = `${paddingLeft + col * columnWidth}px`;
        row += 1;
    });
}

// Portfolio items
function initializePortfolioItems() {
    const portfolioItems = document.querySelectorAll('.portfolio-row');
    portfolioItems.forEach(item => {
        const openProject = () => {
            const projectNumber = item.getAttribute('data-project');
            openWindow(`project-${projectNumber}-window`);
        };

        item.addEventListener('dblclick', openProject);
        item.addEventListener('click', () => {
            if (isMobileViewport()) openProject();
        });
    });

    const projectWindows = document.querySelectorAll('.project-window');
    projectWindows.forEach(win => {
        const thumbnails = win.querySelectorAll('.project-thumbnail');
        const mainImage = win.querySelector('.project-main-image');
        thumbnails.forEach(t => {
            t.addEventListener('click', () => {
                if (mainImage) {
                    mainImage.src = t.src;
                    mainImage.alt = t.alt;
                }
            });
        });
    });
}

// Webamp Host
function initializeWebamp() {
    const host = document.getElementById('webamp-host');
    const task = document.getElementById('webamp-task');
    if (!host || !task) return;

    const showWebamp = () => {
        host.hidden = false;
        task.style.display = 'flex';
        task.classList.add('active');
    };

    const hideWebamp = () => {
        host.hidden = true;
        task.classList.remove('active');
    };

    task.addEventListener('click', () => {
        if (host.hidden) showWebamp();
        else hideWebamp();
    });

    window.openWebamp = showWebamp;
}

// Clock
function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const clockEl = document.getElementById('clock');
    if (clockEl) clockEl.textContent = `${hours}:${minutes}`;
}

// Cookie Notice
function initializeCookieNotice() {
    const notice = document.getElementById('cookie-notice');
    if (!notice) return;

    if (localStorage.getItem('crede_cookie_consent')) {
        notice.style.display = 'none';
        return;
    }

    const dismissNotice = (choice) => {
        try {
            localStorage.setItem('crede_cookie_consent', choice);
        } catch (e) {}
        window.SoundSystem?.playClick();
        notice.classList.add('dismissed');
        setTimeout(() => {
            if (notice.parentNode) notice.remove();
        }, 350);
    };

    const acceptBtn = notice.querySelector('.cookie-accept-btn');
    const dismissBtn = notice.querySelector('.cookie-dismiss-btn');

    if (acceptBtn) {
        acceptBtn.onclick = () => dismissNotice('accepted');
    }
    if (dismissBtn) {
        dismissBtn.onclick = () => dismissNotice('dismissed');
    }
}

window.addEventListener('resize', () => {
    layoutDesktopIcons();
    const type = localStorage.getItem('crede_wallpaper_type') || 'default';
    if (type !== 'default') {
        document.body.style.backgroundAttachment = isMobileViewport() ? 'scroll' : 'fixed';
        document.body.style.backgroundPosition = isMobileViewport() ? '18% center' : 'center center';
    }
});
