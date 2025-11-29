export const verifyAI = (req, res, next) => {
  console.log('🔐 [verifyAI] Middleware called');
  console.log(
    '🔐 [verifyAI] All headers:',
    JSON.stringify(req.headers, null, 2)
  );

  const secret = req.headers['x-ai-secret'];
  const expectedSecret = process.env.AI_INTERNAL_SECRET;

  console.log(
    '🔍 [verifyAI] Received secret:',
    secret ? `"${secret}" (length: ${secret.length})` : 'MISSING'
  );
  console.log(
    '🔍 [verifyAI] Expected secret:',
    expectedSecret
      ? `"${expectedSecret}" (length: ${expectedSecret.length})`
      : 'MISSING'
  );
  console.log('🔍 [verifyAI] Secrets match?', secret === expectedSecret);
  console.log('🔍 [verifyAI] Secret exists?', !!secret);
  console.log('🔍 [verifyAI] Expected exists?', !!expectedSecret);

  if (!secret) {
    console.error('❌ [verifyAI] No secret header provided');
    return res
      .status(403)
      .json({ message: 'Unauthorized AI: No secret header' });
  }

  if (!expectedSecret) {
    console.error('❌ [verifyAI] AI_INTERNAL_SECRET not set in environment');
    return res.status(500).json({
      message: 'Server configuration error: AI_INTERNAL_SECRET not set',
    });
  }

  if (secret !== expectedSecret) {
    console.error('❌ [verifyAI] Secret mismatch');
    console.error('❌ [verifyAI] Received:', JSON.stringify(secret));
    console.error('❌ [verifyAI] Expected:', JSON.stringify(expectedSecret));
    return res
      .status(403)
      .json({ message: 'Unauthorized AI: Secret mismatch' });
  }

  console.log('✅ [verifyAI] Secret verified successfully');
  next();
};
