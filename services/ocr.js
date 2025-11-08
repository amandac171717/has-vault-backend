import { ImageAnnotatorClient } from '@google-cloud/vision';

// Initialize Google Cloud Vision client
let visionClient = null;

function getVisionClient() {
    if (!visionClient) {
        // Check if credentials are provided via environment variable
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            visionClient = new ImageAnnotatorClient({
                keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
            });
        } else if (process.env.GOOGLE_CLOUD_PROJECT && process.env.GOOGLE_CLOUD_KEYFILE) {
            // Alternative: use project ID and keyfile path
            visionClient = new ImageAnnotatorClient({
                projectId: process.env.GOOGLE_CLOUD_PROJECT,
                keyFilename: process.env.GOOGLE_CLOUD_KEYFILE
            });
        } else {
            // Try to use default credentials (if running on GCP or with gcloud auth)
            try {
                visionClient = new ImageAnnotatorClient();
            } catch (error) {
                console.error('Google Cloud Vision client initialization failed:', error.message);
                throw new Error('Google Cloud Vision credentials not configured. Please set GOOGLE_APPLICATION_CREDENTIALS environment variable.');
            }
        }
    }
    return visionClient;
}

/**
 * Process receipt image with Google Cloud Vision API OCR
 */
export const processReceiptOCR = async (imageBuffer) => {
    try {
        const client = getVisionClient();
        
        // Perform text detection with Google Cloud Vision
        const [result] = await client.textDetection({
            image: { content: imageBuffer },
        });

        const detections = result.textAnnotations;
        
        if (!detections || detections.length === 0) {
            console.log('No text detected in image');
            return {
                text: '',
                confidence: 0,
                words: [],
                date: null,
                vendor: null,
                amount: null,
                service_type: null
            };
        }

        // First element is the full text, rest are individual words
        const fullText = detections[0].description || '';
        const words = detections.slice(1).map(d => ({
            text: d.description || '',
            confidence: d.confidence || 0
        }));

        // Calculate average confidence
        const confidences = words.map(w => w.confidence).filter(c => c > 0);
        const avgConfidence = confidences.length > 0
            ? Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100)
            : 85; // Default confidence for Google Vision (usually very accurate)

        console.log('Google Vision OCR Confidence:', avgConfidence);
        console.log('OCR Text (first 200 chars):', fullText.substring(0, 200));

        // Parse extracted text
        const extractedData = parseReceiptText(fullText, words);

        return {
            text: fullText,
            confidence: avgConfidence,
            words: words.slice(0, 50), // First 50 words for debugging
            ...extractedData
        };
    } catch (error) {
        console.error('Google Cloud Vision OCR error:', error);
        
        // If it's a credentials error, provide helpful message
        if (error.message.includes('credentials') || error.message.includes('authentication')) {
            throw new Error('Google Cloud Vision credentials not configured. Please set GOOGLE_APPLICATION_CREDENTIALS environment variable with the path to your service account key file.');
        }
        
        throw new Error('Failed to process OCR with Google Cloud Vision: ' + error.message);
    }
};

/**
 * Parse OCR text to extract receipt information
 */
function parseReceiptText(text, words = []) {
    const data = {};
    
    // Clean text - remove extra whitespace
    const cleanText = text.replace(/\s+/g, ' ').trim();

    // Extract date (look for common date patterns)
    const datePatterns = [
        // MM/DD/YYYY or MM/DD/YY
        /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g,
        // YYYY-MM-DD
        /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g,
        // Month name formats
        /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\s,.-]+(\d{1,2})[\s,.-]+(\d{2,4})\b/gi,
        // DD-MM-YYYY
        /\b(\d{1,2})-(\d{1,2})-(\d{2,4})\b/g,
    ];

    const foundDates = [];
    for (const pattern of datePatterns) {
        const matches = [...text.matchAll(pattern)];
        for (const match of matches) {
            try {
                let dateStr = match[0];
                const date = new Date(dateStr);
                if (!isNaN(date.getTime())) {
                    const year = date.getFullYear();
                    const now = new Date();
                    if (year >= 2000 && year <= now.getFullYear() + 1) {
                        foundDates.push({ date, confidence: match.index < 500 ? 1 : 0.5 });
                    }
                }
            } catch (e) {
                // Continue to next pattern
            }
        }
    }
    
    if (foundDates.length > 0) {
        foundDates.sort((a, b) => b.confidence - a.confidence);
        data.date = foundDates[0].date.toISOString().split('T')[0];
    }

    // Extract amount (look for dollar amounts, totals)
    const amountPatterns = [
        // Explicit total patterns (highest priority)
        /\b(?:total|amount|due|paid|balance|subtotal|grand\s+total)[\s:]*\$?\s*(\d{1,3}(?:,\d{3})*\.\d{2})\b/gi,
        /\b(?:total|amount|due|paid|balance|subtotal)[\s:]*\$?\s*(\d+\.\d{2})\b/gi,
        // Dollar sign patterns
        /\$\s*(\d{1,3}(?:,\d{3})*\.\d{2})\b/g,
        /\$\s*(\d+\.\d{2})\b/g,
        // Decimal amounts (likely totals)
        /\b(\d{1,3}(?:,\d{3})*\.\d{2})\b/g,
        /\b(\d+\.\d{2})\b/g,
    ];

    const amounts = [];
    for (const pattern of amountPatterns) {
        const matches = [...text.matchAll(pattern)];
        for (const match of matches) {
            const amountStr = (match[1] || match[0].replace('$', '').replace(/,/g, '')).trim();
            const amount = parseFloat(amountStr);
            if (amount > 0 && amount < 100000 && amountStr.includes('.')) {
                const isTotal = /total|amount|due|paid|balance/i.test(match.input.substring(Math.max(0, match.index - 20), match.index));
                amounts.push({ 
                    amount, 
                    confidence: isTotal ? 1 : 0.5,
                    position: match.index 
                });
            }
        }
    }

    if (amounts.length > 0) {
        amounts.sort((a, b) => {
            if (a.confidence !== b.confidence) return b.confidence - a.confidence;
            return b.position - a.position;
        });
        data.amount = amounts[0].amount;
    }

    // Extract vendor/store name
    const lines = text.split(/\n|\r/).map(l => l.trim()).filter(l => l.length > 0);
    
    // Look for vendor in first few lines (store names usually at top)
    for (let i = 0; i < Math.min(10, lines.length); i++) {
        const line = lines[i];
        
        // Skip lines that are clearly not store names
        if (line.match(/^\d/) ||
            line.match(/^\$/) ||
            line.match(/^[0-9\s\-\/]+$/) ||
            line.length < 3 ||
            line.length > 60 ||
            line.match(/^(total|subtotal|tax|amount|date|time)/i)) {
            continue;
        }
        
        // Good candidate: starts with capital, reasonable length
        if (line.match(/^[A-Z]/) && 
            line.match(/[a-zA-Z]/) &&
            !line.match(/^[A-Z0-9\s]+$/) &&
            line.split(' ').length <= 5) {
            data.vendor = line;
            break;
        }
    }
    
    // If still no vendor, try looking for common store name patterns
    if (!data.vendor) {
        const vendorPatterns = [
            /(?:FROM|STORE|MERCHANT|VENDOR|PHARMACY|HOSPITAL|CLINIC)[\s:]+([A-Z][A-Za-z\s&]+?)(?:\n|$)/i,
            /^([A-Z][A-Za-z\s&]{2,40})(?:\n|$)/m
        ];
        
        for (const pattern of vendorPatterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                const vendor = match[1].trim();
                if (vendor.length > 2 && vendor.length < 50) {
                    data.vendor = vendor;
                    break;
                }
            }
        }
    }

    // Try to detect service type from text
    const serviceKeywords = {
        'Prescription': /prescription|pharmacy|rx|medication|drug/i,
        'Doctor Visit': /doctor|physician|clinic|visit|appointment/i,
        'Dental': /dental|dentist|teeth|oral/i,
        'Vision': /vision|eye|optometrist|glasses|contact/i,
        'Lab Tests': /lab|test|blood|diagnostic/i,
        'Mental Health': /therapy|psychologist|psychiatrist|mental|therapy/i
    };

    for (const [serviceType, pattern] of Object.entries(serviceKeywords)) {
        if (pattern.test(text)) {
            data.service_type = serviceType;
            break;
        }
    }

    return data;
}
