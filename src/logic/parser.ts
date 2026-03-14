import { Trade, BotMapping } from './types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Strip space-thousands separators and normalise comma → dot decimal. */
function parseNum(raw: string): number {
    const clean = raw.replace(/\s/g, '').replace(',', '.');
    return parseFloat(clean) || 0;
}

/**
 * Parse MT5 date string: "2025.01.06 15:47:40"
 * Converts to ISO format so Date() can parse it reliably across all browsers.
 */
function parseDate(raw: string): Date {
    const iso = raw.trim()
        .replace(/(\d{4})\.(\d{2})\.(\d{2})/, '$1-$2-$3')
        .replace(' ', 'T');
    const d = new Date(iso);
    return isNaN(d.getTime()) ? new Date(raw) : d;
}

// ─── Main backtest report parser ─────────────────────────────────────────────

export const parseMT5Report = (html: string, fileName: string): Trade[] => {
    const dom = new DOMParser();
    const doc = dom.parseFromString(html, 'text/html');
    const trades: Trade[] = [];

    // ── 1. Extract bot name from "Experto:" label row ──
    let botName = fileName.replace(/\.html?$/i, '');
    for (const row of Array.from(doc.querySelectorAll('tr'))) {
        const tds = Array.from(row.querySelectorAll('td'));
        for (let i = 0; i < tds.length; i++) {
            const label = tds[i].textContent?.trim().toLowerCase() || '';
            if (label === 'experto:' || label === 'expert:') {
                // The value is in the NEXT td in the same row
                const valueTd = tds[i + 1] ?? tds[i + 2];
                const extracted = valueTd?.textContent?.trim() || '';
                if (extracted && extracted.length < 200) botName = extracted;
                break;
            }
        }
    }

    // ── 2. Auto-extract MagicNumber from the input params section ──
    let autoMagic = '';
    const bodyText = doc.body?.textContent || '';
    const magicMatch = bodyText.match(/MagicNumber\s*=\s*(\d+)/i);
    if (magicMatch) autoMagic = magicMatch[1];

    // ── 3. Locate the "Transacciones" (Deals) table ──
    const tables = Array.from(doc.querySelectorAll('table')) as HTMLTableElement[];
    let dealsTable: HTMLTableElement | null = null;

    // Strategy A: find table containing a <th> with "transacciones" / "deals"
    for (const table of tables) {
        const ths = Array.from(table.querySelectorAll('th'));
        const found = ths.some(th => {
            const t = th.textContent?.toLowerCase() || '';
            return t.includes('transacciones') || t.includes('deals');
        });
        if (found) { dealsTable = table; break; }
    }

    // Strategy B (fallback): score-based header row detection
    if (!dealsTable) {
        outer: for (const table of tables) {
            for (const row of Array.from(table.querySelectorAll('tr'))) {
                const cells = Array.from(row.querySelectorAll('th, td')).map(c =>
                    c.textContent?.replace(/\s+/g, ' ').trim().toLowerCase() || ''
                );
                const checks = [
                    cells.some(c => c.includes('transacción') || c.includes('transaccion') || c.includes('ticket')),
                    cells.some(c => c.includes('beneficio') || c.includes('profit')),
                    cells.some(c => c.includes('fecha') || c.includes('time') || c.includes('hora')),
                    cells.some(c => c.includes('símbolo') || c.includes('simbolo') || c.includes('symbol')),
                ];
                if (checks.filter(Boolean).length >= 3) {
                    dealsTable = table;
                    break outer;
                }
            }
        }
    }

    if (!dealsTable) {
        console.warn(`[parser] "${fileName}": no deals table found — skipping.`);
        return trades;
    }

    // ── 4. Identify the header row inside the deals table ──
    //
    // IMPORTANT: MT5 puts "Órdenes" and "Transacciones" in the SAME <table>.
    // We must skip past the "Órdenes" section by finding the "Transacciones"
    // title row first, then look for the column-header row starting from there.
    // We also require "beneficio"/"profit" as a mandatory column — that field
    // only appears in the Transacciones header, not in the Órdenes header.
    const tableRows = Array.from(dealsTable.querySelectorAll('tr'));
    let headers: string[] = [];
    let headerRowIdx = -1;

    // Step A: find the row index of the "Transacciones" section title
    let transaccionesStart = 0;
    for (let i = 0; i < tableRows.length; i++) {
        const hasTitle = Array.from(tableRows[i].querySelectorAll('th, td')).some(c => {
            const t = c.textContent?.toLowerCase() || '';
            return t.includes('transacciones') || t.includes('deals');
        });
        if (hasTitle) { transaccionesStart = i + 1; break; }
    }

    // Step B: find the column header row (requires "beneficio"/"profit")
    for (let i = transaccionesStart; i < Math.min(transaccionesStart + 10, tableRows.length); i++) {
        const cells = Array.from(tableRows[i].querySelectorAll('th, td')).map(c =>
            c.textContent?.replace(/\s+/g, ' ').trim().toLowerCase() || ''
        );
        const hasBeneficio = cells.some(c => c.includes('beneficio') || c.includes('profit'));
        const hasFecha     = cells.some(c => c.includes('fecha') || c.includes('time') || c.includes('hora'));
        const hasSymbol    = cells.some(c => c.includes('símbolo') || c.includes('simbolo') || c.includes('symbol'));
        // "beneficio" is present ONLY in the Transacciones header → required to avoid matching Órdenes
        if (hasBeneficio && (hasFecha || hasSymbol)) {
            headers = cells;
            headerRowIdx = i;
            break;
        }
    }

    if (headerRowIdx === -1) {
        console.warn(`[parser] "${fileName}": header row not found in deals table.`);
        return trades;
    }

    // ── 5. Map column names to indices ──
    const fi = (keywords: string[]) =>
        headers.findIndex(h => keywords.some(k => h.includes(k)));

    const col = {
        time:       fi(['fecha', 'time', 'tiempo', 'hora de apertura']),
        ticket:     fi(['transacción', 'transaccion', 'ticket', 'deal', 'comprobante']),
        symbol:     fi(['símbolo', 'simbolo', 'symbol']),
        type:       fi(['tipo', 'type']),
        direction:  fi(['dirección', 'direccion', 'direction']),
        volume:     fi(['volumen', 'volume']),
        price:      fi(['precio', 'price']),
        order:      fi(['orden', 'order']),
        commission: fi(['comisión', 'comision', 'commission']),
        swap:       fi(['swap']),
        profit:     fi(['beneficio', 'profit']),
        balance:    fi(['balance']),
        comment:    fi(['comentario', 'comment']),
    };

    console.log(`[parser] "${fileName}" → botName="${botName}" magic="${autoMagic}" headerIdx=${headerRowIdx}`);

    // ── 6a. First pass: collect "in" row commissions by ticket number ──
    // MT5 charges commission in two halves: entry ("in") and exit ("out").
    // The "out" ticket is always "in" ticket + 1 (consecutive numbering).
    // We index "in" commissions by their own ticket so "out" rows can look
    // them up as (out_ticket - 1).
    const inCommissions = new Map<string, number>();
    for (let ri = headerRowIdx + 1; ri < tableRows.length; ri++) {
        const cells = Array.from(tableRows[ri].querySelectorAll('td'));
        if (cells.length < 5) continue;
        const get = (i: number) =>
            i >= 0 && cells[i] ? cells[i].textContent?.trim() ?? '' : '';
        if (get(col.direction).toLowerCase().trim() !== 'in') continue;
        const ticket = get(col.ticket).replace(/\s/g, '');
        const comm   = parseNum(get(col.commission));
        if (ticket && comm !== 0) inCommissions.set(ticket, comm);
    }

    // ── 6b. Second pass: parse "out" rows (closed deals) + balance entries ──
    for (let ri = headerRowIdx + 1; ri < tableRows.length; ri++) {
        const cells = Array.from(tableRows[ri].querySelectorAll('td'));
        if (cells.length < 5) continue;

        const get = (i: number) =>
            i >= 0 && cells[i] ? cells[i].textContent?.trim() ?? '' : '';

        const timeStr   = get(col.time);
        const direction = get(col.direction).toLowerCase().trim();
        const type      = get(col.type).toLowerCase().trim();

        if (!timeStr) continue;
        // Only closed deals (direction="out") and initial balance entries
        if (direction !== 'out' && type !== 'balance') continue;

        // Add the opening-leg commission (ticket N-1) to the round-trip cost
        const ticket    = get(col.ticket).replace(/\s/g, '');
        const prevTicket = String(parseInt(ticket, 10) - 1);
        const openComm  = direction === 'out' ? (inCommissions.get(prevTicket) ?? 0) : 0;

        trades.push({
            ticket,
            time:       parseDate(timeStr),
            type,
            direction,
            order:      get(col.order),
            symbol:     get(col.symbol),
            volume:     parseNum(get(col.volume)),
            price:      parseNum(get(col.price)),
            commission: parseNum(get(col.commission)) + openComm,
            swap:       parseNum(get(col.swap)),
            profit:     parseNum(get(col.profit)),
            balance:    parseNum(get(col.balance)),
            magic:      autoMagic,
            botName,
            comment:    get(col.comment),
        });
    }

    console.log(`[parser] "${fileName}" → ${trades.length} deals extracted.`);
    return trades;
};

// ─── Magic mapping file parser ────────────────────────────────────────────────

export const parseMapping = (html: string): Map<string, BotMapping> => {
    const dom = new DOMParser();
    const doc = dom.parseFromString(html, 'text/html');
    const mapping = new Map<string, BotMapping>();

    // Find a table that has both "magic" and "nombre/bot" columns
    const tables = Array.from(doc.querySelectorAll('table'));
    for (const table of tables) {
        const rows = Array.from(table.querySelectorAll('tr'));

        // Locate header row
        let headers: string[] = [];
        let headerIdx = -1;
        for (let i = 0; i < rows.length; i++) {
            const cells = Array.from(rows[i].querySelectorAll('th, td')).map(c =>
                c.textContent?.replace(/\s+/g, ' ').trim().toLowerCase() || ''
            );
            const hasMagic = cells.some(c => c.includes('magic'));
            const hasName  = cells.some(c => c.includes('nombre') || c.includes('bot') || c.includes('name') || c.includes('ea'));
            if (hasMagic && hasName) {
                headers = cells;
                headerIdx = i;
                break;
            }
        }
        if (headerIdx === -1) continue;

        const fi = (kw: string[]) =>
            headers.findIndex(h => kw.some(k => h.includes(k)));

        const col = {
            name:   fi(['nombre', 'bot', 'name', 'ea', 'experto', 'expert']),
            magic:  fi(['magic']),
            symbol: fi(['symbol', 'símbolo', 'simbolo', 'par', 'instrumento']),
        };

        if (col.name === -1 || col.magic === -1) continue;

        for (let ri = headerIdx + 1; ri < rows.length; ri++) {
            const cells = Array.from(rows[ri].querySelectorAll('td'));
            if (cells.length < 2) continue;

            const get = (i: number) =>
                i >= 0 && cells[i] ? cells[i].textContent?.trim() ?? '' : '';

            const name   = get(col.name);
            const magic  = get(col.magic).replace(/\s/g, '');
            const symbol = get(col.symbol);

            if (name && magic) {
                mapping.set(name, { botName: name, magicNumber: magic, symbol });
            }
        }

        if (mapping.size > 0) break; // found a good table
    }

    console.log(`[parseMapping] Loaded ${mapping.size} bot mappings.`);
    return mapping;
};

// ─── File decoder (handles UTF-16 LE BOM) ─────────────────────────────────────

export const decodeFile = async (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = (e) => {
            const buf = e.target?.result;
            if (typeof buf === 'string') { resolve(buf); return; }
            if (!(buf instanceof ArrayBuffer)) { reject(new Error('Unknown result type')); return; }

            const bytes = new Uint8Array(buf);
            // Detect UTF-16 LE BOM (0xFF 0xFE) or spaced chars typical of UTF-16
            const isUtf16 =
                (bytes[0] === 0xFF && bytes[1] === 0xFE) ||   // BOM LE
                (bytes[0] === 0xFE && bytes[1] === 0xFF) ||   // BOM BE
                (bytes[0] === 0x3C && bytes[1] === 0x00);     // '<' in UTF-16 LE (no BOM)

            const decoder = new TextDecoder(isUtf16 ? 'utf-16' : 'utf-8');
            resolve(decoder.decode(buf));
        };
        reader.readAsArrayBuffer(file);
    });
