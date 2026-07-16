// ==UserScript==
// @name         Stream Assistant − Keyboard Shortcuts, Features for Streaming Services
// @namespace    https://github.com/chj85/Stream-Assistant
// @version      3.0.1
// @description  Adds keyboard shortcuts, filters, EQ controls (Bass/Vocals), Censor bleep, zoom controls, Mono Downmix, and visualizers.
// @author       CHJ85
// @match        https://*.max.com/*
// @match        https://play.hbomax.com/*
// @match        https://www.discoveryplus.com/*
// @match        https://www.hulu.com/*
// @match        https://www.acallforanuprising.com/*
// @match        https://www.amazon.com*
// @match        https://app.pureflix.com/*
// @match        https://watch.hgtv.com/*
// @match        https://www.peacocktv.com/*
// @match        https://www.cc.com/*
// @match        https://kick.com/*
// @match        https://www.twitch.tv/*
// @match        https://tv.apple.com/*
// @match        https://rumble.com/*
// @match        https://www.adultswim.com/*
// @match        https://www.amcplus.com/*
// @match        https://*.crunchyroll.com/*
// @match        https://www.magellantv.com/*
// @match        https://watch.spectrum.net/*
// @match        https://watch.sling.com/*
// @match        https://fawesome.tv/*
// @match        https://app.plex.tv/*
// @match        https://watch.plex.tv/*
// @match        https://www.ovationtv.com/*
// @match        https://www.fox.com/*
// @match        https://www.disneyplus.com/*
// @match        https://vaughn.live/*
// @match        https://tubitv.com/*
// @match        https://www.hidive.com/*
// @match        https://www.retrocrush.tv/*
// @match        https://www.dovechannel.com/*
// @match        https://www.midnightpulp.com/*
// @match        https://www.klowdtv.com/*
// @match        https://www.vimeo.com/*
// @match        https://more.clownfishtv.com/*
// @match        https://www.ruptly.tv/*
// @match        https://therokuchannel.roku.com/*
// @match        https://pluto.tv/*
// @match        https://www.dailymotion.com/*
// @match        https://distro.tv/*
// @match        https://www.paramountplus.com/*
// @match        https://www.investigationdiscovery.com/*
// @match        https://audiovisual.ec.europa.eu/*
// @match        https://www.dazn.com/*
// @match        https://*.youtube.com/*
// @match        https://multimedia.europarl.europa.eu/*
// @updateURL    https://github.com/chj85/Stream-Assistant/raw/main/main.user.js
// @downloadURL  https://github.com/chj85/Stream-Assistant/raw/main/main.user.js
// @icon         https://i.imgur.com/pwiVt0N.png
// @homepageURL  https://github.com/CHJ85/Stream-Assistant/blob/main/README.md
// @supportURL   https://github.com/CHJ85/Stream-Assistant/issues
// @license      MIT
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // --- Configuration ---
    const config = {
        seek: 5,
        volume: 0.1,
        playbackSpeedStep: 0.25,
        brightnessStep: 0.1,
        hueStep: 10,
        saturationStep: 0.1,
        contrastStep: 0.1,
        holdThreshold: 500,
        eqStepDb: 2,   // Decibels per keypress for Bass/Vocals
        eqMaxDb: 24,   // Max/Min limits for EQ
        zoomStep: 0.15,
        zoomMax: 4.0,
        zoomMin: 1.0
    };

    // --- State Management ---
    let video = null;
    let fastSeek = false;
    let aspectRatioOption = 0;
    let isEPressed = false;
    let eKeyUsedAsModifier = false; // Tracks if E was held to press arrows/digits
    let videoScale = 1.0;

    const filters = {
        brightness: 1.0,
        hue: 0,
        saturation: 1.0,
        contrast: 1.0,
        special: 'none',
        profile: null
    };

    let playbackSpeed = 1.0;
    let originalPlaybackSpeed = 1.0;
    let isMouseHeldDown = false;
    let mouseDownTime = 0;
    let mouseHoldTimer = null;
    let spacebarKeyDownTime = 0;
    let spacebarSpeedUp = false;
    let spacebarTimer = null;
    let spacebarHeldDown = false;
    let enforceSpeedInterval = null;

    let audioContextData = null;

    // --- Visualizer State ---
    let visCanvas = null;
    let visCtx = null;
    let currentVisMode = 0;
    let animationFrameId = null;
    let vizData = {
        time: 0,
 stars: Array.from({length: 150}, () => ({ x: Math.random()*2-1, y: Math.random()*2-1, z: Math.random() })),
 matrixDrops: Array(100).fill(0)
    };

    // --- Helper Functions ---
    const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

    const applyFilters = () => {
        if (!video) return;
        if (filters.profile) {
            video.style.filter = filters.profile;
        } else {
            // If filters are untouched, remove the style entirely to preserve hardware video acceleration
            const isDefault = filters.brightness === 1.0 && filters.hue === 0 && filters.saturation === 1.0 && filters.contrast === 1.0 && filters.special === 'none';
            if (isDefault) {
                video.style.filter = '';
            } else {
                const baseFilters = `brightness(${filters.brightness}) hue-rotate(${filters.hue}deg) saturate(${filters.saturation}) contrast(${filters.contrast})`;
                video.style.filter = filters.special !== 'none' ? `${baseFilters} ${filters.special}` : baseFilters;
            }
        }
    };

    // --- Initialization & Event Listeners ---
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keyup', handleKeyUp, true);
    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('mouseup', handleMouseUp, true);
    window.addEventListener('blur', () => { isEPressed = false; });

    function handleKeyDown(e) {
        const targetTagName = e.target.tagName ? e.target.tagName.toLowerCase() : '';
        const isInputField = ['input', 'textarea'].includes(targetTagName) || e.target.isContentEditable;

        if (isInputField) return;

        // --- Let native video player override Ctrl + Left/Right ---
        if (e.ctrlKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
            return;
        }

        // Track custom E modifier
        if (e.key.toLowerCase() === 'e') {
            isEPressed = true;
            eKeyUsedAsModifier = false; // Reset on initial downpress
        }

        // --- Censor Bleep (X Key) ---
        if (e.key.toLowerCase() === 'x' && !e.repeat) {
            e.preventDefault();
            initAudioGraph();
            if (audioContextData) {
                const now = audioContextData.context.currentTime;
                // Quick 15ms crossfade to avoid popping
                audioContextData.bleepGain.gain.setTargetAtTime(0.15, now, 0.015);
                audioContextData.videoGain.gain.setTargetAtTime(0, now, 0.015);
            }
            return;
        }

        if (e.key === ' ') {
            e.preventDefault();
            e.stopImmediatePropagation();

            if (!spacebarHeldDown) {
                spacebarKeyDownTime = Date.now();
                spacebarHeldDown = true;
                spacebarSpeedUp = false;

                spacebarTimer = setTimeout(() => {
                    if (spacebarHeldDown) {
                        loadVideo();
                        if (video) {
                            originalPlaybackSpeed = video.playbackRate || 1.0;
                            video.playbackRate = 2.0;
                            spacebarSpeedUp = true;

                            clearInterval(enforceSpeedInterval);
                            enforceSpeedInterval = setInterval(() => {
                                if (video && video.playbackRate !== 2.0) video.playbackRate = 2.0;
                            }, 100);
                        }
                    }
                }, config.holdThreshold);
            }
            return;
        }

        // --- Visualizer & EQ Hotkeys (E + Modifiers) ---
        if (isEPressed) {
            // E + M: Stereo to Mono Downmix
            if (e.key.toLowerCase() === 'm') {
                e.preventDefault();
                e.stopImmediatePropagation();
                toggleMono();
                eKeyUsedAsModifier = true;
                return;
            }

            const digitMatch = e.code && e.code.match(/^(?:Digit|Numpad)(\d)$/);
            if (digitMatch) {
                e.preventDefault();
                e.stopImmediatePropagation();
                setVisualizer(parseInt(digitMatch[1]));
                eKeyUsedAsModifier = true;
                return;
            }

            // Bass and Vocal EQ Mapping
            if (e.key === 'ArrowUp') { e.preventDefault(); adjustEQ('bass', config.eqStepDb); eKeyUsedAsModifier = true; return; }
            if (e.key === 'ArrowDown') { e.preventDefault(); adjustEQ('bass', -config.eqStepDb); eKeyUsedAsModifier = true; return; }
            if (e.key === 'ArrowRight') { e.preventDefault(); adjustEQ('vocal', config.eqStepDb); eKeyUsedAsModifier = true; return; }
            if (e.key === 'ArrowLeft') { e.preventDefault(); adjustEQ('vocal', -config.eqStepDb); eKeyUsedAsModifier = true; return; }
        }
        else if (e.ctrlKey || e.shiftKey) {
            // Keyboard Zoom (Shift + Plus / Shift + Minus)
            if (e.shiftKey && (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd')) {
                e.preventDefault();
                e.stopImmediatePropagation();
                adjustZoomKeyboard(1);
                return;
            }
            if (e.shiftKey && (e.key === '_' || e.key === '-' || e.code === 'NumpadSubtract')) {
                e.preventDefault();
                e.stopImmediatePropagation();
                adjustZoomKeyboard(-1);
                return;
            }

            const digitMatch = e.code && e.code.match(/^(?:Digit|Numpad)(\d)$/);
            if (digitMatch) {
                e.preventDefault();
                e.stopImmediatePropagation();
                const digit = parseInt(digitMatch[1]);
                applyProfile(e.ctrlKey ? digit : digit + 10);
                return;
            }

            if (e.ctrlKey && e.key === 'ArrowUp') { e.preventDefault(); adjustFilter('brightness', config.brightnessStep); }
            else if (e.ctrlKey && e.key === 'ArrowDown') { e.preventDefault(); adjustFilter('brightness', -config.brightnessStep); }
            else if (e.ctrlKey && e.key === 'ArrowRight') { e.preventDefault(); adjustFilter('hue', config.hueStep); }
            else if (e.ctrlKey && e.key === 'ArrowLeft') { e.preventDefault(); adjustFilter('hue', -config.hueStep); }
            else if (e.shiftKey && e.key === 'ArrowUp') { e.preventDefault(); adjustFilter('saturation', config.saturationStep); }
            else if (e.shiftKey && e.key === 'ArrowDown') { e.preventDefault(); adjustFilter('saturation', -config.saturationStep); }
            else if (e.shiftKey && e.key === 'ArrowRight') { e.preventDefault(); adjustFilter('contrast', config.contrastStep); }
            else if (e.shiftKey && e.key === 'ArrowLeft') { e.preventDefault(); adjustFilter('contrast', -config.contrastStep); }
            return;
        }

        loadVideo();

        if (e.key.toLowerCase() !== 'e' && e.key.toLowerCase() !== 'x') {
            switch (e.key) {
                case 'l': seekVideo(config.seek); break;
                case 'j': seekVideo(-config.seek); break;
                case 'ArrowUp': adjustVolume(config.volume); break;
                case 'ArrowDown': adjustVolume(-config.volume); break;
                case 'm': toggleMute(); break;
                case 'k': e.preventDefault(); e.stopImmediatePropagation(); togglePlayPause(); break;
                case 'f': if (!document.baseURI.includes('play.hbomax.com')) toggleFullscreen(); break;
                case 'ArrowRight': seekVideo(config.seek); break;
                case 'ArrowLeft': seekVideo(-config.seek); break;
                case '<': case '-': adjustPlaybackSpeed(-1); break;
                case '>': case '+': adjustPlaybackSpeed(1); break;
                case 'a': toggleAspectRatio(); break;
                case 'o': toggleEqualizer(); break;
                case 'v': toggleCompressor(); break;
                case 'b': toggleBlackAndWhite(); break;
                case 'i': skipIntro(); break;
                case 'h': adjustFilter('hue', config.hueStep); break;
                case 'n': clickNextEpisodeButton(); break;
                case 's': seekVideo(30); break;
                case 'r': resetFilters(); break;
                case '0': case '1': case '2': case '3': case '4': case '5': case '6': case '7': case '8': case '9':
                    jumpToPercentage(parseInt(e.key) * 10);
                    break;
                default: return;
            }
            e.stopImmediatePropagation();
        }
    }

    function handleKeyUp(e) {
        if (e.key.toLowerCase() === 'e') {
            // If E is released and was NOT used for any modifiers, reset the EQ and Mono.
            if (isEPressed && !eKeyUsedAsModifier) {
                resetEQ();
            }
            isEPressed = false;
        }

        // --- Release Censor Bleep ---
        if (e.key.toLowerCase() === 'x') {
            if (audioContextData) {
                const now = audioContextData.context.currentTime;
                audioContextData.bleepGain.gain.setTargetAtTime(0, now, 0.015);
                audioContextData.videoGain.gain.setTargetAtTime(1, now, 0.015);
            }
        }

        if (e.key === ' ') {
            e.preventDefault();
            e.stopImmediatePropagation();

            const duration = Date.now() - spacebarKeyDownTime;
            spacebarHeldDown = false;
            clearTimeout(spacebarTimer);
            clearInterval(enforceSpeedInterval);

            if (spacebarSpeedUp) {
                if (video) video.playbackRate = originalPlaybackSpeed;
                spacebarSpeedUp = false;
            } else if (duration < config.holdThreshold) {
                loadVideo();
                togglePlayPause();
            }
        }
    }

    function handleMouseDown(e) {
        if (e.button !== 0) return;
        const targetTag = e.target.tagName ? e.target.tagName.toLowerCase() : '';
        if (['input', 'textarea', 'button', 'a', 'select'].includes(targetTag) || e.target.closest('button, a, .skip-button')) return;

        mouseDownTime = Date.now();
        isMouseHeldDown = true;

        mouseHoldTimer = setTimeout(() => {
            if (isMouseHeldDown) {
                loadVideo();
                if (video) {
                    originalPlaybackSpeed = video.playbackRate || 1.0;
                    video.playbackRate = 2.0;

                    clearInterval(enforceSpeedInterval);
                    enforceSpeedInterval = setInterval(() => {
                        if (video && video.playbackRate !== 2.0) video.playbackRate = 2.0;
                    }, 100);
                }
            }
        }, config.holdThreshold);
    }

    function handleMouseUp(e) {
        if (e.button !== 0) return;
        if (isMouseHeldDown) {
            const duration = Date.now() - mouseDownTime;
            isMouseHeldDown = false;
            clearTimeout(mouseHoldTimer);
            clearInterval(enforceSpeedInterval);
            if (duration >= config.holdThreshold && video) {
                video.playbackRate = originalPlaybackSpeed;
            }
        }
    }

    // --- Core Video Logic ---
    function loadVideo() {
        let newVideo = null;
        if (typeof jwplayer !== 'undefined' && jwplayer.api) newVideo = jwplayer.api.getFirstPlayer().getContainer();
        else if (typeof flowplayer !== 'undefined' && flowplayer.api) newVideo = flowplayer.api.getFirstPlayer().getParent();
        else if (typeof rmp !== 'undefined' && rmp.players.length > 0) newVideo = rmp.players[0].media.parentNode;
        else newVideo = document.querySelector('video');

        if (newVideo && newVideo !== video) {
            video = newVideo;
            videoScale = 1.0; // Reset scale when target changes
            fastSeek = typeof video.fastSeek === 'function';
            applyFilters();
            setupVisualizerCanvas();
            setupZoomListener(); // Safely bind mousewheel zoom
        }
    }

    function seekVideo(value) {
        if (!video) return;
        const pos = video.currentTime + value;
        fastSeek ? video.fastSeek(pos) : video.currentTime = pos;
    }

    function adjustVolume(value) {
        if (!video) return;
        if (value === 0) {
            video.muted = !video.muted;
        } else {
            video.volume = clamp(video.volume + value, 0, 1);
            video.muted = false;
        }
    }

    function toggleMute() { if (video) video.muted = !video.muted; }
    function togglePlayPause() { if (video && !spacebarSpeedUp) video.paused ? video.play() : video.pause(); }
    function toggleFullscreen() {
        if (!video) return;
        if (!document.fullscreenElement) video.requestFullscreen({ navigationUI: 'show' }).catch(err => console.log(err));
        else document.exitFullscreen();
    }
    function adjustPlaybackSpeed(direction) {
        if (video) {
            playbackSpeed = clamp(playbackSpeed + direction * config.playbackSpeedStep, 0.25, 4);
            video.playbackRate = playbackSpeed;
        }
    }
    function toggleAspectRatio() {
        if (!video) return;
        const options = [{ fit: 'fill', pos: 'center' }, { fit: 'contain', pos: 'center' }, { fit: 'cover', pos: 'center' }];
        video.style.objectFit = options[aspectRatioOption].fit;
        video.style.objectPosition = options[aspectRatioOption].pos;
        aspectRatioOption = (aspectRatioOption + 1) % options.length;
    }

    function adjustFilter(type, amount) {
        filters.profile = null;
        if (type === 'hue') filters.hue = (filters.hue + amount) % 360;
        else filters[type] = clamp(filters[type] + amount, 0, type === 'brightness' ? 3 : 2);
        applyFilters();
    }

    // --- Dynamic Zoom Logic (Wheel and Keys) ---
    function setupZoomListener() {
        if (!video || video.dataset.zoomBound === "true") return;

        video.addEventListener('wheel', (e) => {
            if (!e.shiftKey) return;
            e.preventDefault();

            // Only apply layout constraints when actively zooming to prevent UI bugs on YouTube
            if (video.parentNode && video.parentNode.style) {
                video.parentNode.style.overflow = 'hidden';
            }

            const rect = video.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;

            video.style.transformOrigin = `${x}% ${y}%`;

            if (e.deltaY < 0) {
                videoScale = Math.min(videoScale + config.zoomStep, config.zoomMax);
            } else {
                videoScale = Math.max(videoScale - config.zoomStep, config.zoomMin);
            }

            video.style.transform = `scale(${videoScale})`;
        }, { passive: false });

        video.dataset.zoomBound = "true";
    }

    function adjustZoomKeyboard(direction) {
        if (!video) return;

        // Only apply layout constraints when actively zooming
        if (video.parentNode && video.parentNode.style) {
            video.parentNode.style.overflow = 'hidden';
        }

        video.style.transformOrigin = '50% 50%';
        if (direction > 0) {
            videoScale = Math.min(videoScale + config.zoomStep, config.zoomMax);
        } else {
            videoScale = Math.max(videoScale - config.zoomStep, config.zoomMin);
        }
        video.style.transform = `scale(${videoScale})`;
    }

    // --- Unified Audio Graph & EQ Management ---
    function initAudioGraph() {
        if (!video) loadVideo();
        if (audioContextData) {
            if (audioContextData.context.state === 'suspended') {
                audioContextData.context.resume();
            }
            return;
        }

        const context = new (window.AudioContext || window.webkitAudioContext)();
        if (context.state === 'suspended') {
            context.resume();
        }

        const source = context.createMediaElementSource(video);

        // Censor Switch Nodes
        const videoGain = context.createGain();
        videoGain.gain.value = 1;

        const bleepGain = context.createGain();
        bleepGain.gain.value = 0;

        const bleepOsc = context.createOscillator();
        bleepOsc.type = 'sine';
        bleepOsc.frequency.value = 1000;
        bleepOsc.connect(bleepGain);
        bleepGain.connect(context.destination);
        bleepOsc.start();

        // User EQ Nodes (Bass & Vocals)
        const bassFilter = context.createBiquadFilter();
        bassFilter.type = 'lowshelf';
        bassFilter.frequency.value = 100;
        bassFilter.gain.value = 0;

        const vocalFilter = context.createBiquadFilter();
        vocalFilter.type = 'peaking';
        vocalFilter.frequency.value = 1500;
        vocalFilter.Q.value = 1.0;
        vocalFilter.gain.value = 0;

        // Stereo to Mono Downmix Node
        const monoNode = context.createGain();
        monoNode.channelCount = 1; // Forces the API to sum left and right
        monoNode.channelCountMode = 'explicit';
        monoNode.channelInterpretation = 'speakers';

        // General Enhancers (Spatial/Compression)
        const analyser = context.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.85;

        const splitter = context.createChannelSplitter(2);
        const merger = context.createChannelMerger(2);
        const leftDelay = context.createDelay();
        const rightDelay = context.createDelay();
        leftDelay.delayTime.value = 0;
        rightDelay.delayTime.value = 0.01;

        splitter.connect(leftDelay, 0); splitter.connect(rightDelay, 1);
        leftDelay.connect(merger, 0, 0); rightDelay.connect(merger, 0, 1);

        const compressor = context.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-24, context.currentTime);
        compressor.knee.setValueAtTime(30, context.currentTime);
        compressor.ratio.setValueAtTime(4, context.currentTime);
        compressor.attack.setValueAtTime(0.003, context.currentTime);
        compressor.release.setValueAtTime(0.25, context.currentTime);

        audioContextData = {
            context, source, analyser, splitter, merger, compressor,
 videoGain, bleepGain, bassFilter, vocalFilter, monoNode,
 eqActive: false, compActive: false, monoActive: false
        };
        updateAudioRouting();
    }

    function updateAudioRouting() {
        if (!audioContextData) return;
        const { context, source, analyser, splitter, merger, compressor, videoGain, bassFilter, vocalFilter, monoNode, eqActive, compActive, monoActive } = audioContextData;

        // Safely disconnect everything to rebuild the chain
        try { source.disconnect(); } catch (e) {}
        try { bassFilter.disconnect(); } catch (e) {}
        try { vocalFilter.disconnect(); } catch (e) {}
        try { monoNode.disconnect(); } catch (e) {}
        try { merger.disconnect(); } catch (e) {}
        try { compressor.disconnect(); } catch (e) {}
        try { videoGain.disconnect(); } catch (e) {}
        try { analyser.disconnect(); } catch (e) {}

        let currentNode = source;

        // Base EQ Routing
        currentNode.connect(bassFilter);
        bassFilter.connect(vocalFilter);
        currentNode = vocalFilter;

        // Advanced Options
        if (monoActive) { currentNode.connect(monoNode); currentNode = monoNode; }
        if (eqActive) { currentNode.connect(splitter); currentNode = merger; }
        if (compActive) { currentNode.connect(compressor); currentNode = compressor; }

        // Final routing to speakers & visualizer
        currentNode.connect(videoGain);
        videoGain.connect(analyser);
        analyser.connect(context.destination);
    }

    function adjustEQ(type, amount) {
        initAudioGraph();
        if (!audioContextData) return;

        if (type === 'bass') {
            const current = audioContextData.bassFilter.gain.value;
            audioContextData.bassFilter.gain.value = clamp(current + amount, -config.eqMaxDb, config.eqMaxDb);
        } else if (type === 'vocal') {
            const current = audioContextData.vocalFilter.gain.value;
            audioContextData.vocalFilter.gain.value = clamp(current + amount, -config.eqMaxDb, config.eqMaxDb);
        }
    }

    // Instantly resets both custom EQ parameters and Mono toggle
    function resetEQ() {
        if (!audioContextData) return; // Prevent initializing the audio graph just to reset nothing

        audioContextData.bassFilter.gain.value = 0;
        audioContextData.vocalFilter.gain.value = 0;

        if (audioContextData.monoActive) {
            audioContextData.monoActive = false;
            updateAudioRouting();
        }
    }

    function applyProfile(index) {
        const profiles = [
            null, 'brightness(1.05) contrast(1.1) saturate(0.9) blur(0.3px)', 'brightness(1.0) contrast(1.15) saturate(1.2) hue-rotate(0deg)', 'brightness(0.9) contrast(1.2) saturate(0.85) invert(5%)', 'brightness(1.0) contrast(1.05) saturate(0.9) sepia(25%)', 'brightness(1.0) contrast(1.25) saturate(0%) grayscale(100%)', 'brightness(1.0) contrast(1.15) saturate(1.1) hue-rotate(180deg) invert(100%)', 'brightness(1.05) contrast(1.1) saturate(0.7) sepia(10%)', 'brightness(0.95) contrast(1.3) saturate(1.05)', 'brightness(1.15) contrast(1.05) saturate(1.05)', null, 'brightness(1.0) contrast(1.15) saturate(1.1) sepia(15%) hue-rotate(180deg)', 'brightness(0.95) contrast(1.25) saturate(1.4) hue-rotate(270deg)', 'brightness(1.0) contrast(1.1) saturate(0.8) sepia(40%)', 'brightness(0.85) contrast(1.5) saturate(0.9)', 'brightness(0.95) contrast(1.05) saturate(0.5) hue-rotate(190deg)', 'brightness(1.1) contrast(1.2) saturate(1.5) invert(30%) hue-rotate(90deg)', 'brightness(1.05) contrast(1.15) saturate(0.2) sepia(85%)', 'brightness(0.9) contrast(1.2) saturate(0.3) grayscale(50%)', 'brightness(1.2) contrast(1.1) saturate(1.3) sepia(5%)'
        ];
        if (index === 0 || index === 10) resetFilters();
        else { filters.profile = profiles[index]; applyFilters(); }
    }

    function toggleBlackAndWhite() {
        filters.profile = null;
        if (filters.special === 'none') filters.special = 'grayscale(100%)';
        else if (filters.special === 'grayscale(100%)') filters.special = 'sepia(100%)';
        else if (filters.special === 'sepia(100%)') filters.special = 'invert(100%)';
        else filters.special = 'none';
        applyFilters();
    }

    function resetFilters() {
        filters.brightness = 1.0; filters.hue = 0; filters.saturation = 1.0; filters.contrast = 1.0; filters.special = 'none'; filters.profile = null; applyFilters();
    }

    function toggleEqualizer() { if (!video) return; initAudioGraph(); audioContextData.eqActive = !audioContextData.eqActive; updateAudioRouting(); }
    function toggleCompressor() { if (!video) return; initAudioGraph(); audioContextData.compActive = !audioContextData.compActive; updateAudioRouting(); }

    function toggleMono() {
        if (!video) return;
        initAudioGraph();
        audioContextData.monoActive = !audioContextData.monoActive;
        updateAudioRouting();
    }

    // --- Visualizer Setup & Render Loop ---
    function setupVisualizerCanvas() {
        if (visCanvas) return;
        visCanvas = document.createElement('canvas');
        visCtx = visCanvas.getContext('2d', { alpha: true });
        visCanvas.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        pointer-events: none; z-index: 9999; display: block;
        `;
        if (video && video.parentNode) {
            video.parentNode.style.position = video.parentNode.style.position || 'relative';
            video.parentNode.appendChild(visCanvas);
        }
        if (!animationFrameId) renderVisualizer();
    }

    function setVisualizer(mode) {
        if (!video) loadVideo();
        initAudioGraph();
        setupVisualizerCanvas();
        currentVisMode = mode;
    }

    function renderVisualizer() {
        animationFrameId = requestAnimationFrame(renderVisualizer);

        if (visCanvas && video) {
            const rect = video.getBoundingClientRect();
            if (visCanvas.width !== rect.width || visCanvas.height !== rect.height) {
                visCanvas.width = rect.width;
                visCanvas.height = rect.height;
            }
        }

        if (!visCtx || !visCanvas || !audioContextData || currentVisMode === 0) {
            if (visCtx && visCanvas) visCtx.clearRect(0, 0, visCanvas.width, visCanvas.height);
            return;
        }

        const { analyser } = audioContextData;
        const w = visCanvas.width;
        const h = visCanvas.height;
        const cx = w / 2;
        const cy = h / 2;

        const fData = new Uint8Array(analyser.frequencyBinCount);
        const tData = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(fData);
        analyser.getByteTimeDomainData(tData);

        let bassAvg = 0;
        for (let i = 0; i < 10; i++) bassAvg += fData[i];
        bassAvg = bassAvg / 10;

        visCtx.clearRect(0, 0, w, h);
        vizData.time += 0.01;

        switch (currentVisMode) {
            case 1: {
                const barW = (w / fData.length) * 2.5;
                let x = 0;
                for (let i = 0; i < fData.length; i++) {
                    const barH = (fData[i] / 255) * h;
                    visCtx.fillStyle = `hsl(${(i / fData.length) * 360}, 100%, 50%)`;
                    visCtx.fillRect(x, h - barH, barW, barH);
                    x += barW + 1;
                }
                break;
            }
            case 2: {
                visCtx.lineWidth = 3;
                visCtx.strokeStyle = 'cyan';
                visCtx.shadowBlur = 10;
                visCtx.shadowColor = 'cyan';
                visCtx.beginPath();
                const sliceW = w * 1.0 / tData.length;
                let tx = 0;
                for(let i = 0; i < tData.length; i++) {
                    const v = tData[i] / 128.0;
                    const ty = v * cy;
                    if(i === 0) visCtx.moveTo(tx, ty);
                    else visCtx.lineTo(tx, ty);
                    tx += sliceW;
                }
                visCtx.stroke();
                visCtx.shadowBlur = 0;
                break;
            }
            case 3: {
                const radius = 50 + (bassAvg * 1.5);
                visCtx.beginPath();
                visCtx.arc(cx, cy, radius, 0, 2 * Math.PI, false);
                visCtx.fillStyle = `hsla(${bassAvg}, 100%, 50%, 0.5)`;
                visCtx.fill();
                visCtx.lineWidth = 5;
                visCtx.strokeStyle = 'white';
                visCtx.stroke();
                break;
            }
            case 4: {
                const speed = 0.005 + (bassAvg / 10000);
                visCtx.fillStyle = 'rgba(0,0,0,0.5)';
                visCtx.fillRect(0,0,w,h);
                visCtx.fillStyle = 'white';
                vizData.stars.forEach(star => {
                    star.z -= speed;
                    if (star.z <= 0) { star.x = Math.random()*2-1; star.y = Math.random()*2-1; star.z = 1; }
                    const sx = (star.x / star.z) * cx + cx;
                    const sy = (star.y / star.z) * cy + cy;
                    const r = (1 - star.z) * 3;
                    visCtx.beginPath();
                    visCtx.arc(sx, sy, r, 0, Math.PI*2);
                    visCtx.fill();
                });
                break;
            }
            case 5: {
                visCtx.save();
                visCtx.translate(cx, cy);
                visCtx.rotate(vizData.time);
                visCtx.scale(1 + (bassAvg/500), 1 + (bassAvg/500));
                visCtx.beginPath();
                for(let i=0; i<6; i++) {
                    visCtx.lineTo(100 * Math.cos(i * Math.PI / 3), 100 * Math.sin(i * Math.PI / 3));
                }
                visCtx.closePath();
                visCtx.strokeStyle = `hsl(${(vizData.time*50)%360}, 100%, 50%)`;
                visCtx.lineWidth = 10;
                visCtx.stroke();
                visCtx.restore();
                break;
            }
            case 6: {
                visCtx.globalCompositeOperation = 'screen';
                for(let i=0; i<3; i++) {
                    const px = cx + Math.sin(vizData.time + i) * 150;
                    const py = cy + Math.cos(vizData.time * 1.5 + i) * 150;
                    const rad = 100 + (fData[i*20] || 0);
                    const grad = visCtx.createRadialGradient(px, py, 0, px, py, rad);
                    grad.addColorStop(0, `hsla(${i*120 + bassAvg}, 100%, 50%, 0.6)`);
                    grad.addColorStop(1, 'transparent');
                    visCtx.fillStyle = grad;
                    visCtx.beginPath(); visCtx.arc(px, py, rad, 0, Math.PI*2); visCtx.fill();
                }
                visCtx.globalCompositeOperation = 'source-over';
                break;
            }
            case 7: {
                visCtx.save();
                visCtx.translate(cx, cy);
                for(let side = -1; side <= 1; side += 2) {
                    visCtx.save();
                    visCtx.scale(side, 1);
                    for (let i = 0; i < 60; i++) {
                        const hBar = (fData[i] / 255) * cy;
                        visCtx.fillStyle = `hsl(${i*4}, 100%, 60%)`;
                        visCtx.fillRect(i * 10, -hBar/2, 8, hBar);
                    }
                    visCtx.restore();
                }
                visCtx.restore();
                break;
            }
            case 8: {
                visCtx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                visCtx.fillRect(0, 0, w, h);
                visCtx.fillStyle = '#0F0';
                visCtx.font = '15px monospace';
                const cols = Math.floor(w / 20);
                if (vizData.matrixDrops.length !== cols) vizData.matrixDrops = Array(cols).fill(0);
                for(let i = 0; i < cols; i++) {
                    const char = String.fromCharCode(0x30A0 + Math.random() * 96);
                    const intensity = fData[i % fData.length] / 255;
                    visCtx.fillText(char, i * 20, vizData.matrixDrops[i] * 20);
                    if(vizData.matrixDrops[i] * 20 > h && Math.random() > 0.975) vizData.matrixDrops[i] = 0;
                    vizData.matrixDrops[i] += (1 + intensity * 2);
                }
                break;
            }
            case 9: {
                const opacity = clamp(bassAvg / 255, 0, 0.8);
                const glow = visCtx.createRadialGradient(cx, cy, h/4, cx, cy, w);
                glow.addColorStop(0, 'transparent');
                glow.addColorStop(1, `rgba(200, 50, 255, ${opacity})`);
                visCtx.fillStyle = glow;
                visCtx.fillRect(0, 0, w, h);
                break;
            }
        }
    }

    // --- Media Controls ---
    function skipIntro() {
        const selectors = ['button[aria-label="Skip intro"]', 'button[role="Button"]', '.skip-button', 'button.skip-button__text', '.atvwebplayersdk-skipelement-button'];
        for (const selector of selectors) {
            for (const btn of document.querySelectorAll(selector)) {
                if (btn && (btn.textContent.toLowerCase().includes('skip') || btn.classList.contains('skip-button'))) { btn.click(); return; }
            }
        }
    }
    function jumpToPercentage(percentage) { if (video && video.duration) video.currentTime = video.duration * (percentage / 100); }
    function clickNextEpisodeButton() {
        for (const btn of document.querySelectorAll('button, .watch-now-btn, .next-episode')) {
            if (btn.textContent.trim().toLowerCase().startsWith('next episode') || btn.classList.contains('watch-now-btn')) { btn.click(); return; }
        }
    }

    // --- Ad & Host Blocking ---
    function removeAds() {
        document.querySelectorAll('[class^="AdInfoBar-message-"], [class^="AdsContainer-"], .abvsVideo').forEach(el => el.remove());
    }

    function initHostBlocker() {
        const CACHE_KEY = 'StreamAssistant_HostsCache';
        const CACHE_TIME = 24 * 60 * 60 * 1000;
        const cachedData = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
        if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TIME)) observeForAds(cachedData.hosts);
        else {
            fetch('https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts')
            .then(res => res.text())
            .then(text => {
                const blockedHosts = text.split('\n').filter(line => line.startsWith('0.0.0.0')).map(line => line.split(' ')[1]);
                localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), hosts: blockedHosts }));
                observeForAds(blockedHosts);
            }).catch(err => console.error('Failed to fetch hosts:', err));
        }
    }

    function observeForAds(blockedHosts) {
        const observer = new MutationObserver(mutations => {
            let shouldRemoveAds = false;
            mutations.forEach(mutation => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(node => {
                        if (node.tagName === 'VIDEO') {
                            video = null;
                            if (node.src && blockedHosts.some(host => node.src.includes(host))) { node.pause(); node.remove(); }
                        }
                        if (node.nodeType === 1 && (node.className && typeof node.className === 'string' && (node.className.includes('AdInfoBar') || node.className.includes('AdsContainer') || node.className.includes('abvsVideo')))) {
                            shouldRemoveAds = true;
                        }
                    });
                }
            });
            if (shouldRemoveAds) removeAds();
        });
            observer.observe(document.documentElement, { childList: true, subtree: true });
    }

    document.addEventListener('DOMContentLoaded', () => {
        loadVideo();
        removeAds();
        initHostBlocker();
    });
})();
