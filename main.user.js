// ==UserScript==
// @name         Stream Assistent − Keyboard Shortcuts, Features and Ad Blocking for Max, Discovery+, Paramount+, Hulu and more.
// @namespace    https://github.com/chj85/Stream-Assistent
// @version      1.8
// @description  Adds keyboard shortcuts and additional features to various streaming services.
// @author       CHJ85
// @match        *://*.max.com/*
// @match        https://play.hbomax.com/*
// @match        https://www.discoveryplus.com/*
// @match        https://watch.frndlytv.com/*
// @match        https://www.hulu.com/*
// @match        https://www.amazon.com*
// @match        https://app.pureflix.com/*
// @match        https://watch.hgtv.com/*
// @match        https://www.peacocktv.com/*
// @match        https://www.adultswim.com/*
// @match        https://www.magellantv.com/*
// @match        https://watch.spectrum.net/*
// @match        https://watch.sling.com/*
// @match        https://watch.boomerang.com/*
// @match        https://www.ovationtv.com/*
// @match        https://www.fox.com/*
// @match        https://www.hidive.com/*
// @match        https://www.retrocrush.tv/*
// @match        https://www.dovechannel.com/*
// @match        https://www.midnightpulp.com/*
// @match        https://www.contv.com/*
// @match        https://therokuchannel.roku.com/*
// @match        https://pluto.tv/*
// @match        https://distro.tv/*
// @match        https://www.paramountplus.com/*
// @match        https://www.investigationdiscovery.com/*
// @icon         https://i.imgur.com/pwiVt0N.png
// @license      MIT
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

  // register keyboard shortcuts
  document.addEventListener('keydown', handleKeyDown, false);

  function handleKeyDown(e) {
    const isInputField = ['input', 'textarea'].includes(e.target.tagName.toLowerCase());
    if (isInputField) {
      return; // Skip executing keyboard shortcuts if the target element is an input field
    }

    if (e.ctrlKey && e.key === 'ArrowUp') {
      e.preventDefault(); // Prevent default browser behavior (scrolling)
      increaseBrightness();
    } else if (e.ctrlKey && e.key === 'ArrowDown') {
      e.preventDefault(); // Prevent default browser behavior (scrolling)
      decreaseBrightness();
    } else if (e.ctrlKey && e.key === 'ArrowRight') {
      e.preventDefault(); // Prevent default browser behavior (scrolling)
      increaseHue();
    } else if (e.ctrlKey && e.key === 'ArrowLeft') {
      e.preventDefault(); // Prevent default browser behavior (scrolling)
      decreaseHue();
    } else if (e.shiftKey && e.key === 'ArrowUp') {
      e.preventDefault(); // Prevent default browser behavior (scrolling)
      increaseSaturation();
    } else if (e.shiftKey && e.key === 'ArrowDown') {
      e.preventDefault(); // Prevent default browser behavior (scrolling)
      decreaseSaturation();
    } else if (e.shiftKey && e.key === 'ArrowRight') {
      e.preventDefault(); // Prevent default browser behavior (scrolling)
      increaseContrast();
    } else if (e.shiftKey && e.key === 'ArrowLeft') {
      e.preventDefault(); // Prevent default browser behavior (scrolling)
      decreaseContrast();
    } else {
      loadVideo();

      switch (e.key) {
        // seek forward
        case 'l':
          seekVideo(seek);
          break;

        // seek backward
        case 'j':
          seekVideo(-seek);
          break;

        // volume up / down / mute
        case 'ArrowUp':
          adjustVolume(volume);
          break;

        case 'ArrowDown':
          adjustVolume(-volume);
          break;

        case 'm':
          toggleMute();
          break;

        // Play/Pause
        case 'k':
        case ' ':
          e.preventDefault(); // Prevents spacebar from scrolling the page
          togglePlayPause();
          break;

        // Fullscreen
        case 'f':
          if (document.baseURI.includes('play.hbomax.com')) {
            // skip for play.hbomax.com
            return;
          }
          toggleFullscreen();
          break;

        // Jump forward
        case 'ArrowRight':
          jumpForward();
          break;

        // Jump back
        case 'ArrowLeft':
          jumpBack();
          break;

        // Decrease / Increase playback speed
        case '<':
        case '-':
          adjustPlaybackSpeed(-1);
          break;

        case '>':
        case '+':
          adjustPlaybackSpeed(1);
          break;

        // Aspect ratio options
        case 'a':
          toggleAspectRatio();
          break;

        // Toggle surround sound effect
        case 'o':
          toggleEqualizer();
          break;

        // Toggle black and white effect
        case 'b':
          toggleBlackAndWhite();
          break;

        // Skip intro
        case 's':
          skipIntro();
          break;

        default:
          return;
      }

      e.stopImmediatePropagation();
    }
  }

  function loadVideo() {
    if (video == null || video == undefined) {
      video = document.querySelector('video');
      fastSeek = typeof video.fastSeek === 'function';
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
        video.requestFullscreen({ navigationUI: 'show' }).catch((err) => console.log(err));
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

  function skipIntro() {
    const skipButton = document.querySelector('button[aria-label="Skip intro"] span');
    if (skipButton && skipButton.textContent === 'Skip Intro') {
      const buttonParent = skipButton.closest('button[aria-label="Skip intro"]');
      buttonParent.click();
    } else {
      const skipButtonAlt = document.querySelector('button[role="Button"] span.skipStyle');
      if (skipButtonAlt && skipButtonAlt.textContent === 'Skip Intro') {
        const buttonParentAlt = skipButtonAlt.closest('button[role="Button"]');
        buttonParentAlt.click();
      }
    }
  }

  // Fetch and apply the hosts file from GitHub
  fetch('https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts')
    .then((response) => response.text())
    .then((hostsFileContent) => {
      const blockedHosts = hostsFileContent
        .split('\n')
        .filter((line) => line.startsWith('0.0.0.0'))
        .map((line) => line.split(' ')[1]);

      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            const videoElements = Array.from(mutation.addedNodes).filter((node) => node.tagName === 'VIDEO');
            videoElements.forEach((element) => {
              if (element.src && blockedHosts.some((host) => element.src.includes(host))) {
                element.pause();
                element.remove();
              }
            });
          }
        });
      });

      observer.observe(document.documentElement, { childList: true, subtree: true });
    })
    .catch((error) => {
      console.error('Failed to fetch the hosts file:', error);
    });

  // Watch for changes in the DOM to reattach event listeners and initialize variables for new videos
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        const videoAdded = Array.from(mutation.addedNodes).some((node) => node.tagName === 'VIDEO');
        if (videoAdded) {
          video = null;
        }
      }
    });
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener('DOMContentLoaded', () => {
    loadVideo();
  });

    // Remove ads
    setInterval(function() {
        $('[class^="AdsContainer-"]').removeClass();
    });
})();
