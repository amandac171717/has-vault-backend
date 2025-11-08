import sharp from 'sharp';

/**
 * Preprocess image for better OCR accuracy
 */
export const preprocessForOCR = async (imageBuffer) => {
    try {
        // Enhance image for OCR: grayscale, increase contrast, sharpen
        const processed = await sharp(imageBuffer)
            .greyscale() // Convert to grayscale for better OCR
            .normalize() // Enhance contrast
            .sharpen() // Sharpen edges
            .resize(3000, null, { // Higher resolution for better OCR
                withoutEnlargement: false, // Allow upscaling if needed
                fit: 'inside'
            })
            .png() // Use PNG for OCR (better quality)
            .toBuffer();

        return processed;
    } catch (error) {
        console.error('Image preprocessing error:', error);
        // Fallback to original if preprocessing fails
        return imageBuffer;
    }
};

/**
 * Compress and optimize image
 */
export const compressImage = async (imageBuffer) => {
    try {
        const compressed = await sharp(imageBuffer)
            .jpeg({ 
                quality: 85,
                progressive: true,
                mozjpeg: true
            })
            .resize(2000, null, { 
                withoutEnlargement: true,
                fit: 'inside'
            })
            .toBuffer();

        return compressed;
    } catch (error) {
        console.error('Image compression error:', error);
        throw new Error('Failed to compress image');
    }
};

/**
 * Generate thumbnail
 */
export const generateThumbnail = async (imageBuffer) => {
    try {
        const thumbnail = await sharp(imageBuffer)
            .resize(200, 200, { 
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({ 
                quality: 80 
            })
            .toBuffer();

        return thumbnail;
    } catch (error) {
        console.error('Thumbnail generation error:', error);
        throw new Error('Failed to generate thumbnail');
    }
};

