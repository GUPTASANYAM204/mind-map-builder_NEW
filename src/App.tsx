/* Updated App.tsx */
import { useState, useEffect } from 'react';
import './App.css';
import './index.css';

import Canvas from './components/Canvas';
import type { NodeData, ThemeMode } from './types';
import { generateSubtopics, generateMindMapStructure } from './services/aiService';
import html2canvas from 'html2canvas';

function App() {
  const [topic, setTopic] = useState('');
  const [mindMap, setMindMap] = useState<NodeData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>('dark');

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.style.setProperty('--background-gradient', 'linear-gradient(135deg, #0A1128, #001F3F)');
      root.style.setProperty('--text-color', '#E0E0E0');
      root.style.setProperty('--topbar-background', 'rgba(10, 17, 40, 0.8)');
      root.style.setProperty('--topbar-text', '#FFFFFF');
      root.style.setProperty('--node-bg', '#1A2E47');
      root.style.setProperty('--node-text', '#FFFFFF');
      root.style.setProperty('--node-border', '#34568B');
      root.style.setProperty('--node-shadow', 'rgba(0, 0, 0, 0.4)');
      root.style.setProperty('--accent-color-1', '#007BFF');
      root.style.setProperty('--accent-color-2', '#4CAF50');
      root.style.setProperty('--accent-color-3', '#DC3545');
      root.style.setProperty('--gray-800', '#1F2937');
      root.style.setProperty('--gray-700', '#374151');
      root.style.setProperty('--gray-500', '#6B7280');
      root.style.setProperty('--gray-300', '#D1D5DB');
      root.style.setProperty('--gray-200', '#E5E7EB');
      root.style.setProperty('--gray-600', '#4B5563');
    } else {
      root.style.setProperty('--background-gradient', 'linear-gradient(135deg, #E0F7FA, #B2EBF2)');
      root.style.setProperty('--text-color', '#333333');
      root.style.setProperty('--topbar-background', 'rgba(178, 235, 242, 0.8)');
      root.style.setProperty('--topbar-text', '#333333');
      root.style.setProperty('--node-bg', '#80DEEA');
      root.style.setProperty('--node-text', '#333333');
      root.style.setProperty('--node-border', '#00BCD4');
      root.style.setProperty('--node-shadow', 'rgba(0, 0, 0, 0.2)');
      root.style.setProperty('--accent-color-1', '#FF5722');
      root.style.setProperty('--accent-color-2', '#8BC34A');
      root.style.setProperty('--accent-color-3', '#FF9800');
      root.style.setProperty('--gray-800', '#E0E0E0');
      root.style.setProperty('--gray-700', '#EEEEEE');
      root.style.setProperty('--gray-500', '#9E9E9E');
      root.style.setProperty('--gray-300', '#757575');
      root.style.setProperty('--gray-200', '#616161');
      root.style.setProperty('--gray-600', '#5A5A5A');
    }
    document.body.style.background = root.style.getPropertyValue('--background-gradient');
  }, [theme]);

  const handleGenerateMap = async () => {
    if (!topic.trim()) return;
    setIsLoading(true);

    try {
      const structuredMindMap = await generateMindMapStructure(topic);
      const rootNode: NodeData = {
        id: 'root',
        text: topic,
        children: [],
        x: window.innerWidth / 2,
        y: 100,
      };

      if (structuredMindMap && structuredMindMap.children) {
        const childNodes: NodeData[] = structuredMindMap.children.map((child, index) => {
          const nodeId = `node-${Date.now()}-${index}`;
          const childNode: NodeData = {
            id: nodeId,
            text: child.text,
            children: [],
            x: rootNode.x,
            y: rootNode.y !== undefined ? rootNode.y + 150 : 100 + 150,
          };

          if (child.children && child.children.length > 0) {
            childNode.children = child.children.map((subChild, subIndex) => {
              const subNodeId = `${nodeId}-sub-${subIndex}`;
              return {
                id: subNodeId,
                text: subChild.text,
                children: [],
                x: childNode.x,
                y: childNode.y !== undefined ? childNode.y + 150 : (rootNode.y !== undefined ? rootNode.y + 150 : 100 + 150) + 150,
              };
            });
          }

          return childNode;
        });

        rootNode.children = childNodes;
      } else {
        const subtopics = await generateSubtopics(topic);
        const childNodes: NodeData[] = subtopics.map((subtopic, index) => {
          const nodeId = `node-${Date.now()}-${index}`;
          return {
            id: nodeId,
            text: subtopic,
            children: [],
            x: rootNode.x,
            y: rootNode.y !== undefined ? rootNode.y + 150 : 100 + 150,
          };
        });

        rootNode.children = childNodes;
      }

      setMindMap(rootNode);
    } catch (error) {
      console.error('Error generating mind map:', error);
      const newMindMap: NodeData = {
        id: 'root',
        text: topic,
        children: [],
        x: window.innerWidth / 2,
        y: 100,
      };

      setMindMap(newMindMap);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    if (!mindMap) return;

    try {
      const canvasContainer = document.querySelector('.canvas-container') as HTMLElement | null;
      if (!canvasContainer) throw new Error('Canvas container element not found');

      const canvas = await html2canvas(canvasContainer, {
        backgroundColor: null,
        useCORS: true,
        allowTaint: true,
        scale: 2,
      });

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `mind-map-${mindMap.text.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error exporting mind map:', error);
      alert('Failed to export mind map. Please try again.');
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Mind Map Builder</h1>
        <div className="search-area">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="search-input"
            placeholder="Enter topic here..."
          />
          <button
            onClick={handleGenerateMap}
            className="generate-button"
            disabled={isLoading}
          >
            {isLoading ? <span className="animate-spin">⟳</span> : 'Generate'}
          </button>
        </div>
        <div className="action-buttons">
          <button
            onClick={handleExport}
            className="export-button"
            disabled={!mindMap}
          >
            <span>📥</span> Export PNG
          </button>
        </div>
      </header>
      <main className="canvas-area">
        {mindMap ? (
          <Canvas mindMap={mindMap} setMindMap={setMindMap} theme={theme} setTheme={setTheme} />
        ) : (
          <div className="welcome-message">
            <div className="welcome-card">
              <h2>Welcome to Mind Map Builder!</h2>
              <p>Enter a topic in the search box above and click "Generate" to create an interactive mind map.</p>
              <div className="pulsing-circle">
                <div></div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
