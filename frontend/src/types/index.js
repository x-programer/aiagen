// StepType Enum Equivalent (as an object)
const StepType = {
    CreateFile: 0,
    CreateFolder: 1,
    EditFile: 2,
    DeleteFile: 3,
    RunScript: 4
};

// Step Object Structure
const Step = {
    id: 0,
    title: '',
    description: '',
    type: StepType.CreateFile, // Default to one of the StepType values
    status: 'pending'|'in-progress'|'completed', // Default status
    code: '', // Optional
    path: '' // Optional
};

// Project Object Structure
const Project = {
    prompt: '',
    steps: [] // Array of Step objects
};

// FileItem Object Structure
const FileItem = {
    name: '',
    type: 'file', // Default to 'file' or 'folder'
    children: [], // Optional array of FileItem objects
    content: '', // Optional
    path: ''
};

// FileViewerProps Object Structure
const FileViewerProps = {
    file: null, // FileItem object or null
    onClose: () => {} // Function to handle closing
};