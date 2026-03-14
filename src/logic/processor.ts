import { Trade, BotMapping, BotStats, PortfolioStats, EquityPoint, MonthlyPerf } from './types';

// ─── Magic remapping helpers ──────────────────────────────────────────────────

function resolveMagic(botName: string, mapping: Map<string, BotMapping>): string | null {
    if (mapping.size === 0) return null;

    const exact = mapping.get(botName);
    if (exact) return exact.magicNumber;

    const lower = botName.toLowerCase();
    for (const [key, val] of mapping) {
        if (key.toLowerCase() === lower) return val.magicNumber;
    }
    for (const [key, val] of mapping) {
        const kl = key.toLowerCase();
        if (lower.includes(kl) || kl.includes(lower)) return val.magicNumber;
    }
    return null;
}

// ─── Normal CDF (Abramowitz & Stegun, max error 7.5e-8) ──────────────────────

function normalCDF(z: number): number {
    const p  = 0.2316419;
    const b1 =  0.319381530;
    const b2 = -0.356563782;
    const b3 =  1.781477937;
    const b4 = -1.821255978;
    const b5 =  1.061405429;
    const za = Math.abs(z);
    const t  = 1.0 / (1.0 + p * za);
    const y  = 1.0 - (1.0 / Math.sqrt(2 * Math.PI))
                   * Math.exp(-0.5 * za * za)
                   * (b1*t + b2*t**2 + b3*t**3 + b4*t**4 + b5*t**5);
    return z >= 0 ? y : 1 - y;
}

// ─── Main processor ───────────────────────────────────────────────────────────

export const processPortfolio = (
    allTrades: Trade[],
    mapping: Map<string, BotMapping>
): { trades: Trade[]; stats: PortfolioStats; equityCurve: EquityPoint[] } => {

    if (allTrades.length === 0) {
        return { trades: [], stats: emptyStats(), equityCurve: [] };
    }

    // 1. Remap magic numbers
    const remapped = allTrades.map(t => {
        const resolved = resolveMagic(t.botName, mapping);
        return resolved ? { ...t, magic: resolved } : t;
    });

    // 2. Sort chronologically (balance entries first at same timestamp)
    const sorted = [...remapped].sort((a, b) => {
        const dt = a.time.getTime() - b.time.getTime();
        if (dt !== 0) return dt;
        if (a.type === 'balance') return -1;
        if (b.type === 'balance') return 1;
        return 0;
    });

    // 3. Build equity curve (closed deals only, excluding balance deposits)
    const dealTrades = sorted.filter(t => t.type !== 'balance');

    let equity = 0;
    let peak   = 0;
    const equityCurve: EquityPoint[] = [];

    for (const t of dealTrades) {
        const netProfit = t.profit + t.commission + t.swap;
        equity += netProfit;
        if (equity > peak) peak = equity;
        const drawdownPct = peak > 0 ? ((peak - equity) / peak) * 100 : 0;

        equityCurve.push({
            time:        t.time.toLocaleString('es-ES', { month: 'short', day: '2-digit', year: 'numeric' }),
            rawTime:     t.time.getTime(),
            equity:      parseFloat(equity.toFixed(2)),
            drawdownPct: parseFloat(drawdownPct.toFixed(2)),
            profit:      parseFloat(netProfit.toFixed(2)),
        });
    }

    // 4. Compute portfolio stats
    const stats = computeStats(dealTrades, equityCurve);

    // 5. Per-bot stats
    const botMap = new Map<string, { trades: Trade[] }>();
    for (const t of dealTrades) {
        if (!botMap.has(t.botName)) botMap.set(t.botName, { trades: [] });
        botMap.get(t.botName)!.trades.push(t);
    }

    const botStats: BotStats[] = Array.from(botMap.entries()).map(([name, { trades: bt }]) => {
        const winTrades = bt.filter(t => (t.profit + t.commission + t.swap) > 0);
        return {
            botName:    name,
            magic:      bt[0]?.magic || '',
            profit:     parseFloat(bt.reduce((s, t) => s + t.profit + t.commission + t.swap, 0).toFixed(2)),
            trades:     bt.length,
            winRate:    bt.length > 0 ? parseFloat(((winTrades.length / bt.length) * 100).toFixed(1)) : 0,
            commission: parseFloat(bt.reduce((s, t) => s + t.commission, 0).toFixed(2)),
            swap:       parseFloat(bt.reduce((s, t) => s + t.swap, 0).toFixed(2)),
        };
    });

    botStats.sort((a, b) => Math.abs(b.profit) - Math.abs(a.profit));

    return {
        trades: sorted,
        stats:  { ...stats, botStats },
        equityCurve,
    };
};

// ─── Stats computation ────────────────────────────────────────────────────────

function computeStats(trades: Trade[], equityCurve: EquityPoint[]): PortfolioStats {
    if (trades.length === 0) return emptyStats();

    const netProfits = trades.map(t => t.profit + t.commission + t.swap);
    const n          = netProfits.length;
    const totalProfit = netProfits.reduce((s, p) => s + p, 0);

    // ── Win / loss split ────────────────────────────────────────────
    const winArr  = netProfits.filter(p => p > 0);
    const lossArr = netProfits.filter(p => p < 0);
    const wins    = winArr.length;
    const losses  = lossArr.length;

    const grossProfit  = winArr.reduce((s, p) => s + p, 0);
    const grossLoss    = Math.abs(lossArr.reduce((s, p) => s + p, 0));
    const profitFactor = grossLoss === 0 ? grossProfit : grossProfit / grossLoss;

    const avgWin      = wins   > 0 ? grossProfit / wins   : 0;
    const avgLoss     = losses > 0 ? grossLoss   / losses : 0;
    const payoutRatio = avgLoss > 0 ? avgWin / avgLoss     : 0;

    const largestWin  = wins   > 0 ? Math.max(...winArr)            : 0;
    const largestLoss = losses > 0 ? Math.abs(Math.min(...lossArr)) : 0;

    const avgTrade = totalProfit / n;

    // Standard deviation of net profits
    const variance = netProfits.reduce((s, p) => s + (p - avgTrade) ** 2, 0) / n;
    const stdDev   = Math.sqrt(variance);

    // ── Max drawdown ────────────────────────────────────────────────
    let maxDDpct = 0;
    for (const pt of equityCurve) {
        if (pt.drawdownPct > maxDDpct) maxDDpct = pt.drawdownPct;
    }

    let peakEq = 0, maxDDabs = 0, runEq = 0;
    for (const t of trades) {
        runEq += t.profit + t.commission + t.swap;
        if (runEq > peakEq) peakEq = runEq;
        const dd = peakEq - runEq;
        if (dd > maxDDabs) maxDDabs = dd;
    }

    const recoveryFactor = maxDDabs === 0 ? totalProfit : totalProfit / maxDDabs;

    // ── Daily grouping using LOCAL calendar date ─────────────────────
    // Use getFullYear/Month/Date (local time) instead of toISOString() (UTC)
    // to avoid cross-midnight UTC shifts mis-attributing trades to wrong dates.
    const dailyMap = new Map<string, number>();
    for (let i = 0; i < trades.length; i++) {
        const d   = trades[i].time;
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        dailyMap.set(key, (dailyMap.get(key) ?? 0) + netProfits[i]);
    }

    // ── Sharpe = avgTrade / stdDev (per-trade basis, no annualization) ─
    // Matches Quant Analyzer's "Sharpe Ratio" computation.
    const sharpeRatio = stdDev === 0 ? 0 : avgTrade / stdDev;

    // ── SQN (Van Tharp, N capped at 100) ────────────────────────────
    const sqnScore = stdDev === 0 ? 0 : (avgTrade / stdDev) * Math.sqrt(Math.min(n, 100));

    // ── STR Quality Number = standard SQN without N cap ─────────────
    // Matches Quant Analyzer's "STR Quality Number" field
    const strQualityNumber = stdDev === 0 ? 0 : (avgTrade / stdDev) * Math.sqrt(n);

    // ── R Expectancy ────────────────────────────────────────────────
    // R Expectancy Score = totalProfit / avgLoss
    // Verified against Quant Analyzer: 1569.38 / 80.55 = 19.48 R ✓
    const rExpectancy      = avgLoss > 0 ? avgTrade / avgLoss : 0;
    const rExpectancyScore = avgLoss > 0 ? totalProfit / avgLoss : 0;

    // ── Consecutive wins/losses ─────────────────────────────────────
    let maxCW = 0, maxCL = 0, curCW = 0, curCL = 0;
    let sumCW = 0, sumCL = 0, runCW = 0, runCL = 0;
    let runCount = 0;

    for (let i = 0; i < netProfits.length; i++) {
        const isWin = netProfits[i] > 0;
        if (isWin) {
            if (curCL > 0) { runCount++; sumCL += curCL; runCL++; curCL = 0; }
            curCW++;
            if (curCW > maxCW) maxCW = curCW;
        } else {
            if (curCW > 0) { runCount++; sumCW += curCW; runCW++; curCW = 0; }
            curCL++;
            if (curCL > maxCL) maxCL = curCL;
        }
    }
    // Close last open run
    if (curCW > 0) { runCount++; sumCW += curCW; runCW++; }
    if (curCL > 0) { runCount++; sumCL += curCL; runCL++; }

    const avgConsecWins   = runCW > 0 ? sumCW / runCW : 0;
    const avgConsecLosses = runCL > 0 ? sumCL / runCL : 0;

    // ── Z-Score (Wald–Wolfowitz runs test) ──────────────────────────
    // Tests whether the W/L sequence is random
    let zScore = 0, zProbability = 0;
    if (wins > 0 && losses > 0 && n > 2) {
        const twoWL = 2 * wins * losses;
        const meanR = twoWL / n + 1;
        const varR  = (twoWL * (twoWL - n)) / (n * n * (n - 1));
        zScore      = varR > 0 ? (runCount - meanR) / Math.sqrt(varR) : 0;
        // Two-tailed: probability that the sequence is NOT random
        zProbability = Math.min(99.99, (2 * normalCDF(Math.abs(zScore)) - 1) * 100);
    }

    // ── Time-based stats ────────────────────────────────────────────
    const firstDate = trades[0].time.getTime();
    const lastDate  = trades[trades.length - 1].time.getTime();

    // Use unique calendar dates with trades — matches Quant Analyzer's "trading days"
    // (dailyMap was already built above for Sharpe)
    const tradingDays = Math.max(1, dailyMap.size);

    // Calendar days (for drawdown % and stagnation %)
    const calendarDays = Math.max(1, (lastDate - firstDate) / 86_400_000);

    // Calendar months elapsed (year×12+month difference) — matches Quant Analyzer
    // Example: Jan 2025 → Jan 2026 = 12 months → monthly = total/12 ✓
    const firstDt  = new Date(firstDate);
    const lastDt   = new Date(lastDate);
    const calMonths = Math.max(1,
        (lastDt.getFullYear() * 12 + lastDt.getMonth()) -
        (firstDt.getFullYear() * 12 + firstDt.getMonth())
    );

    const dailyAvgProfit   = totalProfit / tradingDays;
    const monthlyAvgProfit = totalProfit / calMonths;
    const yearlyAvgProfit  = monthlyAvgProfit * 12;

    const annualReturnDDRatio = maxDDabs > 0 ? yearlyAvgProfit / maxDDabs : 0;

    // ── Stagnation: max calendar days between equity highs ──────────
    let maxStagDays = 0;
    let stagStart   = equityCurve.length > 0 ? equityCurve[0].rawTime : firstDate;
    let curPeakEq   = -Infinity;

    for (const pt of equityCurve) {
        if (pt.equity > curPeakEq) {
            const days = (pt.rawTime - stagStart) / 86_400_000;
            if (days > maxStagDays) maxStagDays = days;
            curPeakEq = pt.equity;
            stagStart = pt.rawTime;
        }
    }
    // Tail stagnation (from last high to last trade)
    const tailDays = (lastDate - stagStart) / 86_400_000;
    if (tailDays > maxStagDays) maxStagDays = tailDays;

    // Use calendarDays as denominator — matches Quant Analyzer: 142/364 = 39.0% ≈ QA's 38.9% ✓
    const stagnationPct = calendarDays > 0 ? (maxStagDays / calendarDays) * 100 : 0;

    // ── Monthly performance ─────────────────────────────────────────
    const monthlyMap = new Map<string, number>();
    for (let i = 0; i < trades.length; i++) {
        const t   = trades[i];
        const key = `${t.time.getFullYear()}-${t.time.getMonth()}`;
        monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + netProfits[i]);
    }

    const yearSet = new Set<number>();
    for (const t of trades) yearSet.add(t.time.getFullYear());

    const monthlyPerf: MonthlyPerf[] = Array.from(yearSet).sort().map(year => {
        const months: (number | null)[] = Array(12).fill(null);
        let ytd = 0;
        for (let m = 0; m < 12; m++) {
            const key = `${year}-${m}`;
            if (monthlyMap.has(key)) {
                const v    = parseFloat(monthlyMap.get(key)!.toFixed(2));
                months[m]  = v;
                ytd       += v;
            }
        }
        return { year, months, ytd: parseFloat(ytd.toFixed(2)) };
    });

    return {
        totalProfit:          parseFloat(totalProfit.toFixed(2)),
        totalTrades:          n,
        winRate:              parseFloat(((wins / n) * 100).toFixed(2)),
        profitFactor:         parseFloat(profitFactor.toFixed(2)),
        maxDrawdown:          parseFloat(maxDDabs.toFixed(2)),
        maxDrawdownPercent:   parseFloat(maxDDpct.toFixed(2)),
        recoveryFactor:       parseFloat(recoveryFactor.toFixed(2)),
        sharpeRatio:          parseFloat(sharpeRatio.toFixed(2)),
        wins,
        losses,
        grossProfit:          parseFloat(grossProfit.toFixed(2)),
        grossLoss:            parseFloat(grossLoss.toFixed(2)),
        avgWin:               parseFloat(avgWin.toFixed(2)),
        avgLoss:              parseFloat(avgLoss.toFixed(2)),
        largestWin:           parseFloat(largestWin.toFixed(2)),
        largestLoss:          parseFloat(largestLoss.toFixed(2)),
        avgTrade:             parseFloat(avgTrade.toFixed(2)),
        stdDev:               parseFloat(stdDev.toFixed(2)),
        payoutRatio:          parseFloat(payoutRatio.toFixed(2)),
        maxConsecWins:        maxCW,
        maxConsecLosses:      maxCL,
        avgConsecWins:        parseFloat(avgConsecWins.toFixed(2)),
        avgConsecLosses:      parseFloat(avgConsecLosses.toFixed(2)),
        firstTradeDate:       firstDate,
        lastTradeDate:        lastDate,
        tradingDays:          Math.round(tradingDays),
        dailyAvgProfit:       parseFloat(dailyAvgProfit.toFixed(2)),
        monthlyAvgProfit:     parseFloat(monthlyAvgProfit.toFixed(2)),
        yearlyAvgProfit:      parseFloat(yearlyAvgProfit.toFixed(2)),
        sqnScore:             parseFloat(sqnScore.toFixed(2)),
        strQualityNumber:     parseFloat(strQualityNumber.toFixed(2)),
        rExpectancy:          parseFloat(rExpectancy.toFixed(2)),
        rExpectancyScore:     parseFloat(rExpectancyScore.toFixed(2)),
        zScore:               parseFloat(zScore.toFixed(2)),
        zProbability:         parseFloat(zProbability.toFixed(1)),
        stagnationDays:       Math.round(maxStagDays),
        stagnationPct:        parseFloat(stagnationPct.toFixed(2)),
        annualReturnDDRatio:  parseFloat(annualReturnDDRatio.toFixed(2)),
        botStats:             [],
        monthlyPerf,
    };
}

// ─── Empty stats ──────────────────────────────────────────────────────────────

function emptyStats(): PortfolioStats {
    return {
        totalProfit: 0, totalTrades: 0, winRate: 0, profitFactor: 0,
        maxDrawdown: 0, maxDrawdownPercent: 0, recoveryFactor: 0, sharpeRatio: 0,
        wins: 0, losses: 0, grossProfit: 0, grossLoss: 0,
        avgWin: 0, avgLoss: 0, largestWin: 0, largestLoss: 0,
        avgTrade: 0, stdDev: 0, payoutRatio: 0,
        maxConsecWins: 0, maxConsecLosses: 0, avgConsecWins: 0, avgConsecLosses: 0,
        firstTradeDate: 0, lastTradeDate: 0, tradingDays: 0,
        dailyAvgProfit: 0, monthlyAvgProfit: 0, yearlyAvgProfit: 0,
        sqnScore: 0, strQualityNumber: 0, rExpectancy: 0, rExpectancyScore: 0,
        zScore: 0, zProbability: 0, stagnationDays: 0, stagnationPct: 0,
        annualReturnDDRatio: 0,
        botStats: [], monthlyPerf: [],
    };
}
