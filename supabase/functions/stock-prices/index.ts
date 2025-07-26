import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface YahooFinanceQuote {
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  symbol: string;
}

// Symbol mapping for European ETFs and corrected tickers
const SYMBOL_MAPPING: Record<string, string[]> = {
  'CSPX': ['CSPX.L'], // Core S&P 500 USD (Acc) - London
  'EQQQ': ['EQQQ.L'], // NASDAQ 100 USD (Acc) - London
  'MJPY': ['MJPY.L'], // MSCI Core Japan JPY (Acc) - London
  'NCC-B': ['NCC-B.ST'], // NCC (B) - Stockholm (SEK)
  'AAXN': ['AXON'], // Axon Enterprise - correct US ticker
  'SXR8': ['SXR8.DE'], // Core S&P 500 USD (Acc) - Frankfurt (EUR)
  'SXRV': ['SXRV.DE'], // NASDAQ 100 USD (Acc) - Frankfurt (EUR)
};

// Currency mapping for different symbols
const SYMBOL_CURRENCY: Record<string, string> = {
  'NCC-B': 'SEK', // Swedish Krona
  'LCUJ': 'EUR',  // Already in EUR
  'SXR8': 'EUR',  // Already in EUR
  'XAD5': 'EUR',  // Already in EUR
  'SXRV': 'EUR',  // Already in EUR
};

// Exchange suffixes to try for unrecognized symbols
const EXCHANGE_SUFFIXES = ['.L', '.PA', '.AS', '.ST', '.MI', '.DE'];

async function findValidSymbol(originalSymbol: string): Promise<string | null> {
  // First try mapped symbols if available
  if (SYMBOL_MAPPING[originalSymbol]) {
    for (const mappedSymbol of SYMBOL_MAPPING[originalSymbol]) {
      try {
        const response = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${mappedSymbol}?interval=1d&range=1d`
        );
        if (response.ok) {
          const data = await response.json();
          if (data?.chart?.result?.[0]?.meta?.regularMarketPrice) {
            console.log(`Found mapped symbol: ${originalSymbol} -> ${mappedSymbol}`);
            return mappedSymbol;
          }
        }
      } catch (error) {
        console.log(`Failed to fetch mapped symbol ${mappedSymbol}:`, error);
      }
    }
  }

  // Try original symbol first
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${originalSymbol}?interval=1d&range=1d`
    );
    if (response.ok) {
      const data = await response.json();
      if (data?.chart?.result?.[0]?.meta?.regularMarketPrice) {
        return originalSymbol;
      }
    }
  } catch (error) {
    console.log(`Failed to fetch original symbol ${originalSymbol}:`, error);
  }

  // Try with different exchange suffixes
  for (const suffix of EXCHANGE_SUFFIXES) {
    const symbolWithSuffix = originalSymbol + suffix;
    try {
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbolWithSuffix}?interval=1d&range=1d`
      );
      if (response.ok) {
        const data = await response.json();
        if (data?.chart?.result?.[0]?.meta?.regularMarketPrice) {
          console.log(`Found symbol with suffix: ${originalSymbol} -> ${symbolWithSuffix}`);
          return symbolWithSuffix;
        }
      }
    } catch (error) {
      console.log(`Failed to fetch ${symbolWithSuffix}:`, error);
    }
  }

  console.warn(`Could not find valid symbol for: ${originalSymbol}`);
  return null;
}

interface ExchangeRateResponse {
  rates: {
    EUR: number;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Read symbols from request body
    const body = await req.json().catch(() => ({}));
    const symbols = body.symbols ? body.symbols.split(',') : [];
    
    console.log('Received symbols:', symbols);
    
    if (symbols.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No symbols provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current USD/EUR and SEK/EUR exchange rates
    let usdToEurRate = 0.92; // Default fallback rate
    let sekToEurRate = 0.094; // Default fallback rate
    
    try {
      const exchangeResponse = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      
      if (exchangeResponse.ok) {
        const exchangeData: ExchangeRateResponse = await exchangeResponse.json();
        
        if (exchangeData.rates && exchangeData.rates.EUR) {
          usdToEurRate = exchangeData.rates.EUR;
          console.log('Updated USD/EUR rate:', usdToEurRate);
          
          // Update exchange rate in database
          await supabase
            .from('exchange_rates')
            .upsert({
              from_currency: 'USD',
              to_currency: 'EUR',
              rate: usdToEurRate,
              last_updated: new Date().toISOString()
            });
        }
      }
    } catch (error) {
      console.log('Failed to fetch USD/EUR rate, using fallback:', error);
    }

    // Get SEK/EUR exchange rate
    try {
      const sekExchangeResponse = await fetch('https://api.exchangerate-api.com/v4/latest/SEK');
      
      if (sekExchangeResponse.ok) {
        const sekExchangeData: ExchangeRateResponse = await sekExchangeResponse.json();
        
        if (sekExchangeData.rates && sekExchangeData.rates.EUR) {
          sekToEurRate = sekExchangeData.rates.EUR;
          console.log('Updated SEK/EUR rate:', sekToEurRate);
          
          // Update exchange rate in database
          await supabase
            .from('exchange_rates')
            .upsert({
              from_currency: 'SEK',
              to_currency: 'EUR',
              rate: sekToEurRate,
              last_updated: new Date().toISOString()
            });
        }
      }
    } catch (error) {
      console.log('Failed to fetch SEK/EUR rate, using fallback:', error);
    }

    const results = [];
    const uniqueSymbols = [...new Set(symbols.map(s => s.toUpperCase()))];
    
    // Check cache for all symbols first (30 minutes cache)
    const cachedResults = [];
    const symbolsToFetch = [];
    
    for (const symbol of uniqueSymbols) {
      try {
        const { data: cachedPrice } = await supabase
          .from('stock_prices')
          .select('*')
          .eq('symbol', symbol)
          .gte('last_updated', new Date(Date.now() - 30 * 60 * 1000).toISOString())
          .single();

        if (cachedPrice) {
          console.log(`Using cached price for ${symbol}`);
          cachedResults.push({
            symbol: symbol,
            price: cachedPrice.price_eur,
            change: cachedPrice.change_amount,
            changePercent: cachedPrice.change_percent,
            lastUpdated: cachedPrice.last_updated
          });
        } else {
          symbolsToFetch.push(symbol);
        }
      } catch (error) {
        symbolsToFetch.push(symbol);
      }
    }

    // Add cached results to final results
    results.push(...cachedResults);

    // Fetch fresh data for uncached symbols using Yahoo Finance
    if (symbolsToFetch.length > 0) {
      try {
        console.log(`Fetching fresh data for ${symbolsToFetch.length} symbols: ${symbolsToFetch.join(', ')}`);
        
        // Fetch each symbol individually from Yahoo Finance
        for (const symbol of symbolsToFetch) {
          try {
            // Find the correct symbol format for Yahoo Finance
            const validSymbol = await findValidSymbol(symbol);
            
            if (!validSymbol) {
              console.warn(`Could not find valid symbol format for ${symbol}`);
              continue;
            }

            // Use Yahoo Finance query API (free, no key required)
            const yahooResponse = await fetch(
              `https://query1.finance.yahoo.com/v8/finance/chart/${validSymbol}?interval=1d&range=1d`
            );

            if (!yahooResponse.ok) {
              console.error(`Yahoo Finance API error for ${validSymbol}: ${yahooResponse.status}`);
              continue;
            }

            const yahooData = await yahooResponse.json();
            const chartData = yahooData?.chart?.result?.[0];
            
            if (!chartData?.meta) {
              console.warn(`No data returned for ${validSymbol}`);
              continue;
            }

            const meta = chartData.meta;
            const originalPrice = meta.regularMarketPrice;
            const previousClose = meta.previousClose || meta.chartPreviousClose;
            const originalChange = originalPrice - previousClose;
            const changePercent = previousClose ? (originalChange / previousClose) * 100 : 0;

            if (typeof originalPrice !== 'number' || isNaN(originalPrice)) {
              console.warn(`Invalid price data for ${validSymbol}`);
              continue;
            }

            // Determine currency and conversion to EUR
            const symbolCurrency = SYMBOL_CURRENCY[symbol] || 'USD';
            let priceEUR: number;
            let changeEUR: number;
            let originalCurrency: string;

            if (symbolCurrency === 'EUR') {
              // Already in EUR, no conversion needed
              priceEUR = originalPrice;
              changeEUR = originalChange;
              originalCurrency = 'EUR';
              console.log(`${symbol} is already in EUR: €${priceEUR.toFixed(2)}`);
            } else if (symbolCurrency === 'SEK') {
              // Convert from SEK to EUR
              priceEUR = originalPrice * sekToEurRate;
              changeEUR = originalChange * sekToEurRate;
              originalCurrency = 'SEK';
              console.log(`${symbol} converted from SEK to EUR: ${originalPrice.toFixed(2)} SEK → €${priceEUR.toFixed(2)}`);
            } else {
              // Default USD to EUR conversion
              priceEUR = originalPrice * usdToEurRate;
              changeEUR = originalChange * usdToEurRate;
              originalCurrency = 'USD';
            }

            // Cache the result using the original symbol as key
            await supabase
              .from('stock_prices')
              .upsert({
                symbol: symbol, // Store with original symbol for consistency
                price_usd: originalPrice, // Store original price regardless of currency
                price_eur: priceEUR,
                change_amount: changeEUR,
                change_percent: changePercent,
                original_currency: originalCurrency,
                last_updated: new Date().toISOString()
              });

            results.push({
              symbol: symbol, // Return with original symbol
              price: priceEUR,
              change: changeEUR,
              changePercent: changePercent,
              lastUpdated: new Date().toISOString()
            });

            console.log(`Successfully fetched and cached ${symbol} (via ${validSymbol}): €${priceEUR.toFixed(2)} (${changePercent.toFixed(2)}%)`);
          } catch (symbolError) {
            console.error(`Error fetching ${symbol}:`, symbolError);
          }
        }
      } catch (error) {
        console.error('Error fetching data from Yahoo Finance:', error);
      }
    }

    console.log(`Returning ${results.length} price results out of ${symbols.length} requested symbols`);

    return new Response(
      JSON.stringify({ 
        prices: results,
        exchangeRate: usdToEurRate,
        currency: 'EUR'
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in stock-prices function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});