# Meshy 3D Studio

A beautiful and comprehensive web application for the Meshy API that allows you to create 3D models from text descriptions and images, with support for remeshing, rigging, and model management.

## Features

### 🎨 Text to 3D
- Generate 3D models from text descriptions
- Multiple art styles: Realistic, Cartoon, Low Poly, Sculpture, PBR
- Preview and refine modes
- Negative prompts support
- Automatic remeshing option

### 🖼️ Image to 3D
- Convert single images to 3D models
- File upload and URL support
- PBR material generation
- Texture application
- Multiple format exports

### 🖼️ Multi-Image to 3D
- Create detailed 3D models from multiple images
- Drag & drop interface
- URL and file upload support
- Enhanced accuracy with multiple viewpoints

### 🔧 Remesh
- Optimize existing 3D models
- Multiple output formats (GLB, FBX, OBJ, USD, PLY)
- Topology control (Quad/Triangle)
- Polycount optimization
- Model scaling and positioning

### 🤖 Rigging
- Add skeletal animation to 3D models
- Character height configuration
- Quick presets for different character types
- Animation-ready output

### 📊 Task Management
- Real-time progress tracking
- Task history and management
- Download management
- Error handling and retry

### 🌙 Dark/Light Mode
- Automatic theme detection
- Manual theme toggle
- Persistent theme preferences
- Beautiful UI in both modes

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   - The `.env` file is already set up with your API key
   - Your API key: `msy_lp9EWRp4THm4w3FTPp6dD8sccxmGWJMEqC4q`

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Build for Production**
   ```bash
   npm run build
   ```

## Usage Guide

### Getting Started
1. Launch the application
2. Use the sidebar navigation to select the desired feature
3. Follow the intuitive forms for each feature
4. Monitor progress in real-time
5. Download your generated 3D models

### Text to 3D
1. Navigate to "Text to 3D"
2. Enter a descriptive prompt (e.g., "a medieval castle")
3. Choose art style and mode
4. Optionally add negative prompts
5. Click "Generate 3D Model"
6. Wait for processing and download results

### Image to 3D
1. Navigate to "Image to 3D"
2. Upload an image or provide a URL
3. Configure PBR, texturing, and remeshing options
4. Start generation and monitor progress
5. Download the resulting 3D model

### Multi-Image to 3D
1. Navigate to "Multi-Image to 3D"
2. Upload multiple images (minimum 2)
3. Configure generation options
4. Start processing
5. Download high-quality 3D model

### Remesh
1. Navigate to "Remesh"
2. Enter the task ID of a previously generated model
3. Select output formats and quality settings
4. Configure topology and polycount
5. Start remeshing process

### Rigging
1. Navigate to "Rigging"
2. Upload a 3D model or provide URL
3. Set character height
4. Use quick presets or manual configuration
5. Generate rigged model for animation

## API Features Implemented

- ✅ Text to 3D (v2 API)
- ✅ Image to 3D (v1 API)
- ✅ Multi-Image to 3D (v1 API)
- ✅ Remesh (v1 API)
- ✅ Rigging (v1 API)
- ✅ Task Status Polling
- ✅ Task History
- ✅ File Upload & Base64 Support
- ✅ Multiple Format Downloads

## Technical Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS + Shadcn/ui
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Build Tool**: Vite
- **API**: Meshy AI v1/v2

---

**Enjoy creating amazing 3D models with Meshy 3D Studio!** 🎨✨
