import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { dbPool } from "../connections/pg-connection";
import ApiResponse from "../utils/ApiResponse";
import ApiError from "../utils/ApiError";
import { CustomRequest } from "../middlewares/auth.middleware";
import { redisClient } from "../connections/redis-connection";
import checkLocationPresence from "../utils/checkLocationPresence";

interface Aptitude {
    id?: number,
    name: string,
    test_timestamp: string, // Unix timestamp
    duration: number,
    total_questions: number
}

interface Answer {
    question_id: number,
    selected_options: number[],
}

class AptitudeController {
    public createAptitude = asyncHandler(async (req: Request, res: Response) => {
        const apti: Aptitude = req.body;
        const client = await dbPool.connect();
        try {
            const { rows } = await client.query(
                `INSERT INTO aptitude_tests (name, test_timestamp, duration, total_questions)
                VALUES ($1, $2, $3, $4)
                RETURNING *`,
                [apti.name, apti.test_timestamp, apti.duration, apti.total_questions]
            );
            return res.status(201).json(new ApiResponse('Aptitude test created successfully', 201, rows[0]));
        } catch (error) {
            return res.status(500).json(new ApiError((error as Error).message, 500));
        }
        finally {
            client.release();
        }
    });

    public getAptitude = asyncHandler(async (req: Request, res: Response) => {
        const client = await dbPool.connect();
        try {
            const { rows } = await client.query(
                `SELECT id, name, test_timestamp, duration FROM aptitude_tests ORDER BY id DESC;`
            );
            return res.status(200).json(new ApiResponse('Aptitude tests fetched successfully', 200, rows));
        } catch (error) {
            return res.status(500).json(new ApiError((error as Error).message, 500));
        }
        finally {
            client.release();
        }
    });

    public deleteAptitude = asyncHandler(async (req: Request, res: Response) => {
        const client = await dbPool.connect();
        try {
            const { rows } = await client.query(
                `DELETE FROM aptitude_tests WHERE id = $1`,
                [req.params.id]
            );
            return res.status(200).json(new ApiResponse('Aptitude test deleted successfully', 200, rows));
        } catch (error) {
            return res.status(500).json(new ApiError((error as Error).message, 500));
        }
        finally {
            client.release();
        }
    });

    public updateAptitude = asyncHandler(async (req: Request, res: Response) => {
        const apti: Aptitude = req.body;
        const client = await dbPool.connect();
        try {
            const { rows } = await client.query(
                `UPDATE aptitude_tests
                SET name = $1, test_timestamp = $2, duration = $3
                WHERE id = $4
                RETURNING *`,
                [apti.name, apti.test_timestamp, apti.duration, req.params.id]
            );
            return res.status(200).json(new ApiResponse('Aptitude test updated successfully', 200, rows[0]));
        } catch (error) {
            return res.status(500).json(new ApiError((error as Error).message, 500));
        }
        finally {
            client.release();
        }
    });

    public addQuestionsToAptitude = asyncHandler(async (req: Request, res: Response) => {
        const aptitudeId = req.params.id;
        const questionIds: string[] = req.body.questionIds;
        const client = await dbPool.connect();
        // console.log(questionIds);
        try {
            // Check if aptitude test exists
            const { rows: aptitudeRows } = await client.query(
                `SELECT id FROM aptitude_tests WHERE id = $1`,
                [aptitudeId]
            );
            if (aptitudeRows?.length === 0) {
                return res.status(404).json(new ApiError('Aptitude test not found', 404));
            }

            // check if any questions already exist in aptitude 
            const { rows: questionRows } = await client.query(
                `SELECT question_id FROM aptitude_questions WHERE aptitude_test_id = $1`,
                [aptitudeId]
            );

            // check if any of the questions already exist in aptitude
            for (const qid of questionIds) {
                if (questionRows.find((q: any) => q.question_id === qid)) {
                    return res.status(409).json(new ApiError('Question already exists in aptitude test', 409));
                }
            }

            // Add questions to aptitude test
            const query = `
                INSERT INTO aptitude_questions (aptitude_test_id, question_id)
                SELECT $1, unnest($2::int[])
                ON CONFLICT DO NOTHING
                RETURNING *;
            `;
            const values = [aptitudeId, questionIds];
            const { rows } = await client.query(query, values);

            // update the last_used with current unix timestamp of questins table
            const updateQuery = `
                UPDATE questions
                SET last_used = $1
                WHERE id = ANY($2::int[])   
                RETURNING *;
            `;
            const updateValues = [Date.now().toString(), questionIds];
            console.log(Date.now().toString())
            await client.query(updateQuery, updateValues);
            

            return res.status(200).json(new ApiResponse('Questions added to aptitude test successfully', 200, rows));
        } catch (error) {
            return res.status(500).json(new ApiError((error as Error).message, 500));
        }
        finally {
            client.release();
        }


    });

    public getUpcomingAptitudes = asyncHandler(async (req: Request, res: Response) => {
        const currentTimestamp: string = Date.now().toString();
        const client = await dbPool.connect();

        try {
            const { rows } = await client.query(
                `SELECT id, name, test_timestamp, duration 
                 FROM aptitude_tests
                 WHERE test_timestamp > $1 
                 ORDER BY test_timestamp ASC`,
                [currentTimestamp]
            );
            return res.status(200).json(new ApiResponse('Upcoming aptitude tests fetched successfully', 200, rows));
        } catch (error) {

        }
        finally {
            await client.release();
        }
    });

    public getAptitudeById = asyncHandler(async (req: Request, res: Response) => {
        const aptitudeId = req.params.id;
        const client = await dbPool.connect();
        let questions: any[] = [];
        try {
            const { rows } = await client.query(
                `SELECT id, name, test_timestamp, duration 
                 FROM aptitude_tests
                 WHERE id = $1`,
                [aptitudeId]
            );
            // join question table and apitude question table and return questions with a given aptitude id
            const r2 = await client.query(
                `SELECT 
                    q.id AS question_id,
                    q.description,
                    q.topic_tags,
                    q.question_type,
                    q.last_used,
                    q.difficulty_level,
                    q.options,
                    q.correct_option
                 FROM 
                    questions q
                 INNER JOIN 
                    aptitude_questions aq ON q.id = aq.question_id
                 WHERE 
                    aq.aptitude_test_id = $1;`,
                [aptitudeId]
            );
            questions = r2.rows;

            return res.status(200).json(new ApiResponse('Aptitude test fetched successfully', 200, { aptitude: rows[0], questions }));
        } catch (error) {
            return res.status(500).json(new ApiError((error as Error).message, 500));
        }
        finally {
            client.release();
        }
    });

    public getAptitudeForUser = asyncHandler(async (req: Request, res: Response) => {
        const currentTimestamp: string = Math.floor(Date.now() / 1000).toString();
        const userData: {
            regno: string,
            trade: string,
        } = req.body;
        const aptitudeId = req.params.id;
        if (!userData || !aptitudeId) return res.status(400).json(new ApiError("Bad request", 400));

        // if (!checkLocationPresence(
        //     { x: userData.lat, y: userData.long },
        // )) {
        //     return res.status(403).json(new ApiError("You are not present at the test venue", 403));
        // }

        // const cache = await redisClient.get(`apti-${aptitudeId}:${userData.trade}`);
        // if (cache) {
        //     return res.status(200).json(new ApiResponse("Aptitude fetched Successfully", 200, cache));
        // }

        const client = await dbPool.connect();
        try {

            const r1 = await client.query(
                `SELECT id, name, test_timestamp, duration 
                 FROM aptitude_tests
                 WHERE id = $1`,
                [aptitudeId]
            );
            //  check if  aptitude test exists and test_timestamp is greater than current timestamp
            if (r1.rows.length === 0) {
                return res.status(404).json(new ApiError('Aptitude test not found', 404));
            }
            const apti = r1.rows[0];
            // console.log(apti.test_timestamp, currentTimestamp)
            if (+apti.test_timestamp > +currentTimestamp) {
                return res.status(404).json(new ApiError('Aptitude test has not started yet', 401));
            }
            else if (+apti.test_timestamp + +apti.duration * 60 < +currentTimestamp) {
                return res.status(404).json(new ApiError('Aptitude test has ended', 401));
            }


            const { rows } = await client.query(
                `SELECT 
                    q.id AS id,
                    q.description,
                    q.topic_tags,
                    q.question_type,
                    q.last_used,
                    q.difficulty_level,
                    q.format,
                    q.options,
                    q.correct_option
                 FROM 
                    questions q
                 INNER JOIN 
                    aptitude_questions aq ON q.id = aq.question_id
                 WHERE 
                    aq.aptitude_test_id = $1 AND (question_type = $2 OR question_type = 'GENERAL')`,
                [aptitudeId, userData.trade]
            );

            // Validate and fix question data before sending to frontend
            const validatedQuestions = rows.map((question: any) => {
                // Ensure correct_option is always a valid array
                if (!question.correct_option || 
                    !Array.isArray(question.correct_option) || 
                    question.correct_option.length === 0) {
                    console.warn(`Question ${question.id} has invalid correct_option:`, question.correct_option);
                    question.correct_option = [1]; // Default to first option
                }
                
                // Ensure options is always an array
                if (!question.options || !Array.isArray(question.options)) {
                    console.warn(`Question ${question.id} has invalid options:`, question.options);
                    question.options = [];
                }
                
                return question;
            });

            const response = {
                aptitude: apti,
                questions: validatedQuestions
            }

            // await redisClient.set(`apti-${aptitudeId}:${userData.trade}`, JSON.stringify(response), { EX: 600 });

            return res.status(200).json(new ApiResponse('Aptitude test questions fetched successfully', 200, response));
        } catch (error) {
            console.log(error)
            return res.status(500).json(new ApiError((error as Error).message, 500));
        }
        finally {
            client.release();
        }
    });

    public deleteQuestionFromAptitude = asyncHandler(async (req: Request, res: Response) => {
        const { aptitudeId, questionId } = req.body;
        const client = await dbPool.connect();
        try {
            const { rows } = await client.query(
                `DELETE FROM aptitude_questions WHERE aptitude_test_id = $1 AND question_id = $2`,
                [aptitudeId, questionId]
            );
            return res.status(200).json(new ApiResponse('Question deleted from aptitude test successfully', 200, rows));

        } catch (error) {
            return res.status(500).json(new ApiError((error as Error).message, 500));
        }
        finally {
            client.release();
        }
    })

    public submitAptitude = asyncHandler(async (req: Request, res: Response) => {
        const aptitudeId = req.params.id;
        const userData: {
            regno: string,
            trade: string,
        } = req.body.userData;
        const answers: Answer[] = req.body.answers;
        const client = await dbPool.connect();

        try {
            // Check if time still left or aptitude is started or not
            const currentTimestamp = Math.floor(Date.now() / 1000);

            const r1 = await client.query(
                `SELECT id, name, test_timestamp, duration 
                 FROM aptitude_tests
                 WHERE id = $1`,
                [aptitudeId]
            );
            //  check if  aptitude test exists and test_timestamp is greater than current timestamp
            if (r1.rows.length === 0) {
                return res.status(404).json(new ApiError('Aptitude test not found', 404));
            }
            const apti = r1.rows[0];

            if (+apti.test_timestamp > +currentTimestamp) {
                return res.status(404).json(new ApiError('Aptitude test has not started yet', 401));
            }
            else if (+apti.test_timestamp + +apti.duration * 60 < +currentTimestamp) {
                return res.status(404).json(new ApiError('Aptitude test has ended', 401));
            }


            // Check if user exists
            const { rows: userRows } = await client.query(
                `SELECT regno, blocked FROM users WHERE regno = $1`,
                [userData.regno]
            );
            if (userRows?.length === 0) {
                return res.status(404).json(new ApiError('User has not registered', 404));
            }
            if (userRows[0].blocked) {
                return res.status(403).json(new ApiError('Your quiz is blocked, Contact Admin', 403));
            }

            // Check if user has already appeared for the test
            const { rows: appearedRows } = await client.query(
                `SELECT * FROM user_responses WHERE aptitude_test_id = $1 AND regno = $2`,
                [aptitudeId, userData.regno]
            );
            if (appearedRows?.length > 0) {
                return res.status(409).json(new ApiError('You have already appeared for the test', 409));
            }

            const { rows: questionRows } = await client.query(
                `SELECT q.id FROM questions q
                 INNER JOIN aptitude_questions aq ON q.id = aq.question_id
                 WHERE aq.aptitude_test_id = $1`,
                [aptitudeId]
            );

            // Calculate score
            let score = 0;
            for (const answer of answers) {
                const { rows: questionRows } = await client.query(
                    `SELECT correct_option FROM questions WHERE id = $1`,
                    [answer.question_id]
                );
                // Check if any of the selected options match any of the correct options
                const hasCorrectAnswer = answer.selected_options.some(selectedOption => 
                    questionRows[0].correct_option.includes(selectedOption)
                );
                if (hasCorrectAnswer) {
                    score++;
                }
            }

            // Insert submission
            const { rows: submissionRows } = await client.query(
                `INSERT INTO user_responses (regno ,aptitude_test_id, answers, response_time, marks)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING *`,
                [userData.regno, aptitudeId, JSON.stringify(answers), currentTimestamp, score]
            );

            return res.status(200).json(new ApiResponse('Aptitude test submitted successfully', 200, submissionRows[0]));
        } catch (error) {
            return res.status(500).json(new ApiError((error as Error).message, 500));
        }
        finally {
            client.release();
        }
    });

    public getAptitudeResponses = asyncHandler(async (req: Request, res: Response) => {
        const id = req.params.id;
        const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
        const items = req.query.items ? parseInt(req.query.items as string, 10) : 20;

        try {
            // Query to fetch responses with rank
            const responseQuery = `
                WITH ranked_responses AS (
                    SELECT 
                        ur.id,
                        u.regno, 
                        u.name, 
                        u.trade,
                        ur.marks,
                        ur.response_time,
                        RANK() OVER (
                            PARTITION BY ur.aptitude_test_id
                            ORDER BY ur.marks DESC, ur.response_time ASC
                        ) AS rank
                    FROM 
                        user_responses ur
                    INNER JOIN 
                        users u ON ur.regno = u.regno
                    WHERE 
                        ur.aptitude_test_id = $1
                )
                SELECT * 
                FROM ranked_responses
                ORDER BY rank ASC
                LIMIT $2 OFFSET $3;
            `;

            // Query to get the total count of responses
            const countQuery = `
                SELECT 
                    COUNT(*) AS total
                FROM 
                    user_responses 
                WHERE 
                    aptitude_test_id = $1;
            `;

            // Execute both queries
            const countResult = await dbPool.query(countQuery, [id]);
            const totalResponses = parseInt(countResult.rows[0].total, 10);
            const totalPages = Math.ceil(totalResponses / items);

            const responseResult = await dbPool.query(responseQuery, [
                id,
                items,
                items * (page - 1),
            ]);

            // Prepare the response
            const data = {
                currentPage: page,
                totalPages,
                totalResponses,
                responses: responseResult.rows, // Includes rank in the result
            };

            return res
                .status(200)
                .json(
                    new ApiResponse(
                        'Aptitude test responses fetched successfully',
                        200,
                        data
                    )
                );
        } catch (error) {
            return res
                .status(500)
                .json(new ApiError((error as Error).message, 500));
        }
    });

    public getUserApitudeResponse = asyncHandler(async (req: CustomRequest, res: Response) => {
        const aptiId = req.params.id;
        let regno = req?.query?.regno;

        if (req.user.role != "admin" && regno && req.user.regno != regno) return res.status(401).json(new ApiError("Award for most oversmartness goes to you", 401));
        if (!regno) regno = req.user.regno;


        try {
            // Query to get the user's answers and marks
            const ansQuery = `
                SELECT answers, marks
                FROM user_responses
                WHERE aptitude_test_id = $1 AND regno = $2;
            `;
            const { rows } = await dbPool.query(ansQuery, [aptiId, regno]);

            if (rows.length === 0) {
                return res.status(404).json(new ApiError("You didn't appear for this test.", 404));
            }

            const answers: Answer[] = JSON.parse(rows[0].answers);
            let userMarks = 0;

            // Query to get all questions for the aptitude test 
            const questionQuery = `
                SELECT q.id, q.description, q.options, q.correct_option, format, question_type
                FROM questions q
                INNER JOIN aptitude_questions aq ON q.id = aq.question_id
                WHERE aq.aptitude_test_id = $1;
            `;
            const questionRows = await dbPool.query(questionQuery, [aptiId]);

            // Query to calculate the rank and total users who appeared
            const rankQuery = `
                WITH ranked_responses AS (
                    SELECT 
                        regno,
                        RANK() OVER (
                            PARTITION BY aptitude_test_id
                            ORDER BY marks DESC, response_time ASC
                        ) AS rank
                    FROM 
                        user_responses
                    WHERE aptitude_test_id = $1
                )
                SELECT 
                    (SELECT COUNT(*) FROM user_responses WHERE aptitude_test_id = $1) AS total_users,
                    rank
                FROM ranked_responses
                WHERE regno = $2;
            `;
            const rankResult = await dbPool.query(rankQuery, [aptiId, regno]);

            if (rankResult.rows.length === 0) {
                return res.status(404).json(new ApiError("Unable to calculate rank for the given user.", 404));
            }

            const { rank, total_users } = rankResult.rows[0];

            // Prepare the response with questions and user's selected answers
            const response = answers.map((ans) => {
                // Check if any of the selected options match any of the correct options
                const question = questionRows.rows.find((q: any) => q.id === ans.question_id);
                const hasCorrectAnswer = ans.selected_options.some(selectedOption => 
                    question.correct_option.includes(selectedOption)
                );
                userMarks += hasCorrectAnswer ? 1 : 0;
                return {
                    question,
                    answers: ans.selected_options, // Return all selected options
                };
            });

            // Add rank, marks, and total users to the response
            const data = {
                rank,
                total_users,
                marks: userMarks,
                responses: response,
            };

            return res.status(200).json(new ApiResponse("Aptitude response fetched successfully", 200, data));
        } catch (error) {
            return res.status(500).json(new ApiError((error as Error).message, 500));
        }
    });

    public getAptitudeToppers = asyncHandler(async (req: Request, res: Response) => {
        const aptiId = req.params.id;
        if (!aptiId) return res.status(400).json(new ApiError("Bad request", 400));
        const cache = await redisClient.get(`toppers:${aptiId}`);
        if (cache) {
            return res.status(200).json(new ApiResponse("Toppers fetched Successfully", 200, JSON.parse(cache)));
        }
        const client = await dbPool.connect();
        try {
            // Fetch overall toppers
            const overallToppersQuery = await client.query(
                `WITH RankedToppers AS (
                    SELECT 
                        u.regno, 
                        u.name, 
                        u.avatar,
                        u.trade,
                        ur.marks,
                        ur.response_time,
                        RANK() OVER (ORDER BY ur.marks DESC, ur.response_time ASC) AS rank
                    FROM 
                        user_responses ur
                    INNER JOIN 
                        users u ON ur.regno = u.regno
                    WHERE 
                        ur.aptitude_test_id = $1
                )
                SELECT * FROM RankedToppers
                WHERE rank <= 3;`,
                [aptiId]
            );

            const overallToppers = overallToppersQuery.rows;

            // Fetch trade-wise toppers
            const tradeToppersQuery = await client.query(
                `WITH TradeRankedToppers AS (
                    SELECT 
                        u.regno, 
                        u.name, 
                        u.avatar,   
                        u.trade,
                        ur.marks,
                        ur.response_time,
                        RANK() OVER (PARTITION BY u.trade ORDER BY ur.marks DESC, ur.response_time ASC) AS rank
                    FROM 
                        user_responses ur
                    INNER JOIN 
                        users u ON ur.regno = u.regno
                    WHERE 
                        ur.aptitude_test_id = $1
                )
                SELECT * FROM TradeRankedToppers
                WHERE rank <= 3;`,
                [aptiId]
            );


            const tradeToppers = tradeToppersQuery.rows;

            const response = {
                overall: overallToppers,
                trade: tradeToppers,
            };

            await redisClient.set(`toppers:${aptiId}`, JSON.stringify(response), { EX: 600 });

            return res.status(200).json(new ApiResponse('Toppers fetched successfully', 200, response));
        } catch (error) {
            return res.status(500).json(new ApiError((error as Error).message, 500));
        } finally {
            client.release();
        }
    });

    public getPastAptitudes = asyncHandler(async (req: Request, res: Response) => {
        const currentTimestamp: string = Math.floor(Date.now() / 1000).toString();
        const client = await dbPool.connect();
        try {
            const { rows } = await client.query(
                `SELECT id, name, test_timestamp, duration 
                 FROM aptitude_tests
                 WHERE test_timestamp < $1 
                 ORDER BY test_timestamp DESC`,
                [currentTimestamp]
            );
            return res.status(200).json(new ApiResponse('Past aptitude tests fetched successfully', 200, rows));
        } catch (error) {
            return res.status(500).json(new ApiError((error as Error).message, 500));
        } finally {
            client.release();
        }
    });



}

export default new AptitudeController();