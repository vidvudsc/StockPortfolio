import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FMPQuote {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
  change: number;
  dayLow: number;
  dayHigh: number;
  yearHigh: number;
  yearLow: number;
  marketCap: number;
  priceAvg50: number;
  priceAvg200: number;
  exchange: string;
  volume: number;
  avgVolume: number;
  open: number;
  previousClose: number;
  eps: number;
  pe: number;
  earningsAnnouncement: string;
  sharesOutstanding: number;
  timestamp: number;
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

    // Get current USD/EUR exchange rate
    let usdToEurRate = 0.92; // Default fallback rate
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
      console.log('Failed to fetch exchange rate, using fallback:', error);
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

    // Fetch fresh data for uncached symbols using FMP batch API
    if (symbolsToFetch.length > 0) {
      try {
        console.log(`Fetching fresh data for ${symbolsToFetch.length} symbols: ${symbolsToFetch.join(', ')}`);
        
        // FMP allows batch requests - get all symbols in one call
        const symbolsString = symbolsToFetch.join(',');
        const fmpResponse = await fetch(
          `https://financialmodelingprep.com/api/v3/quote/${symbolsString}`
        );

        if (!fmpResponse.ok) {
          console.error(`FMP API error: ${fmpResponse.status}`);
        } else {
          const fmpData: FMPQuote[] = await fmpResponse.json();
          console.log(`FMP returned data for ${fmpData.length} symbols`);

          // Process each quote from FMP
          for (const quote of fmpData) {
            if (!quote || typeof quote.price !== 'number' || isNaN(quote.price)) {
              console.warn(`Invalid quote data for ${quote?.symbol}`);
              continue;
            }

            const priceUSD = quote.price;
            const changeUSD = quote.change || 0;
            const changePercent = quote.changesPercentage || 0;

            const priceEUR = priceUSD * usdToEurRate;
            const changeEUR = changeUSD * usdToEurRate;

            // Cache the result
            await supabase
              .from('stock_prices')
              .upsert({
                symbol: quote.symbol,
                price_usd: priceUSD,
                price_eur: priceEUR,
                change_amount: changeEUR,
                change_percent: changePercent,
                last_updated: new Date().toISOString()
              });

            results.push({
              symbol: quote.symbol,
              price: priceEUR,
              change: changeEUR,
              changePercent: changePercent,
              lastUpdated: new Date().toISOString()
            });

            console.log(`Successfully fetched and cached ${quote.symbol}: €${priceEUR.toFixed(2)}`);
          }
        }
      } catch (error) {
        console.error('Error fetching data from FMP:', error);
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