# Environment Setup Required

## Backend (.env)

Add the following environment variable to `/backend/.env`:

```bash
# AI Internal Secret for protecting AI service endpoints
AI_INTERNAL_SECRET=your-secret-key-here-change-this-in-production
```

**Important**: Generate a strong random secret for production. You can use:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## AI Service (.env)

The AI service already has `AI_SECRET` configured. Make sure it matches the `AI_INTERNAL_SECRET` in the backend.

Update `/ai-service/.env`:
```bash
AI_SECRET=your-secret-key-here-change-this-in-production
```

**Both secrets must match** for the AI service to successfully call the backend's internal endpoints.

## Testing

After adding the secrets, restart both services:

```bash
# Backend
cd backend
npm run dev

# AI Service
cd ai-service
python main.py
```

## Verification

Test the internal endpoint:
```bash
curl -X POST http://localhost:5000/api/ai-internal/get-recent-transactions \
  -H "Content-Type: application/json" \
  -H "x-ai-secret: your-secret-key-here" \
  -d '{"userId": "USER_ID_HERE", "filters": {"limit": 10}}'
```

You should get a 200 response with transaction data.
