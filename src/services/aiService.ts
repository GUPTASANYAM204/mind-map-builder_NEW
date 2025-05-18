// AI Service for generating mind map nodes
import axios from 'axios';

// Interface for learning path data
export interface LearningPathNode {
  title: string;
  description: string;
  resources?: string[];
  timeEstimate?: string;
  milestones?: string[];
  prerequisites?: string[];
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

    // If we have a structured mind map and it has children, extract the top-level subtopics
    // Added check for mindMapStructure existence and children being an array
    if (mindMapStructure && Array.isArray(mindMapStructure.children) && mindMapStructure.children.length > 0) {
      // Filter out any potential null/undefined children before mapping
      return mindMapStructure.children.filter(child => !!child).map(child => child.text);
    }

    // If structured approach fails or returns empty children, fall back to simple list
    return await generateSimpleSubtopics(topic);
  } catch (error) {
    console.error('Error generating subtopics:', error);
    // Fallback to generic subtopics if both structured and simple generation fail
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
    try {
      return JSON.parse(cachedData);
    } catch (e) {
      console.error("Failed to parse cached simple subtopics", e);
      localStorage.removeItem(cacheKey); // Clear invalid cache
    }
  }

  try {
    console.log(`Generating simple subtopics for: ${topic} using Gemini API`);

    // Call the Gemini API
    const response = await axios.post(
      '[https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyCkc5Ay7BGk0QgFSz1LGsqS8m8MT8GGem0](https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyCkc5Ay7BGk0QgFSz1LGsqS8m8MT8GGem0)',
      {
        contents: [
          {
            parts: [
              {
                // Improved prompt for simple subtopics
                text: `List 6-10 distinct and important subtopics for "${topic}". Provide only the subtopics as a simple comma-separated list. Ensure there is no numbering, introductory/explanatory text, or any other formatting. Just the comma-separated list of subtopic names.`
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
    const content = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
        console.error("API response content is empty for simple subtopics.");
        return getGenericSubtopics(topic);
    }

    const subtopics = content
      .split(',')
      .map((topic: string) => topic.trim())
      .filter((topic: string) => topic.length > 0); // Filter out empty strings from split

    // Cache the results only if we got valid subtopics
    if (subtopics.length > 0) {
        localStorage.setItem(cacheKey, JSON.stringify(subtopics));
    }

    return subtopics.length > 0 ? subtopics : getGenericSubtopics(topic); // Fallback if parsing results in empty list

  } catch (error) {
    console.error('Error generating simple subtopics with Gemini API:', error);
    return getGenericSubtopics(topic); // Fallback on API error
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
     try {
      const parsedData = JSON.parse(cachedData);
      // Basic validation for cached data structure
      if (parsedData && typeof parsedData === 'object' && typeof parsedData.text === 'string' && Array.isArray(parsedData.children)) {
         return parsedData;
      } else {
         console.error("Cached mind map structure is invalid.");
         localStorage.removeItem(cacheKey); // Clear invalid cache
      }
    } catch (e) {
      console.error("Failed to parse cached mind map structure", e);
      localStorage.removeItem(cacheKey); // Clear invalid cache
    }
  }

  try {
    console.log(`Generating mind map structure for: ${topic} using Gemini API`);

    // Call the Gemini API with an improved prompt requesting JSON structure
    const response = await axios.post(
      '[https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyCkc5Ay7BGk0QgFSz1LGsqS8m8MT8GGem0](https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyCkc5Ay7BGk0QgFSz1LGsqS8m8MT8GGem0)',
      {
        contents: [
          {
            parts: [
              {
                // Improved prompt for structured mind map
                text: `Create a comprehensive and hierarchical mind map structure about "${topic}".
                Organize the information into a main topic and multiple levels of subtopics.
                Aim for a balanced tree structure with varying depth, rather than a very wide, shallow structure.
                Group related concepts logically under parent nodes.
                Include at least 6-10 main subtopics, and for each main subtopic, include 2-5 relevant sub-subtopics, and potentially further levels of detail where appropriate.

                Return ONLY a valid JSON object representing this structure.
                The JSON object should have the following format:
                {
                  "text": "Main Topic Name",
                  "children": [
                    {
                      "text": "Subtopic 1 Name",
                      "children": [
                        {
                          "text": "Sub-subtopic 1.1 Name",
                          "children": [] // Children array should always be present, even if empty
                        },
                        // ... more sub-subtopics
                      ]
                    },
                    // ... more main subtopics
                  ]
                }

                Ensure the response is ONLY the JSON object, with no surrounding text, explanations, or code block markers (like \`\`\`json).` // Explicitly ask for no code block markers
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
    const content = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

     if (!content) {
        console.error("API response content is empty for structured mind map.");
        // Fallback to simple structure if API returns empty content
        return {
          text: topic,
          children: getGenericSubtopics(topic).map(subtopic => ({
            text: subtopic,
            children: []
          }))
        };
    }


    // Attempt to parse the JSON directly, as we asked the AI not to include markers
    let mindMapStructure: MindMapNode;
    try {
        mindMapStructure = JSON.parse(content) as MindMapNode;
    } catch (parseError) {
        console.error("Failed to parse JSON directly, attempting to extract from code block:", parseError);
        // Fallback: try to extract JSON from a code block if the AI ignored the instruction
        let jsonStr = content;
         if (content.includes('```json')) {
            jsonStr = content.split('```json')[1].split('```')[0].trim();
        } else if (content.includes('```')) {
            jsonStr = content.split('```')[1].split('```')[0].trim();
        }

        try {
             mindMapStructure = JSON.parse(jsonStr) as MindMapNode;
        } catch (fallbackParseError) {
            console.error("Failed to parse JSON even from code block:", fallbackParseError);
             // Final fallback: return a simple structure
            return {
              text: topic,
              children: getGenericSubtopics(topic).map(subtopic => ({
                text: subtopic,
                children: []
              }))
            };
        }
    }

    // Validate the parsed structure
    if (typeof mindMapStructure !== 'object' || typeof mindMapStructure.text !== 'string' || !Array.isArray(mindMapStructure.children)) {
        console.error("Parsed mind map structure is invalid:", mindMapStructure);
        // Fallback if the parsed structure doesn't match the expected format
         return {
            text: topic,
            children: getGenericSubtopics(topic).map(subtopic => ({
              text: subtopic,
              children: []
            }))
          };
    }


    // Cache the results
    localStorage.setItem(cacheKey, JSON.stringify(mindMapStructure));

    return mindMapStructure;

  } catch (error) {
    console.error('Error generating mind map structure with Gemini API:', error);

    // Return a simple structure with the topic as a fallback on API error
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
    try {
      const parsedData = JSON.parse(cachedData);
       // Basic validation for cached learning path data
      if (Array.isArray(parsedData)) {
        // Optional: add more detailed checks for array elements if needed
        return parsedData;
      } else {
         console.error("Cached learning path data is invalid.");
         localStorage.removeItem(cacheKey); // Clear invalid cache
      }
    } catch (e) {
      console.error("Failed to parse cached learning path", e);
      localStorage.removeItem(cacheKey); // Clear invalid cache
    }
  }

  try {
    // Simulate API call delay (keeping this for now as per original code)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // *** This part uses the hardcoded simulateLearningPathResponse ***
    // *** If you want this to be AI-generated, you would need a new API call here ***
    const learningPath = await simulateLearningPathResponse(topic);

    // Cache the results only if we got a valid array back
    if (Array.isArray(learningPath) && learningPath.length > 0) {
       localStorage.setItem(cacheKey, JSON.stringify(learningPath));
    }


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
 * Get generic subtopics for a topic when API fails (Fallback Data)
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
 * Simulate a detailed learning path response (Fallback Data)
 * *** This function contains hardcoded data used as a fallback ***
 * *** If you want AI-generated learning paths, you would need a new API call here ***
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

  // Generic learning path for other topics with more detailed information
  return [
    {
      title: 'Fundamentals',
      description: `Master the core concepts and principles of ${topic}. Start with basic terminology, key theories, and foundational knowledge. Focus on building a strong conceptual understanding before moving to more complex topics.`,
      resources: [
        'Beginner-friendly textbooks and reference guides',
        'Introductory online courses on platforms like Coursera, edX, or Udemy',
        'YouTube tutorial series covering basics',
        'Interactive learning platforms with hands-on exercises'
      ],
      timeEstimate: '4-6 weeks',
      milestones: [
        'Understand basic terminology and concepts',
        'Complete introductory exercises and quizzes',
        'Build simple projects applying fundamental principles',
        'Join community forums and discussion groups'
      ],
      prerequisites: ['Basic computer literacy', 'Self-motivation and consistency']
    },
    {
      title: 'Practical Skills Development',
      description: `Apply your knowledge through structured projects and real-world exercises. This phase focuses on translating theoretical knowledge into practical skills. You'll work on increasingly complex projects that simulate real-world scenarios.`,
      resources: [
        'Project-based learning platforms like Codecademy Pro or DataCamp',
        'GitHub repositories with sample projects and exercises',
        'Medium articles and tutorials on practical applications',
        'Workshops and webinars focusing on hands-on skills'
      ],
      timeEstimate: '6-8 weeks',
      milestones: [
        'Complete 3-5 medium-complexity projects',
        'Troubleshoot common problems independently',
        'Implement best practices in your work',
        'Receive and incorporate feedback from peers or mentors'
      ],
      prerequisites: ['Completion of Fundamentals phase', 'Basic problem-solving skills']
    },
    {
      title: 'Advanced Concepts & Techniques',
      description: `Deepen your understanding with more complex topics, optimization techniques, and advanced methodologies. This phase explores cutting-edge approaches and helps you develop expertise in specific areas of ${topic}.`,
      resources: [
        'Advanced textbooks and academic papers',
        'Specialized courses taught by industry experts',
        'Conference recordings and technical talks',
        'Case studies of complex implementations'
      ],
      timeEstimate: '8-12 weeks',
      milestones: [
        'Understand and implement advanced techniques',
        'Analyze and optimize existing solutions',
        'Contribute to open-source projects or community resources',
        'Create comprehensive documentation for your work'
      ],
      prerequisites: ['Strong practical skills', 'Ability to research independently']
    },
    {
      title: 'Specialization & Expertise',
      description: `Focus on specific areas of interest within ${topic} to develop deep expertise. This phase involves choosing a specialization path and becoming an authority in that niche through focused study and project work.`,
      resources: [
        'Industry-specific blogs and publications',
        'Specialized communities and forums',
        'Advanced certification programs',
        'Mentorship from experts in the field'
      ],
      timeEstimate: '12+ weeks',
      milestones: [
        'Develop and share original insights or techniques',
        'Build a portfolio showcasing your expertise',
        'Mentor others in your area of specialization',
        'Stay current with emerging trends and research'
      ],
      prerequisites: ['Mastery of advanced concepts', 'Clear understanding of industry needs']
    },
    {
      title: 'Professional Application & Growth',
      description: `Apply your expertise in professional settings and continue growing through continuous learning and adaptation. This phase focuses on real-world application, collaboration, and staying current in a rapidly evolving field.`,
      resources: [
        'Professional networking platforms like LinkedIn',
        'Industry conferences and meetups',
        'Subscription-based learning platforms for continuous education',
        'Professional certification programs'
      ],
      timeEstimate: 'Ongoing',
      milestones: [
        'Successfully apply skills in professional projects',
        'Build a professional network in your field',
        'Contribute to the broader community through teaching or content creation',
        'Adapt to new technologies and methodologies as they emerge'
      ],
      prerequisites: ['Specialized expertise', 'Professional communication skills']
    }
  ];
}
