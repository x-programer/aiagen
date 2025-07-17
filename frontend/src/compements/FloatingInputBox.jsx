import { useState, useRef, useEffect, useCallback } from 'react';

function FloatingInputBox({
    onChange,
    onClick
}) {
    const [position, setPosition] = useState({ x: 100, y: 100 });
    const [size, setSize] = useState({ width: 300, height: 180 });
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [inputValue, setInputValue] = useState('');
    const [isMinimized, setIsMinimized] = useState(false);


    // Use refs to store state values to avoid closures in event handlers
    const positionRef = useRef(position);
    const sizeRef = useRef(size);
    const isDraggingRef = useRef(isDragging);
    const isResizingRef = useRef(isResizing);
    const dragOffsetRef = useRef(dragOffset);

    const floatingBoxRef = useRef(null);
    const resizeHandleRef = useRef(null);

    // Update refs when state changes
    useEffect(() => {
        positionRef.current = position;
        sizeRef.current = size;
        isDraggingRef.current = isDragging;
        isResizingRef.current = isResizing;
        dragOffsetRef.current = dragOffset;
    }, [position, size, isDragging, isResizing, dragOffset]);

    // Handle mouse down to start dragging with better performance
    const handleMouseDown = useCallback((e) => {
        if (e.target.classList.contains('drag-handle')) {
            const rect = floatingBoxRef.current.getBoundingClientRect();
            const offset = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };

            setDragOffset(offset);
            dragOffsetRef.current = offset;
            setIsDragging(true);
            isDraggingRef.current = true;

            // Prevent text selection during drag
            e.preventDefault();
        }
    }, []);

    // Handle input prompt change..
    const handleInputPromptChange = (e) => {
        const value = e.target.value;
        setInputValue(value);
        if (onChange) {
            onChange(value); // Pass the value directly to match your external handler
        }
    }

    const handleSubmit = () => {
        if (onSubmit) {
            onSubmit(inputValue); // Call the onSubmit prop with the current value
        }
        setInputValue(''); // Optional: Clear input after submit
    }

    // Handle resize start with better performance
    const handleResizeMouseDown = useCallback((e) => {
        e.stopPropagation();
        setIsResizing(true);
        isResizingRef.current = true;
        document.body.style.cursor = 'nwse-resize';
        e.preventDefault();
    }, []);

    // Use direct DOM manipulation for smoother dragging
    const handleMouseMove = useCallback((e) => {
        // Skip if not dragging or resizing
        if (!isDraggingRef.current && !isResizingRef.current) return;

        // Use requestAnimationFrame for smooth visual updates
        requestAnimationFrame(() => {
            if (isDraggingRef.current) {
                const newX = e.clientX - dragOffsetRef.current.x;
                const newY = e.clientY - dragOffsetRef.current.y;

                // Apply transform directly to DOM for immediate feedback
                if (floatingBoxRef.current) {
                    floatingBoxRef.current.style.transform = `translate3d(${newX}px, ${newY}px, 0)`;
                }

                // Update state less frequently
                setPosition({ x: newX, y: newY });
            } else if (isResizingRef.current) {
                const newWidth = Math.max(200, e.clientX - positionRef.current.x);
                const newHeight = Math.max(120, e.clientY - positionRef.current.y);

                // Apply size directly to DOM
                if (floatingBoxRef.current) {
                    floatingBoxRef.current.style.width = `${newWidth}px`;
                    floatingBoxRef.current.style.height = `${newHeight}px`;
                }

                // Update state less frequently
                setSize({ width: newWidth, height: newHeight });
            }
        });
    }, []);

    // Handle mouse up to stop dragging/resizing
    const handleMouseUp = useCallback(() => {
        if (isDraggingRef.current) {
            setIsDragging(false);
            isDraggingRef.current = false;
        }

        if (isResizingRef.current) {
            setIsResizing(false);
            isResizingRef.current = false;
            document.body.style.cursor = '';
        }
    }, []);

    // Add event listeners with proper options
    useEffect(() => {
        // Use passive: true for non-preventable events
        const moveOptions = { passive: false };
        const upOptions = { passive: true };

        window.addEventListener('mousemove', handleMouseMove, moveOptions);
        window.addEventListener('mouseup', handleMouseUp, upOptions);
        window.addEventListener('touchmove', handleMouseMove, moveOptions);
        window.addEventListener('touchend', handleMouseUp, upOptions);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove, moveOptions);
            window.removeEventListener('mouseup', handleMouseUp, upOptions);
            window.removeEventListener('touchmove', handleMouseMove, moveOptions);
            window.removeEventListener('touchend', handleMouseUp, upOptions);
        };
    }, [handleMouseMove, handleMouseUp]);

    return (
        <div
            ref={floatingBoxRef}
            className={`fixed left-0 top-0 bg-gray-800 rounded-lg shadow-xl overflow-hidden z-50 border border-gray-700 will-change-transform ${isDragging || isResizing ? 'opacity-90' : 'opacity-100'
                } ${isMinimized ? 'w-12 h-12' : ''}`}
            style={{
                transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
                width: isMinimized ? '' : `${size.width}px`,
                height: isMinimized ? '' : `${size.height}px`,
                transition: isDragging || isResizing ? 'none' : 'opacity 0.2s, width 0.2s, height 0.2s',
                WebkitBackfaceVisibility: 'hidden',
                backfaceVisibility: 'hidden'
            }}
        >
            {/* Header/Drag handle with better touch feedback */}
            <div
                className="drag-handle select-none bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 text-white text-sm font-semibold flex justify-between items-center cursor-grab active:cursor-grabbing hover:from-blue-700 hover:to-blue-600 transition-colors duration-200"
                onMouseDown={handleMouseDown}
                onTouchStart={handleMouseDown}
            >
                <span className={`${isMinimized ? 'hidden' : 'block'} select-none`}>Floating Input</span>
                <div className="flex space-x-3">
                    <button
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="text-white hover:bg-blue-700 rounded-full w-5 h-5 flex items-center justify-center transition-colors duration-200"
                    >
                        {isMinimized ? '+' : '-'}
                    </button>
                </div>
            </div>

            {/* Input area */}
            {!isMinimized && (
                <div className="p-4 h-[calc(100%-44px)] flex flex-col">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={handleInputPromptchnage}
                        placeholder="Enter text here..."
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                    <div className="flex justify-end mt-4">
                        <button
                            onClick={handleSubmit}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-200 shadow-md"
                        >
                            Submit
                        </button>
                    </div>
                </div>
            )}

            {/* Resize handle */}
            {!isMinimized && (
                <div
                    ref={resizeHandleRef}
                    className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize bg-blue-500 hover:bg-blue-600 transition-colors duration-200"
                    onMouseDown={handleResizeMouseDown}
                    onTouchStart={handleResizeMouseDown}
                />
            )}
        </div>
    );
}

export default FloatingInputBox;