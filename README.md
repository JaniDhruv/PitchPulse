# 🎯 PitchPulse

### Contactless Biometric Presentation & Mock Interview Coach

\*Powered by the **Presage SmartSpectra SDK\***

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Built for](https://img.shields.io/badge/DEV_Challenge-Presage_SmartSpectra_SDK-ff4f81.svg)](https://dev.to/challenges/presage-2026-11-04)
[![Platform: Electron 28+](https://img.shields.io/badge/Platform-Electron_28+_|_Node_22-47848F.svg)](https://www.electronjs.org/)

<p align="center">
  <img src="./docs/cover.png" alt="PitchPulse Banner" width="100%" />
</p>

---

## 💡 What is PitchPulse?

**PitchPulse** turns any standard laptop camera into a professional, real-time **biometric presentation and mock interview coach**.

Public speaking and high-stakes interviews are inherently physiological: when we get nervous, our heart rate spikes, breathing shallows or freezes, our gaze drops to glance at notes, and speech rushes without breathing pauses.

Until now, measuring these states required wearable chest straps or invasive finger sensors. With **Presage SmartSpectra**, PitchPulse extracts **6 continuous biometric & behavioral signals contactlessly from regular video frames** at 30–60 FPS:

1. **Pulse Plethysmography (PPG)**: Real-time heart rate (BPM) & arterial pressure trace
2. **Heart Rate Variability (HRV / RMSSD)**: Autonomic nervous system composure & coherence
3. **Respiratory Waveforms**: Upper chest & lower abdominal movement traces + breath-holding detection
4. **Gaze & Iris Landmark Vectors**: Eye contact percentage with the camera/audience
5. **Speech & Talking Activity**: Real-time talking detection, filler silence & pacing ratio
6. **Facial Expression Dynamics**: Tension vs. confidence emotion probability distribution

When your pitch concludes, PitchPulse generates a **Multi-Track Flight Recorder Replay** synchronizing all 6 streams with an interactive scrubber, a composite performance grade (0–100), and actionable tips.

---

## 🏗️ Architecture

PitchPulse uses a zero-copy MessagePort bridge between Electron's Main Process (native C++ FFI via `koffi`) and the React Renderer, rendering high-frequency physiological waveforms on pure HTML5 `<canvas>` elements at 60 FPS without React reconciliation stutter.

```mermaid
flowchart TD
    subgraph Camera["Hardware Input"]
        WEBCAM["Standard Webcam (720p @ 30fps)"]
    end

    subgraph Native["Electron Main Process"]
        KOFFI["Presage Native FFI (koffi)"]
        IPC_MAIN["bindSmartSpectraIpc Bridge"]
    end

    subgraph Preload["Preload Context"]
        BRIDGE["MessageChannel (Zero-Copy Port)"]
    end

    subgraph Renderer["React 19 + Canvas UI (60 FPS)"]
        VIDEO["CameraPreview (<video>)"]
        SDK_REN["@smartspectra/node-sdk/renderer"]
        DECODE["decodeMetrics (Protobuf)"]
        PULSE_CV["PulseCanvas (Oscilloscope)"]
        BREATH_CV["BreathingCanvas (Respiratory)"]
        COMP_GAUGE["ComposureGauge (Hybrid HRV)"]
        EYE_METER["EyeContactMeter (Reticle)"]
        TALK_BAR["SpeakingTimeline"]
        REPLAY["ReplayScreen (Multi-Track)"]
    end

    WEBCAM --> VIDEO
    VIDEO --> SDK_REN
    SDK_REN <--> BRIDGE <--> IPC_MAIN <--> KOFFI
    SDK_REN --> DECODE
    DECODE --> PULSE_CV
    DECODE --> BREATH_CV
    DECODE --> COMP_GAUGE
    DECODE --> EYE_METER
    DECODE --> TALK_BAR
    DECODE --> REPLAY
```

---

## 👻 Flagship Features

### 1. "Ghost Take" Comparative Biometrics

PitchPulse solves the single biggest problem with conventional speech coaching: **speakers cannot look at dials while speaking, and single-session numbers don't show real progress.**

1. **Take 1 (Baseline / Raw Run):** The speaker practices their raw pitch. PitchPulse records their full physiological flight log (heart rate spikes, gaze drops, breath-holds).
2. **Take 2 (Ghost Mode Re-pitch):** The speaker clicks **"Practice Again (Ghost Mode)"**. PitchPulse renders Take 1's pulse wave as a subtle, semi-transparent **violet dashed Ghost Curve** directly behind the live solid cyan waveform!
3. **Before & After Performance Delta Scorecard:** The Replay flight recorder generates a side-by-side comparative report:
   - **Heart Rate Delta:** (e.g. `92 BPM → 76 BPM`, **-16 BPM calmer**)
   - **Audience Eye Focus:** (e.g. `58% → 84%`, **+26% engagement**)
   - **Breathing Freezes:** (e.g. `3 episodes → 0 episodes`)
   - **Net Physiological Regulation Gain:** Quantifiable improvement score (e.g. **+28% regulation index**)

### 2. Live Contextual Coaching Overlays

Instead of a passive telemetry recorder, PitchPulse acts as an active, supportive stage presence coach. When biometric sensors detect elevated sympathetic arousal, real-time coaching nudges softly appear directly over the speaker's camera feed:

- `💨 Breathe deeply… inhale through your nose` (triggered during prolonged breath-holds)
- `👀 Look at the camera — connect with your audience` (triggered when gaze drifts from lens)
- `🫀 Elevated cadence — pause 1 second and ground your feet` (triggered upon sudden heart rate spikes)
- `😌 Soften your jaw and brow — let warm confidence show` (triggered upon facial tension markers)
- `✨ Terrific composure and gaze lock! Maintain this rhythm` (positive reinforcement toasts)

### 3. Pre-Pitch Zen Breathing Pacer & Calibration

Addresses the SmartSpectra 60-second HRV warm-up requirement elegantly: before launching into a pitch, an expanding/contracting box-breathing orb guides the user through two deep breath cycles. This grounds stage nervousness, displays real-time pulse settling, and establishes a clean resting baseline before recording begins.

### 4. Cinematic Score Reveal & Interactive Recharts Replay

Upon completing a pitch, speakers experience an electrifying cinematic score reveal with animated radial gauge fill, grade badge drop, and instant 3-pillar breakdown. The full replay screen features synchronized multi-channel Recharts waveforms (pulse, breathing, gaze), peak stress spike navigation, and 1-click JSON flight log telemetry exports.

---

## 🔬 Model-Card Compliance & Scientific Rigor

- **Talking-Gated Breathing:** Optical rPPG respiratory estimations are confounded by jaw and torso movements while speaking. PitchPulse strictly respects SmartSpectra's model card guidelines by automatically gating respiratory calculations when `isSpeaking === true`, displaying `[🎙️ Speech Gated]` and locking the baseline trace rather than plotting motion noise.
- **HRV Warm-up Fallback:** Autonomic RMSSD & SDNN require 60 seconds before statistical confidence is reached. PitchPulse implements a two-phase hybrid composure fallback:
  $$\text{Live Composure} = 0.40 \times \text{PulseStability} + 0.30 \times \text{BreathStability} + 0.30 \times \text{FacialCalm}$$
  Once $t \ge 60\text{s}$ and confidence is confirmed, RMSSD is smoothly integrated into the Composure score with a `✨ Deep HRV Lock Acquired` badge.

---

## 🛡️ Camera Consent & Data Handling

- **100% Local Frame Processing**: Video frames captured from `getUserMedia` are processed in memory by the local SmartSpectra native runtime. **No video frames or raw facial images are ever recorded to disk or transmitted across the internet.**
- **Zero-Egress SDK Telemetry Toggle**: PitchPulse includes an explicit in-app toggle in the Consent Screen for `enableTelemetry`. When disabled (default), the SDK runtime runs with `enableTelemetry: false`, ensuring zero diagnostics or telemetry ever leave your machine.
- **Local Telemetry Retention**: Only mathematical telemetry points (e.g., heart rate integers, timestamps) are stored locally in the application's local user data directory (`pitchpulse_sessions/`) for session review. Users can delete any session at any time with one click.
- **Zero External Cloud AI**: PitchPulse does not forward biometric telemetry to third-party LLMs or cloud endpoints.
- **Non-Medical Wellness Scope**: PitchPulse is an educational practice tool for presentation training. It does not provide medical diagnosis, treatment, or clinical monitoring.

---

## 🏆 DEV Challenge Prize Categories Entered

- **Best Thoughtful Real-World Use:** Presentation & interview anxiety affects over 75% of professionals and students. PitchPulse provides an on-device, private, contactless biometric biofeedback loop to build physiological composure and authentic stage presence.
- **Most Creative or Delightful Use:** The "Ghost Take" feature borrows the beloved racing ghost mechanic from games like Mario Kart and translates it into high-stakes presentation coaching, transforming abstract heart rate numbers into an intuitive visual challenge.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v20+ or v22+ LTS
- **npm**: v10+
- A front-facing webcam
- A **Presage SmartSpectra API Key** ([Register for free](https://physiology.presagetech.com/auth/register))

### Installation & Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/JaniDhruv/PitchPulse.git
   cd PitchPulse
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure your API Key:**
   Copy `.env.example` to `.env` and insert your SmartSpectra API key:

   ```bash
   cp .env.example .env
   ```

   _(Alternatively, you can paste your key directly into the in-app Consent & Settings screen upon launch)._

4. **Launch PitchPulse in Development Mode:**

   ```bash
   npm start
   ```

5. **Package for Distribution (Windows / Mac / Linux):**
   ```bash
   npm run make
   ```

---

## 📜 License

Distributed under the **Apache 2.0 License**. See [`LICENSE`](./LICENSE) for more information.
