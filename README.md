# Mind Map Builder with Auto-Expanding Nodes

## Overview

Mind Map Builder is a web-based application that allows students and developers to create interactive mind maps. Users can generate mind maps either through AI-generated nodes or manual node creation, with a modern, gaming-inspired UI featuring vibrant pastel colors.

## Features

- **Two-way mind map creation**: Generate nodes via AI or create them manually
- **Interactive node manipulation**: Expand, collapse, delete, and drag nodes
- **Vibrant UI**: Pastel blues, greens, and purples with smooth animations
- **Export functionality**: Save your mind maps as PNG images

## Technologies Used

- **Frontend**: React with TypeScript (Vite setup)
- **Canvas**: Konva.js for mind map rendering
- **Styling**: Tailwind CSS for vibrant design
- **Animations**: Framer Motion for smooth transitions
- **AI Integration**: Hugging Face Inference API (GPT-2)
- **Export**: html2canvas for PNG export

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/mind-map-builder.git
   cd mind-map-builder
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Start the development server
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

## Usage

1. **Creating a Mind Map**:
   - Enter a topic in the input field (e.g., "Learn Python")
   - Click "Generate" to create a mind map with AI-generated nodes

2. **Interacting with Nodes**:
   - Right-click on a node to open the context menu
   - Choose "Expand" to add child nodes (AI-generated or manual)
   - Choose "Collapse" to hide child nodes
   - Choose "Delete" to remove a node and its children
   - Drag nodes to reposition them

3. **Exporting Your Mind Map**:
   - Click the "Export PNG" button in the top bar
   - The mind map will be downloaded as a PNG image

## Project Structure

- `src/components/`: React components for the application
  - `Canvas.tsx`: Main canvas component using Konva.js
  - `Node.tsx`: Node component for rendering mind map nodes
- `src/services/`: Services for external API integration
  - `aiService.ts`: Service for Hugging Face API integration
- `src/data/`: Mock data for fallback when API is unavailable

## Future Enhancements

- Mobile support
- Collaboration features
- More customization options for nodes and connections
- Advanced AI integration with more powerful models

## License

This project is licensed under the MIT License - see the LICENSE file for details.
