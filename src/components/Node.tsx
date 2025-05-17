import React from 'react';
import { Group, Circle, Text, Rect } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';

export type NodeShape = 'circle' | 'rectangle' | 'pill';
export type NodeColorScheme = 'pastel' | 'dark' | 'vibrant' | 'gradient';

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
  shape = 'circle', 
  colorScheme = 'modern', 
  onDragEnd, 
  onContextMenu 
}) => {
  // Get color based on color scheme and node ID
  const getNodeColor = () => {
    // Use a hash of the node ID to consistently pick colors
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colorIndex = hash % 3; // 3 colors in each scheme
    
    if (colorScheme === 'modern') {
      // For root node, always use the accent color
      if (id === 'root') {
        return 'var(--modern-accent)';
      }
      
      // Check if this is a sub-subtopic (third level)
      if (id.includes('-sub-')) {
        // Use a gradient with transparency for sub-subtopics
        return colorIndex === 0 ? 'var(--modern-node-1)' : 
               colorIndex === 1 ? 'var(--modern-node-2)' : 
               'var(--modern-node-3)';
      }
      
      // For second level nodes, use vibrant green variants
      const modernColors = [
        'var(--modern-accent)', // Vibrant green
        'var(--modern-node-2)', // Dark slate
        'var(--modern-node-3)'  // Navy blue
      ];
      return modernColors[colorIndex];
    } else if (colorScheme === 'pastel') {
      const pastelColors = [
        'var(--pastel-blue)',
        'var(--pastel-green)',
        'var(--pastel-purple)'
      ];
      return pastelColors[colorIndex];
    } else if (colorScheme === 'dark') {
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
    } else if (colorScheme === 'gradient') {
      const gradients = [
        'var(--gradient-blue)',
        'var(--gradient-green)',
        'var(--gradient-purple)'
      ];
      return gradients[colorIndex];
    }
    
    // Default fallback
    return 'var(--modern-accent)';
  };

  // Determine if this is the root node
  const isRoot = id === 'root';
  
  // Node dimensions based on shape
  // Adjust node size based on level in the hierarchy
  const isSubSubtopic = id.includes('-sub-');
  const baseRadius = isRoot ? 60 : isSubSubtopic ? 40 : 50;
  const nodeRadius = baseRadius;
  const nodeWidth = shape === 'pill' ? (isRoot ? 140 : isSubSubtopic ? 100 : 120) : 
                   (isRoot ? 120 : isSubSubtopic ? 80 : 100);
  const nodeHeight = shape === 'pill' ? (isRoot ? 70 : isSubSubtopic ? 50 : 60) : 
                    shape === 'rectangle' ? (isRoot ? 90 : isSubSubtopic ? 60 : 80) : 
                    nodeRadius * 2;
  const fontSize = isRoot ? 16 : isSubSubtopic ? 12 : 14;
  
  // Render different shapes based on the shape prop
  const renderShape = () => {
    const fill = getNodeColor();
    // Enhanced shadow effects for modern theme
    const shadowProps = {
      shadowColor: colorScheme === 'modern' ? 
                  (id === 'root' ? "rgba(74, 227, 181, 0.5)" : "rgba(0,0,0,0.4)") : 
                  "rgba(0,0,0,0.2)",
      shadowBlur: colorScheme === 'modern' ? 
                 (id === 'root' ? 15 : 10) : 
                 5,
      shadowOffsetX: 2,
      shadowOffsetY: 2,
      className: "node-circle"
    };
    
    if (shape === 'circle') {
      return (
        <Circle
          radius={nodeRadius}
          fill={fill}
          {...shadowProps}
        />
      );
    } else if (shape === 'rectangle') {
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
    } else if (shape === 'pill') {
      return (
        <Rect
          width={nodeWidth}
          height={nodeHeight}
          fill={fill}
          cornerRadius={nodeHeight / 2}
          offsetX={nodeWidth / 2}
          offsetY={nodeHeight / 2}
          {...shadowProps}
        />
      );
    }
    
    // Default to circle
    return (
      <Circle
        radius={nodeRadius}
        fill={fill}
        {...shadowProps}
      />
    );
  };
  
  // Calculate text position based on shape
  const getTextConfig = () => {
    const baseConfig = {
      text: text,
      fontSize: isRoot ? fontSize + 2 : fontSize,
      fontWeight: isRoot ? 'bold' : 'normal',
      fontFamily: "Poppins",
      fill: colorScheme === 'modern' ? (isRoot ? "#FFFFFF" : "#FFFFFF") : "#333",
      align: "center",
      verticalAlign: "middle",
      wrap: "word",
      ellipsis: true
    };
    
    if (shape === 'circle') {
      return {
        ...baseConfig,
        width: nodeRadius * 1.8,
        offsetX: nodeRadius * 0.9,
        offsetY: fontSize / 2
      };
    } else if (shape === 'rectangle' || shape === 'pill') {
      return {
        ...baseConfig,
        width: nodeWidth * 0.8,
        offsetX: nodeWidth * 0.4,
        offsetY: fontSize / 2
      };
    }
    
    return baseConfig;
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
