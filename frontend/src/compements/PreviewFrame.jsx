import React, { useEffect, useState } from 'react';

// export function PreviewFrame({ fileStructure, webcontainer }: PreviewFrameProps) {
export function PreviewFrame({ fileStructure, webcontainer }) {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("Starting environment...");

  async function main() {
    if (!webcontainer) {
      setStatus("WebContainer not available");
      return;
    }

    try {
      setStatus("Installing dependencies...");
      
      // Check if package.json exists in the fileStructure
      const hasPackageJson = fileStructure.some(file => 
        file.name === 'package.json' || 
        (file.children && file.children.some(child => child.name === 'package.json'))
      );

      if (hasPackageJson) {
        const installProcess = await webcontainer.spawn('npm', ['install']);
        
        // Stream the output
        const installOutput = new WritableStream({
          write(data) {
            console.log(data);
            setStatus(`Installing: ${data}`);
          }
        });
        
        installProcess.output.pipeTo(installOutput);
        
        // Wait for install to complete
        const installExitCode = await installProcess.exit;
        
        if (installExitCode !== 0) {
          setStatus("Installation failed");
          return;
        }
        
        setStatus("Starting development server...");
        
        // Start the dev server
        const devProcess = await webcontainer.spawn('npm', ['run', 'dev']);
        
        // Log the dev server output
        const devOutput = new WritableStream({
          write(data) {
            console.log(data);
            setStatus(`Server: ${data}`);
          }
        });
        
        devProcess.output.pipeTo(devOutput);
        
        // Wait for the server to be ready
        webcontainer.on('server-ready', (port, serverUrl) => {
          console.log(`Server ready on port ${port} at ${serverUrl}`);
          setStatus("Server ready!");
          setUrl(serverUrl);
        });
      } else {
        setStatus("No package.json found. Creating simple preview.");
        
        // Create a simple server for HTML files
        await webcontainer.spawn('npx', ['serve', '-l', '3000']);
        
        webcontainer.on('server-ready', (port, serverUrl) => {
          console.log(`Simple server ready on port ${port} at ${serverUrl}`);
          setStatus("Preview ready!");
          setUrl(serverUrl);
        });
      }
    } catch (error) {
      console.error('Error in Preview:', error);
      setStatus(`Error: ${error.message}`);
    }
  }

  useEffect(() => {
    if (webcontainer) {
      main();
    }
  }, [webcontainer, fileStructure.length]); // Re-run when files change or webcontainer is available

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 bg-gray-100 text-sm border-b">
        <div className="text-gray-600">
          {status}
        </div>
      </div>
      <div className="flex-1 relative">
        {!url && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <div className="text-center">
              {status}
            </div>
          </div>
        )}
        
        {url && (
          <iframe 
            src={url} 
            className="w-full h-full border-0" 
            title="Preview"
            sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation"
          />
        )}
      </div>
    </div>
  );
}

export default PreviewFrame;