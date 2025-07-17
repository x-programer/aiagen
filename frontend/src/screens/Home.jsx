import React, { useContext, useState, useEffect } from 'react';
import { UserContext } from '../context/user.context';
import { FiSun, FiMoon, FiMenu, FiX, FiPlus } from 'react-icons/fi';
import { FaProjectDiagram, FaUser } from 'react-icons/fa';
import axios from '../config/axios';
import { useNavigate } from 'react-router-dom';

function Home() {
  
  const { user, setUser } = useContext(UserContext);
  const [darkMode, setDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isModalOpen, setModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [project, setProject] = useState([]);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Toggle sidebar
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Open modal
  const openModal = () => {
    setModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setModalOpen(false);
    setProjectName('');
  };

  const navigate = useNavigate();

  // Handle project creation
  const handleCreateProject = () => {
    if (!projectName.trim()) {
      alert('Project name is required!');
      return;
    }

    axios
      .post('/projects/create', { name: projectName })
      .then((res) => {
        closeModal();
        axios
          .get('/projects/all')
          .then((res) => {
            setProject(res.data.projects);
          })
          .catch((err) => {
            console.log(err);
          });
      })
      .catch((err) => {
        console.log(err);
      });
  };

  // Fetch project data on component mount
  useEffect(() => {
    axios
      .get('/projects/all')
      .then((res) => {
        setProject(res.data.projects);
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);


  return (
    <div className={darkMode ? 'dark' : ''}>
      
      <main>
        <div className="flex h-screen bg-white dark:bg-gray-900">
          {/* Slim Sidebar */}
          <div
            className={`${isSidebarOpen ? 'w-20' : 'w-0'} 
              transition-all duration-300 ease-in-out 
              border-r bg-white dark:bg-gray-800 dark:border-gray-700 
              overflow-hidden`}
          >
            <div className="flex flex-col h-full p-4">
              <div className="flex items-center justify-between mb-8">
                {isSidebarOpen && (
                  <button
                    onClick={toggleSidebar}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <FiX className="text-xl text-gray-600 dark:text-gray-400" />
                  </button>
                )}
              </div>

              <nav className="flex-1 flex flex-col items-center space-y-6">
                <button
                  onClick={openModal}
                  className="p-3 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 transition-colors"
                >
                  <FiPlus className="text-2xl" />
                </button>
                
                <div className="w-full border-b dark:border-gray-700" />

                <div className="space-y-4 w-full">
                  {project.map((proj) => (
                    <div
                      key={proj._id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors
                        ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
                      onClick={() => navigate(`/project`, { state: { project } })}
                    >
                      <FaProjectDiagram className={`text-xl mx-auto ${darkMode ? "text-gray-400" : "text-gray-600"}`} />
                    </div>
                  ))}
                </div>
              </nav>

              <div className="mt-auto border-t pt-4 dark:border-gray-700 flex justify-center">
                <img
                  src="https://via.placeholder.com/40"
                  alt="Profile"
                  className="rounded-full w-10 h-10 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Bar */}
            <div className="border-b bg-white p-4 dark:bg-gray-800 dark:border-gray-700">
              <div className="flex items-center justify-between">
                {!isSidebarOpen && (
                  <button
                    onClick={toggleSidebar}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <FiMenu className="text-xl text-gray-600 dark:text-gray-400" />
                  </button>
                )}
                
                <div className="flex items-center space-x-4">
                  <button
                    onClick={toggleDarkMode}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
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

            {/* Project Grid */}
            <div className="flex-1 bg-gray-50 p-8 overflow-y-auto dark:bg-gray-900">
              <h2 className="text-2xl font-semibold mb-8 text-gray-800 dark:text-gray-200">Projects</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {project.map((proj) => (
                  <div
                    key={proj._id}
                    className={`p-6 rounded-xl cursor-pointer transition-all
                      ${darkMode ? 
                        "bg-gray-800 hover:bg-gray-700" : 
                        "bg-white hover:bg-gray-50"} 
                      shadow-sm hover:shadow-md`}
                    onClick={() => navigate(`/project`, { state: { project } })}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <FaProjectDiagram className={`text-2xl ${darkMode ? "text-indigo-400" : "text-indigo-500"}`} />
                      <span className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                        <FaUser className="inline-block mr-1" /> {proj.users.length}
                      </span>
                    </div>
                    <h3 className={`text-lg font-medium ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
                      {proj.name}
                    </h3>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Simplified Create Project Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-96">
              <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">New Project</h2>
              <input
                type="text"
                placeholder="Project Name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full p-3 border rounded-lg mb-6 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeModal}
                  className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-lg dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProject}
                  className="px-5 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Home;