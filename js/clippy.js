// Interactive Real Microsoft Agent Clippy using pithings/clippy (clippyjs)
(async function() {
    let agent = null;
    let apiKey = '';
    let isVisible = true;
    let isThinking = false;
    let idleInterval = null;
    let initPromise = null;

    try {
        apiKey = localStorage.getItem('crede_openrouter_key') || '';
        const storedVis = localStorage.getItem('crede_clippy_visible');
        if (storedVis !== null) isVisible = storedVis === 'true';
    } catch(e) {}

    let clippyConfig = {
        enabled: true,
        greeting: "It looks like you're exploring Crede's site!",
        model: "google/gemini-2.5-flash",
        temperature: 0.7,
        maxTokens: 120,
        systemPrompt: "You are Clippy, the nostalgic, helpful, witty 90s assistant on Crede Dalton's portfolio website (crede.vip). Crede is a London-based creative technologist, engineer, and photographer. Keep your replies concise (under 3 sentences), playful, and in genuine Clippy style ('It looks like you...').",
        quickResponses: [
            { id: 'who', label: 'Who is Crede?', response: "Crede Dalton is a London-based creative technologist, engineer, and photographer who crafts digital experiences, web apps, and visual media." },
            { id: 'projects', label: 'Top Projects', response: "Check out 'Shot by CREDE' for photography, 'Dover Marina Hotel & Spa', 'Sai Care Homes', 'Lighthouse on the Marsh', 'QFlooring', and 'AI Bollocks'!" },
            { id: 'features', label: 'Cool Features', response: "You can change wallpapers in Display Properties, open the Command Prompt, play Minesweeper, drag desktop icons, and listen to tunes in Winamp!" },
            { id: 'joke', label: 'Tell a Joke', response: "Why do programmers prefer retro Windows? Because crashing in 16 colors had character!" }
        ]
    };

    async function loadClippyConfig() {
        try {
            const res = await fetch('data/clippy.json');
            if (res.ok) {
                const data = await res.json();
                if (data && typeof data === 'object') {
                    clippyConfig = {
                        ...clippyConfig,
                        ...data,
                        quickResponses: Array.isArray(data.quickResponses) ? data.quickResponses : clippyConfig.quickResponses
                    };
                }
            }
        } catch(e) {
            // Offline or fallback to bundled defaults
        }
    }

    async function initClippy() {
        if (agent) return agent;
        if (initPromise) return initPromise;

        initPromise = (async () => {
            try {
                await loadClippyConfig();
                if (clippyConfig.enabled === false && storedVis === null) {
                    isVisible = false;
                }

                let initAgent, Clippy;
                try {
                    const core = await import('./clippyjs/index.mjs');
                    initAgent = core.initAgent;
                    Clippy = (await import('./clippyjs/agents/clippy/index.mjs')).default;
                } catch(localErr) {
                    console.info('Loading Clippy from CDN fallback...', localErr);
                    const core = await import('https://unpkg.com/clippyjs@0.1.0/dist/index.mjs');
                    initAgent = core.initAgent;
                    Clippy = (await import('https://unpkg.com/clippyjs@0.1.0/dist/agents/clippy/index.mjs')).default;
                }

                agent = await initAgent(Clippy);
                if (!agent) return null;

                if (isVisible) {
                    agent.show();
                    positionClippy();
                } else {
                    agent.hide();
                }

                // Click on Clippy triggers attention animation & speech
                agent._el?.addEventListener('click', () => {
                    if (agent.hasAnimation('GetAttention')) {
                        agent.play('GetAttention');
                    } else {
                        agent.animate();
                    }
                    showInteractivePrompt();
                });

                // Random idle animation every 8 seconds
                if (idleInterval) clearInterval(idleInterval);
                idleInterval = setInterval(() => {
                    if (isVisible && agent && !isThinking) {
                        agent.animate();
                    }
                }, 8000);

                // Initial greeting after 1.5 seconds
                setTimeout(() => {
                    if (isVisible && agent) {
                        showInteractivePrompt();
                    }
                }, 1500);

                window.addEventListener('resize', positionClippy);
                return agent;
            } catch(err) {
                console.warn('Unable to load official clippyjs agent:', err);
                return null;
            }
        })();

        return initPromise;
    }

    function positionClippy() {
        if (!agent || !agent._el) return;
        const width = window.innerWidth;
        const height = window.innerHeight;
        const x = Math.max(20, width - 180);
        const y = Math.max(20, height - 200);
        agent.moveTo(x, y, 0);
    }

    function showInteractivePrompt(customText) {
        if (!agent) return;

        let balloonEl = document.getElementById('clippy-interactive-balloon');
        if (!balloonEl) {
            balloonEl = document.createElement('div');
            balloonEl.id = 'clippy-interactive-balloon';
            balloonEl.className = 'clippy-interactive-balloon';
            document.body.appendChild(balloonEl);
        }

        balloonEl.style.display = 'block';
        updateBalloonPosition();

        if (customText) {
            balloonEl.innerHTML = `
                <div class="clippy-balloon-header">
                    <span>Clippy</span>
                    <button class="clippy-balloon-close" id="clippy-close-btn">&times;</button>
                </div>
                <div class="clippy-balloon-body">
                    <p style="margin: 0 0 8px 0;">${customText}</p>
                    <button class="clippy-pill" id="clippy-ask-more">&larr; Ask something else</button>
                </div>
            `;
            document.getElementById('clippy-close-btn')?.addEventListener('click', () => balloonEl.style.display = 'none');
            document.getElementById('clippy-ask-more')?.addEventListener('click', () => showInteractivePrompt());
            return;
        }

        if (isThinking) {
            balloonEl.innerHTML = `
                <div class="clippy-balloon-header">
                    <span>Clippy</span>
                    <button class="clippy-balloon-close" id="clippy-close-btn">&times;</button>
                </div>
                <div class="clippy-balloon-body">
                    <p style="margin: 0;"><em>Thinking... consulting my 1998 knowledge base...</em></p>
                </div>
            `;
            document.getElementById('clippy-close-btn')?.addEventListener('click', () => balloonEl.style.display = 'none');
            return;
        }

        const renderQuickPills = () => {
            if (!Array.isArray(clippyConfig.quickResponses) || clippyConfig.quickResponses.length === 0) {
                return '';
            }
            return clippyConfig.quickResponses.map(qr => {
                const label = qr.label || qr.id || 'Ask';
                return `<button class="clippy-pill" data-ask="${qr.id}">${label}</button>`;
            }).join('');
        };

        if (!apiKey) {
            balloonEl.innerHTML = `
                <div class="clippy-balloon-header">
                    <span>Clippy Assistant</span>
                    <button class="clippy-balloon-close" id="clippy-close-btn">&times;</button>
                </div>
                <div class="clippy-balloon-body">
                    <p style="margin: 0 0 6px 0;">${clippyConfig.greeting || "It looks like you're exploring Crede's site!"}</p>
                    <p style="margin: 0 0 8px 0; font-weight: bold;">Crede is too cheap to buy me tokens. Feed me an OpenRouter API key:</p>
                    <div style="display: flex; gap: 4px; margin-bottom: 8px;">
                        <input type="password" id="clippy-key-input" placeholder="sk-or-v1-..." style="flex: 1; font-size: 11px; padding: 2px 4px; border: 1px inset #808080;">
                        <button id="clippy-save-key-btn" style="padding: 2px 8px; font-size: 11px; cursor: pointer;">Save</button>
                    </div>
                    <div style="font-size: 10px; color: #555; margin-bottom: 4px;">Or ask a quick question:</div>
                    <div class="clippy-quick-pills">
                        ${renderQuickPills()}
                    </div>
                </div>
            `;

            document.getElementById('clippy-save-key-btn')?.addEventListener('click', () => {
                const val = document.getElementById('clippy-key-input')?.value?.trim();
                if (val) {
                    apiKey = val;
                    try { localStorage.setItem('crede_openrouter_key', apiKey); } catch(e){}
                    agent?.play('Congratulate');
                    showInteractivePrompt("Yum, tokens! I'm fully powered now. Ask me anything about Crede!");
                }
            });
        } else {
            balloonEl.innerHTML = `
                <div class="clippy-balloon-header">
                    <span>Clippy Assistant (AI Powered)</span>
                    <button class="clippy-balloon-close" id="clippy-close-btn">&times;</button>
                </div>
                <div class="clippy-balloon-body">
                    <p style="margin: 0 0 6px 0;">Ask me anything about Crede's background, code, photography, or this site!</p>
                    <div style="display: flex; gap: 4px; margin-bottom: 6px;">
                        <input type="text" id="clippy-chat-input" placeholder="Ask Clippy..." maxlength="180" style="flex: 1; font-size: 11px; padding: 2px 4px; border: 1px inset #808080;">
                        <button id="clippy-send-chat-btn" style="padding: 2px 8px; font-size: 11px; cursor: pointer;">Ask</button>
                    </div>
                    <div class="clippy-quick-pills">
                        ${renderQuickPills()}
                        <button class="clippy-pill" id="clippy-clear-key" style="color: #888; border-style: dashed;">Clear Key</button>
                    </div>
                </div>
            `;

            const sendChat = () => {
                const q = document.getElementById('clippy-chat-input')?.value?.trim();
                if (q) askOpenRouter(q);
            };

            document.getElementById('clippy-send-chat-btn')?.addEventListener('click', sendChat);
            document.getElementById('clippy-chat-input')?.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') sendChat();
            });

            document.getElementById('clippy-clear-key')?.addEventListener('click', () => {
                apiKey = '';
                try { localStorage.removeItem('crede_openrouter_key'); } catch(e){}
                showInteractivePrompt("Key forgotten. Feed me another whenever you like!");
            });
        }

        document.getElementById('clippy-close-btn')?.addEventListener('click', () => {
            balloonEl.style.display = 'none';
        });

        // Wire canned questions
        balloonEl.querySelectorAll('.clippy-pill[data-ask]').forEach(pill => {
            pill.addEventListener('click', () => {
                const askId = pill.dataset.ask;
                const match = (clippyConfig.quickResponses || []).find(r => r.id === askId);
                if (match && match.response) {
                    agent?.play('Explain');
                    showInteractivePrompt(match.response);
                }
            });
        });
    }

    function updateBalloonPosition() {
        const balloonEl = document.getElementById('clippy-interactive-balloon');
        if (!balloonEl || !agent || !agent._el) return;
        const rect = agent._el.getBoundingClientRect();
        const top = Math.max(10, rect.top - 180);
        const left = Math.max(10, rect.left - 240);
        balloonEl.style.top = `${top}px`;
        balloonEl.style.left = `${left}px`;
    }

    async function askOpenRouter(prompt) {
        if (!apiKey) return;
        isThinking = true;
        agent?.play('Thinking');
        showInteractivePrompt();

        const model = clippyConfig.model || 'google/gemini-2.5-flash';
        const systemPrompt = clippyConfig.systemPrompt || "You are Clippy, the nostalgic, helpful, witty 90s assistant on Crede Dalton's portfolio website (crede.vip). Crede is a London-based creative technologist, engineer, and photographer. Keep your replies concise (under 3 sentences), playful, and in genuine Clippy style ('It looks like you...').";
        const maxTokens = typeof clippyConfig.maxTokens === 'number' ? clippyConfig.maxTokens : 120;
        const temperature = typeof clippyConfig.temperature === 'number' ? clippyConfig.temperature : 0.7;

        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': 'https://crede.vip',
                    'X-Title': 'CREDE.VIP Retro Portfolio'
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        {
                            role: 'system',
                            content: systemPrompt
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: maxTokens,
                    temperature: temperature
                })
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err?.error?.message || `HTTP ${response.status}`);
            }

            const data = await response.json();
            const reply = data.choices?.[0]?.message?.content || "It looks like my paperclip gears got stuck! Try asking again.";
            isThinking = false;
            agent?.play('Congratulate');
            showInteractivePrompt(reply);
        } catch(err) {
            isThinking = false;
            agent?.play('Explain');
            showInteractivePrompt(`<strong>Oops:</strong> ${err.message || 'Connection error'}. Check your key or try again.`);
        }
    }

    window.ClippySystem = {
        init: initClippy,
        toggle: async function(show) {
            if (!agent) await initClippy();
            isVisible = (typeof show === 'boolean') ? show : !isVisible;
            if (agent) {
                if (isVisible) {
                    agent.show();
                    positionClippy();
                } else {
                    agent.hide();
                    const balloon = document.getElementById('clippy-interactive-balloon');
                    if (balloon) balloon.style.display = 'none';
                }
            }
            try { localStorage.setItem('crede_clippy_visible', String(isVisible)); } catch(e){}
        },
        speak: async function(msg) {
            if (!agent) await initClippy();
            if (!isVisible) await this.toggle(true);
            agent?.show();
            positionClippy();
            agent?.play('Explain');
            showInteractivePrompt(msg);
        },
        openPrompt: async function() {
            if (!agent) await initClippy();
            if (!isVisible) await this.toggle(true);
            agent?.show();
            positionClippy();
            if (agent?.hasAnimation('GetAttention')) {
                agent.play('GetAttention');
            } else {
                agent?.animate();
            }
            showInteractivePrompt();
        },
        play: async function(animName) {
            if (!agent) await initClippy();
            if (agent && agent.hasAnimation(animName)) agent.play(animName);
        },
        isVisible: function() { return isVisible; }
    };

    // Initialize immediately
    initClippy();
})();
