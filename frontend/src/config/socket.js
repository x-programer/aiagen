import { io } from 'socket.io-client';

let socketInstance = null;

/**
 * Initializes a socket.io-client instance with the server URL and the authentication token obtained from local storage.
 * Returns the socket.io-client instance.
 * @returns {Socket} The socket.io-client instance.
 */
export const initializeSocket = (projectId) => {
    socketInstance = io(import.meta.env.VITE_API_URL, {
        auth: {
            token: localStorage.getItem('token')
        },
        query: {
            projectId
        },
    });

    console.log(socketInstance, "Socket instance");

    //Event listeners for debugging..
    socketInstance.on('connect', () => {
        console.log('Connected to server');
    });

    socketInstance.on('connect_error', (error) => {
        console.error('Connection error:', error);
    });

    socketInstance.on('disconnect', () => {
        console.log('Disconnected from server');
    });

    return socketInstance;
};

export const receiveMessage = (eventName, cb) => {
    socketInstance.on(eventName, cb);
}

export const sendMesaage = (eventName, data) => {
    socketInstance.emit(eventName, data);
}