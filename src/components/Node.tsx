import React from 'react';
import { Group, Text, Rect } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';

// Import types from the new types.ts file
import type { NodeData, NodeShape, ThemeMode } from '../types';


interface NodeProps {
  id: string;
  text: string;
  x: number;
  y: number;
  shape?: NodeShape; // Use NodeShape type
  colorScheme?: ThemeMode; // Use ThemeMode type
  onDragEnd: (x: number, y: number) => void;
  onContextMenu: (e: KonvaEventObject<MouseEvent>) => void;
}

const Node: React.FC<NodeProps> = ({
  id,
  text,
  x,
  y,
  shape = 'rectangle', // Default to rectangle, use NodeShape type
  colorScheme = 'dark', // Default to dark, use ThemeMode type
  onDragEnd,
  onContextMenu
}) => {
  // Get colors based on the global theme variables from CSS
  // These variables should be defined in your index.css or App.css
  // Ensure --node-text and --node-bg are defined in your CSS and have enough contrast for text visibility.
  const nodeFillColor = 'var(--node-bg)';
  const nodeTextColor = 'var(--node-text)'; // Use this for text color

  // Determine if this is the root node
  const isRoot = id === 'root';

  // Node dimensions based on shape and hierarchy level
  const nodeWidth = isRoot ? 200 : 160; // Root node is wider
  const nodeHeight = isRoot ? 100 : 80; // Root node is taller
  const fontSize = isRoot ? 18 : 14; // Font size based on level

  // Render the node shape (always a rectangle with rounded corners for the new design)
  const renderShape = () => {
    // Shadow effects using theme variable
    const shadowProps = {
      shadowColor: 'var(--node-shadow)', // Themed shadow color
      shadowBlur: isRoot ? 20 : 15, // Larger shadow for root
      shadowOffsetX: 3, // Subtle offset
      shadowOffsetY: 3, // Subtle offset
    };

    // Always render a rectangle with rounded corners
    return (
      <Rect
        width={nodeWidth}
        height={nodeHeight}
        fill={nodeFillColor} // Use themed fill color for the node background
        cornerRadius={parseInt(getComputedStyle(document.documentElement).getPropertyValue('--border-radius-rounded')) || 10} // Use CSS variable for corner radius
        offsetX={nodeWidth / 2}
        offsetY={nodeHeight / 2}
        {...shadowProps}
      />
    );
  };

  // Calculate text position and configuration
  const getTextConfig = () => {
    // Ensure text is not empty or just whitespace before rendering
    const displayText = text && text.trim() !== '' ? text : 'New Node';
    const textPadding = 15; // Define padding for the text within the node

    return {
      text: displayText, // Use the checked display text
      fontSize: fontSize,
      fontWeight: isRoot ? 'bold' : 'normal',
      // Using a standard web-safe font stack
      fontFamily: "Arial, sans-serif",
      fill: nodeTextColor, // Explicitly use the themed text color for the text
      align: "center", // Horizontal alignment within the text bounding box
      verticalAlign: "middle", // Vertical alignment within the text bounding box
      wrap: "word",
      ellipsis: true,
      // Position the text element relative to the Group's origin (center of the node)
      // Offset by half the node dimensions minus padding to place the text area correctly
      x: -nodeWidth / 2 + textPadding,
      y: -nodeHeight / 2 + textPadding,
      // Set the width and height of the text's bounding box, respecting padding
      width: nodeWidth - textPadding * 2,
      height: nodeHeight - textPadding * 2,
      // Remove offsetX/Y as we are defining the text area with x, y, width, height
      offsetX: 0,
      offsetY: 0,
      padding: 0, // Padding is handled by the x, y, width, height of the Text element
    };
  };

  return (
    <Group
      x={x}
      y={y}
      draggable // Keep nodes draggable
      onDragEnd={(e) => {
        // Update node position after dragging
        onDragEnd(e.target.x(), e.target.y());
      }}
      onContextMenu={onContextMenu} // Keep context menu
      className="node-group" // Add a class name to the Group
    >
      {/* Node shape - Render FIRST so text appears on top */}
      {renderShape()}

      {/* Node text - Render SECOND so it's on top of the shape */}
      {/* getTextConfig ensures text is not empty */}
      <Text {...getTextConfig()} />
    </Group>
  );
};

export default Node;