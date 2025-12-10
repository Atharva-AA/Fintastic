/**
 * Middleware to verify AI internal secret
 * Protects internal AI service endpoints
 */
export const verifyAiSecret = (req, res, next) => {
  const aiSecret = req.headers['x-ai-secret'];
  const expectedSecret = process.env.AI_INTERNAL_SECRET;

  if (!expectedSecret) {
    console.error('❌ [AI Secret] AI_INTERNAL_SECRET not configured in environment');
    return res.status(500).json({
      success: false,
      message: 'AI secret not configured on server'
    });
  }

  if (!aiSecret) {
    console.warn('⚠️ [AI Secret] Missing x-ai-secret header');
    return res.status(401).json({
      success: false,
      message: 'AI secret required'
    });
  }

  if (aiSecret !== expectedSecret) {
    console.warn('⚠️ [AI Secret] Invalid AI secret provided');
    return res.status(403).json({
      success: false,
      message: 'Invalid AI secret'
    });
  }

  // Secret is valid, proceed
  next();
};
