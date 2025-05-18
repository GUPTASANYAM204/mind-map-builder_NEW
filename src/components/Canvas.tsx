import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Stage, Layer, Group, Path } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import Node from './Node';
import { motion, AnimatePresence } from 'framer-motion';
import { generateLearningPath } from '../services/aiService';
import type { NodeData, NodeShape, ThemeMode, LearningPathNode } from '../types';

interface CanvasProps {
  mindMap: NodeData;
  setMindMap: React.Dispatch<React.SetStateAction<NodeData | null>>;
  theme: ThemeMode;
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

// Constants for layout - Adjusted spacing for tree layout
const NODE_SPACING = {
  HORIZONTAL: 120, // *** Further reduced Horizontal space ***
  VERTICAL: 200,   // Vertical space between parent and child levels - INCREASED FOR DEPTH VISIBILITY
  NODE_WIDTH: 160, // Approximate node width (should match Node.tsx)
  NODE_HEIGHT: 80  // Approximate node height (should match Node.tsx)
};

const Canvas: React.FC<CanvasProps> = ({
  mindMap,
  setMindMap,
  theme,
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
  const [selectedShape, setSelectedShape] = useState<NodeShape>('rectangle');
  const [selectedColorScheme] = useState<ThemeMode>('dark');  const [showSettings, setShowSettings] = useState(false);
  const [learningPath, setLearningPath] = useState<LearningPathNode[] | null>(null);
  const [showLearningPath, setShowLearningPath] = useState(false);
  const [isLoadingLearningPath, setIsLoadingLearningPath] = useState(false);

  // Refs
  const stageRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Function to find a node by its ID
  const findNodeById = useCallback((nodes: NodeData[], id: string): NodeData | null => {
    // Filter out any null/undefined nodes in the input array defensively
    const validNodes = nodes.filter(node => !!node);

    for (const node of validNodes) {
      if (node.id === id) return node;
      // Ensure children is an array before checking and recursing
      if (Array.isArray(node.children) && node.children.length > 0) {
        const foundNode = findNodeById(node.children, id);
        if (foundNode) return foundNode;
      }
    }
    return null;
  }, []);

  // --- Mind map organization with Top-Down Tree Layout ---
  // Define reorganizeMindMap using useCallback to ensure stable reference
  const reorganizeMindMap = useCallback(() => {
      if (!mindMap) return;

      // Create a mutable copy to update positions
      // Using JSON parse/stringify for a simple deep copy, handles basic data types
      const mindMapCopy: NodeData = JSON.parse(JSON.stringify(mindMap));

      // Function to calculate the width of each subtree
      // This is used to determine horizontal spacing
      const calculateSubtreeWidth = (node: NodeData): number => {
          // Return 0 width for invalid node
          if (!node) return 0;

          // Ensure children is an array before checking length
          if (node.isCollapsed || !Array.isArray(node.children) || node.children.length === 0) {
              // If collapsed or no children, subtree width is just the node width + some padding
              return NODE_SPACING.NODE_WIDTH + NODE_SPACING.HORIZONTAL / 2;
          }

          // Recursively calculate children's subtree widths, filtering out null/undefined children
          const childrenSubtreeWidths = node.children
             .filter(child => !!child) // Filter out null/undefined children
             .map(calculateSubtreeWidth);


          // The total width needed for children is the sum of their subtree widths plus spacing between them
          const totalChildrenWidth = childrenSubtreeWidths.reduce((sum, width) => sum + width, 0);
          // Calculate spacing based on the number of *valid* children
          const spacingBetweenChildren = (childrenSubtreeWidths.length > 0 ? childrenSubtreeWidths.length - 1 : 0) * (NODE_SPACING.HORIZONTAL / 2);


          // The subtree width for the current node is the maximum of its own width
          // and the total width required by its children's layout.
          return Math.max(NODE_SPACING.NODE_WIDTH + NODE_SPACING.HORIZONTAL / 2, totalChildrenWidth + spacingBetweenChildren);
      };

      // Function to position nodes in a tree structure (Vertical Layout)
      const positionNodes = (node: NodeData, x: number, y: number) => {
          // Do not position invalid node
          if (!node) return;

          // Set the position of the current node
          node.x = x;
          node.y = y;

          // Ensure children is an array before checking length
          if (node.isCollapsed || !Array.isArray(node.children) || node.children.length === 0) {
              return; // Stop if collapsed or no children
          }

          // Calculate the total width needed for all children's subtrees at the next level, filtering null/undefined children
          const validChildren = node.children.filter(child => !!child);
          const childrenTotalLayoutWidth = validChildren.reduce((sum, child) => sum + calculateSubtreeWidth(child), 0);
          const spacingBetweenChildren = (validChildren.length > 0 ? validChildren.length - 1 : 0) * (NODE_SPACING.HORIZONTAL / 2);
          const totalLayoutWidth = childrenTotalLayoutWidth + spacingBetweenChildren;

          // Calculate the starting x position for the first child
          // Children block should be centered horizontally under the parent
          let currentChildX = x - (totalLayoutWidth / 2);

          // Position each child, filtering out null/undefined children
          validChildren.forEach(child => {
              const childSubtreeWidth = calculateSubtreeWidth(child);
              const childY = y + NODE_SPACING.VERTICAL; // Position children vertically below parent

              // Position the child node. The child's x is its starting position + half its own subtree width
              positionNodes(child, currentChildX + (childSubtreeWidth / 2), childY);

              // Move the starting x position for the next sibling
              currentChildX += childSubtreeWidth + (NODE_SPACING.HORIZONTAL / 2);
          });
      };

      // Start the layout process from the root node
      // Initial position for the root node (centered horizontally, near the top vertically)
      const rootX = containerRef.current ? containerRef.current.offsetWidth / 2 : window.innerWidth / 2;
      const rootY = 100;

      // Position all nodes recursively, starting with the root, only if mindMapCopy is valid
      if (mindMapCopy) {
         positionNodes(mindMapCopy, rootX, rootY);
      }

      // Update the state with the new positions
      setMindMap(mindMapCopy);

  }, [mindMap, setMindMap, containerRef]); // Added containerRef to dependencies

  // Function to center the mind map on the canvas
  const centerMindMap = useCallback(() => {
      if (stageRef.current && mindMap && containerRef.current) {
          // const stage = stageRef.current;
          const containerWidth = containerRef.current.offsetWidth;
          const containerHeight = containerRef.current.offsetHeight;

          // Assuming the root node is the center of the layout initially
          const rootNode = findNodeById([mindMap], 'root');
          // Add check for rootNode being valid and having defined positions
          if (rootNode && rootNode.x !== undefined && rootNode.y !== undefined) {
              const centerX = containerWidth / 2;
              const centerY = containerHeight / 3; // Position root node higher up

              // Calculate the required stage position to center the root node
              const newX = centerX - rootNode.x * scale;
              const newY = centerY - rootNode.y * scale;

              setPosition({ x: newX, y: newY });
          } else {
               // If no mind map or root node position is unknown, reset position
               setPosition({ x: 0, y: 0 });
          }
      }
  }, [mindMap, scale, findNodeById]);

  // Effect for window resize handling and initial centering
  useEffect(() => {
      const handleResize = () => {
          if (stageRef.current && containerRef.current) {
              // Set stage size to container size
              stageRef.current.width(containerRef.current.offsetWidth);
              stageRef.current.height(containerRef.current.offsetHeight);
              // Re-center the mind map on resize if it exists
              if (mindMap) {
                   centerMindMap();
              } else {
                  // If no mind map, reset position on resize
                  setPosition({ x: 0, y: 0 });
              }
          }
      };

      handleResize(); // Initial size set
      window.addEventListener('resize', handleResize);

      return () => window.removeEventListener('resize', handleResize);
  }, [mindMap, centerMindMap]); // Added centerMindMap to dependencies

  // Effect for initial mind map organization
  useEffect(() => {
    if (mindMap) {
      // Reorganize and then center the mind map after a short delay
      const timer = setTimeout(() => {
          reorganizeMindMap();
          // Only center if reorganizeMindMap didn't result in a null mindMap
          // (reorganizeMindMap currently doesn't set to null, but being defensive)
          if (mindMap) {
             centerMindMap();
          }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [mindMap?.id, mindMap?.text, reorganizeMindMap, centerMindMap]);

  // Zoom handling
  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const stage = stageRef.current;
    if (!stage) return; // Add null check for stage

    const oldScale = stage.scaleX();
    const pointerPosition = stage.getPointerPosition();

    if (!pointerPosition) return; // Handle case where pointer position is null

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
  // findNodeById is now defined using useCallback above

  const updateNodePosition = (nodeId: string, x: number, y: number) => {
    // Allow manual dragging to update position, but layout will override on reorganize
    setMindMap(prevMap => {
      // Add null check for prevMap
      if (!prevMap) return prevMap;

      const updateNode = (node: NodeData): NodeData | null => { // Function can return null if node is invalid
        // Add null check for node being updated
        if (!node) return null; // Return null if the node itself is invalid

        if (node.id === nodeId) return { ...node, x, y };

        // Ensure node.children is an array before mapping
        if (Array.isArray(node.children) && node.children.length > 0) {
          // Recursively update children and filter out any null/undefined results
          const updatedChildren = node.children.map(updateNode).filter(child => !!child);
          return { ...node, children: updatedChildren };
        }

        return node; // Return the node if no update or children to process
      };

      // Update the map starting from the root and filter out any null results (though root shouldn't be null)
      const updatedMap = updateNode(prevMap);

      // Reorganize after position update (layout will override manual position, but good practice)
      // Only reorganize if updatedMap is not null
      if (updatedMap) {
         setTimeout(() => reorganizeMindMap(), 10);
      }

      return updatedMap;
    });
  };

  // Context menu handlers
  const showContextMenu = (e: KonvaEventObject<MouseEvent>, nodeId: string) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const pointerPosition = stage.getPointerPosition();

    if (!pointerPosition) return;

    // Position context menu relative to the viewport, not the stage
    setContextMenu({
      visible: true,
      x: e.evt.clientX, // Use event clientX/Y for viewport position
      y: e.evt.clientY,
      nodeId,
    });
  };

  const closeContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, nodeId: null });
  };

  const handleExpand = () => {
    if (!contextMenu.nodeId) return;

    closeContextMenu();
    // Position modal relative to the viewport where the context menu was
    setModal({
      visible: true,
      nodeId: contextMenu.nodeId,
      x: contextMenu.x, // Use context menu position
      y: contextMenu.y, // Use context menu position
    });
  };

  const handleCollapse = () => {
    if (!contextMenu.nodeId) return;

    setMindMap(prevMap => {
      // Add null check for prevMap
      if (!prevMap) return prevMap;

      const updateNode = (node: NodeData): NodeData | null => { // Function can return null if node is invalid
         // Add null check for node being updated
        if (!node) return null; // Return null if the node itself is invalid

        if (node.id === contextMenu.nodeId) {
          // Ensure children is an array before spreading (though not strictly needed for collapse)
           const currentChildren = Array.isArray(node.children) ? node.children : [];
          return { ...node, isCollapsed: !node.isCollapsed, children: currentChildren }; // Preserve children array type
        }

        // Ensure node.children is an array before mapping
        if (Array.isArray(node.children) && node.children.length > 0) {
          // Recursively update children and filter out any null/undefined results
          const updatedChildren = node.children.map(updateNode).filter(child => !!child);
          return { ...node, children: updatedChildren };
        }

        return node; // Return the node if no update or children to process
      };

      const updatedMap = updateNode(prevMap);
       // Reorganize after collapse/uncollapse
      // Only reorganize if updatedMap is not null
      if (updatedMap) {
         setTimeout(() => reorganizeMindMap(), 10);
      }

      return updatedMap;
    });

    closeContextMenu();
  };

  const handleDelete = () => {
    // Prevent deletion of the root node
    if (!contextMenu.nodeId || contextMenu.nodeId === 'root') return;

    setMindMap(prevMap => {
       // Add null check for prevMap
      if (!prevMap) return prevMap;

      // Recursive function to find and delete the node
      const deleteNode = (node: NodeData): NodeData | null => {
        // If the current node is the one to be deleted, return null
        if (node.id === contextMenu.nodeId) {
             return null;
        }

         // Ensure node.children is an array before processing
        if (Array.isArray(node.children)) {
            // Filter out the child to delete and any null/undefined children, then recursively process remaining children
            const filteredChildren = node.children
                .filter(child => !!child && child.id !== contextMenu.nodeId)
                .map(deleteNode) // Recursively call deleteNode on remaining children
                .filter(child => !!child); // Filter out children that were deleted in recursive calls


             return {
                ...node,
                children: filteredChildren
             };
        }

        // If the node to delete was not found in children and current node is not the one to delete, return current node
        return node;
      };

      // Start deletion process from the root node
      const updatedMap = deleteNode(prevMap);

       // Reorganize after deletion
       // Only reorganize if updatedMap is not null (shouldn't be null if root is protected)
      if (updatedMap) {
         setTimeout(() => reorganizeMindMap(), 10);
      }

      return updatedMap;
    });

    closeContextMenu();
  };

  // Modal operations
  const closeModal = () => {
    setModal({ visible: false, nodeId: null, x: 0, y: 0 });
    setNewNodeText('');
  };

  const handleAddManualNode = () => {
    // Ensure parent node ID and non-empty text exist
    if (!modal.nodeId || !newNodeText.trim()) return;

    const newNodeId = `node-${Date.now()}`;
    const parentNode = findNodeById([mindMap], modal.nodeId);

    if (!parentNode) {
        console.error("Parent node not found for adding manual node.");
        closeModal();
        return;
    }

    const newNode: NodeData = {
        id: newNodeId,
        text: newNodeText.trim(), // Trim whitespace from manual input
        children: [],
        isCollapsed: false, // Ensure new nodes are not collapsed by default
        // Initial position will be set by reorganizeMindMap
        x: parentNode.x, // Use parent's x as a starting point
        y: parentNode.y !== undefined ? parentNode.y + NODE_SPACING.VERTICAL : undefined, // Position below parent
        shape: selectedShape,
        colorScheme: selectedColorScheme
    };

    setMindMap(prevMap => {
      // Add null check for prevMap
      if (!prevMap) return prevMap;

      const updateNode = (node: NodeData): NodeData | null => { // Function can return null if node is invalid
         // Add null check for node being updated
        if (!node) return null; // Return null if the node itself is invalid

        if (node.id === modal.nodeId) {
           // Ensure node.children is an array before spreading
           const currentChildren = Array.isArray(node.children) ? node.children : [];
          return {
            ...node,
            isCollapsed: false, // Uncollapse parent when adding a child
            children: [
              ...currentChildren.filter(child => !!child), // Filter existing children
              newNode, // Add the new node
            ],
          };
        }

        // Ensure node.children is an array before mapping
        if (Array.isArray(node.children) && node.children.length > 0) {
          // Recursively update children and filter out any null/undefined results
          const updatedChildren = node.children.map(updateNode).filter(child => !!child);
          return { ...node, children: updatedChildren };
        }

        return node; // Return the node if no update or children to process
      };

      const result = updateNode(prevMap);
      // Reorganize after adding node
       // Only reorganize if result is not null
      if (result) {
         setTimeout(() => reorganizeMindMap(), 10);
      }
      return result;
    });

    closeModal();
  };

  const handleGenerateAINodes = async () => {
    if (!modal.nodeId) return;

    const parentNode = findNodeById([mindMap], modal.nodeId);

    if (!parentNode) {
        console.error("Parent node not found for generating AI nodes.");
        closeModal();
        return;
    }

    try {
      const { generateSubtopics } = await import('../services/aiService');
      // Generate subtopics based on the parent node's text
      const subtopics = await generateSubtopics(parentNode.text);

      // If generating for the root node and learning path is not yet generated, generate it
      // This part seems unrelated to the Konva errors, keeping as is.
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
        // Add null check for prevMap
        if (!prevMap) return prevMap;

        const updateNode = (node: NodeData): NodeData | null => { // Function can return null if node is invalid
           // Add null check for node being updated
          if (!node) return null; // Return null if the node itself is invalid

          if (node.id === modal.nodeId) {
             // Ensure node.children is an array before spreading
             const currentChildren = Array.isArray(node.children) ? node.children : [];

            // Create new children nodes, filtering out empty/whitespace subtopics and trimming text
            const newChildren: NodeData[] = subtopics
              .filter(topic => !!topic && topic.trim() !== '') // Filter out null/undefined/empty/whitespace subtopics
              .map((topic, index) => {
                const newNodeId = `node-${Date.now()}-${index}`;
                 // Initial position will be set by reorganizeMindMap
                return {
                  id: newNodeId,
                  text: topic.trim(), // Trim AI-generated text
                  children: [],
                  isCollapsed: false, // Ensure AI-generated nodes are not collapsed by default
                  x: node.x, // Initial position near parent
                  y: node.y !== undefined ? node.y + NODE_SPACING.VERTICAL : undefined, // Position below parent
                  shape: selectedShape,
                  colorScheme: selectedColorScheme,
                  description: `Generated step/subtopic.` // Generic description
                };
              });

            return {
              ...node,
              isCollapsed: false, // Uncollapse parent when adding children
              children: [...currentChildren.filter(child => !!child), ...newChildren], // Combine and filter existing children
            };
          }

          // Ensure node.children is an array before mapping
          if (Array.isArray(node.children) && node.children.length > 0) {
            // Recursively update children and filter out any null/undefined results
            const updatedChildren = node.children.map(updateNode).filter(child => !!child);
            return { ...node, children: updatedChildren };
          }

          return node; // Return the node if no update or children to process
        };

        const updatedMap = updateNode(prevMap);
        // Reorganize after adding nodes
         // Only reorganize if updatedMap is not null
        if (updatedMap) {
           setTimeout(() => reorganizeMindMap(), 10);
        }
        return updatedMap;
      });
    } catch (error) {
      console.error('Error generating AI nodes:', error);
      // Optionally show an error message to the user
    }

    closeModal();
  };

  // Node rendering
  const renderNodes = (node: NodeData | null): React.ReactNode | null => {
    // Add initial strict check for valid node before rendering
    // Ensure node is not null/undefined and has required properties (id, x, y)
    if (!node || node.x === undefined || node.y === undefined || !node.id) {
        // console.warn("Skipping rendering of invalid node:", node); // Optional: log invalid nodes
        return null; // Do not render if node is null/undefined or lacks essential properties
    }

    const parentX = node.x;
    const parentY = node.y;

    // Ensure node.children is an array before processing, default to empty array if not
    const childrenToRender = Array.isArray(node.children) ? node.children : [];


    return (
      <Group key={node.id}>
        {/* Render the current node */}
        <Node
          id={node.id}
          text={node.text} // Node component handles empty text check
          x={parentX}
          y={parentY}
          shape={node.shape || selectedShape}
          colorScheme={node.colorScheme || selectedColorScheme}
          onDragEnd={(x, y) => updateNodePosition(node.id, x, y)}
          onContextMenu={(e) => showContextMenu(e, node.id)}
        />

        {/* Render lines to children and recursively render children */}
        {/* Check if node is NOT collapsed AND there are children to render */}
        {!node.isCollapsed && childrenToRender.length > 0 && childrenToRender
            .filter(child => !!child) // Filter out any null/undefined children before mapping for rendering
            .map((child) => {
          // Strict check for valid child node before rendering line or child subtree
          // Ensure child is not null/undefined and has required properties (id, x, y)
          if (!child || child.x === undefined || child.y === undefined || !child.id) {
            // console.warn("Skipping rendering of invalid child node or line:", child); // Optional: log invalid children
            return null; // Skip if child is null/undefined or lacks essential properties
          }

          const childX = child.x;
          const childY = child.y;

          // Calculate start and end points for the line
          // Start from the bottom center of the parent
          const startX = parentX;
          const startY = parentY + NODE_SPACING.NODE_HEIGHT / 2; // Bottom of parent node

          // End at the top center of the child
          const endX = childX;
          const endY = childY - NODE_SPACING.NODE_HEIGHT / 2; // Top of child node

          // Create a simple vertical line
          const pathData = `M${startX},${startY} L${endX},${endY}`;

          return (
            <React.Fragment key={child.id}>
              {/* Render the line */}
              <Path
                data={pathData}
                stroke="var(--node-border)" // Use themed border color for lines
                strokeWidth={2}
                lineJoin="round" // Smooth corners if using segments
                lineCap="round"
                // dash={[5, 2]} // Optional: dashed lines
              />
              {/* Recursively render the child node and its subtree */}
              {/* Ensure the recursive call happens here for each valid child */}
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

    // Generate learning path if not already generated and panel is being opened
    // This part seems unrelated to the Konva errors, keeping as is.
    if (!showLearningPath && !learningPath && mindMap && mindMap.id === 'root') {
      setIsLoadingLearningPath(true);
      generateLearningPath(mindMap.text)
        .then(path => {
          setLearningPath(path);
          setIsLoadingLearningPath(false);
        })
        .catch(error => {
          console.error('Error generating learning path:', error);
          setIsLoadingLearningPath(false);
          // Optionally show an error message to the user
        });
    }
  };

  // Function to handle generating learning path from button in panel
  const handleGenerateLearningPath = async () => {
    // This part seems unrelated to the Konva errors, keeping as is.
    if (!learningPath && mindMap && mindMap.id === 'root') {
      try {
        setIsLoadingLearningPath(true);
        const path = await generateLearningPath(mindMap.text);
        setLearningPath(path);
      } catch (error) {
        console.error('Error generating learning path:', error);
        // Optionally show an error message to the user
      } finally {
        setIsLoadingLearningPath(false);
      }
    }
  };

  // Helper components (styled with CSS classes now)
  const ControlButton = ({ children, onClick, rotate = 0 }: {
    children: React.ReactNode;
    onClick: () => void;
    rotate?: number;
  }) => (
    <motion.button
      whileHover={{ scale: 1.1, rotate }}
      whileTap={{ scale: 0.9 }}
      className="control-button" // Use the new CSS class
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
          ? 'active' // Use 'active' class for styling
          : ''
      }`}
    >
      <span>{mode === 'dark' ? 'Dark Mode' : 'Vibrant'}</span>
      {currentTheme === mode && <span className="ml-2">✓</span>}
    </button>
  );

  const ShapeButton = ({ shapeType, selectedShape }: {
    shapeType: NodeShape;
    selectedShape: NodeShape;
  }) => (
    <button
      onClick={() => setSelectedShape(shapeType)}
      className={`px-4 py-2 rounded-lg flex items-center justify-between ${
        selectedShape === shapeType
          ? 'active' // Use 'active' class for styling
          : ''
      }`}
    >
      <span>{shapeType === 'rectangle' ? 'Rectangle' : 'Circle'}</span> {/* Added back 'Circle' text */}
      {selectedShape === shapeType && <span className="ml-2">✓</span>}
    </button>
  );

  return (
    <div className="canvas-container" ref={containerRef}>
      {/* Control buttons */}
      <div className="absolute top-4 right-4 z-30">
        <ControlButton onClick={toggleSettings} rotate={15}>⚙️</ControlButton>
      </div>
      <div className="absolute top-4 left-4 z-30">
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
          >
            <h3>Customize Nodes</h3>

            <div className="mb-4">
              <label>Shape:</label>
              <div className="flex gap-2">
                <ShapeButton shapeType="rectangle" selectedShape={selectedShape} />
                {/* You can add other shapes here if needed */}
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
          >
            <h3>Learning Path: {mindMap?.text || 'Loading...'}</h3> {/* Display root node text, use optional chaining */}

            {isLoadingLearningPath ? (
              <div className="loading-indicator">
                <div className="animate-spin">⟳</div>
                <p>Generating learning path...</p>
              </div>
            ) : learningPath ? (
              <div>
                {/* Ensure learningPath is an array before mapping */}
                {Array.isArray(learningPath) && learningPath
                  .filter(step => !!step) // Filter out null/undefined steps
                  .map((step, index) => (
                  // Add check for valid step object before rendering
                  <div
                    key={index}
                    className="path-step"
                  >
                    <h4>{step.title || 'Untitled Step'}</h4> {/* Provide fallback title */}
                    <p>{step.description || 'No description available.'}</p> {/* Provide fallback description */}

                    {step.timeEstimate && (
                      <div className="time-estimate">
                        ⏱️ Estimated time: {step.timeEstimate}
                      </div>
                    )}

                    {/* Ensure step.resources is an array */}
                    {Array.isArray(step.resources) && step.resources.length > 0 && (
                      <div>
                        <strong>Recommended Resources:</strong>
                        <ul>
                           {/* Add check for valid resource string */}
                          {step.resources.filter(resource => !!resource).map((resource: string, i: number) => (
                             <li key={i}>{resource}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                     {/* Ensure step.prerequisites is an array */}
                    {Array.isArray(step.prerequisites) && step.prerequisites.length > 0 && (
                      <div>
                        <strong>Prerequisites:</strong>
                        <ul>
                           {/* Add check for valid prerequisite string */}
                          {step.prerequisites.filter(prerequisite => !!prerequisite).map((prerequisite: string, i: number) => (
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
        width={containerRef.current ? containerRef.current.offsetWidth : window.innerWidth}
        height={containerRef.current ? containerRef.current.offsetHeight : window.innerHeight}
        onWheel={handleWheel}
        draggable
        x={position.x}
        y={position.y}
        scaleX={scale}
        scaleY={scale}
        onClick={closeContextMenu}
        fill="transparent"
      >
        <Layer>
          {/* Render the mind map nodes and lines, only if mindMap is not null */}
          {mindMap && renderNodes(mindMap)}
        </Layer>
      </Stage>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <div className="context-menu-item" onClick={handleExpand}>
            Add Node / Generate AI
          </div>
           {/* Add check for valid node before accessing isCollapsed */}
          <div className="context-menu-item" onClick={handleCollapse}>
            {findNodeById([mindMap], contextMenu.nodeId || '')?.isCollapsed ? 'Uncollapse' : 'Collapse'}
          </div>
          {contextMenu.nodeId !== 'root' && (
            <div className="context-menu-item" onClick={handleDelete}>
              Delete Node
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