import argon2 from "argon2";
import mongoose from "mongoose";
import jwt from 'jsonwebtoken';

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
        // required: true,
        select: false,
    }
});

userSchema.statics.hashPassword = async function (password) {
    try {
        // Use hash method 
        return await argon2.hash(password);
    } catch (err) {
        console.log("Some error occurred during password hashing " + err);
        throw err; // It's better to throw the error for proper error handling
    }
};

userSchema.methods.isPasswordValid = async function (password) {
    // Use verify method from argon2
    return await argon2.verify(this.password, password);
};

userSchema.methods.generateJWT = function () {
    return jwt.sign({ email: this.email }, process.env.JWT_SECRET , { expiresIn: '24h' });
};

const User = mongoose.model('user', userSchema);

export default User;