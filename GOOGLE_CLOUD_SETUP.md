# Google Cloud Vision API Setup Guide

This guide will help you set up Google Cloud Vision API for receipt OCR.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter a project name (e.g., "hsa-vault-ocr")
5. Click "Create"

## Step 2: Enable the Vision API

1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Cloud Vision API"
3. Click on "Cloud Vision API"
4. Click "Enable"

## Step 3: Create a Service Account

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Enter a name (e.g., "hsa-vault-ocr-service")
4. Click "Create and Continue"
5. For "Role", select "Cloud Vision API User" (or "Owner" for full access)
6. Click "Continue" then "Done"

## Step 4: Create and Download a Key

1. In the "Credentials" page, find your service account
2. Click on the service account email
3. Go to the "Keys" tab
4. Click "Add Key" > "Create new key"
5. Choose "JSON" format
6. Click "Create" - this will download a JSON file

## Step 5: Set Up Environment Variable

1. Save the downloaded JSON file to a secure location (e.g., `~/google-cloud-credentials.json`)
2. Add the following to your `.env` file:

```
GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/google-cloud-credentials.json
```

**Example:**
```
GOOGLE_APPLICATION_CREDENTIALS=/Users/amandacorcoran/google-cloud-credentials.json
```

## Step 6: Restart Your Backend Server

After setting up the credentials, restart your backend server:

```bash
cd /Users/amandacorcoran/Downloads/hsa-vault-backend
PATH="/opt/homebrew/bin:$PATH" npm run dev
```

## Pricing

Google Cloud Vision API pricing (as of 2024):
- **First 1,000 units/month**: FREE
- **1,001 - 5,000,000 units/month**: $1.50 per 1,000 units
- Each receipt image = 1 unit

So you get 1,000 free receipts per month, then it's about $0.0015 per receipt after that.

## Troubleshooting

### Error: "Credentials not configured"
- Make sure `GOOGLE_APPLICATION_CREDENTIALS` is set in your `.env` file
- Make sure the path to the JSON file is correct
- Make sure the JSON file exists and is readable

### Error: "Permission denied"
- Make sure the service account has the "Cloud Vision API User" role
- Make sure the Vision API is enabled in your project

### Error: "Billing not enabled"
- Google Cloud requires billing to be enabled (even for free tier)
- Go to "Billing" in the Google Cloud Console and set up billing
- Don't worry - you still get 1,000 free requests per month

## Alternative: AWS Textract

If you prefer AWS Textract instead, let me know and I can help you set that up instead!

