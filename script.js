// Window Management
let activeWindow = 'main-window';
let draggedWindow = null;
let dragOffset = { x: 0, y: 0 };

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Fade-in effect
    document.body.classList.add('page-loaded');

    // Apply saved theme (default to 7.css)
    let savedTheme = '7';
    try {
        const stored = localStorage.getItem('crede_theme');
        if (stored === 'xp' || stored === '98' || stored === '7') {
            savedTheme = stored;
        }
    } catch (e) {
        // ignore
    }
    setTheme(savedTheme);

    // Ensure only the welcome window is open on load
    document.querySelectorAll('.window').forEach(win => {
        win.classList.remove('active');
        win.style.display = 'none';
    });
    const mainWindow = document.getElementById('main-window');
    if (mainWindow) {
        mainWindow.classList.add('active');
        mainWindow.style.display = 'block';
    }

    initializeWindows();
    initializeTaskbar();
    initializeStartMenu();
    initializeDesktopIcons();
    initializePortfolioItems();
    layoutDesktopIcons();
    updateTaskbar();

    // Portfolio button
    const portfolioBtn = document.getElementById('portfolio-btn');
    if (portfolioBtn) {
        portfolioBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openWindow('portfolio-window');
        });
    }
    
    updateClock();
    setInterval(updateClock, 1000);
});

// Helpers
function isMobileViewport() {
    return window.innerWidth <= 768;
}

function setTheme(theme) {
    const themes = ['7', 'xp', '98'];
    themes.forEach(name => {
        const link = document.getElementById(`theme-${name}`);
        if (link) {
            link.disabled = name !== theme;
        }
    });
    try {
        localStorage.setItem('crede_theme', theme);
    } catch (e) {
        // ignore persistence errors
    }
}

function layoutDesktopIcons() {
    const desktop = document.querySelector('.desktop');
    const icons = Array.from(document.querySelectorAll('.desktop-icon'));
    if (!desktop || icons.length === 0) return;

    const paddingTop = 20;
    const paddingLeft = 20;
    const columnWidth = 100;   // space reserved per column
    const rowHeight = 100;     // space reserved per row
    const maxHeight = window.innerHeight - 100; // keep above taskbar

    let col = 0;
    let row = 0;

    icons.forEach(icon => {
        const top = paddingTop + row * rowHeight;
        const left = paddingLeft + col * columnWidth;

        icon.style.top = `${top}px`;
        icon.style.left = `${left}px`;

        row += 1;
        if (top + rowHeight > maxHeight) {
            row = 0;
            col += 1;
        }
    });
}

// Window Functions
function initializeWindows() {
    const windows = document.querySelectorAll('.window');
    windows.forEach(window => {
        const titlebar = window.querySelector('.title-bar');
        const controls = window.querySelectorAll('.title-bar-controls button');
        const closeBtn = Array.from(controls).find(btn => btn.getAttribute('aria-label') === 'Close');
        const minimizeBtn = Array.from(controls).find(btn => btn.getAttribute('aria-label') === 'Minimize');
        const maximizeBtn = Array.from(controls).find(btn => btn.getAttribute('aria-label') === 'Maximize');

        // Make window draggable
        if (titlebar && !isMobileViewport()) {
            titlebar.addEventListener('mousedown', (e) => {
                if (e.target.tagName === 'BUTTON') return;
                startDrag(window, e);
            });
        }

        // Window controls
        if (closeBtn) closeBtn.addEventListener('click', () => closeWindow(window));
        if (minimizeBtn) minimizeBtn.addEventListener('click', () => minimizeWindow(window));
        if (maximizeBtn) maximizeBtn.addEventListener('click', () => maximizeWindow(window));
    });

    // Center or maximize main window on load depending on viewport
    const main = document.getElementById('main-window');
    if (main) {
        if (isMobileViewport()) {
            maximizeWindow(main);
        } else {
            centerWindow(main);
        }
    }
}

function centerWindow(win) {
    const windowRect = win.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    const left = (viewportWidth - windowRect.width) / 2;
    const top = (viewportHeight - windowRect.height) / 2 - 20; // Account for taskbar
    
    win.style.left = `${left}px`;
    win.style.top = `${top}px`;
}

function startDrag(window, e) {
    draggedWindow = window;
    const rect = window.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
    
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
    
    // Bring window to front
    bringToFront(window);
}

function onDrag(e) {
    if (!draggedWindow) return;
    
    const maxX = window.innerWidth - draggedWindow.offsetWidth;
    const maxY = window.innerHeight - 50; // Account for taskbar
    
    let x = e.clientX - dragOffset.x;
    let y = e.clientY - dragOffset.y;
    
    // Constrain to viewport
    x = Math.max(0, Math.min(x, maxX));
    y = Math.max(0, Math.min(y, maxY));
    
    draggedWindow.style.left = `${x}px`;
    draggedWindow.style.top = `${y}px`;
}

function stopDrag() {
    draggedWindow = null;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
}

function bringToFront(window) {
    const windows = document.querySelectorAll('.window');
    let maxZ = 10;
    windows.forEach(w => {
        const z = parseInt(w.style.zIndex) || 10;
        if (z > maxZ) maxZ = z;
    });
    window.style.zIndex = maxZ + 1;
    activeWindow = window.id;
    updateTaskbar();
}

function closeWindow(window) {
    window.classList.remove('active');
    window.style.display = 'none';
    updateTaskbar();
}

function minimizeWindow(window) {
    window.classList.remove('active');
    window.style.display = 'none';
    updateTaskbar();
}

function maximizeWindow(window) {
    if (window.classList.contains('maximized')) {
        // Restore
        window.classList.remove('maximized');
        window.style.width = '';
        window.style.height = '';
        window.style.left = '';
        window.style.top = '';
    } else {
        // Maximize
        window.classList.add('maximized');
        const margin = 10;
        const taskbarHeight = 40;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        window.style.left = `${margin}px`;
        window.style.top = `${margin}px`;
        window.style.width = `${viewportWidth - margin * 2}px`;
        window.style.height = `${viewportHeight - taskbarHeight - margin * 2}px`;
    }
}

function openWindow(windowId) {
    const win = document.getElementById(windowId);
    if (!win) return;
    
    win.classList.add('active');
    win.style.display = 'block';
    bringToFront(win);
    
    // On mobile, always maximize; on desktop, center if not maximized
    if (isMobileViewport()) {
        if (!win.classList.contains('maximized')) {
            maximizeWindow(win);
        }
    } else if (!win.classList.contains('maximized')) {
        centerWindow(win);
    }
    
    updateTaskbar();
}

// Taskbar Functions
function initializeTaskbar() {
    const tasks = document.querySelectorAll('.taskbar-task');
    tasks.forEach(task => {
        task.addEventListener('click', () => {
            const windowId = task.getAttribute('data-window');
            const window = document.getElementById(windowId);
            
            if (window && window.style.display === 'none') {
                openWindow(windowId);
            } else if (window && window.classList.contains('active')) {
                minimizeWindow(window);
            } else if (window) {
                bringToFront(window);
            }
        });
    });
}

function updateTaskbar() {
    const windows = document.querySelectorAll('.window');
    windows.forEach(window => {
        const windowId = window.id;
        const task = document.querySelector(`.taskbar-task[data-window="${windowId}"]`);
        
        if (window.style.display !== 'none' && window.classList.contains('active')) {
            if (task) {
                task.style.display = 'flex';
                task.classList.add('active');
            }
        } else if (window.style.display !== 'none') {
            if (task) {
                task.style.display = 'flex';
                task.classList.remove('active');
            }
        } else {
            if (task) {
                task.classList.remove('active');
                task.style.display = 'none';
            }
        }
    });
}

// Start Menu Functions
function initializeStartMenu() {
    const startBtn = document.getElementById('start-btn');
    const startMenu = document.getElementById('start-menu');
    
    startBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        startMenu.classList.toggle('active');
    });
    
    // Close start menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!startMenu.contains(e.target) && !startBtn.contains(e.target)) {
            startMenu.classList.remove('active');
        }
    });
    
    // Start menu items
    const menuItems = document.querySelectorAll('.start-menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const theme = item.getAttribute('data-theme');
            const action = item.getAttribute('data-action');

            if (theme) {
                e.preventDefault();
                setTheme(theme);
                startMenu.classList.remove('active');
                return;
            }

            if (action === 'welcome') {
                e.preventDefault();
                openWindow('main-window');
                startMenu.classList.remove('active');
            } else if (action === 'portfolio') {
                e.preventDefault();
                openWindow('portfolio-window');
                startMenu.classList.remove('active');
            } else if (action === 'pinball') {
                e.preventDefault();
                openWindow('pinball-window');
                startMenu.classList.remove('active');
            } else if (action === 'paint') {
                e.preventDefault();
                openWindow('paint-window');
                startMenu.classList.remove('active');
            } else if (action === 'minesweeper') {
                e.preventDefault();
                openWindow('minesweeper-window');
                startMenu.classList.remove('active');
            }
        });
    });
    
    // Logoff and shutdown buttons (just close menu, ignore link default)
    const logoffBtn = document.querySelector('.start-menu-logoff');
    const shutdownBtn = document.querySelector('.start-menu-shutdown');

    if (logoffBtn) {
        logoffBtn.addEventListener('click', () => {
            startMenu.classList.remove('active');
            const url = logoffBtn.dataset.url;
            if (url) {
                window.location.href = url;
            }
        });
    }
    
    if (shutdownBtn) {
        shutdownBtn.addEventListener('click', () => {
            startMenu.classList.remove('active');
            const url = shutdownBtn.dataset.url;
            if (url) {
                window.location.href = url;
            }
        });
    }
}

// Desktop Icons
function initializeDesktopIcons() {
    const welcomeIcon = document.getElementById('welcome-icon');
    const portfolioIcon = document.getElementById('portfolio-icon');
    const emailIcon = document.getElementById('email-icon');
    const pinballIcon = document.getElementById('pinball-icon');
    const linkedinIcon = document.getElementById('linkedin-icon');
    const substackIcon = document.getElementById('substack-icon');
    const instagramIcon = document.getElementById('instagram-icon');
    
    if (welcomeIcon) {
        welcomeIcon.addEventListener('dblclick', () => {
            openWindow('main-window');
        });
    }
    
    if (portfolioIcon) {
        portfolioIcon.addEventListener('dblclick', () => {
            openWindow('portfolio-window');
        });
    }
    
    if (emailIcon) {
        emailIcon.addEventListener('dblclick', () => {
            window.location.href = 'mailto:crede@crede.vip';
        });
    }

    if (linkedinIcon) {
        linkedinIcon.addEventListener('dblclick', () => {
            window.open('https://www.linkedin.com/in/crede-dalton-818334202', '_blank');
        });
    }

    if (substackIcon) {
        substackIcon.addEventListener('dblclick', () => {
            window.open('https://substack.com/@credevip', '_blank');
        });
    }

    if (instagramIcon) {
        instagramIcon.addEventListener('dblclick', () => {
            window.open('https://instagram.com/crede.vip', '_blank');
        });
    }
    
    if (pinballIcon) {
        pinballIcon.addEventListener('dblclick', () => {
            openWindow('pinball-window');
        });
    }
    
    const paintIcon = document.getElementById('paint-icon');
    if (paintIcon) {
        paintIcon.addEventListener('dblclick', () => {
            openWindow('paint-window');
        });
    }
    
    const minesweeperIcon = document.getElementById('minesweeper-icon');
    if (minesweeperIcon) {
        minesweeperIcon.addEventListener('dblclick', () => {
            openWindow('minesweeper-window');
        });
    }
    
    // Single click selection
    const icons = document.querySelectorAll('.desktop-icon');
    icons.forEach(icon => {
        icon.addEventListener('click', () => {
            icons.forEach(i => i.classList.remove('selected'));
            icon.classList.add('selected');
        });
    });
}

// Portfolio items - make them clickable
function initializePortfolioItems() {
    const portfolioItems = document.querySelectorAll('.portfolio-item');
    portfolioItems.forEach(item => {
        item.addEventListener('click', () => {
            const projectNumber = item.getAttribute('data-project');
            const windowId = `project-${projectNumber}-window`;
            openWindow(windowId);
        });
    });

    // Thumbnail click handlers - switch main image
    const projectWindows = ['project-1-window', 'project-2-window', 'project-3-window', 'project-4-window'];
    projectWindows.forEach(windowId => {
        const window = document.getElementById(windowId);
        if (window) {
            const thumbnails = window.querySelectorAll('.project-thumbnail');
            const mainImage = window.querySelector('.project-main-image');
            
            thumbnails.forEach(thumbnail => {
                thumbnail.addEventListener('click', () => {
                    if (mainImage) {
                        mainImage.src = thumbnail.src;
                        mainImage.alt = thumbnail.alt;
                    }
                });
            });
        }
    });
}


// Clock
function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('clock').textContent = `${hours}:${minutes}`;
}

// Touch support for mobile
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', (e) => {
    if (isMobileViewport()) return; // avoid dragging on small touch screens
    if (e.target.closest('.title-bar')) {
        const window = e.target.closest('.window');
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        draggedWindow = window;
        const rect = window.getBoundingClientRect();
        dragOffset.x = touch.clientX - rect.left;
        dragOffset.y = touch.clientY - rect.top;
        bringToFront(window);
    }
});

document.addEventListener('touchmove', (e) => {
    if (isMobileViewport()) return;
    if (draggedWindow) {
        e.preventDefault();
        const touch = e.touches[0];
        const maxX = window.innerWidth - draggedWindow.offsetWidth;
        const maxY = window.innerHeight - 50;
        
        let x = touch.clientX - dragOffset.x;
        let y = touch.clientY - dragOffset.y;
        
        x = Math.max(0, Math.min(x, maxX));
        y = Math.max(0, Math.min(y, maxY));
        
        draggedWindow.style.left = `${x}px`;
        draggedWindow.style.top = `${y}px`;
    }
});

document.addEventListener('touchend', () => {
    draggedWindow = null;
});

// Re-layout icons on resize so they stay visible
window.addEventListener('resize', () => {
    layoutDesktopIcons();
});
