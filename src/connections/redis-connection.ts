import { createClient } from "redis";


// const REDIS_USERNAME = process.env.REDIS_USERNAME;
// const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
// const REDIS_HOST = process.env.REDIS_HOST;
// const REDIS_PORT = process.env.REDIS_PORT;
// const REDIS_DB_NUMBER = process.env.REDIS_DB_NUMBER;
const REDIS_URI = process.env.REDIS_URL;
console.log(REDIS_URI);
const uri = REDIS_URI;

// REDIS CONNECTION
const redisClient = createClient({
    url: uri,
});
const verifyOTP = async (otp: string, email: string) => {
    const storedOTP = await redisClient.get(`otp:${email}`);
    if (!storedOTP) return false;
    if (otp.toString() != storedOTP) return false;
    return true;
}


export { redisClient, verifyOTP };
