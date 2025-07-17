import { useEffect, useState } from 'react';
import { FolderIcon, DocumentIcon, ChevronRightIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import Editor from '@monaco-editor/react';
import { useLocation } from 'react-router-dom';
import { parseXml, StepType } from '../Steps';
import FloatingInputBox from '../compements/FloatingInputBox';
import axios from '../config/axios';
import { useWebContainer } from '../hooks/useWebContainers';
import { useNavigate } from 'react-router-dom';
import PreviewFrame from '../compements/PreviewFrame';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import Login from './Login';
// import { PreviewFrame } from '../components/PreviewFrame'; 

function BuilderPage() {
  const location = useLocation();
  const { prompt } = location.state;
  const [activeStep, setActiveStep] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [activeTab, setActiveTab] = useState('code');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [fileContent, setFileContent] = useState({});
  const [floatingValuePrompt, setFloatingValuePrompt] = useState('');
  const [llmMessages, setllmMessages] = useState([]);

  // Updated state to properly store parsed XML data
  const [project, setProject] = useState(null);
  const [stepFiles, setStepFiles] = useState([]);
  const [webConError, setWebConError] = useState(null);

  const [fileStructure, setFileStructure] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const { webcontainer, loading: webcontainerLoading, error: webcontainerError } = useWebContainer();
  const navigate = useNavigate();

  //download handler function..
  const handleDownloadCode = async () => {
    try {
      const zip = new JSZip();

      // Recursive function to add files to zip
      const addFilesToZip = (items, currentPath) => {
        items.forEach(item => {
          const fullPath = currentPath ? `${currentPath}/${item.name}` : item.name;
          if (item.type === 'folder') {
            const folder = zip.folder(fullPath);
            addFilesToZip(item.children, fullPath);
          } else {
            zip.file(fullPath, item.content);
          }
        });
      };

      // Start processing from root
      addFilesToZip(fileStructure, '');

      // Generate zip file
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'website-code.zip');

    } catch (error) {
      console.error('Error generating zip file:', error);
      alert('Error downloading code. Please check the console for details.');
    }
  };

  //handle floating value..
  const handleFloatingInputChange = (e) => {
    const value = e.target.value;
    setFloatingValuePrompt(value);
    console.log("Floating value Prompt : ", value); // Log the value to verify it's being updated..
  }

  const handleFloatingSubmit = async (e) => {
    const promptValue = floatingValuePrompt.trim();
    if (!promptValue) return;

    try {
      const newMessage = { role: 'user', content: promptValue };
      const updatedMessages = [...llmMessages, newMessage];

      setIsLoading(true);
      const setResponse = await axios.post('/ai/chat', {
        messages: updatedMessages // ✅ Send full history
      });

      const parsedResponse = parseXml(setResponse.data);
      if (!parsedResponse?.length) throw new Error('Invalid response');

      // ✅ Add both messages to history
      setllmMessages(prev => [
        ...prev,
        newMessage,
        { role: 'assistant', content: setResponse.data }
      ]);

      // ✅ Proper type conversion and state merge
      setProject(prev => ({
        title: prev?.title || 'Project Files & Steps..',
        steps: [
          ...(prev?.steps || []),
          ...parsedResponse.map(x => ({
            ...x,
            type: typeof x.type === 'string' ? StepType[x.type] : x.type,
            status: "pending"
          }))
        ]
      }));

      setFloatingValuePrompt('');
    } catch (error) {
      console.error('API Error:', error);
      // ✅ Add error message to chat
      setllmMessages(prev => [...prev, {
        role: 'assistant',
        content: `<error>${error.message}</error>`
      }]);
    } finally {
      setIsLoading(false);
    }
  };


  // Update your useEffect to track loading state
  useEffect(() => {
    if (webcontainer) {
      setIsLoading(false);
    }
  }, [webcontainer]);


  useEffect(() => {
    // Only proceed if project exists and has steps
    if (!project || !Array.isArray(project.steps)) return;
    let originalFiles = [...fileStructure];
    let updateHappened = false;

    const pendingSteps = project.steps.filter(({ status }) => status === "pending");

    pendingSteps.forEach(step => {
      updateHappened = true;

      // Make sure we're working with the right step type (CreateFile)
      if (step.type === 0) { // StepType.CreateFile is 0
        let parsedPath = step.path?.split("/").filter(Boolean) || [];
        let currentFileStructure = originalFiles;

        let currentFolder = "";
        for (let i = 0; i < parsedPath.length; i++) {
          const currentFolderName = parsedPath[i];
          currentFolder = currentFolder ? `${currentFolder}/${currentFolderName}` : `/${currentFolderName}`;

          if (i === parsedPath.length - 1) {
            // This is the final file
            const existingFile = currentFileStructure.find(x => x.path === currentFolder);
            if (!existingFile) {
              currentFileStructure.push({
                id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: currentFolderName,
                type: 'file',
                path: currentFolder,
                content: step.code
              });
            } else {
              existingFile.content = step.code;
            }



          } else {
            // This is a folder
            let folder = currentFileStructure.find(x => x.path === currentFolder);
            if (!folder) {
              folder = {
                id: `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: currentFolderName,
                type: 'folder',
                path: currentFolder,
                children: []
              };
              currentFileStructure.push(folder);
            }

            // Move to children for next iteration
            currentFileStructure = folder.children;
          }
        }
      }
    });

    if (updateHappened) {
      // Sort the file structure to ensure src folder is at the top
      const sortedFiles = [...originalFiles].sort((a, b) => {
        // Place src folder at the top
        if (a.name === 'src' && a.type === 'folder') return -1;
        if (b.name === 'src' && b.type === 'folder') return 1;

        // Then sort other folders
        if (a.type === 'folder' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'folder') return 1;

        // Finally sort alphabetically
        return a.name.localeCompare(b.name);
      });

      setFileStructure(sortedFiles);

      // Update step status
      setProject(prevProject => ({
        ...prevProject,
        steps: prevProject.steps.map(step => ({
          ...step,
          status: "completed"
        }))
      }));
    }
  }, [project, fileStructure]);

  // Helper function to format file paths for display
  const formatFileDescription = (filePath) => {
    const fileName = filePath.split('/').pop();

    // Determine the action type based on the file
    let actionType = "Create";
    if (fileName.includes('config') || fileName.includes('tsconfig')) {
      actionType = "Setup";
    }

    // Generate a description based on the file type
    let description = "";
    if (fileName === 'eslint.config.js') {
      description = "Set up ESLint for linting and ensure code quality.";
    } else if (fileName === 'index.html') {
      description = "Define the HTML structure and include the root element for the application.";
    } else if (fileName === 'package.json') {
      description = "Manage dependencies, scripts, and other metadata for the project.";
    } else if (fileName === 'postcss.config.js') {
      description = "Configure PostCSS for processing CSS with plugins like Tailwind CSS and Autoprefixer.";
    } else if (fileName === 'tailwind.config.js') {
      description = "Configure Tailwind CSS for theming and extending the design system.";
    } else if (fileName === 'tsconfig.app.json') {
      description = "Define TypeScript compiler options specifically for the application.";
    } else if (fileName === 'tsconfig.json') {
      description = "Manage TypeScript configuration and references between projects.";
    } else if (fileName === 'tsconfig.node.json') {
      description = "Configure TypeScript specifically for Node.js-related tasks.";
    } else if (fileName === 'vite.config.ts') {
      description = "Configure Vite as the build tool and optimize dependencies.";
    } else if (fileName.endsWith('.tsx') || fileName.endsWith('.ts')) {
      description = "TypeScript component for the application.";
    } else if (fileName.endsWith('.css')) {
      description = "Styles for the application.";
    } else {
      description = `File for the ${fileName.split('.')[0]} component.`;
    }

    return {
      actionType,
      description
    };
  };

  //web container part starts here..

  // Find your existing WebContainer useEffect (around line 120 in your code) and enhance it:

  useEffect(() => {
    // Only proceed if webcontainer is available
    if (!webcontainer) {
      setWebConError('WebContainer not available because of an error so please login again because i am using free services !');
      console.log('WebContainer not yet initialized');
      return;
    }

    const createMountStructure = (files) => {
      const mountStructure = {};

      const processFile = (file, isRootFolder) => {
        if (file.type === 'folder' || file.type === 'directory') {
          // For folders, create a directory entry
          const directoryContent = {};

          if (file.children && file.children.length > 0) {
            file.children.forEach(child => {
              const result = processFile(child, false);
              directoryContent[child.name] = result;
            });
          }

          if (isRootFolder) {
            mountStructure[file.name] = {
              directory: directoryContent
            };
          } else {
            return {
              directory: directoryContent
            };
          }
        } else if (file.type === 'file') {
          if (isRootFolder) {
            mountStructure[file.name] = {
              file: {
                contents: file.content || ''
              }
            };
          } else {
            // For files, create a file entry with contents
            return {
              file: {
                contents: file.content || ''
              }
            };
          }
        }

        // Return the appropriate object for non-root items
        if (!isRootFolder) {
          if (file.type === 'folder' || file.type === 'directory') {
            return mountStructure[file.name];
          }
        }
      };

      // Process each top-level file/folder
      files.forEach(file => processFile(file, true));

      return mountStructure;
    };

    const mountStructure = createMountStructure(fileStructure);

    // Make sure we have some files before mounting
    if (Object.keys(mountStructure).length > 0) {
      console.log('Mounting file structure in WebContainer:', mountStructure);

      // Add package.json if not present (for simpler projects)
      if (!mountStructure['package.json']) {
        mountStructure['package.json'] = {
          file: {
            contents: JSON.stringify({
              "name": "web-project",
              "version": "1.0.0",
              "scripts": {
                "dev": "npx vite --host",
                "build": "vite build",
                "serve": "vite preview"
              },
              "dependencies": {
                "react": "^18.2.0",
                "react-dom": "^18.2.0"
              },
              "devDependencies": {
                "vite": "^4.3.9"
              }
            }, null, 2)
          }
        };
      }

      // Reset the container before mounting new files
      // webcontainer.reset();

      // Mount the updated structure
      webcontainer.mount(mountStructure).then(() => {
        console.log('Files mounted successfully');
      }).catch(err => {
        console.error('Error mounting files:', err);
      });
    }
  }, [fileStructure, webcontainer]);
  //web container part end here..


  async function init() {
    try {
      console.log('Prompt:', prompt);
      const response = await axios.post('/ai/template', {
        message: prompt.trim()
      });

      const { prompts, uiPrompts } = response.data;
      console.log(uiPrompts, 'UI PROMPTS');

      if (uiPrompts && uiPrompts.length > 0) {
        // Parse XML and handle returned data properly
        console.log('UI Prompt - - - - - :', uiPrompts[0]);
        const parsedData = parseXml(uiPrompts[0]);
        console.log('Parsed Data:', parsedData);

        if (parsedData && parsedData.length > 0) {
          // Process the parsed data to create project structure
          processProjectData(parsedData);
        }
      }

      // Fix the API request format to match the backend expectations
      if (prompts && Array.isArray(prompts)) {
        try {
          const messageArray = [...prompts.map(content => ({
            role: 'user',
            content
          }))];

          // Add the original prompt as the last message
          messageArray.push({
            role: 'user',
            content: prompt
          });

          const setResponse = await axios.post('/ai/chat', {
            messages: messageArray
          });

          // Updated code to properly update the project state with error handling
          try {
            console.log('Set response:', setResponse);
            console.log('Set response1:', setResponse.data);

            // FIX: Check setResponse.data directly instead of setResponse.data.response
            if (setResponse.data) {
              console.log('Raw response to parse:', setResponse.data);

              try {
                // Parse the XML directly from setResponse.data
                const parsedResponse = parseXml(setResponse.data);
                console.log('Parsed response:', parsedResponse);

                if (parsedResponse && Array.isArray(parsedResponse) && parsedResponse.length > 0) {
                  setProject(prevProject => {
                    if (!prevProject) {
                      return {
                        title: 'Project Files & Steps..',
                        steps: parsedResponse.map(x => ({
                          ...x,
                          status: "pending"
                        }))
                      };
                    } else {
                      return {
                        ...prevProject,
                        steps: [
                          ...prevProject.steps,
                          ...parsedResponse.map(x => ({
                            ...x,
                            status: "pending"
                          }))
                        ]
                      };
                    }
                  });

                  // Process the file structure immediately if needed
                  if (parsedResponse.some(step => step.type === 0)) { // StepType.CreateFile
                    const fileSteps = parsedResponse.filter(step => step.type === 0);
                    console.log('File steps to process:', fileSteps);
                    // This will trigger the useEffect that updates the file structure
                  }
                } else {
                  console.warn('Parsed response is empty or not an array:', parsedResponse);
                }
              } catch (error) {
                console.error('Error parsing XML response:', error);
                console.warn('Response structure that caused error:', setResponse.data);
              }
            } else {
              console.warn('Response missing expected data:', setResponse);
            }
          } catch (error) {
            console.error('Error parsing XML or updating project:', error);
          }

          setllmMessages([...prompts, prompt].map(content => ({
            role: "user",
            content
          })));

          setllmMessages(x => [...x, { role: 'assistant', content: setResponse.data }])


          console.log('Chat response:', setResponse.data);
        } catch (error) {
          console.error('Chat API error:', error.response?.data || error.message);
        }


      }
    } catch (error) {
      console.error('Template API error:', error.response?.data || error.message);
    }


  }


  // New function to process parsed data from API
  const processProjectData = (parsedData) => {
    // For direct parsed data format (array of objects)
    if (Array.isArray(parsedData) && parsedData.length > 0 && parsedData[0].id !== undefined) {
      console.log('Processing direct parsed data format');

      // Create project structure from parsed data
      const projectData = {
        title: 'Project Files & Steps: ',
        steps: parsedData.map(step => {
          let title = step.title || '';
          let description = '';

          if (step.type === 'CreateFile' || step.type === 0) {
            const path = step.path || '';
            const fileName = path.split('/').pop();
            const { actionType, description: fileDesc } = formatFileDescription(path);

            title = title || `${actionType} \`${fileName}\``;
            description = fileDesc;
          }

          return {
            ...step,
            title,
            description: description || step.description || '',
            status: step.status || 'pending',
            type: typeof step.type === 'string' ?
              (step.type === 'CreateFile' ? 0 :
                step.type === 'CreateFolder' ? 1 : 2) :
              step.type
          };
        })
      };

      // Add project overview as the first step if not present
      if (!projectData.steps.some(step => step.type === -1)) {
        projectData.steps.unshift({
          id: 0,
          title: "Project Overview",
          description: "Organize and manage all the necessary files for the project.",
          type: -1,
          status: 'pending'
        });
      }

      setProject(projectData);
      setStepFiles([]); // No separate files in this format
    }
    // For the structure where first item is project and rest are files
    else if (parsedData && parsedData.length > 0) {
      console.log('Processing complex parsed data format');
      // First item is the project with steps
      const projectData = parsedData[0];
      console.log('Project Data:', projectData);

      // Enhance the steps with better formatting
      if (projectData.steps && projectData.steps.length > 0) {
        const enhancedSteps = projectData.steps.map(step => {
          if (step.type === 0) { // CreateFile type
            const { actionType, description } = formatFileDescription(step.path);

            return {
              ...step,
              title: `${actionType} \`${step.path.split('/').pop()}\``,
              description: description,
              status: step.status || 'pending'
            };
          }
          return {
            ...step,
            status: step.status || 'pending'
          };
        });

        // Add project overview as the first step
        enhancedSteps.unshift({
          id: 0,
          title: projectData.title || "Project Overview",
          description: "Organize and manage all the necessary files for the project.",
          type: -1,
          status: 'pending'
        });

        projectData.steps = enhancedSteps;
      }

      setProject(projectData);

      // Remaining items are files
      const filesData = parsedData.slice(1);
      setStepFiles(filesData);
    }
  };

  useEffect(() => {
    init();
  }, []);

  const getLanguage = (fileName) => {
    const extension = fileName.split('.').pop();
    switch (extension) {
      case 'jsx': return 'javascript';
      case 'tsx': return 'typescript';
      case 'ts': return 'typescript';
      case 'js': return 'javascript';
      case 'html': return 'html';
      case 'css': return 'css';
      case 'json': return 'json';
      default: return 'plaintext';
    }
  };

  const handleEditorChange = (value) => {
    if (selectedFile) {
      setFileContent(prev => ({
        ...prev,
        [selectedFile.id]: value
      }));
    }
  };

  const getFileContent = (file) => {
    return fileContent[file.id] || file.content;
  };

  // Handle step click to potentially load a file
  const handleStepClick = (index, step) => {
    setActiveStep(index);

    if (step.type === -1) {
      // Overview step, don't load any file
      return;
    }

    // If step has associated file path, try to find and select it
    if (step.type === 0 || step.type === 2) { // CreateFile or EditFile
      const associatedFile = stepFiles.find(f => f.file && f.file.path === step.path);
      if (associatedFile) {
        // Create a selectable file object from the step file
        const fileObj = {
          id: `step-file-${step.id}`,
          name: associatedFile.file.name,
          type: 'file',
          content: associatedFile.file.content,
          path: associatedFile.file.path
        };
        setSelectedFile(fileObj);

        // Update file content state
        setFileContent(prev => ({
          ...prev,
          [`step-file-${step.id}`]: associatedFile.file.content
        }));
      }
    }
  };

  // Mark step as completed
  const markStepCompleted = (stepId) => {
    if (project && project.steps) {
      const updatedSteps = project.steps.map(step =>
        step.id === stepId ? { ...step, status: 'completed' } : step
      );
      setProject({ ...project, steps: updatedSteps });
    }
  };

  // Get status display text and color
  const getStatusDisplay = (status) => {
    switch (status) {
      case 'completed':
        return { text: 'Completed', color: 'text-green-400' };
      case 'in-progress':
        return { text: 'In Progress', color: 'text-yellow-400' };
      case 'pending':
      default:
        return { text: 'Pending', color: 'text-gray-400' };
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-900 flex flex-col">
      {/* Mobile Header */}
      <div className="md:hidden w-full bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center">
        <h1 className="text-gray-200 font-bold text-lg">Code Builder : </h1>
        <button
          className="px-3 py-1 bg-blue-600 text-gray-200 rounded"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          {isSidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
        </button>
      </div>

      {/* Error Message */}
      {/* {webConError && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white p-4 text-center z-50">
          {webConError}
          <button
          className="ml-4 px-4 py-2 text-white hover:text-white hover:border-white" 
          onClick={() => navigate('/login')} // Navigate to the login route
        >
          Login
        </button>
        </div>
      )} */}

      {/* Main Content */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Sidebar */}
        <div
          className={`absolute md:relative w-full md:w-1/2 bg-gray-800 
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
            md:translate-x-0 transition-transform duration-300 ease-in-out
            z-20 h-full flex flex-col overflow-hidden`}
        >
          {/* Steps Panel */}
          <div className="h-1/2 overflow-y-auto border-b border-gray-700 p-4">
            <h2 className="text-xl font-bold mb-4 text-gray-200 sticky top-0 bg-gray-800 py-2">
              {project?.title || "Project Steps"}
            </h2>
            <div className="space-y-3">
              {project?.steps?.map((step, index) => {
                const statusDisplay = getStatusDisplay(step.status);
                return (
                  <div
                    key={`step-${step.id || index}-${index}`} // Fixed key to ensure uniqueness
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${index === activeStep
                      ? 'bg-gray-700 border-l-4 border-blue-500'
                      : 'hover:bg-gray-700'
                      }`}
                    onClick={() => handleStepClick(index, step)}
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircleIcon
                        className={`w-5 h-5 ${step.status === 'completed' ? 'text-green-400' : 'text-gray-400'
                          } flex-shrink-0`}
                        onClick={(e) => {
                          e.stopPropagation();
                          markStepCompleted(step.id);
                        }}
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium text-gray-200"
                            dangerouslySetInnerHTML={{ __html: step.title }}></h3>
                          <span className={`text-xs ${statusDisplay.color} ml-2`}>
                            {statusDisplay.text}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">{step.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {!project?.steps?.length && (
                <div className="text-gray-400 text-center p-4">
                  No steps available yet
                </div>
              )}
            </div>
          </div>

          {/* File Explorer Panel */}
          <div className="h-1/2 overflow-y-auto p-4 pt-0 pl-5">
            <h2 className="text-xl font-bold mb-4 text-gray-200 sticky top-0 bg-gray-800 py-2">File Explorer : </h2>
            <div className="bg-gray-800 rounded-lg pl-10">
              <FileExplorer
                items={fileStructure}
                onFileSelect={(file) => {
                  setSelectedFile(file);
                  if (window.innerWidth < 768) {
                    setIsSidebarOpen(false);
                  }
                }}
                selectedFile={selectedFile}
              />
            </div>
          </div>
        </div>

        {/* Editor/Preview Panel button starts*/}
        <div className="flex-1 flex flex-col bg-gray-900">

          <div className="bg-gray-800 flex border-b border-gray-700 justify-between items-center space-x-1 p-1">
            <div className="flex space-x-1">
              <button
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === 'code'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                  }`}
                onClick={() => setActiveTab('code')}
              >
                Code Editor
              </button>
              <button
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === 'preview'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                  }`}
                onClick={() => setActiveTab('preview')}
              >
                Preview
              </button>
            </div>

            {/* Download Code Button */}
            <button
              onClick={handleDownloadCode}
              className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-all duration-200 flex items-center space-x-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-9.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <span>Download Code</span>
            </button>
          </div>

          {/* Editor/Preview Panel starts here */}
          {activeTab === 'code' ? (
            // Only render the editor if selectedFile exists
            selectedFile ? (
              <Editor
                height="100%"
                language={getLanguage(selectedFile.name)}
                value={getFileContent(selectedFile)}
                onChange={handleEditorChange}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                }}
                className="bg-gray-900"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-gray-400 bg-gray-900">
                Please select a file to edit
              </div>
            )
          ) : (
            <div className="h-full w-full bg-gray-900">
              {selectedFile && selectedFile.name && selectedFile.name.endsWith('.html') && !webcontainer ? (
                // Fallback for HTML files when WebContainer is not available
                <iframe
                  srcDoc={getFileContent(selectedFile)}
                  className="w-full h-full border border-gray-700 rounded-lg"
                  title="HTML Preview"
                  style={{ backgroundColor: 'white' }}
                />
              ) : webcontainer ? (
                // Use WebContainer-based preview when available
                <PreviewFrame
                  fileStructure={fileStructure}
                  webcontainer={webcontainer}
                />
              ) : (
                <div className="p-4 text-center flex items-center justify-center h-full text-gray-400">
                  <div>
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    WebContainer is initializing. Please wait...
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Editor/Preview Panel ends here */}


        </div>

        {/* Editor/Preview Panel button end*/}


      </div>

      {/* // Floating input box start.. */}
      <div className="relative w-full pt-2 px-4 pb-2">
        <input
          type="text"
          onChange={handleFloatingInputChange}
          className="w-full px-5 py-4 pr-16 text-gray-200 bg-gray-800 border-2 border-gray-700 rounded-full shadow-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all duration-300 placeholder-gray-500"
          placeholder="Enter your prompt..."
        />
        <button
          onClick={handleFloatingSubmit}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-2 bg-gradient-to-r mr-7 mt-0.5 from-blue-600 to-indigo-600 text-white rounded-full hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-md transition-all duration-300 flex items-center justify-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {/* <FloatingInputBox


      /> */}

      {/* // Floating input box end.. */}

    </div>
  );
}

function FileExplorer({ items = [], depth = 0, onFileSelect, selectedFile }) {
  const [expandedFolders, setExpandedFolders] = useState([]);

  const toggleFolder = (folderId) => {
    setExpandedFolders(prev =>
      prev.includes(folderId)
        ? prev.filter(id => id !== folderId)
        : [...prev, folderId]
    );
  };

  const handleItemClick = (item) => {
    if (item.type === 'file') {
      onFileSelect(item);
    } else {
      toggleFolder(item.id);
    }
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={`${depth}-${item.id || index}-${index}`}> {/* Fixed key to ensure uniqueness */}
          <div
            className={`flex items-center gap-2 p-1 rounded cursor-pointer ${item.type === 'file' && selectedFile?.id === item.id
              ? 'bg-gray-700'
              : 'hover:bg-gray-700'
              }`}
            style={{ paddingLeft: `${depth * 20}px` }}
            onClick={() => handleItemClick(item)}
          >
            {item.type === 'folder' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFolder(item.id);
                }}
                className="text-gray-400 hover:text-gray-300"
              >
                <ChevronRightIcon
                  className={`w-4 h-4 transition-transform ${expandedFolders.includes(item.id) ? 'rotate-90' : ''
                    }`}
                />
              </button>
            )}
            {item.type === 'folder' ? (
              <FolderIcon className="w-5 h-5 text-blue-400" />
            ) : (
              <DocumentIcon className="w-5 h-5 text-gray-400" />
            )}
            <span className="text-sm text-gray-200">{item.name}</span>
          </div>
          {item.type === 'folder' && expandedFolders.includes(item.id) && item.children && (
            <FileExplorer
              items={item.children}
              depth={depth + 1}
              onFileSelect={onFileSelect}
              selectedFile={selectedFile}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default BuilderPage;