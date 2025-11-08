import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { uploadToS3 } from './s3.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Local storage directory
const STORAGE_DIR = path.join(__dirname, '..', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

/**
 * Check if S3 is configured (not using dummy credentials)
 */
function isS3Configured() {
    const accessKey = process.env.AWS_ACCESS_KEY_ID;
    const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
    
    // Check if credentials are set and not dummy
    return accessKey && 
           secretKey && 
           accessKey !== 'dummy' && 
           secretKey !== 'dummy' &&
           accessKey.length > 10; // Real keys are longer
}

/**
 * Upload file - uses S3 if configured, otherwise stores locally
 */
export const uploadFile = async (key, buffer, contentType, metadata = {}) => {
    // Try S3 first if configured
    if (isS3Configured()) {
        try {
            return await uploadToS3(key, buffer, contentType, metadata);
        } catch (error) {
            console.warn('S3 upload failed, falling back to local storage:', error.message);
            // Fall through to local storage
        }
    }
    
    // Use local storage
    // Key format: users/{userId}/receipts/{receiptId}/compressed.jpg
    // We'll preserve the full path structure for local storage
    const filePath = path.join(STORAGE_DIR, key);
    const dir = path.dirname(filePath);
    
    try {
        // Create directory if it doesn't exist
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        // Write file
        fs.writeFileSync(filePath, buffer);
        console.log(`File saved successfully to: ${filePath} (size: ${buffer.length} bytes)`);
        
        // Return local file path (for development)
        return `/uploads/${key}`;
    } catch (error) {
        console.error(`Error saving file to ${filePath}:`, error);
        throw error;
    }
};

/**
 * Get file URL - returns S3 URL or local file path
 */
export const getFileUrl = (key) => {
    if (isS3Configured()) {
        // Would need to generate signed URL for S3
        // For now, return null and handle in routes
        return null;
    }
    
    // For local storage, use the full key path
    // Key format: users/{userId}/receipts/{receiptId}/compressed.jpg
    return `/uploads/${key}`;
};

/**
 * Delete file
 */
export const deleteFile = async (key) => {
    if (isS3Configured()) {
        const { deleteFromS3 } = await import('./s3.js');
        try {
            return await deleteFromS3(key);
        } catch (error) {
            console.warn('S3 delete failed, trying local:', error.message);
        }
    }
    
    // Delete local file
    // Use the full key path for local storage
    const filePath = path.join(STORAGE_DIR, key);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
    }
    
    return false;
};

