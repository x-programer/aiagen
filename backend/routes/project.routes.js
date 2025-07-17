import { Router } from 'express';
import { body } from 'express-validator';
import * as projectController from '../controllers/project.controller.js';
import * as authMiddleware from '../middleware/auth.middleware.js';

const router = Router();

router.post('/create',
    authMiddleware.authUser,
    body('name').isString().withMessage('Name is required'),
    projectController.createProjectController
)

router.get('/all', authMiddleware.authUser, projectController.getAllProjectsController);

router.put('/add-user',
    authMiddleware.authUser,
    body('projectId').isString().withMessage('Project ID is required'),
    body('users').isArray({ min: 1 }).withMessage('Users must be an array with at least one user'),
    body('users.*').isString().withMessage('Each user must be a string'),
    projectController.addUserController
);

router.get('/get-project/:projectId', authMiddleware.authUser, projectController.getSingleProjectController);

export default router;