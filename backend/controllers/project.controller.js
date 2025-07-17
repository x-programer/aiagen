import { validationResult } from "express-validator";
import projectModel from "../models/project.model.js";
import * as projectService from '../services/project.service.js';
import userModel from "../models/user.model.js";


// controller to create project..
export const createProjectController = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array() });
    }

    try {
        const { name } = req.body;
        const loggedInUser = await userModel.findOne({ email: req.user.email });
        const userId = loggedInUser._id;
        const newProject = await projectService.createProject({ name, userId });

        return res.status(201).json(newProject);

    } catch (err) {
        console.log(err);
        return res.status(400).json({ error: err.message });
    }
}

//get all project controller..
export const getAllProjectsController = async (req, res) => {
    try {

        //first find userId by user's email..
        const loggedInUser = await userModel.findOne({ email: req.user.email });
        const allProject = await projectService.getAllProjectByUserId({ userId: loggedInUser._id });
        return res.status(200).json({ projects: allProject });

    } catch (err) {
        console.log(err);
        return res.status(400).json({ error: err.message });
    }
}

// add user controller ..
export const addUserController = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array() });
    }

    try {

        const { projectId, users } = req.body;
        const loggedInUser = await userModel.findOne({ email: req.user.email });

        const project = await projectService.addUserToProject({
            projectId,
            users,
            //loggedInUser._id is the user who is adding the user to the project..
            userId: loggedInUser._id
        })

        return res.status(200).json({ project });


    } catch (err) {
        console.log(err);
        return res.status(400).json({ error: err.message });
    }

}

// get single project controller..
export const getSingleProjectController = async (req, res) => {
    try {
        const { projectId } = req.params;

        const project = await projectService.getSingleProjectById({projectId});

        return res.status(200).json({ project });
        
    } catch(err){
        console.log(err);
        return res.status(400).json({ error: err.message });
    }

}