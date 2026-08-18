import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import ApiError from '../utils/ApiError';
import jwt from 'jsonwebtoken';
import { dbPool } from '../connections/pg-connection';

interface DecodedToken {
    regno: string;
    iat: number;
    exp: number;
}
interface CustomRequest extends Request {
    user?: any;
}

const verifyJwt = asyncHandler(async (req: CustomRequest, _: Response, next: NextFunction) => {
    const accessToken =
        req?.cookies?.accessToken ||
        req.header('Authorization')?.replace('Bearer ', '');
    if (!accessToken) throw new ApiError('Unauthorized request', 401);

    const decodedToken = jwt.verify(accessToken, process.env.JWT_SECRET!) as DecodedToken;
    const regno: string = decodedToken.regno;
    const query: string = `SELECT regno,role, trade FROM users WHERE regno=$1 LIMIT 1`;

    const user = await dbPool.query(query, [regno]);
    if (!user) throw new ApiError("Unauthorized User", 401);
    req.user = user.rows[0];
    console.log('User:', user.rows[0]);
    next();
});

const generateJwt = (regno: string): string => {
    const payload = { regno };
    const options = { expiresIn: '7d' };
    return jwt.sign(payload, process.env.JWT_SECRET!, options);
}

const adminAccess = asyncHandler(async (req: CustomRequest, res: Response, next: NextFunction) => {
    if (!req.user) throw new ApiError('Unauthorized request', 401);
    if (req.user.role !== 'admin') throw new ApiError('Unauthorized request', 401);
    next();
});

const jsprAccess = asyncHandler(async (req: CustomRequest, res: Response, next: NextFunction) => {
    if (!req.user) throw new ApiError('Unauthorized request', 401);
    if (req.user.role !== 'jspr' && req.user.role !== 'admin') throw new ApiError('Unauthorized request', 401);
    next();
});



export { verifyJwt, generateJwt, adminAccess, jsprAccess, type CustomRequest };

