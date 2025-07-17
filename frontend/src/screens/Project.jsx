import React, { useState, useEffect, useContext, useRef } from "react";
import { useLocation } from "react-router-dom";
import { FiSun, FiMoon, FiMenu, FiX, FiUser, FiPlus } from "react-icons/fi";
import { IoIosSend, IoIosArrowBack, IoIosArrowForward, IoIosPerson } from "react-icons/io";
import axios from "../config/axios";
import EmojiPicker from "emoji-picker-react"; // Import the Emoji Picker
import { initializeSocket, sendMesaage, receiveMessage } from "../config/socket";
import { UserContext } from "../context/user.context";
import { format } from 'date-fns'; // Import date-fns for formatting timestamps
import { Link, useNavigate } from 'react-router-dom';

function Project() {
    const location = useLocation();
    const projectData = location.state;
    const chatContainerRef = useRef(null);

    const [darkMode, setDarkMode] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 640);
    const [isUserSidebarOpen, setIsUserSidebarOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [collaborators, setCollaborators] = useState([]);
    const [users, setUsers] = useState([]);
    const [project, setProject] = useState([]);
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false); // State for emoji picker visibility
    const { user } = useContext(UserContext);

    const [prompt, setPrompt] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (prompt.trim()) {

            navigate('/code', { state: { prompt } });

        }
    };


    //use Effect for scrolling to bottom of chat
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    // Fetch all users and project data
    useEffect(() => {
        initializeSocket(projectData.project[0]._id);

        // Listen for incoming messages
        receiveMessage('project-message', (data) => {
            // Ensure the message is added only if it's not from the current user
            if (data.sender !== user._id) {
                setMessages((prevMessages) => [...prevMessages, data]);
            }
        });

        axios.get('/projects/get-project/' + projectData.project[0]._id)
            .then((res) => {
                console.log(res.data, "project data");
                setProject(res.data.project);
            })
            .catch(err => console.log(err));

        axios.get('/users/all')
            .then((res) => {
                setUsers(res.data.users);
            }).catch(err => console.log(err));

        // Cleanup socket listener on unmount
        return () => {
            if (socket) {
                socket.off('project-message');
            }
        };
    }, []);

    // Open modal
    const openModal = () => setIsModalOpen(true);
    // Close modal
    const closeModal = () => setIsModalOpen(false);

    // Add user as collaborator
    const selectCollaborator = (userId) => {
        setCollaborators(prevSelected => {
            const newSelectedUserId = new Set(prevSelected);
            if (newSelectedUserId.has(userId)) {
                newSelectedUserId.delete(userId);
            } else {
                newSelectedUserId.add(userId);
            }
            console.log(Array.from(newSelectedUserId));
            return newSelectedUserId;
        });
    };

    // Add collaborator to project
    const addCollaborator = () => {
        axios.put('/projects/add-user', {
            projectId: projectData.project[0]._id,
            users: Array.from(collaborators)
        }).then((res) => {
            console.log(res.data);
            setIsModalOpen(false);
        }).catch(err => console.log(err));
    };

    // Handle emoji selection
    const handleEmojiClick = (emojiObject) => {
        setMessage(prevMessage => prevMessage + emojiObject.emoji); // Append the selected emoji to the message
        setIsEmojiPickerOpen(false); // Close the emoji picker after selection
    };

    // Handle sending a message
    const handleSendMessage = () => {
        if (message.trim()) {
            const newMessage = {
                text: message,
                sender: user._id,
                senderEmail: user.email, // Include the sender's email
                timestamp: new Date().toISOString(), // Add the current timestamp
            };
            sendMesaage('project-message', newMessage);
            setMessages((prevMessages) => [...prevMessages, newMessage]); // Update UI optimistically
            setMessage("");
        }
    };
    return (
        <div className={darkMode ? "dark" : ""}>
            <main>
                <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
                    {/* Left Sidebar (Chat Area) */}
                    <div
                        className={`${isSidebarOpen ? "w-[80%] sm:w-[25%]" : "w-0"} 
              transition-all duration-300 ease-in-out 
              border-r bg-white shadow-lg dark:bg-gray-800 dark:border-gray-700 
              overflow-hidden`}
                    >
                        <div className="flex flex-col h-full p-4">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                                    Chat
                                </h2>
                                <div className="flex items-center space-x-4">
                                    <button onClick={() => setIsUserSidebarOpen(true)}>
                                        <FiUser className="text-xl text-gray-600 dark:text-gray-400" />
                                    </button>
                                    {isSidebarOpen && (
                                        <button
                                            onClick={() => setIsSidebarOpen(false)}
                                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 sm:hidden"
                                        >
                                            <FiX className="text-xl text-gray-600 dark:text-gray-400" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Add Collaborators Button */}
                            <button
                                className="flex items-center space-x-2 mb-4"
                                onClick={openModal}
                            >
                                <FiPlus className="text-gray-800 dark:text-gray-200" />
                                <h2 className="text-gray-800 dark:text-gray-200 font-mono hover:cursor-pointer">
                                    Add collaborators
                                </h2>
                            </button>
                            <hr className="mb-3 font-bold " />

                            {/* Chat Messages */}
                            <div ref={chatContainerRef} className="flex-1 overflow-y-auto mb-4 scrollbar-hide">
                                {messages.map((msg, index) => {
                                    const formattedTime = format(new Date(msg.timestamp), 'h:mm a'); // Format the timestamp

                                    return (
                                        <div
                                            key={index}
                                            className={`flex mb-2 ${msg.sender === user._id ? "justify-end" : "justify-start"}`}
                                        >
                                            <div
                                                className={`p-3 max-w-[26ch] break-words ${msg.sender === user._id
                                                    ? "rounded-tl-2xl rounded-br-2xl rounded-bl-2xl bg-blue-200 dark:bg-blue-800" // For messages sent by the current user
                                                    : "rounded-tr-2xl rounded-br-2xl rounded-bl-2xl bg-gray-100 dark:bg-gray-700" // For messages received from others
                                                    }`}
                                            >
                                                {/* Display the sender's email */}
                                                <p className={`text-xs font-semibold text-gray-600 dark:text-gray-400 ${msg.sender === user._id ? "text-left" : "text-left"}`}>
                                                    {msg.senderEmail}
                                                </p>
                                                <div className="flex items-center">
                                                    {msg.sender !== user._id && (
                                                        <IoIosArrowBack className="text-xl text-gray-600 dark:text-gray-400 mr-2" />
                                                    )}
                                                    <p
                                                        className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap w-full"
                                                    >
                                                        {msg.text}
                                                    </p>
                                                    {msg.sender === user._id && (
                                                        <IoIosArrowForward className="text-xl text-gray-600 dark:text-gray-400 ml-2" />
                                                    )}
                                                </div>
                                                {/* Display the timestamp */}
                                                <p className={`text-xs text-gray-600 dark:text-gray-400 mt-1 ${msg.sender === user._id ? "text-right" : "text-right"}`}>
                                                    {formattedTime}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Chat Input with Emoji Picker */}
                            <div className="flex items-center border-t pt-4 dark:border-gray-700 relative">
                                {/* Message Input */}
                                <input
                                    type="text"
                                    placeholder="Type a message..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className="flex-1 p-3 border rounded-3xl dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 pr-12" // Add padding-right for the emoji button
                                />

                                {/* Emoji Picker Button */}
                                <button
                                    onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                                    className="absolute right-16 p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                >
                                    😊
                                </button>

                                {/* Emoji Picker */}
                                {isEmojiPickerOpen && (
                                    <div className="absolute bottom-16 right-4 z-50">
                                        <EmojiPicker
                                            onEmojiClick={handleEmojiClick}
                                            theme={darkMode ? "dark" : "light"}
                                            width={300} // Set a fixed width for the emoji picker
                                            height={400} // Set a fixed height for the emoji picker
                                        />
                                    </div>
                                )}

                                {/* Send Button */}
                                <button
                                    onClick={handleSendMessage}
                                    className="ml-2 p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                                >
                                    <IoIosSend className="text-xl" />
                                </button>
                            </div>
                        </div>
                    </div>


                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="border-b bg-white p-4 dark:bg-gray-800 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                {!isSidebarOpen && (
                                    <button
                                        onClick={() => setIsSidebarOpen(true)}
                                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 sm:hidden"
                                    >
                                        <FiMenu className="text-xl text-gray-600 dark:text-gray-400" />
                                    </button>
                                )}
                                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                                    Project: {projectData?.name}
                                </h2>
                                <div className="flex items-center space-x-4">
                                    <button
                                        onClick={() => setDarkMode(!darkMode)}
                                        className="p-2 rounded-lg bg-gray-200 ml-5 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                                    >
                                        {darkMode ? (
                                            <FiSun className="text-xl text-gray-800 dark:text-gray-200" />
                                        ) : (
                                            <FiMoon className="text-xl text-gray-800 dark:text-gray-200" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 bg-gradient-to-br from-gray-50 via-white to-gray-100 p-4 sm:p-6 overflow-y-auto dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 scrollbar-hide backdrop-blur-lg">
    <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl p-4 sm:p-8 transition-all duration-300 hover:shadow-xl sm:hover:shadow-2xl border border-white/20 dark:border-gray-700/50 backdrop-blur-md">
        <div className="mb-6 sm:mb-8">
            <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                ✨ AI Website Builder
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-base sm:text-lg">
                {projectData?.description || "Transform your ideas into a website using natural language."}
            </p>
            <div className="mt-3 sm:mt-4 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full w-20 sm:w-24 opacity-80"/>
        </div>

        <div className="min-h-[calc(100vh-10rem)] sm:min-h-[calc(100vh-12rem)] flex items-center justify-center">
            <div className="relative group w-full max-w-md sm:max-w-2xl">
                <div className="absolute -inset-0.5 sm:-inset-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl sm:rounded-3xl blur opacity-20 sm:opacity-25 group-hover:opacity-30 sm:group-hover:opacity-40 transition duration-1000"/>
                
                <div className="relative bg-white dark:bg-gray-800 p-4 sm:p-8 rounded-2xl sm:rounded-3xl shadow-lg sm:shadow-xl border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:border-blue-300 dark:hover:border-blue-500/50">
                    <div className="text-center mb-6 sm:mb-8">
                        <div className="animate-float inline-block">
                            <span className="text-3xl sm:text-4xl">🚀</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold mt-3 sm:mt-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            Start Creating
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">
                            Describe your dream website in plain English
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                        <div className="relative">
                            <input
                                type="text"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Example: 'Modern e-commerce site with dark mode...'"
                                className="w-full px-4 sm:px-6 py-3 sm:py-4 text-base sm:text-lg border-0 ring-1 sm:ring-2 ring-gray-200/50 dark:ring-gray-700 rounded-xl sm:rounded-2xl focus:ring-3 sm:focus:ring-4 focus:ring-blue-500/30 dark:focus:ring-blue-600/50 bg-white/50 dark:bg-gray-700/20 placeholder-gray-400/60 dark:placeholder-gray-500 transition-all duration-300 pr-[6.5rem] sm:pr-20"
                                required
                            />
                            <button
                                type="submit"
                                className="absolute right-1 sm:right-2 top-1 sm:top-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 sm:px-8 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl hover:scale-[1.02] hover:shadow-md sm:hover:shadow-lg active:scale-95 transition-transform duration-200 flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
                            >
                                <span>Create Magic</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd"/>
                                </svg>
                            </button>
                        </div>

                        <div className="text-center">
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                Try: 
                                <button
                                    type="button"
                                    onClick={() => setPrompt("Portfolio site with 3D animations and contact form")}
                                    className="ml-1 sm:ml-2 text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-xs sm:text-sm"
                                >
                                    Portfolio Example
                                </button>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
</div>


                    </div>


                    {/* Right User Sidebar */}
                    <div
                        className={`${isUserSidebarOpen ? "w-[80%] sm:w-[20%]" : "w-0"} 
              transition-all duration-300 ease-in-out 
              border-l bg-white shadow-lg dark:bg-gray-800 dark:border-gray-700 
              overflow-hidden`}
                    >
                        <div className="flex flex-col h-full p-4">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                                    User Profile
                                </h2>
                                <button
                                    onClick={() => setIsUserSidebarOpen(false)}
                                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    <FiX className="text-xl text-gray-600 dark:text-gray-400" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto scrollbar-hide">
                                <div className="text-gray-800 dark:text-gray-200 space-y-4">
                                    <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                        <h3 className="font-semibold">Account Settings</h3>
                                        <p className="text-sm">Email: user@example.com</p>
                                    </div>
                                    <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                        <h3 className="font-semibold">Preferences</h3>
                                        <p className="text-sm">Dark Mode: {darkMode ? "On" : "Off"}</p>
                                    </div>
                                    <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                        <h3 className="font-semibold">Statistics</h3>
                                        <p className="text-sm">Messages sent: {messages.length}</p>
                                    </div>
                                </div>
                                <hr className=" mt-6 mb-6" />

                                {project.users && project.users.map((user) => {
                                    return (
                                        <div className="flex items-center justify-between p-3 mt-2 bg-gray-100 dark:bg-gray-700 rounded-lg ">
                                            <div className="flex items-center">
                                                <IoIosPerson className="text-xl text-gray-800 dark:text-gray-200 mr-2" />
                                                <h3 className="font-serif text-gray-800 dark:text-gray-200">
                                                    {user.email}
                                                </h3>
                                            </div>
                                        </div>
                                    )
                                })}

                            </div>
                        </div>
                    </div>
                </div>

                {/* Modal for Adding Collaborators */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-hidden">
                            <div className="flex justify-between items-center mb-4">
                                <FiUser className="text-xl text-gray-800 dark:text-gray-200" />
                                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                                    Add Collaborators
                                </h2>
                                <button
                                    onClick={closeModal}
                                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    <FiX className="text-xl text-gray-600 dark:text-gray-400" />
                                </button>
                            </div>

                            {/* Scrollable User List */}
                            <div className="space-y-4 max-h-[70vh] overflow-y-auto scrollbar-hide">
                                {users.map((user) => (
                                    <div
                                        key={user._id}
                                        className="flex justify-between items-center p-3 bg-gray-100 dark:bg-gray-700 rounded-lg"
                                    >
                                        <div>
                                            <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                                                {user.email}
                                            </h3>
                                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                                {user._id}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => selectCollaborator(user._id)}
                                            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                                        >
                                            <FiPlus className="text-xl" />
                                        </button>
                                    </div>
                                ))}

                                <button
                                    onClick={addCollaborator}
                                    className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 w-full"
                                >
                                    Add Commit
                                </button>
                            </div>

                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

export default Project;