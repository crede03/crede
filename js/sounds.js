// Retro Sound System using Web Audio API
(function() {
    let audioCtx = null;
    let masterGain = null;
    let isMuted = false;
    let masterVolume = 0.5;

    function initAudio() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                audioCtx = new AudioContext();
                masterGain = audioCtx.createGain();
                masterGain.connect(audioCtx.destination);
                applyVolume();
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    function applyVolume() {
        if (!masterGain || !audioCtx) return;
        masterGain.gain.setValueAtTime(isMuted ? 0 : masterVolume, audioCtx.currentTime);
    }

    // Load persisted settings
    try {
        const storedVol = localStorage.getItem('crede_volume');
        if (storedVol !== null) masterVolume = parseFloat(storedVol);
        const storedMute = localStorage.getItem('crede_muted');
        if (storedMute !== null) isMuted = storedMute === 'true';
    } catch(e) {}

    window.SoundSystem = {
        init: initAudio,

        setVolume: function(val) {
            masterVolume = Math.max(0, Math.min(1, val));
            applyVolume();
            try { localStorage.setItem('crede_volume', String(masterVolume)); } catch(e){}
        },

        getVolume: function() {
            return masterVolume;
        },

        setMuted: function(muted) {
            isMuted = !!muted;
            applyVolume();
            try { localStorage.setItem('crede_muted', String(isMuted)); } catch(e){}
        },

        isMuted: function() {
            return isMuted;
        },

        // Startup Chime: Classic ethereal retro chord (Win 98/XP style harmonic swell)
        playStartup: function() {
            initAudio();
            if (isMuted || !audioCtx) return;

            const now = audioCtx.currentTime;
            const chords = [
                { freq: 261.63, start: 0, dur: 1.8 },    // C4
                { freq: 392.00, start: 0.1, dur: 1.7 },  // G4
                { freq: 523.25, start: 0.25, dur: 1.6 }, // C5
                { freq: 659.25, start: 0.45, dur: 1.8 }, // E5
                { freq: 783.99, start: 0.65, dur: 2.0 }, // G5
                { freq: 1046.50, start: 0.85, dur: 2.2 } // C6
            ];

            chords.forEach(c => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(c.freq, now + c.start);

                gain.gain.setValueAtTime(0, now + c.start);
                gain.gain.linearRampToValueAtTime(0.12, now + c.start + 0.1);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + c.start + c.dur);

                osc.connect(gain);
                gain.connect(masterGain);

                osc.start(now + c.start);
                osc.stop(now + c.start + c.dur + 0.1);
            });
        },

        // Shutdown Chime: Gentle descending retro melody
        playShutdown: function() {
            initAudio();
            if (isMuted || !audioCtx) return;

            const now = audioCtx.currentTime;
            const notes = [
                { freq: 659.25, time: 0, dur: 0.3 },   // E5
                { freq: 523.25, time: 0.25, dur: 0.3 }, // C5
                { freq: 392.00, time: 0.5, dur: 0.4 },  // G4
                { freq: 261.63, time: 0.8, dur: 0.8 }   // C4
            ];

            notes.forEach(n => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(n.freq, now + n.time);

                gain.gain.setValueAtTime(0, now + n.time);
                gain.gain.linearRampToValueAtTime(0.15, now + n.time + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + n.time + n.dur);

                osc.connect(gain);
                gain.connect(masterGain);

                osc.start(now + n.time);
                osc.stop(now + n.time + n.dur + 0.1);
            });
        },

        // Subtle Click/Navigation tick
        playClick: function() {
            initAudio();
            if (isMuted || !audioCtx) return;
            const now = audioCtx.currentTime;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);

            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

            osc.connect(gain);
            gain.connect(masterGain);

            osc.start(now);
            osc.stop(now + 0.035);
        },

        // Error / Ding chord
        playError: function() {
            initAudio();
            if (isMuted || !audioCtx) return;
            const now = audioCtx.currentTime;
            const freqs = [350, 440, 523];
            freqs.forEach(f => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(f, now);

                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

                osc.connect(gain);
                gain.connect(masterGain);

                osc.start(now);
                osc.stop(now + 0.4);
            });
        },

        // Minimize sound
        playMinimize: function() {
            initAudio();
            if (isMuted || !audioCtx) return;
            const now = audioCtx.currentTime;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);

            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

            osc.connect(gain);
            gain.connect(masterGain);

            osc.start(now);
            osc.stop(now + 0.12);
        },

        // Restore / Maximize sound
        playRestore: function() {
            initAudio();
            if (isMuted || !audioCtx) return;
            const now = audioCtx.currentTime;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(750, now + 0.1);

            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

            osc.connect(gain);
            gain.connect(masterGain);

            osc.start(now);
            osc.stop(now + 0.12);
        }
    };

    // Unlock Web Audio on first user interaction anywhere
    const unlockAudio = function() {
        initAudio();
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('keydown', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('keydown', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
})();
