import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Group } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import Node from './Node';
import type { NodeShape, NodeColorScheme } from './Node';
import { motion, AnimatePresence } from 'framer-motion';
import { generateLearningPath } from '../services/aiService';
import type { LearningPathNode } from '../services/aiService';

// Theme type definition
export type ThemeMode = 'modern' | 'pastel' | 'dark' | 'vibrant';

// Define types for our mind map data
interface NodeData {
  id: string;
  text: string;
  children: NodeData[];
  x?: number;
  y?: number;
  isCollapsed?: boolean;
  shape?: NodeShape;
  colorScheme?: NodeColorScheme;
  description?: string;
  resources?: string[];
  timeEstimate?: string;
}

interface CanvasProps {
  mindMap: NodeData;
  setMindMap: React.Dispatch<React.SetStateAction<NodeData | null>>;
  theme?: ThemeMode;
  setTheme?: React.Dispatch<React.SetStateAction<ThemeMode>>;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  nodeId: string | null;
}

interface ModalState {
  visible: boolean;
  nodeId: string | null;
  x: number;
  y: number;
}

const Canvas: React.FC<CanvasProps> = ({ mindMap, setMindMap, theme = 'modern', setTheme }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    nodeId: null,
  });
  const [modal, setModal] = useState<ModalState>({
    visible: false,
    nodeId: null,
    x: 0,
    y: 0,
  });
  const [newNodeText, setNewNodeText] = useState('');
  const [selectedShape, setSelectedShape] = useState<NodeShape>('circle');
  const [selectedColorScheme] = useState<NodeColorScheme>('pastel');
  const [showSettings, setShowSettings] = useState(false);
  const [learningPath, setLearningPath] = useState<LearningPathNode[] | null>(null);
  const [showLearningPath, setShowLearningPath] = useState(false);
  const stageRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update stage dimensions on window resize
  useEffect(() => {
    const handleResize = () => {
      if (stageRef.current && containerRef.current) {
        stageRef.current.width(containerRef.current.offsetWidth);
        stageRef.current.height(containerRef.current.offsetHeight);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Handle wheel events for zooming
  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    
    const scaleBy = 1.1;
    const stage = stageRef.current;
    const oldScale = stage.scaleX();
    
    const pointerPosition = stage.getPointerPosition();
    const mousePointTo = {
      x: (pointerPosition.x - stage.x()) / oldScale,
      y: (pointerPosition.y - stage.y()) / oldScale,
    };
    
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    
    setScale(newScale);
    setPosition({
      x: pointerPosition.x - mousePointTo.x * newScale,
      y: pointerPosition.y - mousePointTo.y * newScale,
    });
  };

  // Find a node by ID in the mind map tree
  const findNodeById = (nodes: NodeData[], id: string): NodeData | null => {
    for (const node of nodes) {
      if (node.id === id) {
        return node;
      }
      if (node.children.length > 0) {
        const foundNode = findNodeById(node.children, id);
        if (foundNode) {
          return foundNode;
        }
      }
    }
    return null;
  };

  // Update a node's position in the mind map tree
  const updateNodePosition = (nodeId: string, x: number, y: number) => {
    setMindMap((prevMap) => {
      if (!prevMap) return prevMap;
      
      const updateNode = (node: NodeData): NodeData => {
        if (node.id === nodeId) {
          return { ...node, x, y };
        }
        
        if (node.children.length > 0) {
          return {
            ...node,
            children: node.children.map(updateNode),
          };
        }
        
        return node;
      };
      
      return updateNode(prevMap);
    });
  };

  // Handle context menu for a node
  const handleContextMenu = (e: KonvaEventObject<MouseEvent>, nodeId: string) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    const pointerPosition = stage.getPointerPosition();
    
    setContextMenu({
      visible: true,
      x: pointerPosition.x,
      y: pointerPosition.y,
      nodeId,
    });
  };

  // Close the context menu
  const closeContextMenu = () => {
    setContextMenu({
      visible: false,
      x: 0,
      y: 0,
      nodeId: null,
    });
  };

  // Handle expanding a node
  const handleExpand = () => {
    if (!contextMenu.nodeId) return;
    
    closeContextMenu();
    
    const stage = stageRef.current;
    const pointerPosition = stage.getPointerPosition();
    
    setModal({
      visible: true,
      nodeId: contextMenu.nodeId,
      x: pointerPosition.x,
      y: pointerPosition.y,
    });
  };

  // Handle collapsing a node
  const handleCollapse = () => {
    if (!contextMenu.nodeId) return;
    
    setMindMap((prevMap) => {
      if (!prevMap) return prevMap;
      
      const updateNode = (node: NodeData): NodeData => {
        if (node.id === contextMenu.nodeId) {
          return { ...node, isCollapsed: !node.isCollapsed };
        }
        
        if (node.children.length > 0) {
          return {
            ...node,
            children: node.children.map(updateNode),
          };
        }
        
        return node;
      };
      
      return updateNode(prevMap);
    });
    
    closeContextMenu();
  };

  // Handle deleting a node
  const handleDelete = () => {
    if (!contextMenu.nodeId || contextMenu.nodeId === 'root') return;
    
    setMindMap((prevMap) => {
      if (!prevMap) return prevMap;
      
      const deleteNode = (node: NodeData): NodeData => {
        return {
          ...node,
          children: node.children
            .filter((child) => child.id !== contextMenu.nodeId)
            .map(deleteNode),
        };
      };
      
      return deleteNode(prevMap);
    });
    
    closeContextMenu();
  };

  // Close the modal
  const closeModal = () => {
    setModal({
      visible: false,
      nodeId: null,
      x: 0,
      y: 0,
    });
    setNewNodeText('');
  };

  // Handle adding a manual node
  const handleAddManualNode = () => {
    if (!modal.nodeId || !newNodeText.trim()) return;
    
    const newNodeId = `node-${Date.now()}`;
    
    setMindMap((prevMap) => {
      if (!prevMap) return prevMap;
      
      const updateNode = (node: NodeData): NodeData => {
        if (node.id === modal.nodeId) {
          // Calculate position for the new node
          const parentNode = findNodeById([prevMap], modal.nodeId);
          const childCount = node.children.length;
          const angle = (Math.PI / 6) * childCount;
          const distance = 150;
          
          const newX = (parentNode?.x || 0) + Math.cos(angle) * distance;
          const newY = (parentNode?.y || 0) + Math.sin(angle) * distance;
          
          return {
            ...node,
            isCollapsed: false,
            children: [
              ...node.children,
              {
                id: newNodeId,
                text: newNodeText,
                children: [],
                x: newX,
                y: newY,
                shape: selectedShape,
                colorScheme: selectedColorScheme
              },
            ],
          };
        }
        
        if (node.children.length > 0) {
          return {
            ...node,
            children: node.children.map(updateNode),
          };
        }
        
        return node;
      };
      
      return updateNode(prevMap);
    });
    
    closeModal();
  };

  // Handle generating AI nodes using our AI service
  const handleGenerateAINodes = async () => {
    if (!modal.nodeId) return;
    
    // Find the node to generate subtopics for
    const parentNode = findNodeById([mindMap], modal.nodeId || '');
    if (!parentNode) return;
    
    try {
      // Import dynamically to avoid issues with SSR
      const { generateSubtopics } = await import('../services/aiService');
      const subtopics = await generateSubtopics(parentNode.text);
      
      // Also fetch a learning path if this is the root node
      if (parentNode.id === 'root' && !learningPath) {
        try {
          const path = await generateLearningPath(parentNode.text);
          setLearningPath(path);
        } catch (error) {
          console.error('Error generating learning path:', error);
        }
      }
      
      setMindMap((prevMap) => {
        if (!prevMap) return prevMap;
        
        const updateNode = (node: NodeData): NodeData => {
          if (node.id === modal.nodeId) {
            // Calculate positions for the new nodes
            const childCount = node.children.length;
            
            const newChildren = subtopics.map((topic, index) => {
              const angle = (Math.PI / 4) * (index + childCount);
              const distance = 150;
              
              const newX = (parentNode?.x || 0) + Math.cos(angle) * distance;
              const newY = (parentNode?.y || 0) + Math.sin(angle) * distance;
              
              return {
                id: `node-${Date.now()}-${index}`,
                text: topic,
                children: [],
                x: newX,
                y: newY,
                shape: selectedShape,
                colorScheme: selectedColorScheme
              };
            });
            
            return {
              ...node,
              isCollapsed: false,
              children: [...node.children, ...newChildren],
            };
          }
          
          if (node.children.length > 0) {
            return {
              ...node,
              children: node.children.map(updateNode),
            };
          }
          
          return node;
        };
        
        return updateNode(prevMap);
      });
    } catch (error) {
      console.error('Error generating AI nodes:', error);
      // Could add a toast notification here in a more complete implementation
    }
    
    closeModal();
  };

  // Render the mind map nodes recursively
  const renderNodes = (node: NodeData) => {
    if (!node) return null;
    
    return (
      <Group key={node.id}>
        <Node
          id={node.id}
          text={node.text}
          x={node.x || 0}
          y={node.y || 0}
          shape={node.shape || selectedShape}
          colorScheme={node.colorScheme || selectedColorScheme}
          onDragEnd={(x: number, y: number) => updateNodePosition(node.id, x, y)}
          onContextMenu={(e: KonvaEventObject<MouseEvent>) => handleContextMenu(e, node.id)}
        />
        
        {!node.isCollapsed && node.children.map((child) => (
          <React.Fragment key={child.id}>
            {renderNodes(child)}
          </React.Fragment>
        ))}
      </Group>
    );
  };

  // Toggle settings panel
  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };
  
  // Toggle learning path panel
  const toggleLearningPath = () => {
    setShowLearningPath(!showLearningPath);
    
    // If we're showing the learning path and don't have one yet, try to generate it
    if (!showLearningPath && !learningPath && mindMap) {
      generateLearningPath(mindMap.text)
        .then(path => setLearningPath(path))
        .catch(error => console.error('Error generating learning path:', error));
    }
  };
  
  // Apply theme to document
  useEffect(() => {
    // Update CSS variables based on theme
    if (theme === 'modern') {
      document.documentElement.style.setProperty('--background-color', 'var(--modern-background)');
      document.documentElement.style.setProperty('--text-color', 'var(--modern-text)');
      document.documentElement.style.setProperty('--topbar-background', 'var(--modern-topbar)');
      document.documentElement.style.setProperty('--node-color-1', 'var(--modern-node-1)');
      document.documentElement.style.setProperty('--node-color-2', 'var(--modern-node-2)');
      document.documentElement.style.setProperty('--node-color-3', 'var(--modern-node-3)');
      document.body.style.backgroundColor = 'var(--modern-background)';
      document.body.style.color = 'var(--modern-text)';
    } else if (theme === 'dark') {
      document.documentElement.style.setProperty('--background-color', 'var(--dark-background)');
      document.documentElement.style.setProperty('--text-color', 'var(--dark-text)');
      document.documentElement.style.setProperty('--topbar-background', 'var(--dark-topbar)');
      document.documentElement.style.setProperty('--node-color-1', 'var(--dark-node-1)');
      document.documentElement.style.setProperty('--node-color-2', 'var(--dark-node-2)');
      document.documentElement.style.setProperty('--node-color-3', 'var(--dark-node-3)');
      document.body.style.backgroundColor = 'var(--dark-background)';
      document.body.style.color = 'var(--dark-text)';
    } else if (theme === 'vibrant') {
      document.documentElement.style.setProperty('--background-color', 'var(--vibrant-background)');
      document.documentElement.style.setProperty('--text-color', 'var(--vibrant-text)');
      document.documentElement.style.setProperty('--topbar-background', 'var(--vibrant-topbar-gradient)');
      document.documentElement.style.setProperty('--node-color-1', 'var(--vibrant-node-1)');
      document.documentElement.style.setProperty('--node-color-2', 'var(--vibrant-node-2)');
      document.documentElement.style.setProperty('--node-color-3', 'var(--vibrant-node-3)');
      document.body.style.backgroundColor = 'var(--vibrant-background)';
      document.body.style.color = 'var(--vibrant-text)';
    } else if (theme === 'pastel') {
      document.documentElement.style.setProperty('--background-color', 'var(--pastel-background)');
      document.documentElement.style.setProperty('--text-color', 'var(--pastel-text)');
      document.documentElement.style.setProperty('--topbar-background', 'var(--pastel-topbar)');
      document.documentElement.style.setProperty('--node-color-1', 'var(--pastel-node-1)');
      document.documentElement.style.setProperty('--node-color-2', 'var(--pastel-node-2)');
      document.documentElement.style.setProperty('--node-color-3', 'var(--pastel-node-3)');
      document.body.style.backgroundColor = 'var(--pastel-background)';
      document.body.style.color = 'var(--pastel-text)';
    }
  }, [theme]);
  
  // Handle theme change
  const changeTheme = (newTheme: ThemeMode) => {
    if (setTheme) {
      setTheme(newTheme);
    }
  };

  return (
    <div 
      ref={containerRef} 
      className="canvas-container"
      style={{
        backgroundColor: 'var(--background-color)',
        color: 'var(--text-color)',
        height: '100%',
        width: '100%',
        position: 'relative'
      }}
    >
      {/* Settings Button */}
      <button 
        className="settings-button" 
        onClick={toggleSettings}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 100,
          background: theme === 'dark' ? 'var(--dark-node-2)' : 
                     theme === 'vibrant' ? 'var(--vibrant-node-3)' : 
                     'var(--pastel-node-1)',
          color: theme === 'dark' ? 'white' : '#333',
          border: 'none',
          borderRadius: '4px',
          padding: '8px 12px',
          cursor: 'pointer'
        }}
      >
        ⚙️ Settings
      </button>
      
      {/* Learning Path Button - only show if we have a mind map */}
      {mindMap && (
        <button 
          className="learning-path-button" 
          onClick={toggleLearningPath}
          style={{
            position: 'absolute',
            top: '10px',
            right: '120px',
            zIndex: 100,
            background: theme === 'dark' ? 'var(--dark-node-1)' : 
                      theme === 'vibrant' ? 'var(--vibrant-node-2)' : 
                      'var(--pastel-node-2)',
            color: theme === 'dark' ? 'white' : '#333',
            border: 'none',
            borderRadius: '4px',
            padding: '8px 12px',
            cursor: 'pointer'
          }}
        >
          📚 Learning Path
        </button>
      )}
      
      {/* Settings Panel */}
      {showSettings && (
        <div 
          className="settings-panel"
          style={{
            position: 'absolute',
            top: '50px',
            right: '10px',
            zIndex: 100,
            background: theme === 'dark' ? 'var(--dark-node-1)' : 'white',
            color: theme === 'dark' ? 'white' : 'inherit',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
            width: '250px'
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Customize Nodes</h3>
          
          {/* Shape Selection */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Shape:</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setSelectedShape('circle')}
                style={{
                  padding: '8px',
                  background: selectedShape === 'circle' ? 
                    (theme === 'dark' ? 'var(--dark-node-3)' : 
                     theme === 'vibrant' ? 'var(--vibrant-node-3)' : 
                     'var(--pastel-purple)') : 
                    'var(--gray-200)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  flex: 1,
                  color: selectedShape === 'circle' && theme === 'dark' ? 'white' : 'inherit'
                }}
              >
                Circle
              </button>
              <button 
                onClick={() => setSelectedShape('rectangle')}
                style={{
                  padding: '8px',
                  background: selectedShape === 'rectangle' ? 
                    (theme === 'dark' ? 'var(--dark-node-3)' : 
                     theme === 'vibrant' ? 'var(--vibrant-node-3)' : 
                     'var(--pastel-purple)') : 
                    'var(--gray-200)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  flex: 1,
                  color: selectedShape === 'rectangle' && theme === 'dark' ? 'white' : 'inherit'
                }}
              >
                Rectangle
              </button>
              <button 
                onClick={() => setSelectedShape('pill')}
                style={{
                  padding: '8px',
                  background: selectedShape === 'pill' ? 
                    (theme === 'dark' ? 'var(--dark-node-3)' : 
                     theme === 'vibrant' ? 'var(--vibrant-node-3)' : 
                     'var(--pastel-purple)') : 
                    'var(--gray-200)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  flex: 1,
                  color: selectedShape === 'pill' && theme === 'dark' ? 'white' : 'inherit'
                }}
              >
                Pill
              </button>
            </div>
          </div>
          

          
          {/* Theme Selection */}
          <div>
            <label style={{ display: 'block', marginBottom: '12px', fontWeight: 'bold' }}>App Theme:</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                onClick={() => changeTheme('modern')}
                style={{
                  padding: '10px',
                  background: theme === 'modern' ? 'var(--modern-gradient)' : 'var(--modern-card-bg)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: 'white',
                  fontWeight: theme === 'modern' ? 'bold' : 'normal',
                  boxShadow: theme === 'modern' ? '0 4px 12px rgba(74, 227, 181, 0.3)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <span>Modern Dark</span>
                {theme === 'modern' && <span style={{ fontSize: '18px' }}>✓</span>}
              </button>
              <button 
                onClick={() => changeTheme('dark')}
                style={{
                  padding: '10px',
                  background: theme === 'dark' ? 'var(--dark-node-3)' : 'var(--modern-card-bg)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: 'white',
                  fontWeight: theme === 'dark' ? 'bold' : 'normal',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <span>Dark Mode</span>
                {theme === 'dark' && <span style={{ fontSize: '18px' }}>✓</span>}
              </button>
              <button 
                onClick={() => changeTheme('vibrant')}
                style={{
                  padding: '10px',
                  background: theme === 'vibrant' ? 
                    'linear-gradient(to right, var(--vibrant-node-1), var(--vibrant-node-2))' : 
                    'var(--modern-card-bg)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: 'white',
                  fontWeight: theme === 'vibrant' ? 'bold' : 'normal',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <span>Vibrant Mode</span>
                {theme === 'vibrant' && <span style={{ fontSize: '18px' }}>✓</span>}
              </button>
              <button 
                onClick={() => changeTheme('pastel')}
                style={{
                  padding: '10px',
                  background: theme === 'pastel' ? 'var(--pastel-node-1)' : 'var(--modern-card-bg)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: theme === 'pastel' ? 'var(--pastel-text)' : 'white',
                  fontWeight: theme === 'pastel' ? 'bold' : 'normal',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <span>Pastel Mode</span>
                {theme === 'pastel' && <span style={{ fontSize: '18px' }}>✓</span>}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Learning Path Panel */}
      {showLearningPath && learningPath && (
        <div 
          className="learning-path-panel"
          style={{
            position: 'absolute',
            top: '50px',
            left: '10px',
            zIndex: 100,
            background: theme === 'dark' ? 'var(--dark-node-1)' : 'white',
            color: theme === 'dark' ? 'white' : 'inherit',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
            width: '350px',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Learning Path: {mindMap.text}</h3>
          
          <div>
            {learningPath.map((step, index) => (
              <div 
                key={index}
                style={{
                  marginBottom: '16px',
                  padding: '12px',
                  borderRadius: '8px',
                  background: theme === 'dark' ? 'var(--dark-node-2)' : 
                             theme === 'vibrant' ? 'var(--vibrant-background)' : 
                             'var(--gray-50)',
                  borderLeft: `4px solid ${theme === 'dark' ? 'var(--dark-node-3)' : 
                                         theme === 'vibrant' ? 'var(--vibrant-node-2)' : 
                                         'var(--pastel-blue)'}`
                }}
              >
                <h4 style={{ margin: '0 0 8px 0' }}>{index + 1}. {step.title}</h4>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>{step.description}</p>
                
                {step.timeEstimate && (
                  <div style={{ 
                    fontSize: '12px', 
                    color: theme === 'dark' ? 'var(--gray-300)' : 'var(--gray-600)', 
                    marginBottom: '8px' 
                  }}>
                    ⏱️ Estimated time: {step.timeEstimate}
                  </div>
                )}
                
                {step.resources && step.resources.length > 0 && (
                  <div>
                    <strong style={{ fontSize: '13px' }}>Recommended Resources:</strong>
                    <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px', fontSize: '13px' }}>
                      {step.resources.map((resource, i) => (
                        <li key={i}>{resource}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      <Stage
        ref={stageRef}
        width={window.innerWidth}
        height={window.innerHeight}
        onWheel={handleWheel}
        draggable
        x={position.x}
        y={position.y}
        scaleX={scale}
        scaleY={scale}
        onClick={closeContextMenu}
      >
        <Layer>
          {renderNodes(mindMap)}
        </Layer>
      </Stage>
      
      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          className="context-menu absolute z-10"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
          }}
        >
          <div className="context-menu-item" onClick={handleExpand}>
            Expand
          </div>
          <div className="context-menu-item" onClick={handleCollapse}>
            {findNodeById([mindMap], contextMenu.nodeId || '')?.isCollapsed ? 'Uncollapse' : 'Collapse'}
          </div>
          {contextMenu.nodeId !== 'root' && (
            <div className="context-menu-item" onClick={handleDelete}>
              Delete
            </div>
          )}
        </div>
      )}
      
      {/* Node Action Modal */}
      <AnimatePresence>
        {modal.visible && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute z-10 bg-white p-4 rounded-lg shadow-lg"
            style={{
              top: modal.y,
              left: modal.x,
            }}
          >
            <div className="mb-4">
              <button
                onClick={handleGenerateAINodes}
                className="w-full bg-pastel-purple text-white px-4 py-2 rounded-lg mb-2"
              >
                Generate AI Nodes
              </button>
              <div className="text-center text-gray-500 my-2">or</div>
              <div className="flex">
                <input
                  type="text"
                  value={newNodeText}
                  onChange={(e) => setNewNodeText(e.target.value)}
                  placeholder="Enter node text"
                  className="flex-1 p-2 border-0 rounded-l-lg outline-none"
                  style={{ border: '1px solid var(--gray-300)' }}
                />
                <button
                  onClick={handleAddManualNode}
                  className="bg-pastel-green text-white px-4 py-2 rounded-r-lg"
                  disabled={!newNodeText.trim()}
                >
                  Add
                </button>
              </div>
            </div>
            <button
              onClick={closeModal}
              className="w-full bg-gray-200 text-gray-700 px-4 py-1 rounded-lg"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Canvas;
