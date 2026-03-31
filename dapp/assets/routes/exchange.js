// EXCHANGE.JS - Exchange page renderer

function renderExchange(ctx) {
    console.log('🔄 Rendering Exchange page');

    const { $, state, fmt } = ctx;

    // Render using container
    $('app').innerHTML = SNIPPETS.container(`
        <div class="card" style="padding: 24px;">
            <div style="display: flex; justify-content: flex-end; align-items: center; margin-bottom: 16px;">
                <div class="pill">
                    <span class="badge" style="background: var(--cyan);"></span>
                    <span>Live Rates</span>
                </div>
            </div>

            <!-- FROM Card -->
            <div style="background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <label style="color: var(--muted); font-size: 12px; font-weight: 700;">From</label>
                    <span style="color: var(--muted); font-size: 12px;">Balance: ${fmt(state.balances.m)} mUSD</span>
                </div>
                <div style="display: flex; gap: 12px; align-items: center;">
                    <div style="position: relative; width: 100%;">
                        <input type="text" id="exchFromAmount" inputmode="decimal" placeholder="Input Amount" 
                            style="font-size: 24px; font-weight: 700; padding: 8px 60px 8px 8px; border: none; background: transparent; width: 100%; outline: none; color: var(--text);">
                        <button id="btnExchMax" style="position: absolute; right: 0; top: 50%; transform: translateY(-50%); padding: 4px 8px; font-size: 10px; height: auto; background: rgba(103, 232, 249, 0.15); color: var(--accent); border: none;">MAX</button>
                    </div>

                    <select id="exchFromCurrency" style="width: auto; padding: 8px 32px 8px 12px; min-width: 100px;">
                        <optgroup label="Payment Currencies">
                            <option value="m" selected>mUSD</option>
                            <option value="eur">mEUR</option>
                            <option value="chf">mCHF</option>
                            <option value="cad">mCAD</option>
                        </optgroup>
                        <optgroup label="Investment Currencies">
                            <option value="sm">smUSD</option>
                            <option value="x">xMINIMA</option>
                        </optgroup>
                        <optgroup label="Base">
                            <option value="minima">MINIMA</option>
                        </optgroup>
                    </select>
                </div>
            </div>

            <!-- Arrow Divider -->
            <div style="display: flex; justify-content: center; margin: -24px 0; position: relative; z-index: 5;">
                <button id="btnSwap" title="Swap Assets" style="background: var(--card-bg); border: 1px solid var(--border); border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 20px; cursor: pointer; color: var(--text);">
                   ⇅
                </button>
            </div>

            <!-- TO Card -->
            <div style="background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; margin-top: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <label style="color: var(--muted); font-size: 12px; font-weight: 700;">To (Estimated)</label>
                    <span style="color: var(--muted); font-size: 12px;">Rate: 1 <span id="lblBase">mUSD</span> ≈ <span id="lblQuote">...</span> <span id="lblTarget">mEUR</span></span>
                </div>
                <div style="display: flex; gap: 12px; align-items: center;">
                    <div style="position: relative; width: 100%;">
                        <input type="text" id="exchToAmount" inputmode="decimal" placeholder="Input Amount" 
                             style="font-size: 24px; font-weight: 700; padding: 8px 60px 8px 8px; border: none; background: transparent; width: 100%; outline: none; color: var(--text);">
                        <button id="btnExchMaxTo" style="position: absolute; right: 0; top: 50%; transform: translateY(-50%); padding: 4px 8px; font-size: 10px; height: auto; background: rgba(103, 232, 249, 0.15); color: var(--accent); border: none;">MAX</button>
                    </div>
                    
                    <select id="exchToCurrency" style="width: auto; padding: 8px 32px 8px 12px; min-width: 100px;">
                        <optgroup label="Payment Currencies">
                            <option value="m">mUSD</option>
                            <option value="eur" selected>mEUR</option>
                            <option value="chf">mCHF</option>
                            <option value="cad">mCAD</option>
                        </optgroup>
                        <optgroup label="Investment Currencies">
                            <option value="sm">smUSD</option>
                            <option value="x">xMINIMA</option>
                        </optgroup>
                        <optgroup label="Base">
                            <option value="minima">MINIMA</option>
                        </optgroup>
                    </select>
                </div>
            </div>

            <!-- Action Button -->
            <div style="margin-top: 24px;">
                <button id="btnDoExchange" class="primary" style="width: 100%; padding: 16px; font-size: 16px;">
                    Exchange
                </button>
            </div>
            
        </div>
    `);

    // --- LOGIC ---

    // Rate Helper: Get value in USD for 1 unit of Asset
    const getUsdPrice = (key) => {
        // Crypto/Stables: prices are in USD
        if (['sm', 'x', 'minima'].includes(key)) {
            // Map key to state.prices key
            const map = { 'sm': 'smUSD', 'x': 'xMINIMA', 'minima': 'MINIMA' };
            return state.prices[map[key]] || 0;
        }
        // Forex: prices are Units per USD (1 USD = X Units) => Price = 1/Rate
        if (['eur', 'chf', 'cad'].includes(key)) {
            const map = { 'eur': 'mEUR', 'chf': 'mCHF', 'cad': 'mCAD' };
            const rate = state.prices[map[key]];
            return rate ? (1 / rate) : 0;
        }
        // Base mUSD
        return 1.0;
    };

    const calculate = (direction) => { // direction: 'forward' (from->to) or 'reverse' (to->from)
        const fromKey = $('exchFromCurrency').value;
        const toKey = $('exchToCurrency').value;
        const fromPx = getUsdPrice(fromKey);
        const toPx = getUsdPrice(toKey);

        // Avoid divide by zero
        if (!fromPx || !toPx) return;

        // Rate: How many TO for 1 FROM?
        // 1 From = $F. 1 To = $T.
        // Ratio = $F / $T
        const exchangeRate = fromPx / toPx;

        // Update UI Rate Label
        $('lblBase').textContent = $('exchFromCurrency').options[$('exchFromCurrency').selectedIndex].text;
        $('lblTarget').textContent = $('exchToCurrency').options[$('exchToCurrency').selectedIndex].text;
        $('lblQuote').textContent = exchangeRate < 0.0001 ? exchangeRate.toExponential(4) : exchangeRate.toFixed(4);

        if (direction === 'forward') {
            const fromVal = parseFloat($('exchFromAmount').value.replace(/,/g, '')) || 0;
            if (fromVal > 0) {
                const toVal = fromVal * exchangeRate;
                $('exchToAmount').value = Number.isInteger(toVal) ? toVal : toVal.toFixed(4); // Simple fmt
            } else {
                $('exchToAmount').value = '';
            }
        } else {
            const toVal = parseFloat($('exchToAmount').value.replace(/,/g, '')) || 0;
            if (toVal > 0) {
                const fromVal = toVal / exchangeRate;
                $('exchFromAmount').value = Number.isInteger(fromVal) ? fromVal : fromVal.toFixed(4);
            } else {
                $('exchFromAmount').value = '';
            }
        }
    };

    // Event Listeners
    $('exchFromCurrency').onchange = () => calculate('forward');
    $('exchToCurrency').onchange = () => calculate('forward');

    // Live Input Calculation
    // Using 'input' event for instant math
    $('exchFromAmount').addEventListener('input', () => calculate('forward'));
    $('exchToAmount').addEventListener('input', () => calculate('reverse'));

    // Swap / Invert
    $('btnSwap').onclick = () => {
        // Swap Currencies
        const fromSel = $('exchFromCurrency');
        const toSel = $('exchToCurrency');
        const tempCurr = fromSel.value;
        fromSel.value = toSel.value;
        toSel.value = tempCurr;

        // Swap Amounts is tricky with live calc. 
        // User wants: "Already input amount needs to follow the currency"
        // If From=100(mUSD) -> To=85(mEUR). Swap -> From=85(mEUR) -> To=100(mUSD).
        // This effectively means we just swap the input values too, and re-run calc to verify/trim.

        const fromAmt = $('exchFromAmount');
        const toAmt = $('exchToAmount');
        const tempAmt = fromAmt.value;
        fromAmt.value = toAmt.value;
        toAmt.value = tempAmt;

        calculate('forward'); // Re-validate
    };

    // Max Buttons
    $('btnExchMax').onclick = () => {
        const currency = $('exchFromCurrency').value;
        const balance = state.balances[currency] || 0;
        $('exchFromAmount').value = balance;
        calculate('forward');
    };

    $('btnExchMaxTo').onclick = () => {
        const currency = $('exchToCurrency').value;
        const balance = state.balances[currency] || 0;
        $('exchToAmount').value = balance;
        calculate('reverse');
    };

    // Exchange Button Warning
    $('btnDoExchange').onclick = () => {
        const fromAmt = $('exchFromAmount').value;
        const toAmt = $('exchToAmount').value;

        if (!fromAmt || !toAmt) {
            alert("Please enter an amount.");
            return;
        }

        const confirmed = confirm(
            `Confirm Exchange?\n\n` +
            `Send: ${fromAmt} ${$('exchFromCurrency').value.toUpperCase()}\n` +
            `Receive: ≈ ${toAmt} ${$('exchToCurrency').value.toUpperCase()}\n\n` +
            `⚠ Warning: This amount is estimated and may vary due to rate fluctuations.`
        );

        if (confirmed) {
            alert("Exchange functionality coming soon! (Prototype)");
        }
    };

    // Run initial rate display
    calculate('forward');

    if (window.setupNumericInput) {
        window.setupNumericInput('exchFromAmount');
        window.setupNumericInput('exchToAmount');
    }
}

// Global export
window.renderExchange = renderExchange;



