import AWS from 'aws-sdk';
import dotenv from 'dotenv';

dotenv.config();

const s3 = new AWS.S3({
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

/**
 * Upload file to S3
 */
export const uploadToS3 = async (key, buffer, contentType, metadata = {}) => {
    try {
        const params = {
            Bucket: BUCKET_NAME,
            Key: key,
            Body: buffer,
            ContentType: contentType,
            ServerSideEncryption: 'AES256', // Use SSE-S3 for HIPAA compliance
            Metadata: {
                'uploaded-at': new Date().toISOString(),
                ...metadata
            }
        };

        const result = await s3.upload(params).promise();
        return result.Location;
    } catch (error) {
        console.error('S3 upload error:', error);
        throw new Error('Failed to upload file to S3');
    }
};

/**
 * Get signed URL for reading file (temporary access)
 */
export const getSignedUrl = async (key, expiresIn = 3600) => {
    try {
        const params = {
            Bucket: BUCKET_NAME,
            Key: key,
            Expires: expiresIn
        };

        return s3.getSignedUrlPromise('getObject', params);
    } catch (error) {
        console.error('S3 signed URL error:', error);
        throw new Error('Failed to generate signed URL');
    }
};

/**
 * Delete file from S3
 */
export const deleteFromS3 = async (key) => {
    try {
        const params = {
            Bucket: BUCKET_NAME,
            Key: key
        };

        await s3.deleteObject(params).promise();
        return true;
    } catch (error) {
        console.error('S3 delete error:', error);
        throw new Error('Failed to delete file from S3');
    }
};

/**
 * Check if file exists in S3
 */
export const fileExists = async (key) => {
    try {
        const params = {
            Bucket: BUCKET_NAME,
            Key: key
        };

        await s3.headObject(params).promise();
        return true;
    } catch (error) {
        if (error.code === 'NotFound') {
            return false;
        }
        throw error;
    }
};

