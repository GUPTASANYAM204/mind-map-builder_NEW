import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Group, Path } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import Node from './Node';
import type { NodeShape, NodeColorScheme } from './Node';
import { motion, AnimatePresence } from 'framer-motion';
import { generateLearningPath } from '../services/aiService';
import type { LearningPathNode } from '../services/aiService';

type ThemeMode = 'dark' | 'vibrant';

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

// Constants for layout
const NODE_SPACING = {
  HORIZONTAL: 450,
  VERTICAL: 500,
  NODE_WIDTH: 300,
  NODE_HEIGHT: 80
};

const Canvas: React.FC<CanvasProps> = ({ 
  mindMap, 
  setMindMap, 
  theme = 'dark', 
  setTheme 
}) => {
  // State management
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
  const [isLoadingLearningPath, setIsLoadingLearningPath] = useState(false);
  
  // Refs
  const stageRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Effect for window resize handling
  useEffect(() => {
    const handleResize = () => {
      if (stageRef.current && containerRef.current) {
        stageRef.current.width(containerRef.current.offsetWidth);
        stageRef.current.height(containerRef.current.offsetHeight);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Effect for initial mind map organization
  useEffect(() => {
    if (mindMap) {
      const timer = setTimeout(() => reorganizeMindMap(), 100);
      return () => clearTimeout(timer);
    }
  }, [mindMap?.id, mindMap?.text]);

  // Zoom handling
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

  // Node operations
  const findNodeById = (nodes: NodeData[], id: string): NodeData | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children.length > 0) {
        const foundNode = findNodeById(node.children, id);
        if (foundNode) return foundNode;
      }
    }
    return null;
  };

  const updateNodePosition = (nodeId: string, x: number, y: number) => {
    setMindMap(prevMap => {
      if (!prevMap) return prevMap;
      
      const updateNode = (node: NodeData): NodeData => {
        if (node.id === nodeId) return { ...node, x, y };
        if (node.children.length > 0) {
          return { ...node, children: node.children.map(updateNode) };
        }
        return node;
      };
      
      return updateNode(prevMap);
    });
  };

  // Context menu handlers
  const showContextMenu = (e: KonvaEventObject<MouseEvent>, nodeId: string) => {
    e.evt.preventDefault();
    const pointerPosition = stageRef.current.getPointerPosition();
    
    setContextMenu({
      visible: true,
      x: pointerPosition.x,
      y: pointerPosition.y,
      nodeId,
    });
  };

  const closeContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, nodeId: null });
  };

  const handleExpand = () => {
    if (!contextMenu.nodeId) return;
    
    closeContextMenu();
    const pointerPosition = stageRef.current.getPointerPosition();
    
    setModal({
      visible: true,
      nodeId: contextMenu.nodeId,
      x: pointerPosition.x,
      y: pointerPosition.y,
    });
  };

  const handleCollapse = () => {
    if (!contextMenu.nodeId) return;
    
    setMindMap(prevMap => {
      if (!prevMap) return prevMap;
      
      const updateNode = (node: NodeData): NodeData => {
        if (node.id === contextMenu.nodeId) {
          return { ...node, isCollapsed: !node.isCollapsed };
        }
        if (node.children.length > 0) {
          return { ...node, children: node.children.map(updateNode) };
        }
        return node;
      };
      
      return updateNode(prevMap);
    });
    
    closeContextMenu();
  };

  const handleDelete = () => {
    if (!contextMenu.nodeId || contextMenu.nodeId === 'root') return;
    
    setMindMap(prevMap => {
      if (!prevMap) return prevMap;
      
      const deleteNode = (node: NodeData): NodeData => ({
        ...node,
        children: node.children
          .filter(child => child.id !== contextMenu.nodeId)
          .map(deleteNode),
      });
      
      return deleteNode(prevMap);
    });
    
    closeContextMenu();
  };

  // Modal operations
  const closeModal = () => {
    setModal({ visible: false, nodeId: null, x: 0, y: 0 });
    setNewNodeText('');
  };

  const calculateNewNodePosition = (parentNode: NodeData | null) => {
    if (!parentNode) return { x: 0, y: 0 };
    
    // For new nodes, we'll place them temporarily to the right of the parent
    // The reorganizeMindMap function will properly position them later
    return {
      x: (parentNode.x || 0) + NODE_SPACING.HORIZONTAL,
      y: (parentNode.y || 0) + NODE_SPACING.VERTICAL
    };
  };

  const handleAddManualNode = () => {
    if (!modal.nodeId || !newNodeText.trim()) return;
    
    const newNodeId = `node-${Date.now()}`;
    const parentNode = findNodeById([mindMap], modal.nodeId);
    const nodeIndex = parentNode?.children.length || 0;
    const { x, y } = calculateNewNodePosition(parentNode);
    
    setMindMap(prevMap => {
      if (!prevMap) return prevMap;
      
      const updateNode = (node: NodeData): NodeData => {
        if (node.id === modal.nodeId) {
          return {
            ...node,
            isCollapsed: false,
            children: [
              ...node.children,
              {
                id: newNodeId,
                text: `${nodeIndex + 1}. ${newNodeText}`,
                children: [],
                x,
                y,
                shape: selectedShape,
                colorScheme: selectedColorScheme
              },
            ],
          };
        }
        
        if (node.children.length > 0) {
          return { ...node, children: node.children.map(updateNode) };
        }
        
        return node;
      };
      
      const result = updateNode(prevMap);
      setTimeout(() => reorganizeMindMap(), 10);
      return result;
    });
    
    closeModal();
  };

  const handleGenerateAINodes = async () => {
    if (!modal.nodeId) return;
    
    const parentNode = findNodeById([mindMap], modal.nodeId || '');
    if (!parentNode) return;
    
    try {
      const { generateSubtopics } = await import('../services/aiService');
      const subtopics = await generateSubtopics(parentNode.text);
      
      if (parentNode.id === 'root' && !learningPath) {
        try {
          setIsLoadingLearningPath(true);
          const path = await generateLearningPath(parentNode.text);
          setLearningPath(path);
        } catch (error) {
          console.error('Error generating learning path:', error);
        } finally {
          setIsLoadingLearningPath(false);
        }
      }
      
      setMindMap(prevMap => {
        if (!prevMap) return prevMap;
        
        const updateNode = (node: NodeData): NodeData => {
          if (node.id === modal.nodeId) {
            const childCount = node.children.length;
            
            const newChildren = subtopics.map((topic, index) => {
              const sequenceNumber = childCount + index + 1;
              const { x, y } = calculateNewNodePosition(parentNode);
              
              return {
                id: `node-${Date.now()}-${index}`,
                text: `${sequenceNumber}. ${topic}`,
                children: [],
                x,
                y,
                shape: selectedShape,
                colorScheme: selectedColorScheme,
                description: `Step ${childCount + index + 1} in the process`
              };
            });
            
            return {
              ...node,
              isCollapsed: false,
              children: [...node.children, ...newChildren],
            };
          }
          
          if (node.children.length > 0) {
            return { ...node, children: node.children.map(updateNode) };
          }
          
          return node;
        };
        
        const updatedMap = updateNode(prevMap);
        setTimeout(() => reorganizeMindMap(), 10);
        return updatedMap;
      });
    } catch (error) {
      console.error('Error generating AI nodes:', error);
    }
    
    closeModal();
  };

  // Mind map organization with improved tree layout
  const reorganizeMindMap = () => {
    const nodePositions = new Map<string, {x: number, y: number}>();
    
    setMindMap(prevMap => {
      if (!prevMap) return prevMap;
      
      // First pass: collect information about the tree structure
      interface NodeInfo {
        width: number;
        height: number;
        subtreeWidth: number;
        children: NodeInfo[];
        node: NodeData;
      }
      
      // Calculate the width needed for each subtree
      const calculateNodeInfo = (node: NodeData): NodeInfo => {
        const nodeWidth = node.shape === 'square' ? 120 : 180;
        const nodeHeight = NODE_SPACING.NODE_HEIGHT;
        
        if (node.isCollapsed || node.children.length === 0) {
          return {
            width: nodeWidth,
            height: nodeHeight,
            subtreeWidth: nodeWidth,
            children: [],
            node
          };
        }
        
        // Sort children for consistent layout
        const sortedChildren = [...node.children].sort((a, b) => 
          a.text.localeCompare(b.text)
        );
        
        // Calculate info for all children
        const childrenInfo = sortedChildren.map(calculateNodeInfo);
        
        // Calculate total width needed for children
        // We add spacing between each child
        let totalChildrenWidth = 0;
        childrenInfo.forEach(childInfo => {
          totalChildrenWidth += childInfo.subtreeWidth;
        });
        
        // Add spacing between children
        if (childrenInfo.length > 1) {
          totalChildrenWidth += (childrenInfo.length - 1) * (NODE_SPACING.HORIZONTAL / 2);
        }
        
        // The subtree width is the max of the node width and total children width
        const subtreeWidth = Math.max(nodeWidth, totalChildrenWidth);
        
        return {
          width: nodeWidth,
          height: nodeHeight,
          subtreeWidth,
          children: childrenInfo,
          node
        };
      };
      
      // Second pass: position nodes based on calculated widths
      const positionNodes = (
        nodeInfo: NodeInfo, 
        x: number,
        y: number,
        level: number
      ): NodeData => {
        const node = nodeInfo.node;
        
        // Position this node
        node.x = x;
        node.y = y;
        
        // Cache position
        nodePositions.set(node.id, {x, y});
        
        // If collapsed or no children, we're done
        if (node.isCollapsed || nodeInfo.children.length === 0) {
          return node;
        }
        
        // Calculate starting x position for children
        // Center the children under the parent
        let childX = x - (nodeInfo.subtreeWidth / 2) + (nodeInfo.children[0].subtreeWidth / 2);
        const childY = y + NODE_SPACING.VERTICAL;
        
        // Position each child
        const updatedChildren = nodeInfo.children.map(childInfo => {
          const childNode = positionNodes(childInfo, childX, childY, level + 1);
          
          // Move to next position
          childX += childInfo.subtreeWidth + (NODE_SPACING.HORIZONTAL / 2);
          
          return childNode;
        });
        
        return {
          ...node,
          children: updatedChildren
        };
      };
      
      // Start the layout process
      const rootInfo = calculateNodeInfo(prevMap);
      return positionNodes(rootInfo, window.innerWidth / 2, 150, 0);
    });
  };

  // Node rendering
  const renderNodes = (node: NodeData) => {
    if (!node) return null;
    
    const parentX = node.x || 0;
    const parentY = node.y || 0;
    const parentWidth = node.shape === 'square' ? 120 : 180;
    const parentHeight = NODE_SPACING.NODE_HEIGHT;
    
    return (
      <Group key={node.id}>
        <Node
          id={node.id}
          text={node.text}
          x={parentX}
          y={parentY}
          shape={node.shape || selectedShape}
          colorScheme={node.colorScheme || selectedColorScheme}
          onDragEnd={(x, y) => updateNodePosition(node.id, x, y)}
          onContextMenu={(e) => showContextMenu(e, node.id)}
        />
        
        {!node.isCollapsed && node.children.map((child) => {
          const childX = child.x || 0;
          const childY = child.y || 0;
          const childWidth = child.shape === 'square' ? 120 : 180;
          
          const startX = parentX + parentWidth / 2;
          const startY = parentY + parentHeight;
          const endX = childX + childWidth / 2;
          const endY = childY;
          
          const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
          const curveHeight = distance * 0.3;
          
          const controlX1 = startX;
          const controlY1 = startY + curveHeight;
          const controlX2 = endX;
          const controlY2 = endY - curveHeight;
          
          const pathData = `M${startX},${startY} C${controlX1},${controlY1} ${controlX2},${controlY2} ${endX},${endY}`;
          
          return (
            <React.Fragment key={child.id}>
              <Group>
                <Path
                  data={pathData}
                  stroke={theme === 'dark' ? 'var(--dark-node-3)' : 'var(--vibrant-node-3)'}
                  strokeWidth={2}
                  dash={[5, 2]}
                />
              </Group>
              {renderNodes(child)}
            </React.Fragment>
          );
        })}
      </Group>
    );
  };

  // Panel toggles
  const toggleSettings = () => setShowSettings(!showSettings);
  
  const toggleLearningPath = () => {
    setShowLearningPath(!showLearningPath);
    
    if (!showLearningPath && !learningPath && mindMap) {
      setIsLoadingLearningPath(true);
      generateLearningPath(mindMap.text)
        .then(path => {
          setLearningPath(path);
          setIsLoadingLearningPath(false);
        })
        .catch(error => {
          console.error('Error generating learning path:', error);
          setIsLoadingLearningPath(false);
        });
    }
  };
  
  const handleGenerateLearningPath = async () => {
    if (!learningPath && mindMap) {
      try {
        setIsLoadingLearningPath(true);
        const path = await generateLearningPath(mindMap.text);
        setLearningPath(path);
      } catch (error) {
        console.error('Error generating learning path:', error);
      } finally {
        setIsLoadingLearningPath(false);
      }
    }
  };

  // Helper components
  const ControlButton = ({ children, onClick, rotate = 0 }: {
    children: React.ReactNode;
    onClick: () => void;
    rotate?: number;
  }) => (
    <motion.button
      whileHover={{ scale: 1.1, rotate }}
      whileTap={{ scale: 0.9 }}
      className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-white shadow-lg"
      onClick={onClick}
    >
      {children}
    </motion.button>
  );

  const ThemeButton = ({ mode, currentTheme }: {
    mode: ThemeMode;
    currentTheme: ThemeMode;
  }) => (
    <button 
      onClick={() => setTheme && setTheme(mode)}
      className={`px-4 py-2 rounded-lg flex items-center justify-between ${
        currentTheme === mode 
          ? 'bg-blue-500 text-white font-bold' 
          : 'bg-gray-200 text-gray-800'
      }`}
    >
      <span>{mode === 'dark' ? 'Dark Mode' : 'Vibrant'}</span>
      {currentTheme === mode && <span className="ml-2">✓</span>}
    </button>
  );

  return (
    <div className="canvas-container relative" ref={containerRef}>
      {/* Control buttons */}
      <div className="absolute top-4 right-4 flex space-x-3 z-30">
        <ControlButton onClick={toggleSettings} rotate={15}>⚙️</ControlButton>
        <ControlButton onClick={toggleLearningPath} rotate={-15}>📚</ControlButton>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
        <motion.div 
            initial={{ opacity: 0, scale: 0.9, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: 20 }}
            className="settings-panel"
            style={{ backgroundColor: theme === 'dark' ? 'var(--dark-node-1)' : 'white', color: theme === 'dark' ? 'white' : 'inherit' }}
          >
            <h3>Customize Nodes</h3>
            
            <div className="mb-4">
              <label>Shape:</label>
              <div className="flex gap-2">
                <button 
                  onClick={() => setSelectedShape('circle')}
                  className={`px-4 py-2 rounded-lg ${
                    selectedShape === 'circle' 
                      ? 'bg-blue-500 text-white font-bold' 
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  Circle {selectedShape === 'circle' && '✓'}
                </button>
                <button 
                  onClick={() => setSelectedShape('rectangle')}
                  className={`px-4 py-2 rounded-lg ${
                    selectedShape === 'rectangle' 
                      ? 'bg-blue-500 text-white font-bold' 
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  Rectangle {selectedShape === 'rectangle' && '✓'}
                </button>
              </div>
            </div>
            
            <div className="mb-4">
              <label>Theme:</label>
              <div className="flex gap-2">
                <ThemeButton mode="dark" currentTheme={theme} />
                <ThemeButton mode="vibrant" currentTheme={theme} />
              </div>
            </div>
            
            <button 
              onClick={toggleSettings}
              className="close-button"
            >
              Close
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Learning Path Panel */}
      <AnimatePresence>
        {showLearningPath && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: -20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: -20 }}
            className="learning-path-panel"
            style={{ backgroundColor: theme === 'dark' ? 'var(--dark-node-1)' : 'white', color: theme === 'dark' ? 'white' : 'inherit' }}
          >
            <h3>Learning Path: {mindMap.text}</h3>
            
            {isLoadingLearningPath ? (
              <div className="loading-indicator">
                <div className="animate-spin">⟳</div>
                <p>Generating learning path...</p>
              </div>
            ) : learningPath ? (
              <div>
                {learningPath.map((step, index) => (
                  <div 
                    key={index}
                    className="path-step"
                    style={{
                      backgroundColor: theme === 'dark' ? 'var(--dark-node-2)' : 'var(--gray-50)',
                      borderLeftColor: theme === 'dark' ? 'var(--dark-node-3)' : 'var(--vibrant-node-2)'
                    }}
                  >
                    <h4>{index + 1}. {step.title}</h4>
                    <p>{step.description}</p>
                    
                    {step.timeEstimate && (
                      <div className="time-estimate"
                        style={{ backgroundColor: theme === 'dark' ? 'var(--dark-node-3)' : 'var(--gray-200)' }}
                      >
                        ⏱️ Estimated time: {step.timeEstimate}
                      </div>
                    )}
                    
                    {step.resources?.length > 0 && (
                      <div>
                        <strong>Recommended Resources:</strong>
                        <ul>
                          {step.resources.map((resource, i) => (
                            <li key={i}>{resource}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {step.prerequisites?.length > 0 && (
                      <div>
                        <strong>Prerequisites:</strong>
                        <ul>
                          {step.prerequisites.map((prerequisite, i) => (
                            <li key={i}>{prerequisite}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-path">
                <p>No learning path available.</p>
                <button 
                  onClick={handleGenerateLearningPath}
                  className="generate-path-button"
                >
                  Generate Learning Path
                </button>
              </div>
            )}
            
            <button
              onClick={toggleLearningPath}
              className="close-button"
            >
              Close
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Konva Stage */}
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
        fill={theme === 'dark' ? '#222222' : '#ffffff'}
      >
        <Layer>
          {renderNodes(mindMap)}
        </Layer>
      </Stage>
      
      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
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
            className="node-modal"
            style={{ 
              backgroundColor: theme === 'dark' ? 'var(--dark-node-1)' : 'white', 
              color: theme === 'dark' ? 'white' : 'inherit',
              top: modal.y,
              left: modal.x
            }}
          >
            <div className="modal-content">
              <button
                onClick={handleGenerateAINodes}
                className="ai-generate-button"
              >
                Generate AI Nodes
              </button>
              <div className="divider">or</div>
              <div className="input-group">
                <input
                  type="text"
                  value={newNodeText}
                  onChange={(e) => setNewNodeText(e.target.value)}
                  placeholder="Enter node text"
                  className="text-input"
                  style={{ 
                    backgroundColor: theme === 'dark' ? 'var(--dark-node-2)' : 'white',
                    color: theme === 'dark' ? 'white' : 'inherit',
                    borderColor: theme === 'dark' ? 'var(--dark-node-3)' : 'var(--gray-300)'
                  }}
                />
                <button
                  onClick={handleAddManualNode}
                  className="add-button"
                  disabled={!newNodeText.trim()}
                >
                  Add
                </button>
              </div>
            </div>
            <button
              onClick={closeModal}
              className="cancel-button"
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