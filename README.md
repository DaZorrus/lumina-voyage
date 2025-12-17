# 🌟 Lumina Voyage

**An atmospheric 3D space exploration game built with Vanilla Three.js**

Experience a meditative journey through the cosmos as a luminous orb, collecting energy and uncovering the mysteries of The Void.

![Game Preview](https://img.shields.io/badge/Status-In%20Development-yellow)
![Three.js](https://img.shields.io/badge/Three.js-r170-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

### Core Gameplay
- **Echolocation Pulse Mechanic** - Press `F` to send out a pulse wave that reveals hidden energy orbs
- **Real-time Guide Beam** - Dynamic beam that tracks and points to the nearest uncollected orb
- **Magnetic Collection** - Orbs are drawn to you with beautiful comet trail effects
- **Progressive Difficulty** - Each orb collected increases your speed and unlocks new music layers

### Visual Effects
- **Low-poly Aesthetic** - Clean, geometric art style with flat shading
- **Comet Trail** - Beautiful particle system with orange-to-gold color gradients
- **Bloom Post-processing** - Ethereal glow effects using UnrealBloomPass
- **Dynamic Camera** - FOV shifts based on speed for enhanced sense of velocity
- **Screen Shake** - Satisfying feedback when reaching max speed
- **Portal VFX** - Massive glowing portal with spiral particles and white flash transition

### Audio Experience
- **Ambient Soundscape** - Deep ethereal pads create space atmosphere from game start
- **Procedural Music Layers** - Each orb unlocks a new music layer (bass, harmony, melody, rhythm)
- **Tone.js Integration** - Dynamic audio that responds to gameplay
- **Smooth Bass** - Warm, filtered low-end instead of harsh metallic sounds

## 🎮 Controls

| Key | Action |
|-----|--------|
| **W/A/S/D** | Move (forward/left/backward/right) |
| **E/Q** | Vertical movement (up/down) |
| **F** | Pulse (echolocation) |
| **Mouse** | Look around |
| **ESC** | Pause/Resume |

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/DaZorrus/lumina-voyage.git

# Navigate to project directory
cd lumina-voyage

# Install dependencies
npm install

# Start development server
npm run dev
```

The game will be available at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

Built files will be in the `dist/` directory.

## 🏗️ Architecture

### Project Structure
```
lumina-voyage/
├── src/
│   ├── core/           # Core engine systems
│   │   ├── Engine.js
│   │   └── InputManager.js
│   ├── systems/        # Game systems
│   │   ├── PhysicsSystem.js
│   │   ├── CameraSystem.js
│   │   ├── AudioSystem.js
│   │   └── ParticleSystem.js
│   ├── entities/       # Game entities
│   │   ├── Player.js
│   │   ├── EnergyOrb.js
│   │   ├── Portal.js
│   │   ├── PortalBeam.js
│   │   └── PulseWave.js
│   ├── levels/         # Level definitions
│   │   ├── BaseLevel.js
│   │   └── Level0_TheVoid.js
│   └── main.js         # Entry point
├── public/             # Static assets
├── index.html
└── package.json
```

### Tech Stack
- **Three.js** - 3D rendering engine
- **Cannon-es** - Physics simulation (zero-gravity mechanics)
- **Tone.js** - Web Audio API wrapper for procedural music
- **Vite** - Fast build tool and dev server

## 🎯 Level 0: The Void

The tutorial level where you learn the core mechanics:

1. **Spawn** as a dim light in darkness
2. **Press F** to pulse and reveal 5 hidden energy orbs
3. **Collect all orbs** - each one makes you faster and brighter
4. **Watch the portal spawn** - 5 light beams fly from you to create the gateway
5. **Enter the portal** - white flash transition to complete the level

### Design Philosophy
- **Wave-based Detection** - Pulse expands outward, revealing orbs when the wave reaches them
- **Multi-sensory Feedback** - Visual (brightness), Audio (music layers), Kinetic (speed increase)
- **Breadcrumb Trail** - Orbs guide you naturally through the space
- **No Fail State** - Chill, exploration-focused experience

## 🛠️ Development

### Key Systems

#### Physics System
- Uses Cannon-es for realistic zero-gravity movement
- High damping for arcade-style controls
- Trigger bodies for orb collection

#### Camera System
- Smooth follow with lerp
- Dynamic FOV based on collected orbs (50° → 75°)
- Subtle screen shake effects

#### Audio System
- 5 progressive music layers activated by orb collection
- Ambient pad starts immediately on game init
- Warm, filtered bass for pleasant low-end

#### Particle System
- 150 particles with varied lifetimes
- Color gradient from orange to white
- Smooth fade-out with size variation

## 🎨 Visual Style

- **Color Palette**: Deep blacks (#0a0e27), cyan highlights (#00D9FF), warm golds (#FFD700)
- **Geometry**: Low-poly meshes with flat shading
- **Lighting**: Point lights with bloom for ethereal glow
- **Post-processing**: Unreal Bloom Pass for soft luminosity

## 🔮 Upcoming Features

- Level 1: The Ascent (high-speed obstacle course)
- Level 2: Refraction Valley (light puzzle mechanics)
- Level 3: Symphony Orbit (rhythm-based gameplay)
- Save system for progress tracking
- Additional visual effects and polish

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Inspired by atmospheric games like Journey and GRIS
- Built with love using Vanilla Three.js (no frameworks!)
- Special thanks to the Three.js and Tone.js communities

---

**Made with ✨ by DaZorrus**

*Experience the void. Become the light.*
