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

        // Middleware
        this.app.use(express.static('public'));
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        // CORS
        const allowedOrigins = [
            'http://localhost:5173',
            'https://pppsliet.live',
            'https://www.pppsliet.live',
        ];

        this.app.use(
            cors({
                origin: (origin, callback) => {
                    // Allow requests without an Origin header
                    // (Postman, curl, server-to-server requests, etc.)
                    if (!origin) {
                        return callback(null, true);
                    }

                    if (allowedOrigins.includes(origin)) {
                        return callback(null, true);
                    }

                    return callback(new Error(`CORS blocked origin: ${origin}`));
                },
                credentials: true,
            })
        );

        // Health check
        this.app.get('/', (req: Request, res: Response) => {
            res.send('Hello World');
        });

        // Redis
        redisClient.on('error', (err) => {
            console.error('Redis Client Error:', err);
        });

        redisClient.on('ready', () => {
            console.log('Redis client ready');
        });

        if (!redisClient.isOpen) {
            redisClient
                .connect()
                .then(() => {
                    console.log('Connected to redis');
                })
                .catch((err) => {
                    console.error('Failed to connect to Redis:', err);
                });
        }
    }

    public listen() {
        this.server.listen(3000, () => {
            console.log('Server is running on port 3000');
        });
    }

    public initializeRoutes() {
        // Routes
        this.app.use('/user', userRouter);
        this.app.use('/aptitude', aptitudeRouter);
        this.app.use('/question', questionRouter);
        this.app.use('/screenshot', screenshotRouter);
    }
}

export default new App();