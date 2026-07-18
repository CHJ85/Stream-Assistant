# Stream Assistant
A power-user userscript for streaming services. Adds custom keyboard shortcuts, visual filters, advanced audio controls, and ad-blocking capabilities to your browser.

# Why Stream Assistant?
Stream Assistant bridges the gap between basic video players and power-user needs. Whether you need precise volume normalization, advanced color grading to fix dull masters, or keyboard-driven navigation, this script brings desktop-level control to web-based video.

# Features
- Playback Control: Full hotkey support for seeking, speed, and navigation.
- Visual Enhancements: Aspect ratio control, zoom control and custom color/brightness filters.
- Advanced Audio: EQ (Bass/Vocal), Mono/Stereo switching, and dynamic range compression.
- Recording: Raw video recording (browser-based, auto-pausing).
- Ad Blocking: Integrated host-based blocking for uninterrupted viewing.

# Keyboard shortcuts
**Playback & Navigation**
- **J / L** or **Left / Right** - Seek 5s backward / forward
- **S** - Jump forward 30 seconds (for when "skip intro" is unavailable)
- **K / Space / Click** - Play / pause
- **Hold down Space / Hold down right mouse click** - Play video at 2x speed
- **F** - Fullscreen
- **I** - Skip intro
- **N** - Skip end credits and jump to next episode
- **0-9** - Jump to specific percentage (0 = Beginning, 1 = 10%, etc.)

**Audio & Sound**
- **Up / Down** - Volume control
- **M** - Mute / unmute
- **V** - Toggle volume normalizer on/off (dynamic range compression)
- **O** - Toggle surround sound on/off
- **Hold down X** - Censorship bleep
- **E + Up / Down** - Bass control
- **E + Left / Right** - Vocal control
- **E + M** - Toggle mono on/off
- **E (Single press)** - Revert bass, vocal controls, and mono/stereo switch

**Visuals & Filters**
- **+ / -** or **> / <** - Change playback speed
- **A** - Change aspect ratio (zoom / stretch / normal)
- **Shift + Mousewheel** - Zoom in/out
- **B** - Cycle video filters (B&W, sepia, invert)
- **Ctrl + Up / Down** - Change brightness
- **Shift + Up / Down** - Change saturation
- **Shift + Left / Right** - Change contrast
- **Hold down H** - Hue color control (rainbow cycle)
- **R** - Revert all filters (hue, contrast, saturation, brightness) to normal
- **Shift + R** - Toggle video recorder (Does not work with DRM protected content)

**Visual Filter Presets** (Color grading profiles and display enhancement modes)
- **Ctrl + 1** - Retro CRT Soften (Softens harsh blocky pixels on low-bitrate streams)
- **Ctrl + 2** - Vibrant Punch (Boosts dull, washed-out color grading)
- **Ctrl + 3** - Midnight Dark Room (Tames blinding white backgrounds for late-night viewing)
- **Ctrl + 4** - Warm Vintage Film (Gives digital transfers an aged, warm theatrical look)
- **Ctrl + 5** - Monochrome Noir (A crisp, high-contrast black-and-white conversion)
- **Ctrl + 6** - Cool Sci-Fi / Cyber (An inverted color scheme that acts as an emergency high-contrast dark mode)
- **Ctrl + 7** - Faded Archive Correction (Neutralizes nasty green or magenta color casts in old video rips)
- **Ctrl + 8** - Cinematic Crush (Deepens shadow details to hide background compression noise in dark scenes)
- **Ctrl + 9** - Crisp High-Key (Brightens up dim, murky master recordings without completely blowing out highlights)
- **Shift + 1** - Teal & Orange Blockbuster (Pushes a stylized modern Hollywood color grade)
- **Shift + 2** - Deep Cyberpunk Neon (Enhances purples, blues, and electric tones)
- **Shift + 3** - Aged 16mm Horror Grain/Warmth (Heavier vintage look than profile 4, great for gritty 70s/80s analog rips)
- **Shift + 4** - High-Contrast Silhouette / Edge Out (Crushes midtones heavily to create high-drama shadow play)
- **Shift + 5** - Muted Atmospheric Depths (A cold, desaturated blue tint suited for bleak winter or thriller scenes)
- **Shift + 6** - Solarized Retro Psychedelia (A wild, experimental acid-trip look for music or surreal content)
- **Shift + 7** - Sepia Antique Daguerreotype (Pushes an extreme historical photo/film aesthetic)
- **Shift + 8** - Gothic Midnight Desat (A drained, moody look that strips the color down to a ghostly silver tint)
- **Shift + 9** - Hyper-Luminous Pop (An aggressive pop-art style brightness and color lift for dim web video)
- **Ctrl + 0** or **Shift + 0** - Revert back to normal

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
2. Install the [script](https://github.com/CHJ85/Stream-Assistant/raw/main/main.user.js)

# Ad blocking
This script does not block in-house ads such as self-promotion.<br>
And note that if an ad is not blocked, this script gives you numerous ways to fast forward.

# Support
If you're having technical issues or feature requests, please open an Issue.
