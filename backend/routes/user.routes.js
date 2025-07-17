import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import * as authMiddleware from '../middleware/auth.middleware.js';
import { body } from 'express-validator';

const router = Router();

//register route..
router.post('/register',
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').isLength({ min: 2 }).withMessage('Password must be at least 2 characters long'),
    userController.createUserController
);

//login route..
router.post('/login',
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').isLength({ min: 2 }).withMessage('Please valid password'),
    userController.loginUserController
)

//profile route..
router.get('/profile', authMiddleware.authUser, userController.profileController);

//logout route..
router.get('/logout', authMiddleware.authUser, userController.logoutController)

//get all users route..
router.get('/all', authMiddleware.authUser, userController.getAllUsersController);


export default router;