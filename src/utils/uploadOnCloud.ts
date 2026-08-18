import { v2 as cloudinary } from "cloudinary";
import fs from 'fs';

class Cloud {
    constructor(){
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });
    }

    public upload = async (localFileUrl: string, folder: string) => {
        try {
            const result = await cloudinary.uploader.upload(localFileUrl, {
                folder: folder,
                resource_type: "auto",
            });
            fs.unlinkSync(localFileUrl);
            return result.secure_url;
        } catch (error) {
            fs.unlinkSync(localFileUrl);
            throw new Error((error as Error).message);
        }
    }

    public delete = async (publicUrl:string) => {
        try {
            const publicId = publicUrl.split('/').pop()?.split('.')[0];
            const result = await cloudinary.uploader.destroy(publicId as string);
            return result;
        } catch (error) {
            throw new Error((error as Error).message);
        }
    }
}

export default new Cloud();