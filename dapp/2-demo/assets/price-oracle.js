/**
 * Price Oracle Module
 * Fetches real-time MINIMA/USDT price from MEXC exchange
 * Supports volatility multiplier for stress testing
 */

'use strict';

const PriceOracle = {
    // Configuration
    config: {
        mexcApiBase: 'https://api.mexc.com/api/v3',
        symbol: 'MINIMAUSDT',
        /** CoinGecko id for native Minima; CORS allows browser fetch (MEXC does not). */
        coinGeckoSimpleUrl:
            'https://api.coingecko.com/api/v3/simple/price?ids=minima&vs_currencies=usd&include_24hr_change=true',
        updateInterval: 30000, // 30 seconds
        volatilityMultiplier: 1.0, // Default: no amplification
    },

    // Cache
    cache: {
        price: null,
        timestamp: null,
        stats: null,
    },

    /**
     * Fetch current MINIMA/USDT price from MEXC
     * Uses MDS network command to bypass CORS
     * @returns {Promise<number>} Current price in USD
     */
    async fetchPrice() {
        try {
            const url = `${this.config.mexcApiBase}/ticker/price?symbol=${this.config.symbol}`;

            // Use MDS only after MDS.init() set mainhost; else requests become relative /net on the page origin.
            var mdsNetReady =
                typeof MDS !== 'undefined' &&
                MDS.net &&
                typeof MDS.mainhost === 'string' &&
                MDS.mainhost.length > 0;
            if (mdsNetReady) {
                return new Promise((resolve, reject) => {
                    MDS.net.GET(url, function (response) {
                        try {
                            if (response.status) {
                                const data = JSON.parse(response.response);
                                const price = parseFloat(data.price);

                                // Update cache
                                PriceOracle.cache.price = price;
                                PriceOracle.cache.timestamp = Date.now();

                                console.log('[Oracle] MINIMA price fetched via MDS:', price);
                                resolve(price);
                            } else {
                                throw new Error(response.error || 'MDS network request failed');
                            }
                        } catch (error) {
                            reject(error);
                        }
                    });
                });
            }

            // No MDS: MEXC public API does not send CORS headers — browser fetch fails.
            // CoinGecko simple/price allows * origin and tracks Minima (id: minima).
            const cgResponse = await fetch(this.config.coinGeckoSimpleUrl);
            if (!cgResponse.ok) {
                throw new Error(`CoinGecko API error: ${cgResponse.status}`);
            }
            const cgData = await cgResponse.json();
            const row = cgData && cgData.minima;
            const price = row && typeof row.usd === 'number' ? row.usd : parseFloat(row && row.usd);
            if (!Number.isFinite(price)) {
                throw new Error('CoinGecko: invalid minima.usd');
            }
            this.cache.price = price;
            this.cache.timestamp = Date.now();
            if (row && typeof row.usd_24h_change === 'number') {
                this.cache.stats = {
                    high: 0,
                    low: 0,
                    volume: 0,
                    change: row.usd_24h_change,
                    lastUpdate: Date.now(),
                };
            }
            console.log('[Oracle] MINIMA price fetched via CoinGecko (browser / no MDS):', price);
            return price;
        } catch (error) {
            console.error('Failed to fetch MINIMA price:', error);

            // Return cached price if available
            if (this.cache.price !== null) {
                console.warn('Using cached price:', this.cache.price);
                return this.cache.price;
            }

            // Fallback to default if no cache
            return 0.0084; // Default fallback
        }
    },

    /**
   * Fetch 24h stats from MEXC
   * Uses MDS network command to bypass CORS
   * @returns {Promise<Object>} 24h volume, high, low, change
   */
    async fetch24hStats() {
        try {
            const url = `${this.config.mexcApiBase}/ticker/24hr?symbol=${this.config.symbol}`;

            var mdsNetReady24 =
                typeof MDS !== 'undefined' &&
                MDS.net &&
                typeof MDS.mainhost === 'string' &&
                MDS.mainhost.length > 0;
            if (mdsNetReady24) {
                return new Promise((resolve, reject) => {
                    MDS.net.GET(url, function (response) {
                        try {
                            if (response.status) {
                                const data = JSON.parse(response.response);

                                const stats = {
                                    high: parseFloat(data.highPrice),
                                    low: parseFloat(data.lowPrice),
                                    volume: parseFloat(data.volume),
                                    change: parseFloat(data.priceChangePercent),
                                    lastUpdate: Date.now(),
                                };

                                // Update cache
                                PriceOracle.cache.stats = stats;
                                resolve(stats);
                            } else {
                                throw new Error(response.error || 'MDS network request failed');
                            }
                        } catch (error) {
                            reject(error);
                        }
                    });
                });
            }

            const cgResponse = await fetch(this.config.coinGeckoSimpleUrl);
            if (!cgResponse.ok) {
                throw new Error(`CoinGecko API error: ${cgResponse.status}`);
            }
            const cgData = await cgResponse.json();
            const row = cgData && cgData.minima;
            const change = row && typeof row.usd_24h_change === 'number' ? row.usd_24h_change : 0;
            const stats = {
                high: 0,
                low: 0,
                volume: 0,
                change,
                lastUpdate: Date.now(),
            };
            this.cache.stats = stats;
            return stats;
        } catch (error) {
            console.error('Failed to fetch 24h stats:', error);
            return this.cache.stats || {
                high: 0,
                low: 0,
                volume: 0,
                change: 0,
                lastUpdate: null,
            };
        }
    },

    /**
     * Get current price with volatility multiplier applied
     * @returns {Promise<number>} Price with multiplier
     */
    async getPriceWithVolatility() {
        const basePrice = await this.fetchPrice();

        // If multiplier is 1.0, return base price
        if (this.config.volatilityMultiplier === 1.0) {
            return basePrice;
        }

        // Apply volatility multiplier
        // This amplifies price swings for testing
        const stats = await this.fetch24hStats();
        const changePercent = stats.change / 100; // Convert to decimal

        // Amplify the change
        const amplifiedChange = changePercent * this.config.volatilityMultiplier;
        const adjustedPrice = basePrice * (1 + amplifiedChange);

        console.log(`[Oracle] Base price: $${basePrice}, Multiplier: ${this.config.volatilityMultiplier}x, Adjusted: $${adjustedPrice}`);

        return adjustedPrice;
    },

    /**
     * Set volatility multiplier (for testing)
     * @param {number} multiplier - Multiplier value (1.0 = normal, 5.0 = 5x volatility)
     */
    setVolatilityMultiplier(multiplier) {
        this.config.volatilityMultiplier = Math.max(1.0, Math.min(20.0, multiplier));
        console.log(`[Oracle] Volatility multiplier set to: ${this.config.volatilityMultiplier}x`);
    },

    /**
     * Get all prices for tokens
     * @returns {Promise<Object>} All token prices
     */
    async getAllPrices() {
        const minimaPrice = await this.getPriceWithVolatility();

        return {
            minimaUSD: minimaPrice,
            xMinimaUSD: minimaPrice / 4, // xMINIMA is leveraged
            mUSD: 1.0, // Stablescoin pegged to $1
            smUSD: 1.0, // Stablescoin pegged to $1
        };
    },

    /**
     * Check if price data is stale
     * @returns {boolean} True if data needs refresh
     */
    isStale() {
        if (!this.cache.timestamp) return true;
        return (Date.now() - this.cache.timestamp) > this.config.updateInterval;
    },

    /**
     * Start auto-update interval
     */
    startAutoUpdate(callback) {
        // Initial fetch
        this.fetchPrice().then(() => {
            if (callback) callback();
        });

        // Set up interval
        setInterval(async () => {
            await this.fetchPrice();
            if (callback) callback();
        }, this.config.updateInterval);

        console.log(`[Oracle] Auto-update started (every ${this.config.updateInterval / 1000}s)`);
    },
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.PriceOracle = PriceOracle;
}



