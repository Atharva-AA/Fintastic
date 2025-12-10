# Email Debugging Guide

## Why Emails Might Not Be Sent

### 1. Check if Financial Coach Engine is Triggering
Look for these logs when adding a transaction:
```
🧠 [Financial Coach] Analyzing transaction: [ID]
📧 [Financial Coach] Email check: shouldSend=true, level=HIGH
📧 [Financial Coach] Attempting to send HIGH email...
```

**If you don't see these logs:**
- The financial coach engine might not be running
- Check if `runFinancialCoachEngine` is being called in `transactionController.js`

### 2. Check Email Credentials

**Backend (.env file in `backend/` directory):**
```env
MENTOR_EMAIL=your-email@gmail.com
MENTOR_EMAIL_PASSWORD=your-app-password
```

**AI Service (.env file in `ai-service/` directory):**
```env
MENTOR_EMAIL=your-email@gmail.com
MENTOR_EMAIL_PASSWORD=your-app-password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
```

**Check logs for:**
```
📧 [Email] Checking credentials...
   MENTOR_EMAIL: SET (your-...)
   MENTOR_EMAIL_PASSWORD: SET (***)
✅ [Email] Credentials found, proceeding with email send...
```

**If credentials are NOT SET:**
- Add them to the respective .env files
- Restart both backend and AI service

### 3. Check if Email Conditions Are Met

Email is sent when ANY of these are true:
- `level === 'CRITICAL'`
- `level === 'HIGH'`
- `level === 'POSITIVE'`
- `milestone === true`
- `goalDanger === true`
- `habitBroken === true`

**To trigger HIGH/CRITICAL:**
- Add an expense > 2x your average transaction
- Add an expense > ₹5,000 (if no history)
- Add an expense that threatens a goal

### 4. Check Python AI Service Connection

Look for these logs:
```
📧 [Email] Sending to Python service: http://localhost:8001/ai/send-email
📧 [Email] Python service response: {"success": true, ...}
```

**If you see `ECONNREFUSED`:**
- Python AI service is not running
- Start it with: `cd ai-service && python3 main.py` or `uvicorn main:app --port 8001`

### 5. Check SMTP Authentication

**For Gmail:**
- You MUST use an App Password, not your regular password
- Enable 2-factor authentication
- Generate App Password: https://myaccount.google.com/apppasswords

**Common errors:**
- `SMTPAuthenticationError`: Wrong password or not using App Password
- `SMTPException`: SMTP server issue

### 6. Debug Steps

1. **Add a large transaction** (e.g., ₹10,000 expense)
2. **Check backend logs** for:
   - `📧 [Email] ========== EMAIL SEND ATTEMPT ==========`
   - `📧 [Email] Checking credentials...`
   - `📧 [Email] Sending to Python service...`
3. **Check Python AI service logs** for:
   - `📧 Using SMTP: smtp.gmail.com:587 with email: ...`
   - `✅ Email sent successfully to ...`
4. **Check for errors** in both logs

### 7. Test Email Endpoint Directly

You can test the email endpoint directly:
```bash
curl -X POST http://localhost:8001/ai/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "subject": "Test Email",
    "body": "This is a test email"
  }'
```

## Quick Checklist

- [ ] Backend .env has MENTOR_EMAIL and MENTOR_EMAIL_PASSWORD
- [ ] AI Service .env has MENTOR_EMAIL and MENTOR_EMAIL_PASSWORD
- [ ] Both services are running
- [ ] Python AI service is accessible at http://localhost:8001
- [ ] Gmail App Password is being used (not regular password)
- [ ] Transaction triggers HIGH/CRITICAL level
- [ ] Check logs for error messages

## Common Issues

1. **"Email credentials not configured"**
   - Add MENTOR_EMAIL and MENTOR_EMAIL_PASSWORD to .env files
   - Restart services

2. **"ECONNREFUSED"**
   - Python AI service not running
   - Start it on port 8001

3. **"SMTPAuthenticationError"**
   - Using regular password instead of App Password
   - Generate Gmail App Password

4. **"Email not sent (level=LOW)"**
   - Transaction didn't meet thresholds
   - Add a larger transaction (>₹5,000 or >2x average)

