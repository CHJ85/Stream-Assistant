// ==UserScript==
// @name         Max, HBO Max and Discovery+ Keyboard Shortcuts, Features and Ad Blocking
// @namespace    https://github.com/chj85/HBOMax-and-Discovery-Plus-Keyboard-Shortcuts-and-Features
// @version      1.0
// @description  Adds keyboard shortcuts to (HBO)Max and Discovery Plus' video player with ad blocking and auto-skip functionality.
// @author       CHJ85
// @match        *://*.max.com/*
// @match        https://play.hbomax.com/*
// @match        *://www.discoveryplus.com/video/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=hbomax.com
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // config
    const seek = 5;
    const volume = 0.1;
    const playbackSpeedStep = 0.25;
    const brightnessStep = 0.1; // Adjust the step as needed
    const hueStep = 10; // Adjust the step as needed
    const saturationStep = 0.1; // Adjust the step as needed
    const contrastStep = 0.1; // Adjust the step as needed

    // functions
    const clamp = (num, min, max) => Math.min(Math.max(num, min), max);
    let video = null;
    let fastSeek = false;
    let playbackSpeed = 1.0;
    let originalAspectRatio = null;
    let aspectRatioOption = 0;
    let isMuted = false;
    let brightness = 1.0;
    let equalizerEnabled = false;
    let equalizerPreset = null;
    let isBlackAndWhite = false;
    let hue = 0;
    let saturation = 1.0;
    let contrast = 1.0;
    let isAdBlocked = false;

    // register keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === "ArrowUp") {
            e.preventDefault(); // Prevent default browser behavior (scrolling)
            increaseBrightness();
        } else if (e.ctrlKey && e.key === "ArrowDown") {
            e.preventDefault(); // Prevent default browser behavior (scrolling)
            decreaseBrightness();
        } else if (e.ctrlKey && e.key === "ArrowRight") {
            e.preventDefault(); // Prevent default browser behavior (scrolling)
            increaseHue();
        } else if (e.ctrlKey && e.key === "ArrowLeft") {
            e.preventDefault(); // Prevent default browser behavior (scrolling)
            decreaseHue();
        } else if (e.shiftKey && e.key === "ArrowUp") {
            e.preventDefault(); // Prevent default browser behavior (scrolling)
            increaseSaturation();
        } else if (e.shiftKey && e.key === "ArrowDown") {
            e.preventDefault(); // Prevent default browser behavior (scrolling)
            decreaseSaturation();
        } else if (e.shiftKey && e.key === "ArrowRight") {
            e.preventDefault(); // Prevent default browser behavior (scrolling)
            increaseContrast();
        } else if (e.shiftKey && e.key === "ArrowLeft") {
            e.preventDefault(); // Prevent default browser behavior (scrolling)
            decreaseContrast();
        } else {
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

                // Toggle surround sound effect
                case "o":
                    toggleEqualizer();
                    break;

                // Toggle black and white effect
                case "b":
                    toggleBlackAndWhite();
                    break;

                default:
                    return;
            }

            e.stopImmediatePropagation();
        }
    }, false);

    document.addEventListener('click', () => {
        loadVideo();
    });

    function loadVideo() {
        if (video == null || video == undefined) {
            video = document.querySelector('video');
            fastSeek = typeof video.fastSeek === 'function';
            originalAspectRatio = video.style.objectFit;
            addAdBlockObserver();
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

    function increaseBrightness() {
        if (video) {
            brightness = clamp(brightness + brightnessStep, 0, 1);
            video.style.filter = `brightness(${brightness})`;
        }
    }

    function decreaseBrightness() {
        if (video) {
            brightness = clamp(brightness - brightnessStep, 0, 1);
            video.style.filter = `brightness(${brightness})`;
        }
    }

    function toggleEqualizer() {
        if (video) {
            if (equalizerEnabled) {
                // Reset the audio context to remove the surround sound effect
                resetAudioContext();
                equalizerEnabled = false;
            } else {
                // Apply the surround sound effect
                applySurroundSoundEffect();
                equalizerEnabled = true;
            }
        }
    }

    function applySurroundSoundEffect() {
        const context = new AudioContext();
        const source = context.createMediaElementSource(video);

        const splitter = context.createChannelSplitter(2);
        const merger = context.createChannelMerger(2);

        const leftDelay = context.createDelay();
        const rightDelay = context.createDelay();

        leftDelay.delayTime.value = 0;
        rightDelay.delayTime.value = 0.01;

        source.connect(splitter);

        splitter.connect(leftDelay, 0);
        splitter.connect(rightDelay, 1);

        leftDelay.connect(merger, 0, 0);
        rightDelay.connect(merger, 0, 1);

        merger.connect(context.destination);
    }

    function resetAudioContext() {
        if (video) {
            const audioContext = video.mozAudioContext || video.webkitAudioContext || new AudioContext();
            const source = audioContext.createMediaElementSource(video);

            source.disconnect();
        }
    }

    function toggleBlackAndWhite() {
        if (video) {
            if (!isBlackAndWhite) {
                video.style.filter = 'grayscale(100%)';
                isBlackAndWhite = true;
            } else if (video.style.filter === 'grayscale(100%)') {
                video.style.filter = 'sepia(100%)';
            } else if (video.style.filter === 'sepia(100%)') {
                video.style.filter = 'invert(100%)';
            } else {
                video.style.filter = 'none';
                isBlackAndWhite = false;
            }
        }
    }

    function increaseHue() {
        if (video) {
            hue = (hue + hueStep) % 360;
            video.style.filter = `hue-rotate(${hue}deg)`;
        }
    }

    function decreaseHue() {
        if (video) {
            hue = (hue - hueStep) % 360;
            video.style.filter = `hue-rotate(${hue}deg)`;
        }
    }

    function increaseSaturation() {
        if (video) {
            saturation = clamp(saturation + saturationStep, 0, 2);
            video.style.filter = `saturate(${saturation})`;
        }
    }

    function decreaseSaturation() {
        if (video) {
            saturation = clamp(saturation - saturationStep, 0, 2);
            video.style.filter = `saturate(${saturation})`;
        }
    }

    function increaseContrast() {
        if (video) {
            contrast = clamp(contrast + contrastStep, 0, 2);
            video.style.filter = `contrast(${contrast})`;
        }
    }

    function decreaseContrast() {
        if (video) {
            contrast = clamp(contrast - contrastStep, 0, 2);
            video.style.filter = `contrast(${contrast})`;
        }
    }

    function addAdBlockObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                    const adContainer = findAdContainer(mutation.addedNodes);
                    if (adContainer) {
                        blockAd(adContainer);
                    }
                }
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    function findAdContainer(nodes) {
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (node.classList && node.classList.contains("ad-container")) {
                return node;
            } else if (node.childNodes.length > 0) {
                const adContainer = findAdContainer(node.childNodes);
                if (adContainer) {
                    return adContainer;
                }
            }
        }
        return null;
    }

    function blockAd(adContainer) {
        adContainer.style.display = "none";
        if (video && !isAdBlocked) {
            video.play();
            isAdBlocked = true;
        }
    }
})();
