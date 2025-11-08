import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database.js';
import { uploadFile, deleteFile } from '../services/storage.js';
import { processReceiptOCR } from '../services/ocr.js';
import { compressImage } from '../services/imageProcessing.js';
import { receiptSchema } from '../validators/receipt.js';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

// Get all receipts for user
router.get('/', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { year, month, service_type, limit = 50, offset = 0 } = req.query;

        let queryText = `
            SELECT id, date, vendor, service_type, amount, 
                   image_s3_key, created_at, updated_at
            FROM receipts 
            WHERE user_id = $1 AND deleted_at IS NULL
        `;
        const params = [userId];
        let paramIndex = 2;

        if (year) {
            queryText += ` AND EXTRACT(YEAR FROM date) = $${paramIndex}`;
            params.push(year);
            paramIndex++;
        }

        if (month) {
            queryText += ` AND EXTRACT(MONTH FROM date) = $${paramIndex}`;
            params.push(month);
            paramIndex++;
        }

        if (service_type) {
            queryText += ` AND service_type = $${paramIndex}`;
            params.push(service_type);
            paramIndex++;
        }

        queryText += ` ORDER BY date DESC, created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await query(queryText, params);

        // Get total count
        const countResult = await query(
            'SELECT COUNT(*) FROM receipts WHERE user_id = $1 AND deleted_at IS NULL',
            [userId]
        );

        // Add image URLs to receipts
        const { getFileUrl } = await import('../services/storage.js');
        const receiptsWithUrls = result.rows.map((receipt) => {
            let imageUrl = null;
            if (receipt.image_s3_key) {
                // Generate URL for the image
                imageUrl = getFileUrl(receipt.image_s3_key);
                // If local storage, prepend API base URL
                if (imageUrl && imageUrl.startsWith('/uploads/')) {
                    imageUrl = `${process.env.API_BASE_URL || 'http://localhost:3000'}${imageUrl}`;
                }
            }
            return {
                ...receipt,
                image_url: imageUrl
            };
        });

        res.json({
            receipts: receiptsWithUrls,
            pagination: {
                total: parseInt(countResult.rows[0].count),
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (err) {
        next(err);
    }
});

// Get single receipt
router.get('/:id', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const receiptId = req.params.id;

        const result = await query(
            `SELECT id, date, vendor, service_type, amount, 
                    image_s3_key, ocr_text, ocr_confidence, 
                    created_at, updated_at
             FROM receipts 
             WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
            [receiptId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Receipt not found' });
        }

        res.json({ receipt: result.rows[0] });
    } catch (err) {
        next(err);
    }
});

// Upload receipt with OCR
router.post('/upload', upload.single('image'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        const userId = req.user.id;
        const receiptId = uuidv4();

        // Process OCR
        let ocrData = null;
        try {
            ocrData = await processReceiptOCR(req.file.buffer);
            console.log('OCR Results:', {
                confidence: ocrData.confidence,
                extracted: {
                    date: ocrData.date,
                    vendor: ocrData.vendor,
                    amount: ocrData.amount,
                    service_type: ocrData.service_type
                }
            });
            
            // Warn if confidence is low
            if (ocrData.confidence < 50) {
                console.warn('Low OCR confidence:', ocrData.confidence);
            }
        } catch (ocrError) {
            console.error('OCR processing error:', ocrError);
            // Continue without OCR data
        }

        // Parse OCR data or use manual input
        const { date, vendor, service_type, amount } = req.body;

        console.log('Received form data:', { date, vendor, service_type, amount });
        console.log('OCR data:', ocrData ? { date: ocrData.date, vendor: ocrData.vendor, amount: ocrData.amount, service_type: ocrData.service_type } : 'none');

        // Check if this is just an OCR request (empty form fields) or a full submission
        const isOCROnly = (!date || date.trim() === '') && 
                          (!vendor || vendor.trim() === '') && 
                          (!amount || amount.toString().trim() === '');

        // If this is just OCR, return the OCR data without saving receipt or image
        if (isOCROnly) {
            return res.json({
                ocr: ocrData ? {
                    extracted: true,
                    confidence: ocrData.confidence,
                    suggested: {
                        date: ocrData.date,
                        vendor: ocrData.vendor,
                        amount: ocrData.amount,
                        service_type: ocrData.service_type
                    }
                } : null,
                message: 'OCR processing complete. Please review and fill in the form fields, then click "Save Receipt".'
            });
        }

        // Compress image (only if we're actually saving)
        const compressedBuffer = await compressImage(req.file.buffer);

        // Upload image (S3 or local storage)
        const s3Key = `users/${userId}/receipts/${receiptId}/compressed.jpg`;
        const fileUrl = await uploadFile(s3Key, compressedBuffer, 'image/jpeg');

        // Use OCR data if available, otherwise use manual input
        // Default to today's date if no date provided
        let receiptDate = date && date.trim() ? date : null;
        if (!receiptDate && ocrData?.date) {
            try {
                const ocrDate = new Date(ocrData.date);
                if (!isNaN(ocrDate.getTime())) {
                    receiptDate = ocrDate.toISOString().split('T')[0];
                }
            } catch (e) {
                // Invalid date from OCR, use today
            }
        }
        if (!receiptDate) {
            receiptDate = new Date().toISOString().split('T')[0];
        }

        // Vendor - use manual input first, then OCR, default to empty (will be caught by validation)
        const receiptVendor = (vendor && vendor.trim()) || (ocrData?.vendor && ocrData.vendor.trim()) || '';
        
        // Service type - default to 'Other' if not provided
        const receiptService = (service_type && service_type.trim()) || (ocrData?.service_type && ocrData.service_type.trim()) || 'Other';
        
        // Amount - parse and validate
        let receiptAmount = 0;
        if (amount && amount.toString().trim() !== '') {
            receiptAmount = parseFloat(amount);
        } else if (ocrData?.amount) {
            receiptAmount = parseFloat(ocrData.amount);
        }
        
        console.log('Processed receipt data:', { receiptDate, receiptVendor, receiptService, receiptAmount });
        
        // Validate receipt data (with defaults applied)
        const { error, value } = receiptSchema.validate({
            date: receiptDate,
            vendor: receiptVendor,
            service_type: receiptService || 'Other', // Ensure default
            amount: receiptAmount
        }, {
            abortEarly: false, // Return all validation errors, not just the first
            stripUnknown: true // Remove unknown fields
        });

        if (error) {
            // Delete uploaded image if validation fails
            await deleteFile(s3Key);
            
            // Create user-friendly error messages
            const errorMessages = error.details.map(d => {
                if (d.path.includes('vendor')) {
                    return 'Vendor name is required. Please enter the store or business name.';
                }
                if (d.path.includes('amount')) {
                    return 'Amount is required and must be a positive number.';
                }
                if (d.path.includes('date')) {
                    return 'Date is required and cannot be in the future.';
                }
                if (d.path.includes('service_type')) {
                    return `Service type must be one of: Prescription, Doctor Visit, Dental, Vision, Lab Tests, Mental Health, or Other.`;
                }
                return d.message;
            });
            
            return res.status(400).json({ 
                error: 'Please check the form fields',
                details: errorMessages
            });
        }

        // Save to database
        const result = await query(
            `INSERT INTO receipts (
                id, user_id, date, vendor, service_type, amount,
                image_s3_key, image_s3_bucket, image_format, image_size_bytes,
                ocr_text, ocr_confidence, ocr_processed_at,
                created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6,
                $7, $8, $9, $10,
                $11, $12, $13,
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            ) RETURNING id, date, vendor, service_type, amount, created_at`,
            [
                receiptId,
                userId,
                value.date,
                value.vendor,
                value.service_type,
                value.amount,
                s3Key,
                process.env.S3_BUCKET_NAME,
                'jpg',
                compressedBuffer.length,
                ocrData?.text || null,
                ocrData?.confidence || null,
                ocrData ? new Date() : null
            ]
        );

        res.status(201).json({
            message: 'Receipt uploaded successfully',
            receipt: result.rows[0],
            ocr: ocrData ? {
                extracted: true,
                confidence: ocrData.confidence,
                suggested: {
                    vendor: ocrData.vendor,
                    amount: ocrData.amount,
                    date: ocrData.date
                }
            } : null
        });
    } catch (err) {
        next(err);
    }
});

// Update receipt
router.put('/:id', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const receiptId = req.params.id;

        // Verify receipt belongs to user
        const checkResult = await query(
            'SELECT id FROM receipts WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
            [receiptId, userId]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Receipt not found' });
        }

        // Validate input
        const { error, value } = receiptSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ 
                error: 'Validation error',
                details: error.details.map(d => d.message)
            });
        }

        // Update receipt
        const result = await query(
            `UPDATE receipts 
             SET date = $1, vendor = $2, service_type = $3, amount = $4,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $5 AND user_id = $6
             RETURNING id, date, vendor, service_type, amount, updated_at`,
            [value.date, value.vendor, value.service_type, value.amount, receiptId, userId]
        );

        res.json({
            message: 'Receipt updated successfully',
            receipt: result.rows[0]
        });
    } catch (err) {
        next(err);
    }
});

// Delete receipt (soft delete)
router.delete('/:id', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const receiptId = req.params.id;

        // Verify receipt belongs to user
        const checkResult = await query(
            'SELECT id, image_s3_key FROM receipts WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
            [receiptId, userId]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Receipt not found' });
        }

        // Soft delete
        await query(
            'UPDATE receipts SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
            [receiptId]
        );

        // Optionally delete from S3 (or keep for audit trail)
        // await deleteFromS3(checkResult.rows[0].image_s3_key);

        res.json({ message: 'Receipt deleted successfully' });
    } catch (err) {
        next(err);
    }
});

// Get receipt statistics
router.get('/stats/summary', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { year } = req.query;
        const targetYear = year || new Date().getFullYear();

        // YTD expenses
        const ytdResult = await query(
            `SELECT COALESCE(SUM(amount), 0) as total
             FROM receipts 
             WHERE user_id = $1 
             AND EXTRACT(YEAR FROM date) = $2 
             AND deleted_at IS NULL`,
            [userId, targetYear]
        );

        // Last year comparison
        const lastYearResult = await query(
            `SELECT COALESCE(SUM(amount), 0) as total
             FROM receipts 
             WHERE user_id = $1 
             AND EXTRACT(YEAR FROM date) = $2 
             AND deleted_at IS NULL`,
            [userId, targetYear - 1]
        );

        // Monthly average
        const currentMonth = new Date().getMonth() + 1;
        const monthsToConsider = targetYear === new Date().getFullYear() ? currentMonth : 12;
        const monthlyAvg = parseFloat(ytdResult.rows[0].total) / monthsToConsider;

        // Year-over-year change
        const ytdTotal = parseFloat(ytdResult.rows[0].total);
        const lastYearTotal = parseFloat(lastYearResult.rows[0].total);
        const yoyChange = lastYearTotal > 0 
            ? ((ytdTotal - lastYearTotal) / lastYearTotal * 100).toFixed(1)
            : 0;

        res.json({
            year: parseInt(targetYear),
            ytdExpenses: ytdTotal,
            monthlyAverage: monthlyAvg,
            yoyChange: parseFloat(yoyChange),
            taxSavings: ytdTotal * 0.35 // Estimated
        });
    } catch (err) {
        next(err);
    }
});

export default router;

