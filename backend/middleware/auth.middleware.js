import jwt from 'jsonwebtoken';
import redisClient from '../services/redis.service.js';

export const authUser = async (req, res, next) => {
    try {
        // Check if authorization header exists
        if (!req.headers.authorization) {
            return res.status(401).json({
                error: "Authorization header not found"
            });
        }

        // Get token from header
        const token = req.cookies?.token || req.headers.authorization.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                error: "Unauthorized user! No token provided"
            });
        }

        // Check if token is blacklisted and user has logged out..
        const isBlacklisted = await redisClient.get(token);
        if (isBlacklisted) {

            res.cookie('token', '');
            return res.status(401).json({
                error: "Unauthorized user! Token blacklisted please login again.. "
            })

        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();

    } catch (err) {
        return res.status(401).json({ error: err.message });
    }
}