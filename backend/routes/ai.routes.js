import { Router } from 'express';
import * as aiController from '../controllers/ai.controller.js';

const router = Router();

router.post('/chat', aiController.aiController);
router.post('/template' , aiController.aiTemplate)

export default router;