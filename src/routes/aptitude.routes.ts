import express from 'express';
import aptitudeController from '../controllers/aptitude.controller';
import { verifyJwt, adminAccess } from '../middlewares/auth.middleware';

const aptitudeRouter = express.Router();

aptitudeRouter.post('/create', verifyJwt, adminAccess, aptitudeController.createAptitude);
aptitudeRouter.get('/', verifyJwt, aptitudeController.getAptitude);
aptitudeRouter.delete('/:id', verifyJwt, adminAccess, aptitudeController.deleteAptitude);
aptitudeRouter.put('/:id', verifyJwt, adminAccess, aptitudeController.updateAptitude);
aptitudeRouter.get('/upcoming', verifyJwt, aptitudeController.getUpcomingAptitudes);
aptitudeRouter.get("/past", aptitudeController.getPastAptitudes);
aptitudeRouter.get('/:id', verifyJwt, adminAccess, aptitudeController.getAptitudeById);
aptitudeRouter.put('/add-questions/:id', verifyJwt, adminAccess, aptitudeController.addQuestionsToAptitude);
aptitudeRouter.post('/question/delete', verifyJwt, adminAccess, aptitudeController.deleteQuestionFromAptitude);
aptitudeRouter.post('/appear/:id', aptitudeController.getAptitudeForUser);
aptitudeRouter.post('/submit/:id', aptitudeController.submitAptitude);
aptitudeRouter.get("/responses/:id", verifyJwt, adminAccess, aptitudeController.getAptitudeResponses);
aptitudeRouter.get("/user/response/:id", verifyJwt, aptitudeController.getUserApitudeResponse);
aptitudeRouter.get("/toppers/:id", aptitudeController.getAptitudeToppers);

export default aptitudeRouter;