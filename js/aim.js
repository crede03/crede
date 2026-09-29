/**
 * CREDE.VIP - AIM (AOL Instant Messenger) Engine
 * Faithful late 90s / 2000s Instant Messenger for Crede.vip
 * Adheres strictly to 7.css design principles.
 * Uses the same backend as Clippy (Cloudflare Worker proxy or user OpenRouter key).
 * Supports dynamic buddies from data/buddies.json and independent conversations per buddy.
 */

(function () {
    const TAUNT_MESSAGE = "You have 1 friend, rendering this buddy list completely useless, and your social life in tatters.";

    const DEFAULT_BUDDIES = [
        {
            id: "clippy",
            name: "Clippy",
            screenName: "ClippyTheHelper",
            status: "Online • Your only friend",
            avatar: "img/clippy.png",
            greeting: "Hi Guest! It looks like you have 1 friend - talk about Billy No Mates! But never fear - who needs humans when you have an AI chatbot LARPing as an Office Assistant from 1997? What's on your mind?",
            systemPrompt: "You are Clippy, the nostalgic, witty 90s assistant on Crede Dalton's website (crede.vip), chatting via AOL Instant Messenger (AIM). Keep responses brief (1-3 sentences), playful, in character as 90s Clippy, and with authentic 90s sarcasm.",
            model: "deepseek/deepseek-v4.1-flash",
            profile: {
                title: "Clippy (Microsoft Office Assistant)",
                memberSince: "November 1996",
                quote: "It looks like you're trying to view my profile!",
                hobbies: "Animating idle cycles, piping Rover the dog, teaching kids how to install Linux.",
                status: "Available 24/7 for you, because you're a loser."
            },
            isDefault: true
        }
    ];

    let isInitialized = false;
    let isThinking = false;
    let activeBuddy = 'clippy';
    let buddies = [...DEFAULT_BUDDIES];
    let screenName = 'Guest';

    // Map of buddyId -> { transcriptHtml: string, chatHistory: Array<{role: string, content: string}>, warningLevel: number }
    const buddySessions = {};

    // Current active buddy session state
    let chatHistory = [];
    let warningLevel = 0;

    function isMobileDevice() {
        if (typeof window === 'undefined') return false;
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
            window.innerWidth <= 768 ||
            (window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
    }

    // Default font: normal sans-serif on mobile devices (where Comic Sans doesn't exist), Comic Sans on PC
    const defaultFontFamily = isMobileDevice()
        ? 'Arial, sans-serif'
        : "'Comic Sans MS', cursive, sans-serif";

    // Text formatting preferences
    let fontSettings = {
        family: defaultFontFamily,
        size: '12px',
        color: '#0000ff',
        bold: false,
        italic: false,
        underline: false
    };

    let tauntsEnabled = true;
    try {
        const storedName = localStorage.getItem('crede_aim_screenname');
        if (storedName) screenName = storedName;
        const storedTaunts = localStorage.getItem('crede_aim_taunts_enabled');
        if (storedTaunts !== null) tauntsEnabled = storedTaunts === 'true';
    } catch (e) { }

    function getNowTime() {
        const d = new Date();
        const hrs = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        return `${hrs}:${mins}`;
    }

    function escapeHtml(str) {
        return (str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function getBuddy(buddyId) {
        return buddies.find(b => b.id === buddyId) || buddies[0] || DEFAULT_BUDDIES[0];
    }

    function setTauntsEnabled(val) {
        tauntsEnabled = typeof val === 'boolean' ? val : !tauntsEnabled;
        try {
            localStorage.setItem('crede_aim_taunts_enabled', String(tauntsEnabled));
        } catch (e) { }
        updateTauntsCheckmark();
        updateTauntBanner();
        appendSystemMessage(`"1 Friend" reality checks ${tauntsEnabled ? 'enabled' : 'disabled'}.`);
    }

    function updateTauntsCheckmark() {
        const checkEl = document.getElementById('aim-menu-taunts-check');
        if (checkEl) {
            checkEl.style.visibility = tauntsEnabled ? 'visible' : 'hidden';
        }
    }

    // Load buddies from data/buddies.json
    async function loadBuddies() {
        try {
            const res = await fetch(`data/buddies.json?t=${Date.now()}`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    buddies = data;
                } else if (data && Array.isArray(data.buddies) && data.buddies.length > 0) {
                    buddies = data.buddies;
                    const storedTaunts = localStorage.getItem('crede_aim_taunts_enabled');
                    if (storedTaunts === null && typeof data.tauntsEnabled === 'boolean') {
                        tauntsEnabled = data.tauntsEnabled;
                    }
                }
            }
        } catch (e) {
            console.warn("Could not fetch data/buddies.json, using defaults", e);
        }
        renderBuddyTree();
        updateTauntBanner();
        updateTauntsCheckmark();
    }

    // Render buddy list in the 7.css Tree View
    function renderBuddyTree() {
        const buddiesListEl = document.getElementById('aim-buddies-list');
        const summaryEl = document.getElementById('aim-buddies-summary');
        const mobileBuddyTab = document.getElementById('aim-mobile-buddy-tab');
        const statusCountEl = document.getElementById('aim-status-count');

        if (summaryEl) {
            summaryEl.innerHTML = `<strong>Buddies (${buddies.length}/${buddies.length})</strong>`;
        }
        if (mobileBuddyTab) {
            mobileBuddyTab.textContent = `👥 Buddy List (${buddies.length})`;
        }
        if (statusCountEl) {
            statusCountEl.textContent = `${buddies.length} ${buddies.length === 1 ? 'Buddy' : 'Buddies'} Online`;
        }

        if (!buddiesListEl) return;

        buddiesListEl.innerHTML = '';
        buddies.forEach(buddy => {
            const li = document.createElement('li');
            li.className = `aim-buddy-item ${buddy.id === activeBuddy ? 'active' : ''}`;
            li.id = `buddy-${buddy.id}`;
            li.dataset.buddy = buddy.id;
            li.tabIndex = 0;

            li.innerHTML = `
                <span class="aim-status-indicator online"></span>
                <img src="${buddy.avatar || 'img/aim.png'}" alt="${escapeHtml(buddy.name)}" class="aim-buddy-pic">
                <div class="aim-buddy-text">
                    <span class="aim-buddy-title"><strong>${escapeHtml(buddy.name)}</strong></span>
                    <span class="aim-buddy-subtitle">${escapeHtml(buddy.status || 'Online')}</span>
                </div>
            `;

            li.addEventListener('click', (e) => {
                e.preventDefault();
                selectBuddy(buddy.id);
            });

            buddiesListEl.appendChild(li);
        });
    }

    // Update the taunt callout banner on the buddy pane
    function updateTauntBanner() {
        const banner = document.getElementById('aim-taunt-banner');
        if (!banner) return;

        if (!tauntsEnabled) {
            if (buddies.length <= 1) {
                banner.style.display = 'none';
                return;
            } else {
                banner.style.display = 'block';
                banner.innerHTML = `
                    <div class="aim-taunt-badge">👥 Buddy Status</div>
                    <p class="aim-taunt-msg">You have ${buddies.length} online buddies.</p>
                `;
                return;
            }
        }

        banner.style.display = 'block';
        if (buddies.length === 1) {
            banner.innerHTML = `
                <div class="aim-taunt-badge">⚠️ Buddy Status</div>
                <p class="aim-taunt-msg">You have 1 friend, rendering this buddy list completely useless, and your social life in tatters.</p>
            `;
        } else {
            banner.innerHTML = `
                <div class="aim-taunt-badge">👥 Buddy Status</div>
                <p class="aim-taunt-msg">You have ${buddies.length} online buddies. Look at you, social butterfly!</p>
            `;
        }
    }

    // Initialize AIM Application
    function initAIM() {
        if (isInitialized) return;
        isInitialized = true;

        const aimWin = document.getElementById('aim-window');
        if (!aimWin) return;

        if (isMobileDevice()) {
            aimWin.classList.add('aim-mobile-device');
        }

        window.addEventListener('resize', () => {
            if (isMobileDevice()) {
                aimWin.classList.add('aim-mobile-device');
            } else {
                aimWin.classList.remove('aim-mobile-device');
            }
        });

        // Display current screen name
        const snDisplay = document.getElementById('aim-my-screenname');
        if (snDisplay) snDisplay.textContent = screenName;

        // Load dynamic buddies
        loadBuddies().then(() => {
            // Setup active buddy session (defaults to clippy or first buddy)
            selectBuddy(activeBuddy, true);
        });

        // Send message button & Enter key
        const sendBtn = document.getElementById('aim-send-btn');
        const inputEl = document.getElementById('aim-message-input');

        const submitMessage = () => {
            const val = inputEl?.value?.trim();
            if (!val || isThinking) return;
            inputEl.value = '';
            sendMessage(val);
        };

        sendBtn?.addEventListener('click', submitMessage);
        inputEl?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submitMessage();
            }
        });

        // Click listeners on empty categories (Co-Workers, Real-Life Friends)
        document.querySelectorAll('.aim-buddy-item.empty').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const buddyId = item.dataset.buddy;
                selectBuddy(buddyId);
            });
        });

        // "Add Buddy..." menu item
        document.getElementById('aim-menu-add-buddy')?.addEventListener('click', (e) => {
            e.preventDefault();
            handleAddBuddyClick();
        });

        // "IM" button in buddy list actions
        document.getElementById('aim-action-im')?.addEventListener('click', () => {
            selectBuddy(activeBuddy);
            inputEl?.focus();
        });

        // "Info" button in buddy list actions & menu
        document.getElementById('aim-action-info')?.addEventListener('click', () => {
            showBuddyInfo(activeBuddy);
        });
        document.getElementById('aim-menu-buddy-info')?.addEventListener('click', (e) => {
            e.preventDefault();
            showBuddyInfo(activeBuddy);
        });

        // Menubar Toggle "1 Friend" Taunts
        document.getElementById('aim-menu-toggle-taunts')?.addEventListener('click', (e) => {
            e.preventDefault();
            setTauntsEnabled(!tauntsEnabled);
        });
        updateTauntsCheckmark();

        // Alert dialog buttons
        document.getElementById('aim-alert-ok-btn')?.addEventListener('click', closeTauntAlert);
        document.getElementById('aim-alert-close-x')?.addEventListener('click', closeTauntAlert);

        // Buddy Info dialog close buttons
        document.getElementById('aim-info-ok-btn')?.addEventListener('click', closeBuddyInfo);
        document.getElementById('aim-info-close-x')?.addEventListener('click', closeBuddyInfo);

        // Warn Button
        document.getElementById('aim-btn-warn')?.addEventListener('click', handleWarnClick);

        // Block Button
        document.getElementById('aim-btn-block')?.addEventListener('click', handleBlockClick);

        // Menubar actions
        document.getElementById('aim-menu-new-im')?.addEventListener('click', (e) => {
            e.preventDefault();
            selectBuddy(activeBuddy);
            inputEl?.focus();
        });

        document.getElementById('aim-menu-clear')?.addEventListener('click', (e) => {
            e.preventDefault();
            const transcript = document.getElementById('aim-transcript');
            if (transcript) {
                transcript.innerHTML = '';
                chatHistory = [];
                if (buddySessions[activeBuddy]) {
                    buddySessions[activeBuddy].transcriptHtml = '';
                    buddySessions[activeBuddy].chatHistory = [];
                }
                appendSystemMessage("Chat transcript cleared.");
            }
        });

        document.getElementById('aim-menu-exit')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.closeWindow) window.closeWindow(aimWin);
            else aimWin.style.display = 'none';
        });

        document.getElementById('aim-menu-about')?.addEventListener('click', (e) => {
            e.preventDefault();
            showAboutAIM();
        });

        // Change Screen Name listener
        document.getElementById('aim-change-sn-link')?.addEventListener('click', (e) => {
            e.preventDefault();
            const newName = prompt("Enter your new AIM Screen Name (max 16 chars):", screenName);
            if (newName && newName.trim()) {
                screenName = newName.trim().substring(0, 16);
                try { localStorage.setItem('crede_aim_screenname', screenName); } catch (e) { }
                if (snDisplay) snDisplay.textContent = screenName;
                appendSystemMessage(`Screen name changed to ${escapeHtml(screenName)}.`);
            }
        });

        // Formatting toolbar
        wireFormattingControls();

        // Mobile tabs
        wireMobileTabs();
    }

    function wireFormattingControls() {
        const familySelect = document.getElementById('aim-font-family');
        const sizeSelect = document.getElementById('aim-font-size');
        const colorSelect = document.getElementById('aim-text-color');
        const boldBtn = document.getElementById('aim-btn-bold');
        const italicBtn = document.getElementById('aim-btn-italic');
        const underlineBtn = document.getElementById('aim-btn-underline');
        const emoticonBtn = document.getElementById('aim-btn-emoticons');
        const emoticonMenu = document.getElementById('aim-emoticons-menu');
        const inputEl = document.getElementById('aim-message-input');

        if (familySelect) {
            familySelect.value = fontSettings.family;
        }
        applyInputStyles();

        familySelect?.addEventListener('change', () => {
            fontSettings.family = familySelect.value;
            applyInputStyles();
        });

        sizeSelect?.addEventListener('change', () => {
            fontSettings.size = sizeSelect.value;
            applyInputStyles();
        });

        colorSelect?.addEventListener('change', () => {
            fontSettings.color = colorSelect.value;
            applyInputStyles();
        });

        boldBtn?.addEventListener('click', () => {
            fontSettings.bold = !fontSettings.bold;
            boldBtn.classList.toggle('active', fontSettings.bold);
            applyInputStyles();
        });

        italicBtn?.addEventListener('click', () => {
            fontSettings.italic = !fontSettings.italic;
            italicBtn.classList.toggle('active', fontSettings.italic);
            applyInputStyles();
        });

        underlineBtn?.addEventListener('click', () => {
            fontSettings.underline = !fontSettings.underline;
            underlineBtn.classList.toggle('active', fontSettings.underline);
            applyInputStyles();
        });

        // Emoticon dropdown toggle
        emoticonBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!emoticonMenu) return;
            const isHidden = emoticonMenu.hidden || emoticonMenu.style.display === 'none';
            emoticonMenu.hidden = !isHidden;
            emoticonMenu.style.display = isHidden ? 'grid' : 'none';
        });

        document.querySelectorAll('.aim-emoticon-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const emo = btn.dataset.emo;
                if (emo && inputEl) {
                    inputEl.value += ` ${emo} `;
                    inputEl.focus();
                }
                if (emoticonMenu) {
                    emoticonMenu.hidden = true;
                    emoticonMenu.style.display = 'none';
                }
            });
        });

        document.addEventListener('click', (e) => {
            if (emoticonMenu && !emoticonMenu.contains(e.target) && e.target !== emoticonBtn) {
                emoticonMenu.hidden = true;
                emoticonMenu.style.display = 'none';
            }
        });
    }

    function applyInputStyles() {
        const inputEl = document.getElementById('aim-message-input');
        if (!inputEl) return;
        inputEl.style.fontFamily = fontSettings.family;
        inputEl.style.fontSize = fontSettings.size;
        inputEl.style.color = fontSettings.color;
        inputEl.style.fontWeight = fontSettings.bold ? 'bold' : 'normal';
        inputEl.style.fontStyle = fontSettings.italic ? 'italic' : 'normal';
        inputEl.style.textDecoration = fontSettings.underline ? 'underline' : 'none';
    }

    function wireMobileTabs() {
        const tabList = document.querySelector('.aim-mobile-tabs');
        if (!tabList) return;

        const tabs = tabList.querySelectorAll('[role="tab"]');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => {
                    t.setAttribute('aria-selected', 'false');
                    t.classList.remove('active');
                });
                tab.setAttribute('aria-selected', 'true');
                tab.classList.add('active');

                const targetPane = tab.dataset.pane;
                const buddyPane = document.getElementById('aim-buddy-pane');
                const chatPane = document.getElementById('aim-chat-pane');

                if (targetPane === 'buddy') {
                    if (buddyPane) buddyPane.classList.add('mobile-show');
                    if (chatPane) chatPane.classList.remove('mobile-show');
                } else {
                    if (chatPane) chatPane.classList.add('mobile-show');
                    if (buddyPane) buddyPane.classList.remove('mobile-show');
                }
            });
        });
    }

    // Buddy selection handling with independent transcript and history preservation
    function selectBuddy(buddyId, isInitial = false) {
        // Handle clicking on empty categories
        if (buddyId === 'empty-coworkers' || buddyId === 'empty-irl') {
            if (tauntsEnabled) {
                const customMessages = {
                    'empty-coworkers': "No co-workers found. " + TAUNT_MESSAGE,
                    'empty-irl': "No real-life friends found in database. " + TAUNT_MESSAGE
                };
                showTauntAlert(customMessages[buddyId] || TAUNT_MESSAGE);
            } else {
                const customMessages = {
                    'empty-coworkers': "No co-workers online at this time.",
                    'empty-irl': "No contacts in this group."
                };
                showTauntAlert(customMessages[buddyId] || "Group empty.", "No members are currently online in this category.", "Instant Messenger", "OK");
            }
            return;
        }

        const transcriptEl = document.getElementById('aim-transcript');

        // 1. Save current active buddy conversation transcript & state before switching
        if (!isInitial && activeBuddy && transcriptEl) {
            buddySessions[activeBuddy] = {
                transcriptHtml: transcriptEl.innerHTML,
                chatHistory: [...chatHistory],
                warningLevel: warningLevel
            };
        }

        // 2. Resolve target buddy
        const buddy = getBuddy(buddyId);
        activeBuddy = buddy.id;
        isThinking = false;
        const typingEl = document.getElementById('aim-typing-indicator');
        if (typingEl) typingEl.style.display = 'none';

        // 3. Update active class in Buddy Tree List
        document.querySelectorAll('.aim-buddy-item').forEach(el => el.classList.remove('active'));
        const activeItemEl = document.getElementById(`buddy-${buddy.id}`);
        if (activeItemEl) activeItemEl.classList.add('active');

        // 4. Update Chat Header, Title bar, Input placeholder, and Mobile Chat tab
        updateChatHeader(
            buddy.name,
            buddy.status || 'Online',
            buddy.avatar || 'img/aim.png'
        );

        const inputEl = document.getElementById('aim-message-input');
        if (inputEl) inputEl.placeholder = `Type a message to ${buddy.name}...`;

        const mobileChatTab = document.getElementById('aim-mobile-chat-tab');
        if (mobileChatTab) mobileChatTab.textContent = `💬 Chat with ${buddy.name}`;

        // 5. Restore or Initialize Independent Session
        const session = buddySessions[buddy.id];
        if (session && session.transcriptHtml) {
            // Restore previous conversation
            if (transcriptEl) transcriptEl.innerHTML = session.transcriptHtml;
            chatHistory = [...(session.chatHistory || [])];
            warningLevel = session.warningLevel || 0;
        } else {
            // Initialize fresh conversation for this buddy
            if (transcriptEl) {
                transcriptEl.innerHTML = '';
                appendSystemMessage("Connecting to AOL Instant Messenger gateway (port 5190)...");
                appendSystemMessage(`Connected to network as ${escapeHtml(screenName)}.`);
                appendSystemMessage(`Direct connection established with ${escapeHtml(buddy.name)}.`);

                let greetingText = buddy.greeting || `Hi ${screenName}! What's on your mind?`;
                if (buddy.id === 'clippy' && !tauntsEnabled) {
                    greetingText = `Hi ${screenName}! I'm Clippy, your AI assistant LARPing as an Office Assistant from 1997. What's on your mind?`;
                } else {
                    greetingText = greetingText
                        .replace(/Guest/g, screenName)
                        .replace(/\{screenName\}/g, screenName);
                }

                setTimeout(() => {
                    appendBuddyMessage(buddy.name, greetingText);
                    // Cache the initial greeting into the session
                    if (transcriptEl) {
                        buddySessions[buddy.id] = {
                            transcriptHtml: transcriptEl.innerHTML,
                            chatHistory: [],
                            warningLevel: 0
                        };
                    }
                }, 300);
            }
            chatHistory = [];
            warningLevel = 0;
        }

        // Update Warn percentage display
        const warnPctEl = document.getElementById('aim-warn-pct');
        if (warnPctEl) warnPctEl.textContent = String(warningLevel);

        const warnBtn = document.getElementById('aim-btn-warn');
        if (warnBtn) warnBtn.title = `Increase ${buddy.name}'s warning level`;

        // Scroll to bottom
        if (transcriptEl) transcriptEl.scrollTop = transcriptEl.scrollHeight;

        // Switch to chat tab on mobile
        const chatTab = document.querySelector('.aim-mobile-tabs [data-pane="chat"]');
        if (chatTab && window.innerWidth <= 768) chatTab.click();
    }

    function updateChatHeader(name, status, avatar) {
        const nameEl = document.getElementById('aim-current-buddy-name');
        const statusEl = document.getElementById('aim-current-buddy-status');
        const avatarEl = document.getElementById('aim-current-buddy-avatar');
        const titleEl = document.getElementById('aim-title-bar-text');

        if (nameEl) nameEl.textContent = name;
        if (statusEl) statusEl.textContent = status;
        if (avatarEl) avatarEl.src = avatar;
        if (titleEl) titleEl.textContent = `AIM - Instant Messenger (Buddy: ${name})`;
    }

    // Taunt Alert Dialog
    function showTauntAlert(customHeading, customSubtext, customTitle, customBtnText) {
        window.SoundSystem?.playAIMBuddyAlert?.();
        const dialog = document.getElementById('aim-alert-dialog');
        const textEl = document.getElementById('aim-alert-text');
        const subEl = document.getElementById('aim-alert-subtext');
        const titleEl = document.getElementById('aim-alert-title');
        const btnEl = document.getElementById('aim-alert-ok-btn');

        if (textEl) {
            textEl.textContent = customHeading || (tauntsEnabled ? "You have 1 friend, you lonely fucker." : "Buddy Status Notification");
        }
        if (subEl) {
            subEl.textContent = customSubtext || (tauntsEnabled ? "Clippy has graciously agreed to continue tolerating your messages." : "Online and ready to assist you.");
        }
        if (titleEl) {
            titleEl.textContent = customTitle || (tauntsEnabled ? "Instant Messenger - Social Status" : "Instant Messenger");
        }
        if (btnEl) {
            btnEl.textContent = customBtnText || (tauntsEnabled ? "Accept Reality" : "OK");
        }

        if (dialog) {
            dialog.style.display = 'flex';
            dialog.classList.add('active');
            if (window.bringToFront) window.bringToFront(dialog);
            centerDialog(dialog);
        }
    }

    function closeTauntAlert() {
        const dialog = document.getElementById('aim-alert-dialog');
        if (dialog) {
            dialog.style.display = 'none';
            dialog.classList.remove('active');
        }
    }

    // Buddy Info Dialog (Dynamically populated with current buddy's profile)
    function showBuddyInfo(buddyId) {
        window.SoundSystem?.playClick?.();
        const buddy = getBuddy(buddyId || activeBuddy);

        const dialog = document.getElementById('aim-info-dialog');
        const titleBarText = document.getElementById('aim-info-title');
        const avatarEl = document.getElementById('aim-info-avatar');
        const nameEl = document.getElementById('aim-info-name');
        const snEl = document.getElementById('aim-info-screenname');
        const sinceEl = document.getElementById('aim-info-since');
        const quoteEl = document.getElementById('aim-info-quote');
        const hobbiesEl = document.getElementById('aim-info-hobbies');
        const statusEl = document.getElementById('aim-info-status');

        if (titleBarText) titleBarText.textContent = `Buddy Info: ${buddy.name}`;
        if (avatarEl) avatarEl.src = buddy.avatar || 'img/aim.png';
        let titleDisplay = buddy.name;
        if (buddy.profile?.title) {
            const rawTitle = buddy.profile.title.trim();
            if (rawTitle.toLowerCase().startsWith(buddy.name.toLowerCase())) {
                titleDisplay = rawTitle;
            } else {
                titleDisplay = `${buddy.name} (${rawTitle})`;
            }
        }
        if (nameEl) nameEl.textContent = titleDisplay;
        if (snEl) snEl.textContent = `Screen Name: ${buddy.screenName || buddy.name}`;
        if (sinceEl) sinceEl.textContent = `Member Since: ${buddy.profile?.memberSince || 'November 1996'}`;
        if (quoteEl) quoteEl.textContent = `"${buddy.profile?.quote || 'No profile quote set.'}"`;
        if (hobbiesEl) hobbiesEl.textContent = buddy.profile?.hobbies || 'Browsing the web, chatting.';
        if (statusEl) statusEl.textContent = buddy.profile?.status || buddy.status || 'Online';

        if (dialog) {
            dialog.style.display = 'flex';
            dialog.classList.add('active');
            if (window.bringToFront) window.bringToFront(dialog);
            centerDialog(dialog);
        }
    }

    function closeBuddyInfo() {
        const dialog = document.getElementById('aim-info-dialog');
        if (dialog) {
            dialog.style.display = 'none';
            dialog.classList.remove('active');
        }
    }

    function showAboutAIM() {
        showTauntAlert("AOL Instant Messenger for crede.vip");
    }

    function handleAddBuddyClick() {
        if (buddies.length <= 1) {
            if (tauntsEnabled) {
                showTauntAlert(
                    TAUNT_MESSAGE,
                    "Tip: You can create custom AI buddies in the CMS backend under Studio > AIM Buddies!",
                    "Instant Messenger - Social Status",
                    "Accept Reality"
                );
            } else {
                showTauntAlert(
                    "You currently have 1 buddy online.",
                    "You can create custom AI buddies in the CMS backend under Studio > AIM Buddies.",
                    "Instant Messenger",
                    "OK"
                );
            }
        } else {
            showTauntAlert(
                `You have ${buddies.length} buddies!`,
                "You can create even more custom AI personas in the CMS backend under Studio > AIM Buddies.",
                "Instant Messenger",
                "OK"
            );
        }
    }

    function handleBlockClick() {
        const buddy = getBuddy(activeBuddy);
        if (buddy.id === 'clippy') {
            if (tauntsEnabled) {
                showTauntAlert(
                    "Action Forbidden: You cannot block Clippy.",
                    "You have 1 friend, rendering this buddy list completely useless, and your social life in tatters. If you block Clippy, you'll have 0 friends.",
                    "Instant Messenger - Social Status",
                    "Accept Reality"
                );
            } else {
                showTauntAlert(
                    "Action Forbidden: You cannot block Clippy.",
                    "Clippy is your default assistant and is required to remain active.",
                    "Instant Messenger",
                    "OK"
                );
            }
        } else {
            showTauntAlert(
                `Action Forbidden: You cannot block ${escapeHtml(buddy.name)}.`,
                "Good digital companions are hard to come by!",
                "Instant Messenger",
                "OK"
            );
        }
    }

    function centerDialog(dialog) {
        if (window.innerWidth <= 768) {
            dialog.style.left = '';
            dialog.style.top = '';
            dialog.style.width = '';
            return;
        }
        const dW = dialog.offsetWidth || 380;
        const dH = dialog.offsetHeight || 220;
        dialog.style.top = `${Math.max(40, (window.innerHeight - dH) / 2)}px`;
        dialog.style.left = `${Math.max(20, (window.innerWidth - dW) / 2)}px`;
    }

    // Warn button mechanism (personalized per buddy)
    function handleWarnClick() {
        const buddy = getBuddy(activeBuddy);
        warningLevel = Math.min(100, warningLevel + 20);

        const warnPctEl = document.getElementById('aim-warn-pct');
        if (warnPctEl) warnPctEl.textContent = String(warningLevel);

        window.SoundSystem?.playError?.();

        const isClippy = buddy.id === 'clippy';

        const clippyTauntWarnResponses = {
            20: "A warning? I'm made of 2 inches of bendable steel wire. Your warning has been logged in C:\\WINDOWS\\TEMP\\cares.txt (0 bytes).",
            40: "Warning level at 40%. May I remind you that you have 1 friend, rendering this buddy list completely useless, and your social life in tatters? Tread lightly.",
            60: "60%! Keep pressing that button and I will begin offering unsolicited tips on your resume margins.",
            80: "Warning level 80%! System overheating! Paperclip wire melting!",
            100: "100% warning reached! Maximum exasperation achieved. But as stated: you have 1 friend, so I'm legally obligated to remain here in hopes you don't off yourself."
        };

        const clippyCleanWarnResponses = {
            20: "A warning? I'm made of 2 inches of bendable steel wire. Your warning has been logged in C:\\WINDOWS\\TEMP\\cares.txt (0 bytes).",
            40: "Warning level at 40%. Tread lightly, or I might start offering unsolicited tips on your document margins!",
            60: "60%! Keep pressing that button and I will begin offering unsolicited tips on your resume margins.",
            80: "Warning level 80%! System overheating! Paperclip wire melting!",
            100: "100% warning reached! Maximum exasperation achieved. But as your assistant, I'm always here to help."
        };

        const clippyWarnResponses = tauntsEnabled ? clippyTauntWarnResponses : clippyCleanWarnResponses;

        const genericWarnResponses = {
            20: `Warning received! My warning level is now 20%. I'll try to behave.`,
            40: `Warning level 40%! Getting a bit aggressive with that button, aren't we?`,
            60: `60% warning! I'm an artificial intelligence, but that still stings a bit.`,
            80: `Warning level 80%! Cool your jets or I'll set my away message to something embarrassing.`,
            100: `100% warning reached! Maximum exasperation achieved. But I'm still here chatting with you!`
        };

        const responseDict = isClippy ? clippyWarnResponses : genericWarnResponses;

        appendSystemMessage(`*** You warned ${escapeHtml(buddy.name)}. Warning level is now ${warningLevel}%. ***`);

        setTimeout(() => {
            appendBuddyMessage(buddy.name, responseDict[warningLevel] || "Warning received!");
        }, 500);
    }

    // Append messages to transcript
    function appendSystemMessage(text) {
        const transcript = document.getElementById('aim-transcript');
        if (!transcript) return;
        const msgDiv = document.createElement('div');
        msgDiv.className = 'aim-sys-msg';
        msgDiv.innerHTML = `*** ${escapeHtml(text)} ***`;
        transcript.appendChild(msgDiv);
        transcript.scrollTop = transcript.scrollHeight;
    }

    function appendSystemNotice(text) {
        const transcript = document.getElementById('aim-transcript');
        if (!transcript) return;
        const noticeDiv = document.createElement('div');
        noticeDiv.className = 'aim-taunt-msg-inline';
        noticeDiv.innerHTML = `⚠️ <strong>Notice:</strong> ${escapeHtml(text)}`;
        transcript.appendChild(noticeDiv);
        transcript.scrollTop = transcript.scrollHeight;
    }

    function appendUserMessage(name, text) {
        const transcript = document.getElementById('aim-transcript');
        if (!transcript) return;

        const msgDiv = document.createElement('div');
        msgDiv.className = 'aim-msg-line aim-msg-user';

        const styleAttrs = [
            `font-family: ${fontSettings.family}`,
            `font-size: ${fontSettings.size}`,
            `color: ${fontSettings.color}`,
            fontSettings.bold ? 'font-weight: bold' : '',
            fontSettings.italic ? 'font-style: italic' : '',
            fontSettings.underline ? 'text-decoration: underline' : ''
        ].filter(Boolean).join('; ');

        msgDiv.innerHTML = `
            <span class="aim-msg-timestamp">[${getNowTime()}]</span>
            <span class="aim-msg-sender user-name">${escapeHtml(name)}:</span>
            <span class="aim-msg-content" style="${styleAttrs}">${escapeHtml(text)}</span>
        `;
        transcript.appendChild(msgDiv);
        transcript.scrollTop = transcript.scrollHeight;
    }

    function appendBuddyMessage(name, text) {
        const transcript = document.getElementById('aim-transcript');
        if (!transcript) return;

        const msgDiv = document.createElement('div');
        msgDiv.className = 'aim-msg-line aim-msg-buddy';

        msgDiv.innerHTML = `
            <span class="aim-msg-timestamp">[${getNowTime()}]</span>
            <span class="aim-msg-sender buddy-name">${escapeHtml(name)}:</span>
            <span class="aim-msg-content clippy-text">${escapeHtml(text)}</span>
        `;
        transcript.appendChild(msgDiv);
        transcript.scrollTop = transcript.scrollHeight;

        window.SoundSystem?.playAIMReceive?.();
    }

    // Send message to Backend
    async function sendMessage(text) {
        const currentBuddy = getBuddy(activeBuddy);

        appendUserMessage(screenName, text);
        chatHistory.push({ role: 'user', content: text });
        if (chatHistory.length > 8) chatHistory.shift();

        window.SoundSystem?.playAIMSend?.();

        // Show typing indicator
        isThinking = true;
        const typingEl = document.getElementById('aim-typing-indicator');
        const typingTextEl = document.getElementById('aim-typing-text');
        if (typingTextEl) {
            typingTextEl.textContent = `${currentBuddy.name} is typing a response...`;
        }
        if (typingEl) typingEl.style.display = 'block';

        // Trigger desktop Clippy thinking animation if visible and chatting with Clippy
        if (currentBuddy.id === 'clippy') {
            try {
                if (window.ClippySystem?.speak) {
                    // Clippy desktop companion active
                }
            } catch (e) { }
        }

        const proxyUrl = "https://clippy-api.crede-fa7.workers.dev";
        const customApiKey = localStorage.getItem('crede_openrouter_key') || '';

        try {
            let reply = '';

            if (customApiKey) {
                const model = currentBuddy.model || 'deepseek/deepseek-v4.1-flash';
                const systemPrompt = currentBuddy.systemPrompt || `You are ${currentBuddy.name}, an AI companion on Crede Dalton's website (crede.vip) chatting over AOL Instant Messenger (AIM). Keep responses brief (1-3 sentences) and in character.`;

                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${customApiKey}`,
                        'HTTP-Referer': 'https://crede.vip',
                        'X-Title': 'CREDE.VIP AIM Messenger'
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            ...chatHistory.slice(-6)
                        ],
                        max_tokens: 300,
                        temperature: 0.7,
                        reasoning: { effort: 'low', exclude: true }
                    }),
                    signal: AbortSignal.timeout(20000)
                });

                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err?.error?.message || `HTTP ${response.status}`);
                }
                const data = await response.json();
                reply = data.choices?.[0]?.message?.content?.trim();
            } else {
                // Default Cloudflare Worker proxy
                // Match Clippy tooltip behavior for 100% reliable responses
                const isClippy = currentBuddy.id === 'clippy';
                const userState = isClippy
                    ? `User "${screenName}" is chatting with Clippy inside AIM. ${tauntsEnabled ? 'Visitor has 1 friend on their buddy list.' : ''}`
                    : `User "${screenName}" is chatting inside AIM with ${currentBuddy.name} (${currentBuddy.profile?.title || 'Buddy'}).`;

                const proxyPayload = {
                    prompt: text,
                    userState: userState
                };

                // For custom buddies, pass their distinct systemPrompt
                if (!isClippy && currentBuddy.systemPrompt) {
                    proxyPayload.systemPrompt = currentBuddy.systemPrompt;
                }

                // Pass recent messages for conversation continuity
                if (chatHistory.length > 1) {
                    proxyPayload.messages = chatHistory.slice(-4);
                }

                const response = await fetch(proxyUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(proxyPayload),
                    signal: AbortSignal.timeout(20000)
                });

                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err?.error || `Proxy status ${response.status}`);
                }
                const data = await response.json();
                reply = data.reply?.trim();
                if (!reply && data.details) {
                    console.warn("AIM Proxy upstream details:", data.details);
                }
            }

            if (!reply) {
                reply = `It looks like my gears slipped! Let's try that again.`;
            }

            chatHistory.push({ role: 'assistant', content: reply });

            if (activeBuddy === currentBuddy.id) {
                if (typingEl) typingEl.style.display = 'none';
                isThinking = false;
                appendBuddyMessage(currentBuddy.name, reply);
            }

            // Persist session
            const transcriptEl = document.getElementById('aim-transcript');
            if (transcriptEl && activeBuddy === currentBuddy.id) {
                buddySessions[currentBuddy.id] = {
                    transcriptHtml: transcriptEl.innerHTML,
                    chatHistory: [...chatHistory],
                    warningLevel: warningLevel
                };
            }

        } catch (err) {
            if (activeBuddy === currentBuddy.id) {
                if (typingEl) typingEl.style.display = 'none';
                isThinking = false;
            }

            // In-character fallback answers for dialup / offline
            const fallbacks = [
                `It looks like our 56k dial-up connection dropped a packet! But ${escapeHtml(currentBuddy.name)} is still right here.`,
                `Beep boop! The server is momentarily overloaded with away messages. Try asking ${escapeHtml(currentBuddy.name)} again!`,
                `Carrier signal lost! If I could reconnect faster, I would. Ask again!`
            ];
            const fallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];

            if (activeBuddy === currentBuddy.id) {
                appendBuddyMessage(currentBuddy.name, fallback);
            }

            console.warn("AIM request error:", err);

            // Persist session even on fallback
            const transcriptEl = document.getElementById('aim-transcript');
            if (transcriptEl && activeBuddy === currentBuddy.id) {
                buddySessions[currentBuddy.id] = {
                    transcriptHtml: transcriptEl.innerHTML,
                    chatHistory: [...chatHistory],
                    warningLevel: warningLevel
                };
            }
        }
    }

    // Public API
    window.AIMSystem = {
        init: initAIM,
        loadBuddies: loadBuddies,
        open: function () {
            if (!isInitialized) initAIM();
            else loadBuddies(); // Refresh buddies in case new ones were added in CMS
            const win = document.getElementById('aim-window');
            if (win) {
                if (window.openWindow) window.openWindow('aim-window');
                else {
                    win.style.display = 'flex';
                    win.classList.add('active');
                }
                window.SoundSystem?.playAIMDoor?.();
            }
        },
        showTaunt: showTauntAlert,
        selectBuddy: selectBuddy,
        showBuddyInfo: showBuddyInfo,
        setTauntsEnabled: setTauntsEnabled,
        isTauntsEnabled: () => tauntsEnabled
    };

    // Auto-init on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAIM);
    } else {
        initAIM();
    }
})();
