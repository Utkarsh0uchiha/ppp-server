import OpenAI from "openai";

const API_KEY = process.env.OPENAI_API_KEY || '';

const openai = new OpenAI(
    {
        apiKey: API_KEY,
        maxRetries:2,
    }
);

export default openai;