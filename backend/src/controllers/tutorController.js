import PaperTrade from '../models/PaperTrade.js';
import Portfolio from '../models/Portfolio.js';
import { getMarketData } from '../services/marketData.service.js';
import { placePaperTrade } from '../services/alpaca.service.js';

/**
 * Get videos list
 * First 2 videos must be from "Finance with Sharan"
 */
export const getVideos = async (req, res) => {
  try {
    // Hardcoded videos - first 2 from Finance with Sharan
    const videos = [
      {
        id: '1',
        title: 'Complete Guide to Personal Finance | Finance with Sharan',
        channel: 'Finance with Sharan',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        duration: '15:30',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        category: 'Basics',
      },
      {
        id: '2',
        title: 'Stock Market Investing for Beginners | Finance with Sharan',
        channel: 'Finance with Sharan',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        duration: '20:45',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        category: 'Investing',
      },
      {
        id: '3',
        title: 'Understanding Mutual Funds',
        channel: 'Financial Education',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        duration: '12:20',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        category: 'Investing',
      },
      {
        id: '4',
        title: 'Tax Planning Strategies',
        channel: 'Tax Expert',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        duration: '18:15',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        category: 'Tax',
      },
    ];

    res.json(videos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
};

/**
 * Get market data for a symbol
 */
export const getMarketDataController = async (req, res) => {
  try {
    const { symbol } = req.params;
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }

    const data = await getMarketData(symbol);
    res.json(data);
  } catch (error) {
    console.error('Error fetching market data:', error);
    res.status(500).json({ error: 'Failed to fetch market data' });
  }
};

/**
 * Place a trade order
 */
export const placeTrade = async (req, res) => {
  try {
    const userId = req.user._id;
    const { symbol, quantity, orderType, price } = req.body;

    if (!symbol || !quantity || !orderType || !price) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get or create portfolio
    let portfolio = await Portfolio.findOne({ userId });
    if (!portfolio) {
      portfolio = new Portfolio({ userId, cashBalance: 100000 });
      await portfolio.save();
    }

    // Check if user has enough cash/stock
    if (orderType === 'buy') {
      const totalCost = price * quantity;
      if (portfolio.cashBalance < totalCost) {
        return res.status(400).json({ error: 'Insufficient cash balance' });
      }
    } else if (orderType === 'sell') {
      const holding = portfolio.holdings.find(
        (h) => h.symbol === symbol.toUpperCase()
      );
      if (!holding || holding.quantity < quantity) {
        return res.status(400).json({ error: 'Insufficient stock holdings' });
      }
    }

    // Place order with Alpaca (simulated)
    const alpacaResult = await placePaperTrade({
      symbol: symbol.toUpperCase(),
      quantity,
      orderType,
      price,
    });

    // Create trade record
    const trade = new PaperTrade({
      userId,
      symbol: symbol.toUpperCase(),
      quantity,
      price: alpacaResult.executedPrice || price,
      orderType,
      status: alpacaResult.status || 'executed',
      executedAt: alpacaResult.executedAt || new Date(),
      orderId: alpacaResult.orderId,
    });
    await trade.save();

    // Update portfolio
    if (orderType === 'buy') {
      const totalCost = (alpacaResult.executedPrice || price) * quantity;
      portfolio.cashBalance -= totalCost;

      const existingHolding = portfolio.holdings.find(
        (h) => h.symbol === symbol.toUpperCase()
      );

      if (existingHolding) {
        const totalQuantity = existingHolding.quantity + quantity;
        const totalCostBasis =
          existingHolding.avgPrice * existingHolding.quantity + totalCost;
        existingHolding.avgPrice = totalCostBasis / totalQuantity;
        existingHolding.quantity = totalQuantity;
      } else {
        portfolio.holdings.push({
          symbol: symbol.toUpperCase(),
          quantity,
          avgPrice: alpacaResult.executedPrice || price,
          currentPrice: alpacaResult.executedPrice || price,
        });
      }
    } else {
      // Sell
      const holding = portfolio.holdings.find(
        (h) => h.symbol === symbol.toUpperCase()
      );
      if (holding) {
        const proceeds = (alpacaResult.executedPrice || price) * quantity;
        portfolio.cashBalance += proceeds;
        holding.quantity -= quantity;

        if (holding.quantity <= 0) {
          portfolio.holdings = portfolio.holdings.filter(
            (h) => h.symbol !== symbol.toUpperCase()
          );
        }
      }
    }

    portfolio.lastUpdated = new Date();
    await portfolio.save();

    res.json({
      success: true,
      message: `Order ${orderType} executed successfully`,
      order: trade,
    });
  } catch (error) {
    console.error('Error placing trade:', error);
    res.status(500).json({ error: 'Failed to place trade' });
  }
};

/**
 * Get user portfolio
 */
export const getPortfolio = async (req, res) => {
  try {
    const userId = req.user._id;

    let portfolio = await Portfolio.findOne({ userId });
    if (!portfolio) {
      portfolio = new Portfolio({ userId, cashBalance: 100000 });
      await portfolio.save();
    }

    // Update current prices and calculate P&L
    for (const holding of portfolio.holdings) {
      try {
        const marketData = await getMarketData(holding.symbol);
        holding.currentPrice = marketData.price;
        holding.value = holding.currentPrice * holding.quantity;
        holding.pnl =
          (holding.currentPrice - holding.avgPrice) * holding.quantity;
        holding.pnlPercent =
          ((holding.currentPrice - holding.avgPrice) / holding.avgPrice) * 100;
      } catch (error) {
        console.error(`Error fetching price for ${holding.symbol}:`, error);
      }
    }

    portfolio.totalValue =
      portfolio.cashBalance +
      portfolio.holdings.reduce((sum, h) => sum + h.value, 0);
    portfolio.lastUpdated = new Date();
    await portfolio.save();

    res.json(portfolio);
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
};

/**
 * Get order history
 */
export const getOrders = async (req, res) => {
  try {
    const userId = req.user._id;
    const orders = await PaperTrade.find({ userId })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

/**
 * Calculate SIP
 */
export const calculateSIP = async (req, res) => {
  try {
    const { monthlyAmount, rate, years } = req.body;

    if (!monthlyAmount || !rate || !years) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const monthlyRate = rate / 12 / 100;
    const totalMonths = years * 12;
    const totalInvested = monthlyAmount * totalMonths;

    // SIP formula: FV = P * [((1 + r)^n - 1) / r] * (1 + r)
    let totalValue = 0;
    const projection = [];

    for (let month = 1; month <= totalMonths; month++) {
      const invested = monthlyAmount * month;
      // Calculate future value using compound interest
      const futureValue =
        monthlyAmount *
        ((Math.pow(1 + monthlyRate, month) - 1) / monthlyRate) *
        (1 + monthlyRate);
      totalValue = futureValue;
      projection.push({
        month,
        invested,
        value: futureValue,
      });
    }

    const estimatedReturns = totalValue - totalInvested;

    res.json({
      monthlyAmount,
      rate,
      years,
      totalInvested,
      estimatedReturns,
      totalValue,
      projection,
    });
  } catch (error) {
    console.error('Error calculating SIP:', error);
    res.status(500).json({ error: 'Failed to calculate SIP' });
  }
};
