/**
 * CREDE.VIP - AIM (AOL Instant Messenger) Engine
 * Faithful late 90s / 2000s Instant Messenger for Crede.vip
 * Adheres strictly to 7.css design principles.
 * Uses the same backend as Clippy (Cloudflare Worker proxy or user OpenRouter key).
 */

(function () {
    const TAUNT_MESSAGE = "You have 1 friend, rendering this buddy list completely useless, and your social life in tatters.";

    let isInitialized = false;
    let isThinking = false;
    let warningLevel = 0;
    let activeBuddy = 'clippy';
    let chatHistory = [];
    let screenName = 'Guest';

    // Text formatting preferences
    let fontSettings = {
        family: "'Comic Sans MS', cursive, sans-serif",
        size: '12px',
        color: '#0000ff',
        bold: false,
        italic: false,
        underline: false
    };

    try {
        const storedName = localStorage.getItem('crede_aim_screenname');
        if (storedName) screenName = storedName;
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

    // Initialize AIM Application
    function initAIM() {
        if (isInitialized) return;
        isInitialized = true;

        const aimWin = document.getElementById('aim-window');
        if (!aimWin) return;

        // Display current screen name
        const snDisplay = document.getElementById('aim-my-screenname');
        if (snDisplay) snDisplay.textContent = screenName;

        // Populate initial transcript if empty
        const transcript = document.getElementById('aim-transcript');
        if (transcript && transcript.children.length === 0) {
            appendSystemMessage("Connecting to AOL Instant Messenger gateway (port 5190)...");
            appendSystemMessage(`Connected to network as ${escapeHtml(screenName)}.`);
            appendSystemMessage("Direct connection established with Clippy.");

            // Clippy's opening greeting
            setTimeout(() => {
                appendBuddyMessage("Clippy", `Hi ${escapeHtml(screenName)}! It looks like you have 1 friend - talk about Billy No Mates! But never fear - who needs humans when you have an AI chatbot LARPing as an Office Assistant from 1997? What's on your mind?`);
            }, 300);
        }

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

        // Buddy Selection in Tree View
        document.querySelectorAll('.aim-buddy-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const buddyId = item.dataset.buddy;
                selectBuddy(buddyId);
            });
        });

        // "+ Add Buddy" button & menu
        document.getElementById('aim-action-add')?.addEventListener('click', () => {
            showTauntAlert();
        });
        document.getElementById('aim-menu-add-buddy')?.addEventListener('click', (e) => {
            e.preventDefault();
            showTauntAlert();
        });

        // "IM" button in buddy list actions
        document.getElementById('aim-action-im')?.addEventListener('click', () => {
            selectBuddy('clippy');
            inputEl?.focus();
        });

        // "Info" button in buddy list actions & menu
        document.getElementById('aim-action-info')?.addEventListener('click', () => {
            showBuddyInfo('clippy');
        });
        document.getElementById('aim-menu-buddy-info')?.addEventListener('click', (e) => {
            e.preventDefault();
            showBuddyInfo('clippy');
        });

        // Alert dialog buttons
        document.getElementById('aim-alert-ok-btn')?.addEventListener('click', closeTauntAlert);
        document.getElementById('aim-alert-close-x')?.addEventListener('click', closeTauntAlert);

        // Buddy Info dialog close buttons
        document.getElementById('aim-info-ok-btn')?.addEventListener('click', closeBuddyInfo);
        document.getElementById('aim-info-close-x')?.addEventListener('click', closeBuddyInfo);

        // Warn Button
        document.getElementById('aim-btn-warn')?.addEventListener('click', handleWarnClick);

        // Block Button
        document.getElementById('aim-btn-block')?.addEventListener('click', () => {
            showTauntAlert("Action Forbidden: You cannot block Clippy. You have 1 friend, rendering this buddy list completely useless, and your social life in tatters. If you block Clippy, you'll have 0 friends.");
        });

        // Menubar actions
        document.getElementById('aim-menu-new-im')?.addEventListener('click', (e) => {
            e.preventDefault();
            selectBuddy('clippy');
            inputEl?.focus();
        });

        document.getElementById('aim-menu-clear')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (transcript) {
                transcript.innerHTML = '';
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

    // Buddy selection handling
    function selectBuddy(buddyId) {
        document.querySelectorAll('.aim-buddy-item').forEach(el => el.classList.remove('active'));

        if (buddyId === 'clippy') {
            activeBuddy = 'clippy';
            document.getElementById('buddy-clippy')?.classList.add('active');
            updateChatHeader('Clippy', '📎 Paperclip Assistant • Ready to help', 'img/clippy.png');

            // Switch to chat tab on mobile
            const chatTab = document.querySelector('.aim-mobile-tabs [data-pane="chat"]');
            if (chatTab && window.innerWidth <= 768) chatTab.click();
            return;
        }

        // Any other buddy or empty slot selected -> Highlight Clippy & Taunt user!
        document.getElementById('buddy-clippy')?.classList.add('active');
        activeBuddy = 'clippy';

        const customMessages = {
            'empty-coworkers': "No co-workers found. " + TAUNT_MESSAGE,
            'empty-irl': "No real-life friends found in database. " + TAUNT_MESSAGE
        };

        const msg = customMessages[buddyId] || TAUNT_MESSAGE;
        showTauntAlert(msg);
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
    function showTauntAlert(customText) {
        window.SoundSystem?.playAIMBuddyAlert?.();
        const dialog = document.getElementById('aim-alert-dialog');
        const textEl = document.getElementById('aim-alert-text');
        if (textEl) {
            textEl.textContent = customText || TAUNT_MESSAGE;
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

    // Buddy Info Dialog
    function showBuddyInfo(buddyId) {
        window.SoundSystem?.playClick?.();
        const dialog = document.getElementById('aim-info-dialog');
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

    function centerDialog(dialog) {
        const dW = dialog.offsetWidth || 380;
        const dH = dialog.offsetHeight || 220;
        dialog.style.top = `${Math.max(40, (window.innerHeight - dH) / 2)}px`;
        dialog.style.left = `${Math.max(20, (window.innerWidth - dW) / 2)}px`;
    }

    // Warn button mechanism
    function handleWarnClick() {
        warningLevel = Math.min(100, warningLevel + 20);
        const warnPctEl = document.getElementById('aim-warn-pct');
        if (warnPctEl) warnPctEl.textContent = String(warningLevel);

        window.SoundSystem?.playError?.();

        const warnResponses = {
            20: "A warning? I'm made of 2 inches of bendable steel wire. Your warning has been logged in C:\\WINDOWS\\TEMP\\cares.txt (0 bytes).",
            40: "Warning level at 40%. May I remind you that you have 1 friend, rendering this buddy list completely useless, and your social life in tatters? Tread lightly.",
            60: "60%! Keep pressing that button and I will begin offering unsolicited tips on your resume margins.",
            80: "Warning level 80%! System overheating! Paperclip wire melting!",
            100: "100% warning reached! Maximum exasperation achieved. But as stated: you have 1 friend, so I'm legally obligated to remain here in hopes you don't off yourself."
        };

        appendSystemMessage(`*** You warned Clippy. Warning level is now ${warningLevel}%. ***`);

        setTimeout(() => {
            appendBuddyMessage("Clippy", warnResponses[warningLevel] || "Warning received!");
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
        appendUserMessage(screenName, text);
        chatHistory.push({ role: 'user', content: text });
        if (chatHistory.length > 8) chatHistory.shift();

        window.SoundSystem?.playAIMSend?.();

        // Show typing indicator
        isThinking = true;
        const typingEl = document.getElementById('aim-typing-indicator');
        if (typingEl) typingEl.style.display = 'block';

        // Trigger desktop Clippy thinking animation if visible
        try {
            if (window.ClippySystem?.speak) {
                // If desktop clippy is around, don't overlap speech balloon, just play Thinking animation
            }
        } catch (e) { }

        // Compile visitor environment and chat context
        const userState = `User is chatting inside AIM (AOL Instant Messenger) on Crede Dalton's website (crede.vip). Username: "${screenName}". Clippy is their only friend in their Buddy List. User's Warn Level on Clippy is ${warningLevel}%. Recent conversation: ${chatHistory.map(m => `${m.role}: ${m.content}`).join(' | ')}.`;

        const proxyUrl = "https://clippy-api.crede-fa7.workers.dev";
        const customApiKey = localStorage.getItem('crede_openrouter_key') || '';
        const model = "qwen/qwen3.8-27b:free";

        try {
            let reply = '';

            if (customApiKey) {
                const systemPrompt = `You are Clippy, the nostalgic, witty 90s assistant on Crede Dalton's website (crede.vip), currently talking to the visitor via AOL Instant Messenger (AIM). Keep responses brief (1-3 sentences), playful, in character as 90s Clippy on AIM, and playfully tease the visitor about having only 1 friend when fitting. Context: ${userState}`;

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
                            ...chatHistory
                        ],
                        max_tokens: 140,
                        temperature: 0.7
                    })
                });

                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err?.error?.message || `HTTP ${response.status}`);
                }
                const data = await response.json();
                reply = data.choices?.[0]?.message?.content?.trim();
            } else {
                // Default Cloudflare Worker proxy
                const response = await fetch(proxyUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt: text,
                        userState: userState
                    })
                });

                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err?.error || `Proxy status ${response.status}`);
                }
                const data = await response.json();
                reply = data.reply?.trim();
            }

            if (!reply) {
                reply = "It looks like my paperclip gears slipped! Let's try that again.";
            }

            chatHistory.push({ role: 'assistant', content: reply });

            if (typingEl) typingEl.style.display = 'none';
            isThinking = false;

            appendBuddyMessage("Clippy", reply);

        } catch (err) {
            if (typingEl) typingEl.style.display = 'none';
            isThinking = false;

            // In-character fallback answers for dialup / offline
            const fallbacks = [
                "It looks like our 56k dial-up connection dropped a packet! But fear not, your only friend is still right here.",
                "Beep boop! The server is momentarily overloaded with away messages. Try asking me again!",
                "Carrier signal lost! If I had other buddies to consult, I would, but you have 1 friend: me. Ask again!"
            ];
            const fallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];
            appendBuddyMessage("Clippy", fallback);
            console.warn("AIM Clippy request error:", err);
        }
    }

    // Public API
    window.AIMSystem = {
        init: initAIM,
        open: function () {
            if (!isInitialized) initAIM();
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
        selectBuddy: selectBuddy
    };

    // Auto-init on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAIM);
    } else {
        initAIM();
    }
})();
