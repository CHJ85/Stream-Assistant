// ==UserScript==
// @name         Max, HBO Max and Discovery+ Keyboard Shortcuts
// @namespace    https://github.com/chj85/HBOMax-and-Discovery-Plus-Keyboard-Shortcuts-and-Features
// @version      0.23
// @description  Adds keyboard shortcuts to (HBO)Max and Discovery Plus' video player.
// @author       CHJ85
// @author       Rafalb8
// @match        *://*.max.com/*
// @match        https://play.hbomax.com/*
// @match        *://www.discoveryplus.com/video/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=hbomax.com
// @license      MIT
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // config
    const seek = 5;
    const volume = 0.1;
    const playbackSpeedStep = 0.25;

    // functions
    const clamp = (num, min, max) => Math.min(Math.max(num, min), max);
    let video = null;
    let fastSeek = false;
    let playbackSpeed = 1.0;
    let originalAspectRatio = null;
    let aspectRatioOption = 0;
    let isMuted = false;

    // register keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        loadVideo();

        switch (e.key) {
            // seek forward
            case "l":
                seekVideo(seek);
                break;

            // seek backward
            case "j":
                seekVideo(-seek);
                break;

            // volume up / down / mute
            case "ArrowUp":
                adjustVolume(volume);
                break;

            case "ArrowDown":
                adjustVolume(-volume);
                break;

            case "m":
                toggleMute();
                break;

            // Play/Pause
            case "k":
            case " ":
                e.preventDefault(); // Prevents spacebar from scrolling the page
                togglePlayPause();
                break;

            // Fullscreen
            case "f":
                if (document.baseURI.includes("play.hbomax.com")) {
                    // skip for play.hbomax.com
                    return;
                }
                toggleFullscreen();
                break;

            // Jump forward
            case "ArrowRight":
                jumpForward();
                break;

            // Jump back
            case "ArrowLeft":
                jumpBack();
                break;

            // Decrease / Increase playback speed
            case "<":
            case "-":
                adjustPlaybackSpeed(-1);
                break;

            case ">":
            case "+":
                adjustPlaybackSpeed(1);
                break;

            // Aspect ratio options
            case "a":
                toggleAspectRatio();
                break;

            default:
                return;
        }

        e.stopImmediatePropagation();
    }, false);

    document.addEventListener('click', () => {
        loadVideo();
    });

    function loadVideo() {
        if (video == null || video == undefined) {
            video = document.querySelector('video');
            fastSeek = typeof video.fastSeek === 'function';
            originalAspectRatio = video.style.objectFit;
        }
    }

    function seekVideo(value) {
        if (video) {
            const pos = video.currentTime + value;
            if (fastSeek) {
                video.fastSeek(pos);
            } else {
                video.currentTime = pos;
            }
        }
    }

    function adjustVolume(value) {
        if (video) {
            if (value === 0) {
                video.muted = !video.muted;
                isMuted = video.muted;
            } else {
                video.volume = clamp(video.volume + value, 0, 1);
                video.muted = false;
                isMuted = false;
            }
        }
    }

    function toggleMute() {
        if (video) {
            if (isMuted) {
                video.muted = false;
                isMuted = false;
            } else {
                video.muted = true;
                isMuted = true;
            }
        }
    }

    function togglePlayPause() {
        if (video) {
            if (video.paused) {
                video.play();
            } else {
                video.pause();
            }
        }
    }

    function toggleFullscreen() {
        if (video) {
            if (!document.fullscreenElement) {
                video.requestFullscreen({ navigationUI: 'show' }).catch(err => console.log(err));
            } else {
                document.exitFullscreen();
            }
        }
    }

    function jumpForward() {
        seekVideo(seek);
    }

    function jumpBack() {
        seekVideo(-seek);
    }

    function adjustPlaybackSpeed(direction) {
        if (video) {
            playbackSpeed = clamp(playbackSpeed + direction * playbackSpeedStep, 0.25, 4);
            video.playbackRate = playbackSpeed;
        }
    }

    function toggleAspectRatio() {
        if (video) {
            switch (aspectRatioOption) {
                case 0:
                    // Stretch 4:3 video to fit 16:9 screen
                    video.style.objectFit = 'fill';
                    aspectRatioOption = 1;
                    break;
                case 1:
                    // Zoom 16:9 video to fit 4:3 screen
                    video.style.objectFit = 'contain';
                    video.style.objectPosition = 'center';
                    aspectRatioOption = 2;
                    break;
                case 2:
                    // Zoom 4:3 video to fit 16:9 screen
                    video.style.objectFit = 'cover';
                    video.style.objectPosition = 'center';
                    aspectRatioOption = 0;
                    break;
                default:
                    break;
            }
        }
    }
})();
