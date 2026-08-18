import "dotenv/config";
import { createClient } from "redis";

const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = process.env.REDIS_PORT;
const REDIS_USERNAME = process.env.REDIS_USERNAME;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_DB_NUMBER = process.env.REDIS_DB_NUMBER;

if (!REDIS_HOST) throw new Error("REDIS_HOST is not defined");
if (!REDIS_PORT) throw new Error("REDIS_PORT is not defined");
if (!REDIS_USERNAME) throw new Error("REDIS_USERNAME is not defined");
if (!REDIS_PASSWORD) throw new Error("REDIS_PASSWORD is not defined");

const redisClient = createClient({
    socket: {
        host: REDIS_HOST,
        port: Number(REDIS_PORT),
    },
    username: REDIS_USERNAME,
    password: REDIS_PASSWORD,
    database: Number(REDIS_DB_NUMBER || 0),
});

redisClient.on("error", (err) => {
    console.error("Redis Client Error:", err);
});

redisClient.on("connect", () => {
    console.log("Connecting to Redis...");
});

redisClient.on("ready", () => {
    console.log("Redis connected successfully");
});

redisClient.on("reconnecting", () => {
    console.log("Redis reconnecting...");
});

export const connectRedis = async () => {
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }
};

export const verifyOTP = async (
    otp: string,
    email: string
): Promise<boolean> => {
    const storedOTP = await redisClient.get(`otp:${email}`);

    if (!storedOTP) {
        return false;
    }

    return otp.toString() === storedOTP;
};

export { redisClient };