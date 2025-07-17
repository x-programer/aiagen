import dotenv from 'dotenv/config.js';
import { Server } from 'socket.io';
import http from 'http';
import app from './app.js';
import jwt from 'jsonwebtoken';
import projectModel from './models/project.model.js';
import mongoose from 'mongoose';

const port = process.env.PORT || 3000;
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*',
    }
});

//ai calling start..

// const klusterApiKey = process.env.KLUSTER_API_KEY;
// const client = new OpenAI({ apiKey: klusterApiKey, baseURL: 'https://api.kluster.ai/v1' });

// const completion = await client.chat.completions.create({
//     model: "deepseek-ai/DeepSeek-R1",
//     max_completion_tokens: 5000,
//     temperature: 1,
//     top_p: 1,
//     messages: [
//         { role: "user", content: "what is water?" }
//     ]
// });

// console.log(completion.data.choices[0].message.content);

//ai calling end..



// Middleware for checking connection to Socket.IO
io.use( async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.split(' ')[1];
        const projectId = socket.handshake.query?.projectId;

        if(!mongoose.Types.ObjectId.isValid(projectId)) {
            console.log('Invalid project ID');
            return next(new Error('invalid project ID'));
        }

        socket.project = await projectModel.findOne({ _id: projectId }).lean();

        if (!token) {
            console.log('No token provided');
            return next(new Error('Authentication Error'));
        }

        // Verify token here
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded) {
            console.log('Invalid token');
            return next(new Error('Authentication Error'));
        }

        socket.user = decoded;
        console.log('User authenticated:', decoded);
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        next(error);
    }
});

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    socket.roomId = socket.project._id.toString();
    
    socket.join(socket.roomId);

    socket.on('project-message', (data)=>{

        console.log('Received message:', data);
        
        socket.broadcast.to(socket.roomId).emit('project-message', data);

    })

    socket.on('event', (data) => {
        console.log('Received event:', data);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
        socket.leave(socket.roomId);
    });
});

server.listen(port, () => {
    console.log(`Server is running on PORT ${port}`);
});