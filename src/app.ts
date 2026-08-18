import express from 'express';
import { Request, Response } from 'express';
import { createServer, Server } from 'http';
import { redisClient } from './connections/redis-connection';
import cors from 'cors';
import userController from './controllers/user.controller';


// Import routes
import userRouter from './routes/user.routes';
import aptitudeRouter from './routes/aptitude.routes';
import questionRouter from './routes/question.routes';
import screenshotRouter from './routes/screenshot.routes';
class App {
    public app: express.Application;
    public server: Server;
    private env: string = process.env.ENV || 'DEV';

    constructor() {
        this.app = express();
        this.server = createServer(this.app);
        this.app.use(express.static('public'));
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        if (this.env === 'DEV')
            this.app.use(cors(
                {
                    origin: "http://localhost:5173",
                    credentials: true
                }
            ));
        this.app.get('/', (req: Request, res: Response) => {
            res.send('Hello World');
        });
        redisClient.on("error", (err) => console.log("Redis Client Error", err))
        redisClient.connect().then(() => console.log("Connected to redis"));
        redisClient.on("ready", () => {
            console.log("Redis client ready")
        });
    }

    public listen() {
        this.server.listen(3000, () => {
            console.log('Server is running on port 3000');
        });
    }

    public initializeRoutes() {
        // Add your routes here
        this.app.use('/user', userRouter);
        this.app.use('/aptitude', aptitudeRouter);
        this.app.use('/question', questionRouter);
        this.app.use('/screenshot', screenshotRouter);
    }
}

export default new App(); 