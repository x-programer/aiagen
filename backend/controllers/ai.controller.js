import * as ai from '../services/ai.service.js';

/**
 * Handles the incoming request and response for AI-related services.
 * It delegates the request to the aiService function and sends an appropriate
 * response back to the client. In case of an error, it logs the error and
 * sends a 500 status with an error message.
 *
 * @param {Object} req - The request object containing client request data.
 * @param {Object} res - The response object used to send back the desired HTTP response.
 */

export const aiController = async (req, res) => {
    try {
        await ai.aiService(req, res);
    } catch (err) {
        console.error("Controller Error:", err);
        res.status(500).json({
            error: "An internal server error occurred.",
        });
    }
};

export const aiTemplate = async(req,res) => {
    try{

        await ai.aiTemplateService(req, res);

    } catch(err){
        console.log('Controller error from Template' , err);
        res.status(500).json({ error: "An internal server error occurred." });
    }
}