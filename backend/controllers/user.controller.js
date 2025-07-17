import userModel from '../models/user.model.js';
import * as userService from '../services/user.service.js';
import { validationResult } from 'express-validator';
import redisClient from '../services/redis.service.js';


// Create user controller..
export const createUserController = async (req, res) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        console.log('tt');
        return res.status(400).json({ error: errors.array() });
    }

    try {
        const user = await userService.createUser(req.body.email, req.body.password);
        const token = await user.generateJWT();

        delete user._doc.password;

        return res.status(201).json({ user, token });
    } catch (err) {
        console.log('mm');
        return res.status(400).json({ error: err.message });
    }
}

// login user controller..
export const loginUserController = async (req, res) => {
    const error = validationResult(req);

    if (!error.isEmpty()) {
        return res.status(400).json({ error: error.array() });
    }

    try {
        const { email, password } = req.body;

        const user = await userModel.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ error: "Invalid Email" });
        }

        const isMatch = await user.isPasswordValid(password);
        if (!isMatch) {
            return res.status(401).json(
                { error: "Invalid Password" }
            )
        }

        //if email and password are correct then genrate token..
        const token = await user.generateJWT();
        delete user._doc.password;
        return res.status(200).json({ user, token })

    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
}

// profile controller..
export const profileController = async (req, res) => {
    try {

        console.log(req.user);
        res.status(200).json({
            user: req.user
        });

    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
}

// logout controller..
export const logoutController = async (req, res) => {
    try {

        const token = req.cookies?.token || req.headers.authorization.split(' ')[1];
        if (!token)
            return res.status(401).json({ error: 'Unauthorized user! No token provided' });

        redisClient.set(token, 'logout', 'EX', 60 * 60 * 24)

        res.status(200).json({ message: 'Logout successfully' });

    } catch (err) {
        console.log(err, 'error from logout controller');
        return res.status(400).json({ error: err.message });
    }
}

// get all users controller..
export const getAllUsersController = async (req, res) => {
    try {
        const loggedInUser = await userModel.findOne({ email: req.user.email });
        const userId = loggedInUser._id;
        const allUsers = await userService.getAllUsers({userId});
        return res.status(200).json({ users: allUsers });

    } catch (err) {
        return res.status(400), json({ error: err.message });
    }
}