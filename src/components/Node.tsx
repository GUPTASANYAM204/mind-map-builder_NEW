import React from 'react';
import { Group, Text, Rect } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';

export type NodeShape = 'square' | 'rectangle';
export type NodeColorScheme = 'dark' | 'vibrant';

interface NodeProps {
  id: string;
  text: string;
  x: number;
  y: number;
  shape?: NodeShape;
  colorScheme?: NodeColorScheme;
  onDragEnd: (x: number, y: number) => void;
  onContextMenu: (e: KonvaEventObject<MouseEvent>) => void;
}

const Node: React.FC<NodeProps> = ({ 
  id, 
  text, 
  x, 
  y, 
  shape = 'rectangle', 
  colorScheme = 'dark', 
  onDragEnd, 
  onContextMenu 
}) => {
  // Get color based on color scheme and node ID
  const getNodeColor = () => {
    // Use a hash of the node ID to consistently pick colors
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colorIndex = hash % 3; // 3 colors in each scheme
    
    if (colorScheme === 'dark') {
      const darkColors = [
        'var(--dark-blue)',
        'var(--dark-green)',
        'var(--dark-purple)'
      ];
      return darkColors[colorIndex];
    } else if (colorScheme === 'vibrant') {
      const vibrantColors = [
        'var(--vibrant-blue)',
        'var(--vibrant-green)',
        'var(--vibrant-purple)'
      ];
      return vibrantColors[colorIndex];
    }
    
    // Default fallback
    return 'var(--dark-blue)';
  };

  // Determine if this is the root node
  const isRoot = id === 'root';
  
  // Node dimensions based on shape
  // Adjust node size based on level in the hierarchy
  const isSubSubtopic = id.includes('-sub-');
  const nodeWidth = shape === 'square' ? (isRoot ? 120 : isSubSubtopic ? 80 : 100) : 
                   (isRoot ? 140 : isSubSubtopic ? 100 : 120);
  const nodeHeight = shape === 'square' ? (isRoot ? 120 : isSubSubtopic ? 80 : 100) : 
                    (isRoot ? 90 : isSubSubtopic ? 60 : 80);
  const fontSize = isRoot ? 16 : isSubSubtopic ? 12 : 14;
  
  // Render different shapes based on the shape prop
  const renderShape = () => {
    const fill = getNodeColor();
    // Shadow effects
    const shadowProps = {
      shadowColor: "rgba(0,0,0,0.2)",
      shadowBlur: id === 'root' ? 15 : 10,
      shadowOffsetX: 2,
      shadowOffsetY: 2,
      className: "node-shape"
    };
    
    if (shape === 'square') {
      return (
        <Rect
          width={nodeWidth}
          height={nodeHeight}
          fill={fill}
          cornerRadius={12}
          offsetX={nodeWidth / 2}
          offsetY={nodeHeight / 2}
          {...shadowProps}
        />
      );
    } else {
      // Default to rectangle with rounded corners
      return (
        <Rect
          width={nodeWidth}
          height={nodeHeight}
          fill={fill}
          cornerRadius={8}
          offsetX={nodeWidth / 2}
          offsetY={nodeHeight / 2}
          {...shadowProps}
        />
      );
    }
  };
  
  // Calculate text position based on shape
  const getTextConfig = () => {
    const baseConfig = {
      text: text,
      fontSize: isRoot ? fontSize + 2 : fontSize,
      fontWeight: isRoot ? 'bold' : 'normal',
      fontFamily: "Poppins",
      fill: colorScheme === 'dark' ? "#FFFFFF" : "#333",
      align: "center",
      verticalAlign: "middle",
      wrap: "word",
      ellipsis: true
    };
    
    // Both square and rectangle use the same text positioning
    return {
      ...baseConfig,
      width: nodeWidth * 0.8,
      offsetX: nodeWidth * 0.4,
      offsetY: fontSize / 2
    };
  };

  return (
    <Group
      x={x}
      y={y}
      draggable
      onDragEnd={(e) => {
        onDragEnd(e.target.x(), e.target.y());
      }}
      onContextMenu={onContextMenu}
    >
      {/* Node shape */}
      {renderShape()}
      
      {/* Node text */}
      <Text {...getTextConfig()} />
    </Group>
  );
};

export default Node;
