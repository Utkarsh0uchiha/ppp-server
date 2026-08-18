import { asyncHandler } from "../utils/asyncHandler";
import { Request, Response } from "express";
import ApiError from "../utils/ApiError";
import ApiResponse from "../utils/ApiResponse";
import { dbPool } from "../connections/pg-connection";
import { QUESTION_TYPES } from "../constants";
import uploadOnCloud from "../utils/uploadOnCloud";
import openai from "../utils/openAi";
import test from "node:test";
interface Question {
    description: string,
    options: any,
    correct_option: string | number[],
    difficulty_level: number,
    question_type: QUESTION_TYPES,
    format: string,
    topic_tags: any
}

interface filters {
    topic_tags: string[] | null
    question_type: QUESTION_TYPES
    difficulty_level: number,
    sort: 'ASC' | 'DESC'
}


class QuestionController {
    public addQuestion = asyncHandler(async (req: Request, res: Response) => {
        const question: Question = req.body;
        if (!question.options || !question.correct_option || !question.difficulty_level || !question.question_type || !question.format || !question.topic_tags) {
            return res.status(400).json(new ApiError('All fields are required', 400));
        }

        question.options = question.options.split('/|/');
        question.topic_tags = question.topic_tags.split(',');
        
        // Handle correct_option as array
        if (typeof question.correct_option === 'string') {
            console.log('Received correct_option as string:', question.correct_option);
            try {
                // Try to parse as JSON first (for new format)
                const parsed = JSON.parse(question.correct_option);
                question.correct_option = Array.isArray(parsed) ? parsed : [parsed];
                console.log('Parsed as JSON:', question.correct_option);
            } catch {
                // Fallback to old format with /|/ separator
                const correctOptionString = question.correct_option as string;
                question.correct_option = correctOptionString.split('/|/').map(Number);
                console.log('Parsed with separator:', question.correct_option);
            }
        } else if (!Array.isArray(question.correct_option)) {
            question.correct_option = [question.correct_option];
            console.log('Converted to array:', question.correct_option);
        } else {
            console.log('Already an array:', question.correct_option);
        }

        if (question.format === 'img') {
            const img = req.file?.path;
            if (!img) {
                return res.status(400).json(new ApiError('Image is required', 400));
            }
            const imgPath = await uploadOnCloud.upload(img, "questions");

            question.description = imgPath;
        }
        const client = await dbPool.connect();
        try {
            const { rows } = await client.query(
                `INSERT INTO questions (description, options, correct_option, difficulty_level, question_type, format, topic_tags)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *`,
                [question.description, question.options, question.correct_option, question.difficulty_level, question.question_type, question.format, question.topic_tags]
            );
            return res.status(201).json(new ApiResponse('Question added successfully', 201, rows[0]));
        } catch (error) {
            return res.status(500).json(new ApiError((error as Error).message, 500));
        }
        finally {
            client.release();
        }

    });

    public deleteQuestion = asyncHandler(async (req: Request, res: Response) => {
        const id: number = +req.params.id;

        try {
            const { rows } = await dbPool.query(
                "DELETE FROM questions WHERE id=$1 RETURNING *", [id]);
            return res.status(200).json(new ApiResponse("Question deleted successfully", 200, rows[0]))
        } catch (e) {
            return res.status(500).json(new ApiError((e as Error).message, 500));
        }
    });

    public getQuestions = asyncHandler(async (req: Request, res: Response) => {
        const filters: filters = req.body;
        // Get pagination parameters from the request
        const page = parseInt(req.query.page as string, 10) || 1; // Default to page 1 if not provided
        const limit = parseInt(req.query.limit as string, 10) || 10; // Default to 10 items per page
        const offset = (page - 1) * limit; // Calculate the offset for pagination

        try {
            let query = `SELECT * FROM questions WHERE 1=1`;
            let countQuery = `SELECT COUNT(*) AS total FROM questions WHERE 1=1`; // Separate query for total count
            let values: any[] = [];
            let index = 1;

            // Add filters dynamically
            if (filters.topic_tags && filters.topic_tags.length > 0) {
                query += ` AND topic_tags @> $${index}`;
                countQuery += ` AND topic_tags @> $${index}`;
                values.push(filters.topic_tags);
                index++;
            }
            if (filters.question_type) {
                query += ` AND question_type = $${index}`;
                countQuery += ` AND question_type = $${index}`;
                values.push(filters.question_type);
                index++;
            }
            if (filters.difficulty_level) {
                query += ` AND difficulty_level = $${index}`;
                countQuery += ` AND difficulty_level = $${index}`;
                values.push(filters.difficulty_level);
                index++;
            }

            // Add sorting and pagination
            query += ` ORDER BY id ${filters.sort || 'ASC'} LIMIT $${index} OFFSET $${index + 1}`;
            values.push(limit, offset);

            // Execute queries
            const { rows } = await dbPool.query(query, values); // Fetch paginated results
            const { rows: countRows } = await dbPool.query(countQuery, values.slice(0, index - 1)); // Fetch total count
            const total = parseInt(countRows[0].total, 10); // Total number of records

            // Calculate total pages
            const totalPages = Math.ceil(total / limit);

            // Prepare response
            return res.status(200).json(new ApiResponse('Questions retrieved successfully', 200, {
                page,
                totalPages,
                total,
                results: rows,
            }));
        } catch (error) {
            console.error('Error fetching questions:', error);
            return res.status(500).json(new ApiError((error as Error).message, 500));
        }
    });

    public explainUsingAi = asyncHandler(async (req: Request, res: Response) => {
        const questionId = +req.params.id;

        try {
            // Validate questionId
            if (!questionId || isNaN(questionId)) {
                return res.status(400).json(new ApiError('Invalid question ID', 400));
            }

            const { rows } = await dbPool.query(
                `SELECT * FROM questions WHERE id=$1`,
                [questionId]
            );

            const question = rows[0];
            if (!question || question.format !== 'text') {
                return res.status(404).json(new ApiError('Question not found', 404));
            }

            const query = `
            Please explain the following question and answer:
            Question: ${question.description}
            Options: ${question.options}
            Correct Options: ${Array.isArray(question.correct_option) ? question.correct_option.join(', ') : question.correct_option}
            `;

            const stream = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant that explains questions and their answers clearly.'
                    },
                    {
                        role: 'user',
                        content: query
                    }
                ],
                stream: true
            });

            // Set up SSE headers
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no' // Disable buffering for nginx
            });

            // Stream the response
            try {
                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    if (content) {
                        res.write(`data: ${JSON.stringify({ content })}\n\n`);
                    }
                }
            } catch (streamError) {
                // Handle stream errors
                console.error('Stream error:', streamError);
                res.write(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`);
            } finally {
                res.end();
            }
        } catch (error) {
            // If headers haven't been sent yet, send error response
            if (!res.headersSent) {
                return res.status(500).json(new ApiError(
                    error instanceof Error ? error.message : 'Internal server error',
                    500
                ));
            }
            // If headers have been sent, end the stream with error
            res.write(`data: ${JSON.stringify({ error: 'An error occurred' })}\n\n`);
            res.end();
        }
    });

    public getQuestionTopics = asyncHandler(async (req: Request, res: Response) => {
        let type = req.query.type || '';
        if (!type) return res.status(400).json(new ApiError('Question type is required', 400));
        type = String(type).toUpperCase();
        try {
            const { rows
            } = await dbPool.query(
                `SELECT DISTINCT topic_tags FROM questions WHERE question_type=$1`, [type]
            );
            const topics = rows.map((row: any) => row.topic_tags).flat();
            return res.status(200).json(new ApiResponse('Question topics retrieved successfully', 200, topics));
        } catch (error) {
            return res.status(500).json(new ApiError((error as Error).message, 500));
        }   
    });

}



export default new QuestionController();