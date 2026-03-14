export interface Trade {
    ticket: string;
    time: Date;
    type: string;          // 'buy' | 'sell' | 'balance' | etc.
    direction: string;     // 'in' | 'out' | '' (balance has no direction)
    order: string;
    symbol: string;
    volume: number;
    price: number;
    commission: number;
    swap: number;
    profit: number;        // raw trade profit (excludes comm/swap)
    balance: number;       // running balance from the source report
    magic: string;
    botName: string;
    comment: string;
}

export interface BotMapping {
    botName: string;
    magicNumber: string;
    symbol?: string;
}

export interface BotStats {
    botName: string;
    magic: string;
    profit: number;
    trades: number;
    winRate: number;
    commission: number;
    swap: number;
}

export interface EquityPoint {
    time: string;
    rawTime: number;
    equity: number;
    drawdownPct: number;
    profit: number;        // per-trade net profit for tooltip
}

export interface MonthlyPerf {
    year: number;
    months: (number | null)[];  // index 0 = Jan … 11 = Dec; null = no trades
    ytd: number;
}

export interface PortfolioStats {
    // ── Core ──────────────────────────────────────────────────────────
    totalProfit: number;
    totalTrades: number;
    winRate: number;            // %
    profitFactor: number;
    maxDrawdown: number;        // $ absolute
    maxDrawdownPercent: number; // %
    recoveryFactor: number;     // totalProfit / maxDD$
    sharpeRatio: number;

    // ── Trade breakdown ───────────────────────────────────────────────
    wins: number;
    losses: number;
    grossProfit: number;
    grossLoss: number;
    avgWin: number;
    avgLoss: number;
    largestWin: number;
    largestLoss: number;
    avgTrade: number;           // expectancy
    stdDev: number;
    payoutRatio: number;        // avgWin / avgLoss

    // ── Consecutive ───────────────────────────────────────────────────
    maxConsecWins: number;
    maxConsecLosses: number;
    avgConsecWins: number;
    avgConsecLosses: number;

    // ── Time-based ────────────────────────────────────────────────────
    firstTradeDate: number;     // ms timestamp
    lastTradeDate: number;
    tradingDays: number;
    dailyAvgProfit: number;
    monthlyAvgProfit: number;
    yearlyAvgProfit: number;

    // ── Advanced ──────────────────────────────────────────────────────
    sqnScore: number;           // Van Tharp: √min(N,100) × E/σ  (capped)
    strQualityNumber: number;   // Standard SQN: √N × E/σ (no cap) — matches QA "STR Quality Number"
    rExpectancy: number;        // avgTrade / avgLoss
    rExpectancyScore: number;   // rExpectancy × √N
    zScore: number;
    zProbability: number;       // % probability sequence is non-random
    stagnationDays: number;
    stagnationPct: number;
    annualReturnDDRatio: number; // yearlyAvgProfit / maxDD$

    // ── Per-bot ───────────────────────────────────────────────────────
    botStats: BotStats[];

    // ── Monthly performance ───────────────────────────────────────────
    monthlyPerf: MonthlyPerf[];
}
