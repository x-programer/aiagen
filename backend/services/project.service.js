import projectModel from "../models/project.model.js";
import mongoose from "mongoose";

export const createProject = async ({ name, userId }) => {
    if (!name) {
        throw new Error('Name is required');
    }

    if (!userId) {
        throw new Error('User ID is required');
    }

    let project;
    try {
        project = await projectModel.create({
            name,
            users: [userId],
        });
    } catch (err) {
        if (err.code === 11000) {
            throw new Error('Project name already exists');
        }
        throw err;
    }

    return project;
}

//get all project by user id..
export const getAllProjectByUserId = async ({ userId }) => {
    if (!userId) {
        throw new Error('User ID is required');
    }

    let projects;
    try {
        projects = await projectModel.find({ users: userId });
    } catch (err) {
        throw new Error('Error fetching projects');
    }
    return projects;
};

export const addUserToProject = async ({ projectId, users, userId }) => {
    if (!projectId) {
        throw new Error('Project ID is required');
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new Error('Project ID is invalid');
    }

    if (!userId) {
        throw new Error('User ID is required');
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('User ID is invalid');
    }

    if (!users || !Array.isArray(users)) {
        throw new Error('Users must be an array');
    }

    // Validate each user ID in the array
    for (const user of users) {
        if (!mongoose.Types.ObjectId.isValid(user)) {
            throw new Error('One or more user IDs are invalid');
        }
    }

    try {
        const project = await projectModel.findOne({ _id: projectId, users: userId });
        if (!project) {
            throw new Error('User does not belong to this project');
        }

        const updatedProject = await projectModel.findOneAndUpdate(
            { _id: projectId },
            { $addToSet: { users: { $each: users } } }, // Add multiple users using $each..
            { new: true }
        );

        return updatedProject;

    } catch (err) {
        throw new Error('Error adding user to project: ' + err.message);
    }
};

//get single project by project id..
export const getSingleProjectById = async ({ projectId }) => {
    if (!projectId) {
        throw new Error('Project ID is required');
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new Error('Project ID is invalid');
    }

    let project;
    try {
        project = await projectModel.findOne({ _id: projectId }).populate('users');
    } catch (err) {
        throw new Error('Error fetching project');
    }
    return project;
};