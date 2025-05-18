// src/types.ts

// Define the shape types for nodes
export type NodeShape = 'square' | 'rectangle';

// Define the theme modes
export type ThemeMode = 'dark' | 'vibrant';

// Define the structure for a node in the mind map
export interface NodeData {
  id: string;
  text: string;
  children: NodeData[];
  x?: number; // x coordinate (optional, set by layout)
  y?: number; // y coordinate (optional, set by layout)
  isCollapsed?: boolean; // Whether the node's children are hidden
  shape?: NodeShape; // Shape of the node (optional)
  colorScheme?: ThemeMode; // Color scheme for the node (optional, though theme is global)
  description?: string; // Optional description for the node
  resources?: string[]; // Optional list of resources
  timeEstimate?: string; // Optional time estimate
}

// Define the structure for a learning path node (from AI service)
export interface LearningPathNode {
  title: string;
  description: string;
  timeEstimate?: string;
  resources?: string[];
  prerequisites?: string[];
}
