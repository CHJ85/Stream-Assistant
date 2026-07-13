// ==UserScript==
// @name         Stream Assistant − Keyboard Shortcuts, Features for Streaming Services
// @namespace    https://github.com/chj85/Stream-Assistant
// @version      2.9.4
// @description  Adds keyboard shortcuts and additional features to various streaming services.
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
// @match        https://rumble.com/*
// @match        https://www.adultswim.com/*
// @match        https://www.amcplus.com/*
// @match        https://*.crunchyroll.com/*
// @match        https://www.magellantv.com/*
// @match        https://watch.spectrum.net/*
// @match        https://watch.sling.com/*
// @match        https://app.plex.tv/*
// @match        https://www.ovationtv.com/*
// @match        https://www.fox.com/*
// @match        https://vaughn.live/*
// @match        https://tubitv.com/*
// @match        https://www.hidive.com/*
// @match        https://www.retrocrush.tv/*
// @match        https://www.dovechannel.com/*
// @match        https://www.midnightpulp.com/*
// @match        https://www.klowdtv.com/*
// @match        https://more.clownfishtv.com/*
// @match        https://www.ruptly.tv/*
// @match        https://therokuchannel.roku.com/*
// @match        https://pluto.tv/*
// @match        https://distro.tv/*
// @match        https://www.paramountplus.com/*
// @match        https://www.investigationdiscovery.com/*
// @match        https://audiovisual.ec.europa.eu/*
// @match        https://www.dazn.com/*
// @match        https://*.youtube.com/*
// @match        https://multimedia.europarl.europa.eu/*
// @icon         https://i.imgur.com/pwiVt0N.png
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
        holdThreshold: 200 // ms to distinguish between click and hold
    };

    // --- State Management ---
    let video = null;
    let fastSeek = false;
    let aspectRatioOption = 0;

    // Video Filters State
    const filters = {
        brightness: 1.0,
        hue: 0,
        saturation: 1.0,
        contrast: 1.0,
        special: 'none'
    };

    // Playback & Timing State
    let playbackSpeed = 1.0;
    let originalPlaybackSpeed = 1.0;
    let isMouseHeldDown = false;
    let mouseDownTime = 0;
    let mouseHoldTimer = null;
    let spacebarKeyDownTime = 0;
    let spacebarSpeedUp = false;
    let spacebarTimer = null;
    let spacebarHeldDown = false;
    let enforceSpeedInterval = null; // Forces speed to stay at 2x if the site fights back

    // Audio State
    let audioContextData = null;

    // --- Helper Functions ---
    const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

    const applyFilters = () => {
        if (!video) return;
        const baseFilters = `brightness(${filters.brightness}) hue-rotate(${filters.hue}deg) saturate(${filters.saturation}) contrast(${filters.contrast})`;
        video.style.filter = filters.special !== 'none' ? `${baseFilters} ${filters.special}` : baseFilters;
    };

    // --- Initialization & Event Listeners ---
    // Using capture: true globally to intercept events before site scripts can stop them
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keyup', handleKeyUp, true);
    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('mouseup', handleMouseUp, true);

    function handleKeyDown(e) {
        const targetTagName = e.target.tagName ? e.target.tagName.toLowerCase() : '';
        const isInputField = ['input', 'textarea'].includes(targetTagName) || e.target.isContentEditable;
        const isSpacebar = e.key === ' ';

        if (isInputField) return;

        if (isSpacebar) {
            e.preventDefault();
            e.stopImmediatePropagation(); // Hides spacebar from native player so it doesn't pause

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

                            // Enforce 2x speed in case the site forces it back
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

        // Modifiers for visual settings
        if (e.ctrlKey || e.shiftKey) {
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

    function handleKeyUp(e) {
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

    // --- Mouse Global Listeners (Bypasses Overlays) ---
    function handleMouseDown(e) {
        if (e.button !== 0) return; // Left click only

        // Ensure we don't trigger hold-to-speed when clicking buttons, links, or UI
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
            fastSeek = typeof video.fastSeek === 'function';
            applyFilters();
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

    function toggleMute() {
        if (video) video.muted = !video.muted;
    }

    function togglePlayPause() {
        if (video && !spacebarSpeedUp) {
            video.paused ? video.play() : video.pause();
        }
    }

    function toggleFullscreen() {
        if (!video) return;
        if (!document.fullscreenElement) {
            video.requestFullscreen({ navigationUI: 'show' }).catch(err => console.log(err));
        } else {
            document.exitFullscreen();
        }
    }

    function adjustPlaybackSpeed(direction) {
        if (video) {
            playbackSpeed = clamp(playbackSpeed + direction * config.playbackSpeedStep, 0.25, 4);
            video.playbackRate = playbackSpeed;
        }
    }

    function toggleAspectRatio() {
        if (!video) return;
        const options = [
            { fit: 'fill', pos: 'center' },
            { fit: 'contain', pos: 'center' },
            { fit: 'cover', pos: 'center' }
        ];
        video.style.objectFit = options[aspectRatioOption].fit;
        video.style.objectPosition = options[aspectRatioOption].pos;
        aspectRatioOption = (aspectRatioOption + 1) % options.length;
    }

    function adjustFilter(type, amount) {
        if (type === 'hue') {
            filters.hue = (filters.hue + amount) % 360;
        } else {
            const max = type === 'brightness' ? 3 : 2;
            filters[type] = clamp(filters[type] + amount, 0, max);
        }
        applyFilters();
    }

    function toggleBlackAndWhite() {
        if (filters.special === 'none') filters.special = 'grayscale(100%)';
        else if (filters.special === 'grayscale(100%)') filters.special = 'sepia(100%)';
        else if (filters.special === 'sepia(100%)') filters.special = 'invert(100%)';
        else filters.special = 'none';
        applyFilters();
    }

    function resetFilters() {
        filters.brightness = 1.0;
        filters.hue = 0;
        filters.saturation = 1.0;
        filters.contrast = 1.0;
        filters.special = 'none';
        applyFilters();
    }

    // --- Unified Audio Graph Management ---
    function initAudioGraph() {
        if (audioContextData) return;

        const context = new (window.AudioContext || window.webkitAudioContext)();
        const source = context.createMediaElementSource(video);

        // Equalizer Nodes
        const splitter = context.createChannelSplitter(2);
        const merger = context.createChannelMerger(2);
        const leftDelay = context.createDelay();
        const rightDelay = context.createDelay();

        leftDelay.delayTime.value = 0;
        rightDelay.delayTime.value = 0.01;

        splitter.connect(leftDelay, 0);
        splitter.connect(rightDelay, 1);
        leftDelay.connect(merger, 0, 0);
        rightDelay.connect(merger, 0, 1);

        // Dynamic Range Compressor Node
        const compressor = context.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-24, context.currentTime);
        compressor.knee.setValueAtTime(30, context.currentTime);
        compressor.ratio.setValueAtTime(4, context.currentTime);
        compressor.attack.setValueAtTime(0.003, context.currentTime);
        compressor.release.setValueAtTime(0.25, context.currentTime);

        audioContextData = {
            context,
            source,
            splitter,
            merger,
            compressor,
            eqActive: false,
            compActive: false
        };
    }

    function updateAudioRouting() {
        if (!audioContextData) return;
        const { context, source, splitter, merger, compressor, eqActive, compActive } = audioContextData;

        // Disconnect everything to rebuild the chain cleanly
        source.disconnect();
        merger.disconnect();
        compressor.disconnect();

        let currentNode = source;

        // If Equalizer is active, route through splitter/merger
        if (eqActive) {
            currentNode.connect(splitter);
            currentNode = merger;
        }

        // If Compressor is active, route through compressor
        if (compActive) {
            currentNode.connect(compressor);
            currentNode = compressor;
        }

        // Finally, connect the last node in the chain to the destination
        currentNode.connect(context.destination);
    }

    function toggleEqualizer() {
        if (!video) return;
        initAudioGraph();
        audioContextData.eqActive = !audioContextData.eqActive;
        updateAudioRouting();
    }

    function toggleCompressor() {
        if (!video) return;
        initAudioGraph();
        audioContextData.compActive = !audioContextData.compActive;
        updateAudioRouting();
    }

    // --- End Audio Management ---

    function skipIntro() {
        const selectors = [
            'button[aria-label="Skip intro"]',
            'button[role="Button"]',
            '.skip-button',
            'button.skip-button__text',
            '.atvwebplayersdk-skipelement-button'
        ];

        for (const selector of selectors) {
            const btns = document.querySelectorAll(selector);
            for (const btn of btns) {
                if (btn && (btn.textContent.toLowerCase().includes('skip') || btn.classList.contains('skip-button'))) {
                    btn.click();
                    return;
                }
            }
        }
    }

    function jumpToPercentage(percentage) {
        if (video && video.duration) {
            video.currentTime = video.duration * (percentage / 100);
        }
    }

    function clickNextEpisodeButton() {
        const btns = document.querySelectorAll('button, .watch-now-btn, .next-episode');
        for (const btn of btns) {
            if (btn.textContent.trim().toLowerCase().startsWith('next episode') || btn.classList.contains('watch-now-btn')) {
                btn.click();
                return;
            }
        }
    }

    function removeAds() {
        const adElements = document.querySelectorAll('[class^="AdInfoBar-message-"], [class^="AdsContainer-"], .abvsVideo');
        adElements.forEach(el => el.remove());
    }

    function initHostBlocker() {
        const CACHE_KEY = 'StreamAssistant_HostsCache';
        const CACHE_TIME = 24 * 60 * 60 * 1000;

        const cachedData = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');

        if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TIME)) {
            observeForAds(cachedData.hosts);
        } else {
            fetch('https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts')
            .then(res => res.text())
            .then(text => {
                const blockedHosts = text.split('\n')
                .filter(line => line.startsWith('0.0.0.0'))
                .map(line => line.split(' ')[1]);

                localStorage.setItem(CACHE_KEY, JSON.stringify({
                    timestamp: Date.now(),
                    hosts: blockedHosts
                }));
                observeForAds(blockedHosts);
            })
            .catch(err => console.error('Failed to fetch hosts:', err));
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
                            if (node.src && blockedHosts.some(host => node.src.includes(host))) {
                                node.pause();
                                node.remove();
                            }
                        }
                        if (node.nodeType === 1 && (
                            (node.className && typeof node.className === 'string' &&
                            (node.className.includes('AdInfoBar') || node.className.includes('AdsContainer') || node.className.includes('abvsVideo')))
                        )) {
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
