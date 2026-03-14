import React from 'react';
import { Check, Minus, ChevronRight } from 'lucide-react';
import { BotStats } from '../logic/types';

interface Props {
    botStats: BotStats[];
    excludedBots: Set<string>;
    onToggle: (name: string) => void;
}

export const BotList: React.FC<Props> = ({ botStats, excludedBots, onToggle }) => {
    if (botStats.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-8 opacity-25">
                <div className="w-10 h-10 rounded-xl border border-border flex items-center justify-center">
                    <ChevronRight className="w-5 h-5 text-muted" />
                </div>
                <p className="text-xs text-center text-muted font-medium">
                    Carga archivos para ver los sistemas
                </p>
            </div>
        );
    }

    const totalProfitAll = botStats.reduce((s, b) => s + b.profit, 0);

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-0.5">
            {botStats.map((bot) => {
                const excluded  = excludedBots.has(bot.botName);
                const isProfit  = bot.profit >= 0;
                const pctOfAll  = totalProfitAll !== 0 ? (bot.profit / Math.abs(totalProfitAll)) * 100 : 0;

                return (
                    <button
                        key={bot.botName}
                        onClick={() => onToggle(bot.botName)}
                        className={`w-full text-left rounded-xl px-3 py-2.5 transition-all duration-150 group relative overflow-hidden
                            ${excluded
                                ? 'opacity-35 hover:opacity-55'
                                : 'hover:bg-surface3'
                            }`}
                        style={{
                            background: excluded ? 'transparent' : undefined,
                        }}
                    >
                        {/* Progress bar fill (shows relative profit contribution) */}
                        {!excluded && pctOfAll > 0 && (
                            <div
                                className="absolute left-0 top-0 bottom-0 rounded-xl opacity-[0.07]"
                                style={{
                                    width: `${Math.min(Math.abs(pctOfAll), 100)}%`,
                                    background: isProfit ? '#00d68f' : '#ef4444',
                                }}
                            />
                        )}

                        <div className="relative flex items-center gap-2.5">
                            {/* Checkbox */}
                            <div className={`w-4.5 h-4.5 flex-shrink-0 rounded-md flex items-center justify-center transition-all
                                ${excluded
                                    ? 'border border-border bg-transparent'
                                    : isProfit
                                        ? 'bg-primary/15 border border-primary/30'
                                        : 'bg-error/15 border border-error/30'
                                }`}
                                style={{ width: '18px', height: '18px' }}
                            >
                                {excluded
                                    ? <Minus className="w-2.5 h-2.5 text-muted/40" />
                                    : <Check className={`w-2.5 h-2.5 ${isProfit ? 'text-primary' : 'text-error'}`} />
                                }
                            </div>

                            {/* Name + Meta */}
                            <div className="flex-1 min-w-0">
                                <p className={`text-[11px] font-semibold truncate leading-none mb-0.5
                                    ${excluded ? 'text-muted/40' : 'text-text'}`}>
                                    {bot.botName}
                                </p>
                                <div className="flex items-center gap-1.5">
                                    {bot.magic && (
                                        <span className="text-[9px] font-bold text-secondary/70 tabular">
                                            #{bot.magic}
                                        </span>
                                    )}
                                    <span className="text-[9px] text-muted/40 tabular">
                                        {bot.trades}t · {bot.winRate}%
                                    </span>
                                </div>
                            </div>

                            {/* Profit */}
                            <span className={`text-[11px] font-black tabular flex-shrink-0
                                ${excluded ? 'text-muted/30' : isProfit ? 'text-primary' : 'text-error'}`}>
                                {isProfit ? '+' : '-'}${Math.abs(bot.profit).toFixed(0)}
                            </span>
                        </div>
                    </button>
                );
            })}
        </div>
    );
};
