// * Parse input XML and convert it into steps.
//  * Eg: Input - 
//  * <boltArtifact id=\"project-import\" title=\"Project Files\">
//  *  <boltAction type=\"file\" filePath=\"eslint.config.js\">
//  *      import js from '@eslint/js';\nimport globals from 'globals';\n
//  *  </boltAction>
//  * <boltAction type="shell">
//  *      node index.js
//  * </boltAction>
//  * </boltArtifact>
//  * Output:
//  * [{
// {
//   prompt: 'Initialize a new project',
//   steps: [
//     {
//       id: 1,
//       title: 'Create README.md',
//       description: 'Create a README file for the project',
//       type: 0,
//       status: 'pending',
//       path: '/project/README.md'
//     }
//   ]
// }
// {
//   file: {
//     name: 'README.md',
//     type: 'file',
//     content: '# My Project',
//     path: '/project/README.md'
//   },
//   onClose: [Function: onClose]
// }
/*
 * Parse input XML and convert it into steps.
 * Eg: Input - 
 * <boltArtifact id=\"project-import\" title=\"Project Files\">
 *  <boltAction type=\"file\" filePath=\"eslint.config.js\">
 *      import js from '@eslint/js';\nimport globals from 'globals';\n
 *  </boltAction>
 * <boltAction type="shell">
 *      node index.js
 * </boltAction>
 * </boltArtifact>
 * 
 * Output - 
 * [{
 *      title: "Project Files",
 *      status: "Pending"
 * }, {
 *      title: "Create eslint.config.js",
 *      type: StepType.CreateFile,
 *      code: "import js from '@eslint/js';\nimport globals from 'globals';\n"
 * }, {
 *      title: "Run command",
 *      code: "node index.js",
 *      type: StepType.RunScript
 * }]
 * 
 * The input can have strings in the middle they need to be ignored
 */

// Define StepType enum equivalent in JavaScript
// Define StepType enum equivalent in JavaScript
export const StepType = {
  CreateFile: 0,
  CreateFolder: 1,
  RunScript: 2
};

/**
 * Parse input XML and convert it into steps.
 * @param {string} response - The XML string to parse
 * @returns {Array} Array of step objects
 */
export function parseXml(response) {
  // Remove any code block backticks if present
  const cleanResponse = response.replace(/```(?:html|xml)?\s*/, '').replace(/\s*```\s*$/, '');
  
  // Extract the XML content between <boltArtifact> tags
  const xmlMatch = cleanResponse.match(/<boltArtifact[^>]*>([\s\S]*?)<\/boltArtifact>/);
  
  if (!xmlMatch) {
    console.warn('No boltArtifact tag found in the response');
    return [];
  }

  const xmlContent = xmlMatch[1];
  const steps = [];
  let stepId = 1;

  // Extract artifact ID and title
  const idMatch = cleanResponse.match(/id="([^"]*)"/);
  const titleMatch = cleanResponse.match(/title="([^"]*)"/);
  
  const artifactId = idMatch ? idMatch[1] : 'project-import';
  const artifactTitle = titleMatch ? titleMatch[1] : 'Project Files';

  // Regular expression to find boltAction elements
  const actionRegex = /<boltAction\s+type="([^"]*)"(?:\s+filePath="([^"]*)")?>([\s\S]*?)<\/boltAction>/g;
  
  let match;
  while ((match = actionRegex.exec(xmlContent)) !== null) {
    const [, type, filePath, content] = match;

    if (type === 'file') {
      // File creation step
      steps.push({
        id: stepId++,
        title: `Create \`${filePath.split('/').pop() || 'file'}\``,
        description: `Create file at path ${filePath}`,
        type: StepType.CreateFile, // Use integer value 0
        status: 'pending',
        code: content.trim(),
        path: filePath
      });
    } else if (type === 'shell') {
      // Shell command step
      steps.push({
        id: stepId++,
        title: 'Run command',
        description: `Execute: ${content.trim()}`,
        type: StepType.RunScript, // Use integer value 2
        status: 'pending',
        code: content.trim()
      });
    }
  }

  return steps;
}

