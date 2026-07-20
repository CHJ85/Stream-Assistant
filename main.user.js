// ==UserScript==
// @name         Stream Assistant − Keyboard Shortcuts, Features for Streaming Services
// @namespace    https://github.com/chj85/Stream-Assistant
// @version      3.1.4
// @description  Adds keyboard shortcuts, filters, EQ controls (Bass/Vocals), Censor bleep, zoom controls, Mono Downmix, visualizers, and raw/effects video recording (with auto-pause).
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
        eqStepDb: 2,
        eqMaxDb: 24,
        zoomStep: 0.15,
        zoomMax: 4.0,
        zoomMin: 1.0
    };
    
    // --- State Management ---
    let video = null;
    let fastSeek = false;
    let aspectRatioOption = 0;
    let isEPressed = false;
    let eKeyUsedAsModifier = false;
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
    let wasMouseSpeedUp = false;
    
    let audioContextData = null;
    
    // --- Recording State ---
    let mediaRecorder = null;
    let recordedChunks = [];
    let isRecording = false;
    let recordingIndicator = null;
    let activeVideoForRecordListeners = null;
    
    // --- Canvas Recording State ---
    let isCanvasRecording = false;
    let canvasMediaRecorder = null;
    let canvasRecordedChunks = [];
    let canvasRecordFrameId = null;
    let recordCanvas = null;
    let recordCtx = null;
    
    function handleVideoPause() {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.pause();
        }
        if (canvasMediaRecorder && canvasMediaRecorder.state === 'recording') {
            canvasMediaRecorder.pause();
        }
    }
    
    function handleVideoResume() {
        if (mediaRecorder && mediaRecorder.state === 'paused') {
            mediaRecorder.resume();
        }
        if (canvasMediaRecorder && canvasMediaRecorder.state === 'paused') {
            canvasMediaRecorder.resume();
        }
    }
    
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
            video.style.setProperty('filter', filters.profile, 'important');
        } else {
            const baseFilters = `brightness(${filters.brightness}) hue-rotate(${filters.hue}deg) saturate(${filters.saturation}) contrast(${filters.contrast})`;
            const filterValue = filters.special !== 'none' ? `${baseFilters} ${filters.special}` : baseFilters;
            
            video.style.setProperty('filter', filterValue, 'important');
        }
    };
    
    // Helper to identify if an event originated inside any text input field or chat system
    function isInputFieldEvent(e) {
        const trueTarget = e.composedPath ? e.composedPath()[0] : e.target;
        if (!trueTarget) return false;
        
        const targetTagName = trueTarget.tagName ? trueTarget.tagName.toLowerCase() : '';
        
        return (
            ['input', 'textarea', 'select'].includes(targetTagName) ||
            trueTarget.isContentEditable ||
            trueTarget.getAttribute?.('role') === 'textbox' ||
            (trueTarget.closest && trueTarget.closest('[class*="chat"], [id*="chat"], [class*="message"]'))
        );
    }
    
    // --- Recording Logic ---
    function getSupportedMimeType() {
        const preferredTypes = [
            'video/webm; codecs=vp9,opus',
 'video/webm; codecs=vp8,opus',
 'video/webm',
 'video/mp4; codecs=h264,aac',
 'video/mp4'
        ];
        
        for (const mimeType of preferredTypes) {
            if (MediaRecorder.isTypeSupported(mimeType)) {
                return mimeType;
            }
        }
        return '';
    }
    
    function showRecordingIndicator() {
        if (!recordingIndicator) {
            recordingIndicator = document.createElement('div');
            recordingIndicator.innerHTML = `
            <span>REC</span>
            <span style="font-size: 20px; filter: drop-shadow(0 0 10px red);">🔴</span>
            `;
            
            recordingIndicator.style.cssText = `
            position: absolute;
            top: 30px;
            right: 40px;
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 2147483647;
            pointer-events: none;
            color: red;
            font-family: 'Courier New', Courier, monospace;
            font-size: 26px;
            font-weight: bold;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8), 0 0 10px red;
            animation: streamAssistantRecordBlink 1s step-start infinite;
            `;
            
            if (!document.getElementById('streamAssistantBlinkStyles')) {
                const style = document.createElement('style');
                style.id = 'streamAssistantBlinkStyles';
                style.innerHTML = `
                @keyframes streamAssistantRecordBlink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }
                `;
                document.head.appendChild(style);
            }
        }
        
        const targetContainer = document.fullscreenElement || (video && video.parentNode);
        if (targetContainer) {
            const computedPosition = window.getComputedStyle(targetContainer).position;
            if (computedPosition === 'static') {
                targetContainer.style.position = 'relative';
            }
            targetContainer.appendChild(recordingIndicator);
        }
    }
    
    function hideRecordingIndicator() {
        if (recordingIndicator && recordingIndicator.parentNode) {
            recordingIndicator.parentNode.removeChild(recordingIndicator);
        }
    }
    
    // Raw Recording
    function toggleRecording() {
        if (!video) loadVideo();
        if (!video) return;
        
        if (isRecording) {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
            }
            return;
        }
        
        const stream = video.captureStream ? video.captureStream() : video.mozCaptureStream ? video.mozCaptureStream() : null;
        if (!stream) {
            console.warn("Stream Assistant: captureStream is not supported or the video is DRM protected.");
            return;
        }
        
        const mimeType = getSupportedMimeType();
        const options = mimeType ? { mimeType } : {};
        
        try {
            mediaRecorder = new MediaRecorder(stream, options);
        } catch (e) {
            console.error("Stream Assistant: MediaRecorder initialization failed.", e);
            return;
        }
        
        recordedChunks = [];
        
        mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
                recordedChunks.push(e.data);
            }
        };
        
        const targetVideo = video;
        
        mediaRecorder.onstop = () => {
            isRecording = false;
            hideRecordingIndicator();
            
            if (targetVideo) {
                targetVideo.removeEventListener('pause', handleVideoPause);
                targetVideo.removeEventListener('play', handleVideoResume);
            }
            activeVideoForRecordListeners = null;
            
            const blob = new Blob(recordedChunks, { type: mimeType || 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            document.body.appendChild(a);
            a.style = 'display: none';
            a.href = url;
            
            const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
            a.download = `StreamAssistant_Recording_${Date.now()}.${ext}`;
            a.click();
            
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            // Clear buffer immediately to free memory
            recordedChunks = [];
        };
        
        mediaRecorder.start();
        isRecording = true;
        showRecordingIndicator();
        
        targetVideo.addEventListener('pause', handleVideoPause);
        targetVideo.addEventListener('play', handleVideoResume);
        activeVideoForRecordListeners = targetVideo;
    }
    
    // Canvas/Effects Recording
    function toggleCanvasRecording() {
        if (!video) loadVideo();
        if (!video) return;
        
        // Stop recording if currently active
        if (isCanvasRecording) {
            isCanvasRecording = false;
            cancelAnimationFrame(canvasRecordFrameId);
            if (canvasMediaRecorder && canvasMediaRecorder.state !== 'inactive') {
                canvasMediaRecorder.stop();
            }
            hideRecordingIndicator();
            return;
        }
        
        // Initialize audio graph to ensure we have the audio stream
        initAudioGraph();
        if (!audioContextData || !audioContextData.streamDestination) {
            console.error("Stream Assistant: Audio graph not initialized for Canvas Recording.");
            return;
        }
        
        // Setup the hidden canvas
        if (!recordCanvas) {
            recordCanvas = document.createElement('canvas');
            recordCtx = recordCanvas.getContext('2d');
        }
        
        const mimeType = getSupportedMimeType();
        const options = mimeType ? { mimeType } : {};
        
        // Combine Canvas Video Stream + Processed Audio Stream
        const canvasStream = recordCanvas.captureStream(30); // 30 FPS Capture
        const audioStream = audioContextData.streamDestination.stream;
        const combinedStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
                                               ...audioStream.getAudioTracks()
        ]);
        
        try {
            canvasMediaRecorder = new MediaRecorder(combinedStream, options);
        } catch (e) {
            console.error("Stream Assistant: Canvas MediaRecorder initialization failed.", e);
            return;
        }
        
        canvasRecordedChunks = [];
        canvasMediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) canvasRecordedChunks.push(e.data);
        };
            
            const targetVideo = video;
            
            canvasMediaRecorder.onstop = () => {
                isCanvasRecording = false;
                cancelAnimationFrame(canvasRecordFrameId);
                hideRecordingIndicator();
                
                if (targetVideo) {
                    targetVideo.removeEventListener('pause', handleVideoPause);
                    targetVideo.removeEventListener('play', handleVideoResume);
                }
                activeVideoForRecordListeners = null;
                
                const blob = new Blob(canvasRecordedChunks, { type: mimeType || 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                document.body.appendChild(a);
                a.style = 'display: none';
                a.href = url;
                
                const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
                a.download = `StreamAssistant_Effects_Recording_${Date.now()}.${ext}`;
                a.click();
                
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                // Clear buffer immediately to free memory
                canvasRecordedChunks = [];
            };
            
            // Render Loop: Draw video and apply active filters/zoom to canvas
            const drawFrame = () => {
                if (!isCanvasRecording) return;
                
                // Match native video resolution
                if (recordCanvas.width !== video.videoWidth || recordCanvas.height !== video.videoHeight) {
                    recordCanvas.width = video.videoWidth || 1280;
                    recordCanvas.height = video.videoHeight || 720;
                }
                
                recordCtx.clearRect(0, 0, recordCanvas.width, recordCanvas.height);
                
                // Apply Video Filters to Canvas Context
                if (filters.profile) {
                    recordCtx.filter = filters.profile;
                } else {
                    const baseFilters = `brightness(${filters.brightness}) hue-rotate(${filters.hue}deg) saturate(${filters.saturation}) contrast(${filters.contrast})`;
                    recordCtx.filter = filters.special !== 'none' ? `${baseFilters} ${filters.special}` : baseFilters;
                }
                
                // Apply Zoom/Scale
                recordCtx.save();
                if (videoScale !== 1.0) {
                    recordCtx.translate(recordCanvas.width / 2, recordCanvas.height / 2);
                    recordCtx.scale(videoScale, videoScale);
                    recordCtx.translate(-recordCanvas.width / 2, -recordCanvas.height / 2);
                }
                
                // Draw Video Frame
                recordCtx.drawImage(video, 0, 0, recordCanvas.width, recordCanvas.height);
                recordCtx.restore();
                
                // Overlay Visualizer if active (Drawn above video, unaffectedly by video filters)
                if (visCanvas && currentVisMode !== 0) {
                    recordCtx.filter = 'none'; // Reset filter for visualizer overlay
                    recordCtx.drawImage(visCanvas, 0, 0, recordCanvas.width, recordCanvas.height);
                }
                
                canvasRecordFrameId = requestAnimationFrame(drawFrame);
            };
            
            // Start Recording
            isCanvasRecording = true;
            drawFrame(); // Kick off the render loop
            canvasMediaRecorder.start();
            showRecordingIndicator();
            
            targetVideo.addEventListener('pause', handleVideoPause);
            targetVideo.addEventListener('play', handleVideoResume);
            activeVideoForRecordListeners = targetVideo;
    }
    
    // --- Initialization & Event Listeners ---
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keyup', handleKeyUp, true);
    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('mouseup', handleMouseUp, true);
    
    // Intercept clicks to prevent pause after long-press fast forward
    document.addEventListener('click', (e) => {
        if (wasMouseSpeedUp) {
            e.preventDefault();
            e.stopImmediatePropagation();
        }
    }, true);
    
    // Comprehensive Blur Cleanup
    window.addEventListener('blur', () => {
        isEPressed = false;
        isMouseHeldDown = false;
        spacebarHeldDown = false;
        
        clearTimeout(mouseHoldTimer);
        clearTimeout(spacebarTimer);
        clearInterval(enforceSpeedInterval);
        
        if (video && (spacebarSpeedUp || wasMouseSpeedUp)) {
            video.playbackRate = originalPlaybackSpeed;
            spacebarSpeedUp = false;
            wasMouseSpeedUp = false;
        }
    });
    
    function handleKeyDown(e) {
        if (isInputFieldEvent(e)) return;
        
        if (e.ctrlKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
            return;
        }
        
        if (e.key.toLowerCase() === 'e') {
            isEPressed = true;
            eKeyUsedAsModifier = false;
        }
        
        // --- Censor Bleep (X Key) ---
        if (e.key.toLowerCase() === 'x' && !e.repeat) {
            e.preventDefault();
            initAudioGraph();
            if (audioContextData) {
                const now = audioContextData.context.currentTime;
                audioContextData.bleepGain.gain.cancelScheduledValues(now);
                audioContextData.videoGain.gain.cancelScheduledValues(now);
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
        
        if (isEPressed) {
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
            
            if (e.key === 'ArrowUp') { e.preventDefault(); adjustEQ('bass', config.eqStepDb); eKeyUsedAsModifier = true; return; }
            if (e.key === 'ArrowDown') { e.preventDefault(); adjustEQ('bass', -config.eqStepDb); eKeyUsedAsModifier = true; return; }
            if (e.key === 'ArrowRight') { e.preventDefault(); adjustEQ('vocal', config.eqStepDb); eKeyUsedAsModifier = true; return; }
            if (e.key === 'ArrowLeft') { e.preventDefault(); adjustEQ('vocal', -config.eqStepDb); eKeyUsedAsModifier = true; return; }
        }
        else if (e.ctrlKey || e.shiftKey) {
            
            if (e.shiftKey && e.key.toLowerCase() === 'r') {
                e.preventDefault();
                e.stopImmediatePropagation();
                if (e.ctrlKey) {
                    toggleCanvasRecording();
                } else {
                    toggleRecording();
                }
                return;
            }
            
            if (e.shiftKey && (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd')) {
                e.preventDefault(); e.stopImmediatePropagation(); adjustZoomKeyboard(1); return;
            }
            if (e.shiftKey && (e.key === '_' || e.key === '-' || e.code === 'NumpadSubtract')) {
                e.preventDefault(); e.stopImmediatePropagation(); adjustZoomKeyboard(-1); return;
            }
            
            const digitMatch = e.code && e.code.match(/^(?:Digit|Numpad)(\d)$/);
            if (digitMatch) {
                e.preventDefault(); e.stopImmediatePropagation();
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
        if (isInputFieldEvent(e)) return;
        
        if (e.key.toLowerCase() === 'e') {
            if (isEPressed && !eKeyUsedAsModifier) {
                resetEQ();
            }
            isEPressed = false;
        }
        
        // --- Release Censor Bleep ---
        if (e.key.toLowerCase() === 'x') {
            if (audioContextData) {
                const now = audioContextData.context.currentTime;
                audioContextData.bleepGain.gain.cancelScheduledValues(now);
                audioContextData.videoGain.gain.cancelScheduledValues(now);
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
        
        // --- ROBUST UI DETECTION ---
        const isPlayerControl = e.target.closest(
            '#volumeButton, ' +
            '[role="slider"], ' +
            '[role="button"], ' +
            '[role="menuitem"], ' +
            'button, ' +
            'input[type="range"]'
        );
        
        const hasAriaLabel = e.target.hasAttribute('aria-label') || e.target.parentElement?.hasAttribute('aria-label');
        const targetTag = e.target.tagName ? e.target.tagName.toLowerCase() : '';
        
        if (['input', 'textarea', 'button', 'a', 'select'].includes(targetTag) ||
            isPlayerControl ||
            hasAriaLabel ||
            isInputFieldEvent(e)) {
            return;
            }
            
            if (!video) loadVideo();
            
            if (video) {
                const rect = video.getBoundingClientRect();
                const isInsideVideo = (
                    e.clientX >= rect.left &&
                    e.clientX <= rect.right &&
                    e.clientY >= rect.top &&
                    e.clientY <= rect.bottom
                );
                
                if (!isInsideVideo) {
                    return;
                }
            }
            
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
                
                e.preventDefault();
                e.stopImmediatePropagation();
                
                wasMouseSpeedUp = true;
                setTimeout(() => { wasMouseSpeedUp = false; }, 50);
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
            // Clean up old audio context completely to prevent context/node leaks
            if (audioContextData) {
                try {
                    audioContextData.source.disconnect();
                    if (audioContextData.streamDestination) audioContextData.streamDestination.disconnect();
                    if (audioContextData.bleepOsc) {
                        audioContextData.bleepOsc.stop();
                        audioContextData.bleepOsc.disconnect();
                    }
                    audioContextData.context.close();
                } catch (e) {}
                audioContextData = null;
            }
            
            video = newVideo;
            videoScale = 1.0;
            fastSeek = typeof video.fastSeek === 'function';
            applyFilters();
            setupVisualizerCanvas();
            setupZoomListener();
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
            clearTimeout(spacebarTimer);
            clearInterval(enforceSpeedInterval);
            spacebarSpeedUp = false;
            spacebarHeldDown = false;
            isMouseHeldDown = false;
            
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
    
    // --- Dynamic Zoom Logic (Wheel and Keys) ---
    function setupZoomListener() {
        if (!video || video.dataset.zoomBound === "true") return;
        
        video.addEventListener('wheel', (e) => {
            if (!e.shiftKey) return;
            e.preventDefault();
            
            video.style.willChange = 'transform';
            
            const rect = video.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            
            video.style.transformOrigin = `${x}% ${y}%`;
            
            if (e.deltaY < 0) {
                videoScale = Math.min(videoScale + config.zoomStep, config.zoomMax);
            } else {
                videoScale = Math.max(videoScale - config.zoomStep, config.zoomMin);
            }
            
            if (videoScale <= 1.0) {
                videoScale = 1.0;
                video.style.transform = '';
                video.style.transformOrigin = '';
            } else {
                video.style.transform = `scale(${videoScale})`;
            }
        }, { passive: false });
        
        video.dataset.zoomBound = "true";
    }
    
    function adjustZoomKeyboard(direction) {
        if (!video) return;
        
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
    
    function adjustFilter(type, amount) {
        filters.profile = null;
        if (type === 'hue') filters.hue = (filters.hue + amount) % 360;
        else filters[type] = clamp(filters[type] + amount, 0, type === 'brightness' ? 3 : 2);
        applyFilters();
    }
    
    // --- CORS Audio Graph Safety ---
    function isVideoCorsSafe(vid) {
        if (!vid) return false;
        const src = vid.currentSrc || vid.src;
        if (!src) return true;
        
        try {
            const url = new URL(src, window.location.href);
            if (url.origin === window.location.origin || url.protocol === 'blob:' || url.protocol === 'data:') {
                return true;
            }
            if (vid.crossOrigin === 'anonymous' || vid.crossOrigin === 'use-credentials') {
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    }
    
    // --- Lazy Audio Graph & EQ Management ---
    function initAudioGraph() {
        if (!video) loadVideo();
        if (!video) return;
        
        if (audioContextData) {
            if (audioContextData.context.state === 'suspended') {
                audioContextData.context.resume().catch(() => {});
            }
            return;
        }
        
        if (!isVideoCorsSafe(video)) {
            console.warn("Stream Assistant: Audio capture skipped to prevent permanent cross-origin muting.");
            return;
        }
        
        const context = new (window.AudioContext || window.webkitAudioContext)();
        if (context.state === 'suspended') {
            context.resume().catch(() => {});
        }
        
        const source = context.createMediaElementSource(video);
        
        // --- Censor Block ---
        const videoGain = context.createGain(); videoGain.gain.value = 1;
        const bleepGain = context.createGain(); bleepGain.gain.value = 0;
        const bleepOsc = context.createOscillator();
        bleepOsc.type = 'sine'; bleepOsc.frequency.value = 1000;
        bleepOsc.connect(bleepGain);
        bleepGain.connect(context.destination);
        bleepOsc.start();
        
        // --- Active EQ Filters ---
        const bassFilter = context.createBiquadFilter();
        bassFilter.type = 'lowshelf'; bassFilter.frequency.value = 100; bassFilter.gain.value = 0;
        
        const vocalFilter = context.createBiquadFilter();
        vocalFilter.type = 'peaking'; vocalFilter.frequency.value = 1500; vocalFilter.Q.value = 1.0; vocalFilter.gain.value = 0;
        
        // --- Mono Mix Block ---
        const monoDryGain = context.createGain(); monoDryGain.gain.value = 1;
        const monoWetGain = context.createGain(); monoWetGain.gain.value = 0;
        const monoNode = context.createGain();
        monoNode.channelCount = 1; monoNode.channelCountMode = 'explicit'; monoNode.channelInterpretation = 'speakers';
        const monoMixer = context.createGain(); monoMixer.gain.value = 1;
        
        // --- Surround / Spatial Block ---
        const surroundDryGain = context.createGain(); surroundDryGain.gain.value = 1;
        const surroundWetGain = context.createGain(); surroundWetGain.gain.value = 0;
        const splitter = context.createChannelSplitter(2);
        const merger = context.createChannelMerger(2);
        const leftDelay = context.createDelay(); leftDelay.delayTime.value = 0;
        const rightDelay = context.createDelay(); rightDelay.delayTime.value = 0.01;
        splitter.connect(leftDelay, 0); splitter.connect(rightDelay, 1);
        leftDelay.connect(merger, 0, 0); rightDelay.connect(merger, 0, 1);
        const surroundMixer = context.createGain(); surroundMixer.gain.value = 1;
        
        // --- Compressor Block ---
        const compDryGain = context.createGain(); compDryGain.gain.value = 1;
        const compWetGain = context.createGain(); compWetGain.gain.value = 0;
        const compressor = context.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-24, context.currentTime);
        compressor.knee.setValueAtTime(30, context.currentTime);
        compressor.ratio.setValueAtTime(4, context.currentTime);
        compressor.attack.setValueAtTime(0.003, context.currentTime);
        compressor.release.setValueAtTime(0.25, context.currentTime);
        const compMixer = context.createGain(); compMixer.gain.value = 1;
        
        // --- Analyser ---
        const analyser = context.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.85;
        
        // --- STATIC ROUTING CHAIN ---
        source.connect(bassFilter);
        bassFilter.connect(vocalFilter);
        
        vocalFilter.connect(monoDryGain);
        vocalFilter.connect(monoWetGain);
        monoWetGain.connect(monoNode);
        monoDryGain.connect(monoMixer);
        monoNode.connect(monoMixer);
        
        monoMixer.connect(surroundDryGain);
        monoMixer.connect(surroundWetGain);
        surroundWetGain.connect(splitter);
        surroundDryGain.connect(surroundMixer);
        merger.connect(surroundMixer);
        
        surroundMixer.connect(compDryGain);
        surroundMixer.connect(compWetGain);
        compWetGain.connect(compressor);
        compDryGain.connect(compMixer);
        compressor.connect(compMixer);
        
        compMixer.connect(videoGain);
        videoGain.connect(analyser);
        analyser.connect(context.destination);
        
        // Output for Canvas Recording
        const streamDestination = context.createMediaStreamDestination();
        analyser.connect(streamDestination);
        
        audioContextData = {
            context, source, analyser, compressor,
 videoGain, bleepGain, bleepOsc, bassFilter, vocalFilter,
 monoDryGain, monoWetGain, surroundDryGain, surroundWetGain, compDryGain, compWetGain,
 eqActive: false, compActive: false, monoActive: false,
 streamDestination
        };
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
    
    function resetEQ() {
        if (!audioContextData) return;
        
        audioContextData.bassFilter.gain.value = 0;
        audioContextData.vocalFilter.gain.value = 0;
        
        if (audioContextData.monoActive) {
            toggleMono();
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
    
    // --- Filters ---
    function resetFilters() {
        filters.brightness = 1.0; filters.hue = 0; filters.saturation = 1.0; filters.contrast = 1.0; filters.special = 'none'; filters.profile = null; applyFilters();
    }
    
    function toggleEqualizer() {
        if (!video) return;
        initAudioGraph();
        if (!audioContextData) return;
        const { context, surroundDryGain, surroundWetGain } = audioContextData;
        audioContextData.eqActive = !audioContextData.eqActive;
        
        const now = context.currentTime;
        surroundDryGain.gain.cancelScheduledValues(now);
        surroundWetGain.gain.cancelScheduledValues(now);
        
        if (audioContextData.eqActive) {
            surroundWetGain.gain.setTargetAtTime(1, now, 0.015);
            surroundDryGain.gain.setTargetAtTime(0, now, 0.015);
        } else {
            surroundWetGain.gain.setTargetAtTime(0, now, 0.015);
            surroundDryGain.gain.setTargetAtTime(1, now, 0.015);
        }
    }
    
    function toggleCompressor() {
        if (!video) return;
        initAudioGraph();
        if (!audioContextData) return;
        const { context, compDryGain, compWetGain } = audioContextData;
        audioContextData.compActive = !audioContextData.compActive;
        
        const now = context.currentTime;
        compDryGain.gain.cancelScheduledValues(now);
        compWetGain.gain.cancelScheduledValues(now);
        
        if (audioContextData.compActive) {
            compWetGain.gain.setTargetAtTime(1, now, 0.015);
            compDryGain.gain.setTargetAtTime(0, now, 0.015);
        } else {
            compWetGain.gain.setTargetAtTime(0, now, 0.015);
            compDryGain.gain.setTargetAtTime(1, now, 0.015);
        }
    }
    
    function toggleMono() {
        if (!video) return;
        initAudioGraph();
        if (!audioContextData) return;
        const { context, monoDryGain, monoWetGain } = audioContextData;
        audioContextData.monoActive = !audioContextData.monoActive;
        
        const now = context.currentTime;
        monoDryGain.gain.cancelScheduledValues(now);
        monoWetGain.gain.cancelScheduledValues(now);
        
        if (audioContextData.monoActive) {
            monoWetGain.gain.setTargetAtTime(1, now, 0.015);
            monoDryGain.gain.setTargetAtTime(0, now, 0.015);
        } else {
            monoWetGain.gain.setTargetAtTime(0, now, 0.015);
            monoDryGain.gain.setTargetAtTime(1, now, 0.015);
        }
    }
    
    // --- Visualizer Setup & Render Loop ---
    function setupVisualizerCanvas() {
        if (!visCanvas) {
            visCanvas = document.createElement('canvas');
            visCtx = visCanvas.getContext('2d', { alpha: true });
            visCanvas.style.cssText = `
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none; z-index: 9999; display: block;
            `;
        }
        
        if (video && video.parentNode && visCanvas.parentNode !== video.parentNode) {
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
                    const MathGrad = visCtx.createRadialGradient(px, py, 0, px, py, rad);
                    MathGrad.addColorStop(0, `hsla(${i*120 + bassAvg}, 100%, 50%, 0.6)`);
                    MathGrad.addColorStop(1, 'transparent');
                    visCtx.fillStyle = MathGrad;
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
    
    // --- Front-load Audio API on Webpage/Video Load ---
    
    document.addEventListener('loadedmetadata', (e) => {
        if (e.target && e.target.tagName === 'VIDEO') {
            loadVideo();
            initAudioGraph();
        }
    }, true);
    
    document.addEventListener('play', (e) => {
        if (e.target && e.target.tagName === 'VIDEO') {
            if (!audioContextData) {
                loadVideo();
                initAudioGraph();
            }
        }
    }, true);
    
    const wakeUpAudio = () => {
        if (audioContextData && audioContextData.context.state === 'suspended') {
            audioContextData.context.resume().catch(() => {});
        }
    };
    
    document.addEventListener('click', wakeUpAudio, { capture: true });
    document.addEventListener('keydown', wakeUpAudio, { capture: true });
})();
