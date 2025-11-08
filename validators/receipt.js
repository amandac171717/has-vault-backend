import Joi from 'joi';

const serviceTypes = [
    'Prescription',
    'Doctor Visit',
    'Dental',
    'Vision',
    'Lab Tests',
    'Mental Health',
    'Other'
];

export const receiptSchema = Joi.object({
    date: Joi.alternatives()
        .try(
            Joi.date().iso().max('now'),
            Joi.date().max('now'),
            Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/)
        )
        .required()
        .messages({
            'date.base': 'Date must be a valid date',
            'date.max': 'Date cannot be in the future',
            'any.required': 'Date is required',
            'alternatives.match': 'Date must be in YYYY-MM-DD format'
        }),
    
    vendor: Joi.string()
        .trim()
        .min(1)
        .max(255)
        .required()
        .messages({
            'string.empty': 'Vendor name is required',
            'string.min': 'Vendor name is required',
            'string.max': 'Vendor name is too long (max 255 characters)',
            'any.required': 'Vendor is required'
        }),
    
    service_type: Joi.string()
        .trim()
        .valid(...serviceTypes)
        .default('Other')
        .allow('Other')
        .messages({
            'any.only': `Service type must be one of: ${serviceTypes.join(', ')}`,
            'any.required': 'Service type is required'
        }),
    
    amount: Joi.number()
        .positive()
        .max(100000)
        .precision(2)
        .required()
        .messages({
            'number.base': 'Amount must be a number',
            'number.positive': 'Amount must be greater than 0',
            'number.max': 'Amount cannot exceed $100,000',
            'any.required': 'Amount is required'
        })
});

