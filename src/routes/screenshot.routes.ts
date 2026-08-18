import express, { Request, Response } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

const router = express.Router();
const upload = multer();

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

// Upload route
router.post(
  "/upload",
  upload.single("image"),
  async (req: Request, res: Response): Promise<void> => {
    const { contestId, userId } = req.body;

    if (!req.file || !contestId || !userId) {
      res.status(400).json({ message: "Missing data" });
      return;
    }

    try {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `ppp_screenshots/${contestId}/${userId}`,
        },
        (error: any, result: any) => {
          if (error) {
            res.status(500).json({ message: "Upload failed", error });
          } else {
            res.status(200).json(result);
          }
        }
      );

      streamifier.createReadStream(req.file.buffer).pipe(stream);
    } catch (err: any) {
      res.status(500).json({ message: "Internal error", error: err });
    }
  }
);

export default router;
