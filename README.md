# 🌀 Holographic Fractal 3D Explorer

An interactive 3D fractal explorer built with **Three.js** and custom **GLSL** shaders, utilizing **Ray Marching** technology, head-position control (**Head Tracking**), and anaglyph stereoscopy. This project transforms your monitor into a "holographic window," where the 3D fractal models appear to project out from the screen surface.

## 🚀 Live Demo
Project hosted on Render: [See my work!](https://holographic-fractal-3d-explorer.onrender.com)  
*Note: Please allow camera access to experience the VisionAR head-tracking effect.*

## ✨ Key Features
* **Full Fractal Control:** Choose from multiple fractal types (e.g., Mandelbulb, Julia Sets). All mathematical parameters—such as Power, Iterations, and Smoothing—are fully adjustable in real-time.
* **Dual-Pass Post-Processing:** Advanced visual effects (Vignetting, Gamma Correction) are applied via a secondary shader pass for a cinematic look.
* **Johnny Lee Effect (Off-Axis Projection):** Dynamic perspective shifts based on the user's head position. The image reacts to your movements, creating the illusion of an object physically sitting in your room.
* **Holographic Pop-out:** Special anaglyph calibration utilizing negative parallax, making the fractal appear to levitate between you and the monitor.
* **Anaglyph Optimization (Grayscale Method):** Complete elimination of "retinal rivalry" through luminance conversion, ensuring maximum eye comfort for long sessions.
* **Anti-Ghosting System:** A custom shader algorithm that subtracts "color leakage" to ensure the red/cyan filters provide the cleanest possible 3D separation.

---

## 🛠️ Tech Stack
* **Vite** - Lightning-fast frontend build tool and development server.
* **Three.js** - Robust WebGL framework used for the rendering pipeline.
* **GLSL** - Low-level shader language used for the heavy lifting of Ray Marching calculations on the GPU.
* **MediaPipe Face Mesh** - High-performance ML solution for real-time head and face tracking via webcam.
* **Lil-GUI** - Clean interface for real-time parameter tweaking and fractal exploration.
* **Canvas API** - Used for capturing and processing the tracking data.

---

## ⚙️ How It Works
1. **Ray Marching Engine:** Unlike standard 3D models, these fractals are calculated pixel-by-pixel using Signed Distance Functions (SDFs).
2. **Head Tracking:** The app calculates your distance and angle relative to the screen. 
3. **Off-Axis Projection:** The projection matrix is skewed in real-time to match your physical perspective, breaking the "flatness" of the monitor.
4. **Stereo Rendering:** The shader renders two distinct views (Left/Right eye) simultaneously based on your Interpupillary Distance (IPD).

---

## 📦 Getting Started
1. Clone the repository:
   ```bash
   git clone https://github.com/for5en/holographic-fractal-3d-explorer.git
   ```
2. Install dependencies:
    ```bash
   npm install
   ```
3. Run the development server:
    ```bash
   npm run dev
   ```
4. Build for production:
    ```bash
   npm run build
   ```
