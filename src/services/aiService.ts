// AI Service for generating mind map nodes
import axios from 'axios';

// Interface for learning path data
export interface LearningPathNode {
  title: string;
  description: string;
  resources?: string[];
  timeEstimate?: string;
}

// Interface for mind map node structure
export interface MindMapNode {
  text: string;
  children: MindMapNode[];
}

/**
 * Generate a comprehensive mind map structure for a given topic using Gemini API
 * Returns a structured tree of nodes with variable depth
 */
export const generateSubtopics = async (topic: string): Promise<string[]> => {
  try {
    // First try to generate a structured mind map
    const mindMapStructure = await generateMindMapStructure(topic);
    
    // If we have a structured mind map, extract the top-level subtopics
    if (mindMapStructure && mindMapStructure.children && mindMapStructure.children.length > 0) {
      return mindMapStructure.children.map(child => child.text);
    }
    
    // If structured approach fails, fall back to simple list
    return await generateSimpleSubtopics(topic);
  } catch (error) {
    console.error('Error generating subtopics:', error);
    return getGenericSubtopics(topic);
  }
};

/**
 * Generate a simple list of subtopics using Gemini API
 */
export const generateSimpleSubtopics = async (topic: string): Promise<string[]> => {
  // Check localStorage cache first to avoid rate limits
  const cacheKey = `mindmap_simple_${topic}`;
  const cachedData = localStorage.getItem(cacheKey);
  if (cachedData) {
    return JSON.parse(cachedData);
  }
  
  try {
    console.log(`Generating simple subtopics for: ${topic} using Gemini API`);
    
    // Call the Gemini API
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyCkc5Ay7BGk0QgFSz1LGsqS8m8MT8GGem0',
      {
        contents: [
          {
            parts: [
              {
                text: `List 5-8 subtopics for ${topic}. Return only the subtopics as a simple comma-separated list with no numbering or additional text.`
              }
            ]
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Parse the response
    const content = response.data.candidates[0].content.parts[0].text;
    const subtopics = content
      .split(',')
      .map((topic: string) => topic.trim())
      .filter((topic: string) => topic.length > 0);
    
    // Cache the results
    localStorage.setItem(cacheKey, JSON.stringify(subtopics));
    
    return subtopics;
  } catch (error) {
    console.error('Error generating simple subtopics with Gemini API:', error);
    return getGenericSubtopics(topic);
  }
};

/**
 * Generate a comprehensive mind map structure using Gemini API
 * Returns a structured tree of nodes with variable depth
 */
export const generateMindMapStructure = async (topic: string): Promise<MindMapNode> => {
  // Check localStorage cache first to avoid rate limits
  const cacheKey = `mindmap_structure_${topic}`;
  const cachedData = localStorage.getItem(cacheKey);
  if (cachedData) {
    return JSON.parse(cachedData);
  }
  
  try {
    console.log(`Generating mind map structure for: ${topic} using Gemini API`);
    
    // Call the Gemini API with a prompt requesting JSON structure
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyCkc5Ay7BGk0QgFSz1LGsqS8m8MT8GGem0',
      {
        contents: [
          {
            parts: [
              {
                text: `I want a mind map about "${topic}". Create a comprehensive mind map structure with the main topic and multiple levels of subtopics.

Return ONLY a valid JSON object with the following structure:
{
  "text": "${topic}",
  "children": [
    {
      "text": "Subtopic 1",
      "children": [
        {
          "text": "Sub-subtopic 1.1",
          "children": []
        },
        ...
      ]
    },
    ...
  ]
}

Include at least 5-8 main subtopics, and 2-4 sub-subtopics for each main subtopic. Do not include any explanatory text, only the JSON structure.`
              }
            ]
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Parse the response
    const content = response.data.candidates[0].content.parts[0].text;
    
    // Extract the JSON object from the response (handling potential extra text)
    let jsonStr = content;
    
    // If the response contains a code block, extract just the JSON part
    if (content.includes('```json')) {
      jsonStr = content.split('```json')[1].split('```')[0].trim();
    } else if (content.includes('```')) {
      jsonStr = content.split('```')[1].split('```')[0].trim();
    }
    
    // Parse the JSON
    const mindMapStructure = JSON.parse(jsonStr) as MindMapNode;
    
    // Cache the results
    localStorage.setItem(cacheKey, JSON.stringify(mindMapStructure));
    
    return mindMapStructure;
  } catch (error) {
    console.error('Error generating mind map structure with Gemini API:', error);
    
    // Return a simple structure with the topic
    return {
      text: topic,
      children: getGenericSubtopics(topic).map(subtopic => ({
        text: subtopic,
        children: []
      }))
    };
  }
};

/**
 * Generate a detailed learning path for a topic
 * This provides more structured information about how to learn the topic
 */
export const generateLearningPath = async (topic: string): Promise<LearningPathNode[]> => {
  // Check localStorage cache first
  const cacheKey = `learning_path_${topic}`;
  const cachedData = localStorage.getItem(cacheKey);
  if (cachedData) {
    return JSON.parse(cachedData);
  }
  
  try {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate a detailed learning path
    const learningPath = await simulateLearningPathResponse(topic);
    
    // Cache the results
    localStorage.setItem(cacheKey, JSON.stringify(learningPath));
    
    return learningPath;
  } catch (error) {
    console.error('Error generating learning path:', error);
    
    // Return a simple fallback learning path
    return [
      {
        title: 'Getting Started',
        description: `Begin your journey with ${topic} by understanding the fundamentals.`,
        timeEstimate: '1-2 weeks'
      },
      {
        title: 'Core Concepts',
        description: 'Master the essential concepts and techniques.',
        timeEstimate: '2-4 weeks'
      },
      {
        title: 'Advanced Topics',
        description: 'Explore more complex aspects and specialized areas.',
        timeEstimate: '4-8 weeks'
      }
    ];
  }
};

/**
 * Get generic subtopics for a topic when API fails
 */
function getGenericSubtopics(topic: string): string[] {
  // Generate more intelligent responses based on common topics
  const lowerTopic = topic.toLowerCase();
  
  if (lowerTopic.includes('python')) {
    return [
      'Basic Syntax & Data Types',
      'Control Flow & Functions',
      'Data Structures',
      'Object-Oriented Programming',
      'Libraries & Frameworks',
      'Web Development with Python',
      'Data Science & ML',
      'Testing & Debugging'
    ];
  } else if (lowerTopic.includes('javascript') || lowerTopic.includes('js')) {
    return [
      'Core Concepts & Syntax',
      'DOM Manipulation',
      'Asynchronous JS',
      'Modern JS (ES6+)',
      'Frameworks & Libraries',
      'State Management',
      'Testing in JavaScript',
      'Performance Optimization'
    ];
  } else if (lowerTopic.includes('web') && lowerTopic.includes('develop')) {
    return [
      'HTML & CSS Fundamentals',
      'JavaScript Essentials',
      'Frontend Frameworks',
      'Backend Development',
      'Responsive Design',
      'Web Performance',
      'Security Best Practices',
      'Deployment & DevOps'
    ];
  } else if (lowerTopic.includes('machine learning') || lowerTopic.includes('ml')) {
    return [
      'Data Preprocessing',
      'Supervised Learning',
      'Unsupervised Learning',
      'Neural Networks',
      'Deep Learning',
      'Model Evaluation',
      'Feature Engineering',
      'ML in Production'
    ];
  } else if (lowerTopic.includes('data science')) {
    return [
      'Data Collection & Cleaning',
      'Exploratory Data Analysis',
      'Statistical Methods',
      'Machine Learning',
      'Data Visualization',
      'Big Data Technologies',
      'Communication & Storytelling',
      'Ethics in Data Science'
    ];
  }
  
  // For other topics, return generic subtopics
  return [
    'Overview',
    'Key Concepts',
    'Fundamentals',
    'Advanced Topics',
    'Practical Applications',
    'Tools & Technologies',
    'Best Practices',
    'Resources & Learning'
  ];
}

/**
 * Simulate a detailed learning path response
 */
async function simulateLearningPathResponse(topic: string): Promise<LearningPathNode[]> {
  const lowerTopic = topic.toLowerCase();
  
  if (lowerTopic.includes('python')) {
    return [
      {
        title: 'Python Basics',
        description: 'Learn the fundamental syntax, data types, and control structures.',
        resources: ['Python.org documentation', 'Automate the Boring Stuff with Python', 'Python Crash Course'],
        timeEstimate: '2-3 weeks'
      },
      {
        title: 'Data Structures & Algorithms',
        description: 'Master lists, dictionaries, sets, and basic algorithms.',
        resources: ['Real Python tutorials', 'LeetCode Python problems'],
        timeEstimate: '3-4 weeks'
      },
      {
        title: 'Object-Oriented Programming',
        description: 'Understand classes, inheritance, and OOP principles in Python.',
        resources: ['Python OOP tutorials', 'Clean Code in Python book'],
        timeEstimate: '2-3 weeks'
      },
      {
        title: 'Libraries & Frameworks',
        description: 'Explore popular libraries like NumPy, Pandas, and frameworks like Django or Flask.',
        resources: ['Official documentation', 'Real-world projects'],
        timeEstimate: '4-8 weeks'
      },
      {
        title: 'Advanced Python',
        description: 'Dive into decorators, generators, context managers, and metaprogramming.',
        resources: ['Fluent Python book', 'Advanced Python tutorials'],
        timeEstimate: '4-6 weeks'
      }
    ];
  } else if (lowerTopic.includes('web development')) {
    return [
      {
        title: 'HTML & CSS Fundamentals',
        description: 'Build a solid foundation in markup and styling.',
        resources: ['MDN Web Docs', 'freeCodeCamp HTML/CSS course'],
        timeEstimate: '3-4 weeks'
      },
      {
        title: 'JavaScript Essentials',
        description: 'Learn core JavaScript concepts and DOM manipulation.',
        resources: ['JavaScript.info', 'Eloquent JavaScript book'],
        timeEstimate: '4-6 weeks'
      },
      {
        title: 'Frontend Frameworks',
        description: 'Master a modern framework like React, Vue, or Angular.',
        resources: ['Official documentation', 'Frontend Masters courses'],
        timeEstimate: '6-8 weeks'
      },
      {
        title: 'Backend Development',
        description: 'Learn server-side programming with Node.js, Express, databases.',
        resources: ['Node.js documentation', 'Full Stack Open course'],
        timeEstimate: '6-8 weeks'
      },
      {
        title: 'DevOps & Deployment',
        description: 'Understand how to deploy, maintain and scale web applications.',
        resources: ['Netlify/Vercel documentation', 'AWS/GCP tutorials'],
        timeEstimate: '3-4 weeks'
      }
    ];
  }
  
  // Generic learning path for other topics
  return [
    {
      title: 'Fundamentals',
      description: `Learn the core concepts and principles of ${topic}.`,
      resources: ['Online courses', 'Beginner-friendly books', 'Tutorial videos'],
      timeEstimate: '4-6 weeks'
    },
    {
      title: 'Practical Skills',
      description: 'Apply your knowledge through hands-on projects and exercises.',
      resources: ['Project-based tutorials', 'Practice platforms'],
      timeEstimate: '6-8 weeks'
    },
    {
      title: 'Advanced Concepts',
      description: 'Deepen your understanding with more complex topics and techniques.',
      resources: ['Advanced books', 'Specialized courses'],
      timeEstimate: '8-12 weeks'
    },
    {
      title: 'Specialization',
      description: 'Focus on specific areas of interest within the broader field.',
      resources: ['Industry blogs', 'Specialized communities'],
      timeEstimate: '12+ weeks'
    }
  ];
}


