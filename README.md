# Stream Assistant
A power-user userscript for streaming services. Adds custom keyboard shortcuts, visual filters, advanced audio controls, and ad-blocking capabilities to your browser.

# Why Stream Assistant?
Stream Assistant bridges the gap between basic video players and power-user needs. Whether you need precise volume normalization, advanced color grading to fix dull masters, or keyboard-driven navigation, this script brings desktop-level control to web-based video.

# Features
- Playback Control: Full hotkey support for seeking, speed, and navigation.
- Visual Enhancements: Aspect ratio control and custom color/brightness filters.
- Advanced Audio: EQ (Bass/Vocal), Mono/Stereo switching, and dynamic range compression.
- Recording: Raw video recording (browser-based, auto-pausing).
- Ad Blocking: Integrated host-based blocking for uninterrupted viewing.

# Keyboard shortcuts
 - J / L or Left / Right - seek 5s backward / forward
 - Up / Down - volume control
 - M - Mute / unmute
 - K / Space bar / Left mouse click - play / pause
 - Hold down space bar / Left mouse button - Play video at 2x speed
 - F - Fullscreen
 - S - Jump forward 30 seconds. Useful when "skip intro" is not available or if you just want to fast forward a bit.
 - I - Skip intro
 - N - Skip the end credit and jump straight to the next episode.
 - 0-9 - Jump to specific percentage. 0 = Beginning, 1 = 10% and so on.
 - Plus / Minus or > / < - Change playback speed faster / slower
 - A - Change aspect ratio (zoom / stretch / normal)
 - B - Cycle through video filters: black & white, sepia and invert colors
 - Ctrl+Up / Ctrl+Down - Change brightness
 - Hold down H - Hue color control (Cycle through the rainbow)
 - Shift+Up / Shift+Down - Change saturation
 - Shift+Left / Shift+Right - Change contrast
 - R - Revert filters (brightness, contrast, hue, and saturation) back to normal
 - O - Toggle surround sound on/off
 - Shift+R - Toggle video recorder on/off (Saves automatically, does not work on DRM protected content)
 - Hold down X - Censorship bleep
 - E+Up / E+Down - Bass control
 - E+Left / E+Right - Vocal control
 - E+M - Toggle mono on/off (useful if sound only comes out of one channel)
 - E (Single press) - Revert bass, vocal controls and mono/stereo switch
 - V - Volume normalizer (dynamic range compression)
 - Ctrl/Shift + 1-9 - Apply soft shaders (color grading and cosmetic texturing), Ctrl/Shift+0 to reset
 <details>
  <summary>&nbsp;&nbsp;Click to see the list of all available shader profiles</summary>
&nbsp;&nbsp;Ctrl+1: Retro CRT Soften (Softens harsh blocky pixels on low-bitrate streams)<br>
&nbsp;&nbsp;Ctrl+2: Vibrant Punch (Boosts dull, washed-out color grading)<br>
&nbsp;&nbsp;Ctrl+3: Midnight Dark Room (Tames blinding white backgrounds for late-night viewing)<br>
&nbsp;&nbsp;Ctrl+4: Warm Vintage Film (Gives digital transfers an aged, warm theatrical look)<br>
&nbsp;&nbsp;Ctrl+5: Monochrome Noir (A crisp, high-contrast black-and-white conversion)<br>
&nbsp;&nbsp;Ctrl+6: Cool Sci-Fi / Cyber (An inverted color scheme that acts as an emergency high-contrast dark mode)<br>
&nbsp;&nbsp;Ctrl+7: Faded Archive Correction (Neutralizes nasty green or magenta color casts in old video rips)<br>
&nbsp;&nbsp;Ctrl+8: Cinematic Crush (Deepens shadow details to hide background compression noise in dark scenes)<br>
&nbsp;&nbsp;Ctrl+9: Crisp High-Key (Brightens up dim, murky master recordings without completely blowing out highlights)<br>
&nbsp;&nbsp;Shift+1: Teal & Orange Blockbuster (Pushes a stylized modern Hollywood color grade)<br>
&nbsp;&nbsp;Shift+2: Deep Cyberpunk Neon (Enhances purples, blues, and electric tones)<br>
&nbsp;&nbsp;Shift+3: Aged 16mm Horror Grain/Warmth (Heavier vintage look than profile 4, great for gritty 70s/80s analog rips)<br>
&nbsp;&nbsp;Shift+4: High-Contrast Silhouette / Edge Out (Crushes midtones heavily to create high-drama shadow play)<br>
&nbsp;&nbsp;Shift+5: Muted Atmospheric Depths (A cold, desaturated blue tint suited for bleak winter or thriller scenes)<br>
&nbsp;&nbsp;Shift+6: Solarized Retro Psychedelia (A wild, experimental acid-trip look for music or surreal content)<br>
&nbsp;&nbsp;Shift+7: Sepia Antique Daguerreotype (Pushes an extreme historical photo/film aesthetic)<br>
&nbsp;&nbsp;Shift+8: Gothic Midnight Desat (A drained, moody look that strips the color down to a ghostly silver tint)<br>
&nbsp;&nbsp;Shift+9: Hyper-Luminous Pop (An aggressive pop-art style brightness and color lift for dim web video)</details>

# Supported streaming services
- Adult Swim
- Amazon Prime Video
- AMC+
- Apple TV+
- Clownfish TV
- Comedy Central
- Crunchyroll
- DailyMotion
- DAZN
- Discovery+
- Disney+
- Distro TV
- Dove Channel
- FAWESOME
- Fox
- FreeVee
- Frndly TV
- HGTV Go
- HBO Max
- HiDive
- Hulu
- Investigation Discovery
- Kick
- Klowd TV
- Magellan TV
- Midnight Pulp
- Ovation TV
- Paramount+
- Peacock TV
- Plex
- Pluto TV
- PureFlix
- Retro Crush
- Rumble
- Sling TV
- Spectrum
- The Roku Channel
- Tubi
- Twitch
- Vaughn Live
- Vimeo
- YouTube

# Installation
1. Install a userscript manager like [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/).<br>
2. Install the [script](https://github.com/chj85/Stream-Assistant/raw/main/main.user.js)

# Ad blocking
This script does not block in-house ads such as self-promotion.<br>
And note that if an ad is not blocked, this script gives you numerous ways to fast forward.

# Support
If you're having technical issues or feature requests, please open an Issue.
