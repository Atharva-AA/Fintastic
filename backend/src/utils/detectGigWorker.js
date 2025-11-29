import User from '../models/User.js';

/**
 * Detect if user is a gig worker/freelancer from:
 * 1. User occupation field (from onboarding)
 * 2. Transaction categories (freelance, gig, etc.)
 */
export async function detectGigWorker(userId, transactions = []) {
  try {
    const user = await User.findById(userId).select('occupation').lean();
    
    if (!user) {
      return { isGigWorker: false, source: 'unknown', indicators: [] };
    }

    const gigKeywords = [
      'gig',
      'freelance',
      'freelancer',
      'contractor',
      'self-employed',
      'self employed',
      'consulting',
      'consultant',
      'commission',
      'tips',
      'side hustle',
      'sidehustle',
      'independent',
      'contract',
    ];

    // Check occupation from onboarding
    const occupation = (user.occupation || []).map(o => o.toLowerCase());
    const occupationMatch = occupation.some(occ => 
      gigKeywords.some(keyword => occ.includes(keyword))
    );

    // Check transaction categories
    const transactionMatch = transactions.some(t => {
      if (t.type !== 'income') return false;
      const category = (t.category || '').toLowerCase();
      const note = (t.note || '').toLowerCase();
      return gigKeywords.some(keyword => 
        category.includes(keyword) || note.includes(keyword)
      );
    });

    const isGigWorker = occupationMatch || transactionMatch;
    const indicators = [];

    if (occupationMatch) {
      indicators.push(...occupation.filter(occ => 
        gigKeywords.some(keyword => occ.includes(keyword))
      ));
    }

    if (transactionMatch) {
      transactions.forEach(t => {
        if (t.type === 'income') {
          const category = (t.category || '').toLowerCase();
          const note = (t.note || '').toLowerCase();
          if (gigKeywords.some(keyword => category.includes(keyword) || note.includes(keyword))) {
            indicators.push(t.category || 'Income');
          }
        }
      });
    }

    return {
      isGigWorker,
      source: occupationMatch ? 'onboarding' : transactionMatch ? 'transactions' : 'none',
      indicators: [...new Set(indicators)], // Remove duplicates
    };
  } catch (error) {
    console.error('Error detecting gig worker:', error);
    return { isGigWorker: false, source: 'error', indicators: [] };
  }
}

