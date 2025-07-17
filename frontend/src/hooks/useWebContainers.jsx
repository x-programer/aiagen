import { useState, useEffect } from 'react';

export function useWebContainer() {
    const [webcontainer, setWebcontainer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        async function loadWebContainer() {
            try {
                setLoading(true);

                // Dynamically import WebContainer to avoid SSR issues
                const { WebContainer } = await import('@webcontainer/api');

                console.log('Initializing WebContainer...');
                const instance = await WebContainer.boot();
                console.log('WebContainer initialized successfully');

                // Create a basic package.json with essential dependencies
                const packageJson = {
                    name: "web-project",
                    version: "1.0.0",
                    scripts: {
                        "dev": "npx vite --host",
                        "build": "vite build",
                        "serve": "vite preview"
                    },
                    dependencies: {
                        "react": "^18.2.0",
                        "react-dom": "^18.2.0",
                        "lucide-react": "^0.263.1"
                    },
                    devDependencies: {
                        "vite": "^4.3.9"
                    }
                };

                // Mount the initial file structure with just package.json
                await instance.mount({
                    'package.json': {
                        file: {
                            contents: JSON.stringify(packageJson, null, 2)
                        }
                    }
                });

                // Pre-install common dependencies to speed up later use
                try {
                    console.log('Pre-installing core dependencies...');
                    const installProcess = await instance.spawn('npm', ['install']);
                    
                    const exitCode = await installProcess.exit;
                    if (exitCode !== 0) {
                        console.warn('Pre-installation completed with non-zero exit code:', exitCode);
                    } else {
                        console.log('Pre-installation completed successfully');
                    }
                    
                    setIsReady(true);
                } catch (installErr) {
                    console.warn('Pre-installation error (continuing anyway):', installErr);
                    // We'll continue even if this fails
                    setIsReady(true);
                }

                setWebcontainer(instance);
                setLoading(false);
            } catch (err) {
                console.error('Error initializing WebContainer:', err);
                setError(err.message);
                setLoading(false);
            }
        }

        loadWebContainer();

        // Clean up WebContainer on unmount
        return () => {
            if (webcontainer) {
                console.log('Cleaning up WebContainer...');
                setWebcontainer(null);
            }
        };
    }, []);

    return { webcontainer, loading, error, isReady };
}