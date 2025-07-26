import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlphaVantageQuote {
  '01. symbol': string;
  '02. open': string;
  '03. high': string;
  '04. low': string;
  '05. price': string;
  '06. volume': string;
  '07. latest trading day': string;
  '08. previous close': string;
  '09. change': string;
  '10. change percent': string;
}

interface AlphaVantageResponse {
  'Global Quote': AlphaVantageQuote;
}

interface ExchangeRateResponse {
  'Realtime Currency Exchange Rate': {
    '1. From_Currency Code': string;
    '2. From_Currency Name': string;
    '3. To_Currency Code': string;
    '4. To_Currency Name': string;
    '5. Exchange Rate': string;
    '6. Last Refreshed': string;
    '7. Time Zone': string;
    '8. Bid Price': string;
    '9. Ask Price': string;
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

    // Get Alpha Vantage API key
    const apiKey = Deno.env.get('ALPHA_VANTAGE_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Alpha Vantage API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current USD/EUR exchange rate
    let usdToEurRate = 0.92; // Default fallback rate
    try {
      const exchangeResponse = await fetch(
        `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=USD&to_currency=EUR&apikey=${apiKey}`
      );
      
      if (exchangeResponse.ok) {
        const exchangeData: ExchangeRateResponse = await exchangeResponse.json();
        
        // Check if the response has the expected structure
        if (exchangeData['Realtime Currency Exchange Rate'] && 
            exchangeData['Realtime Currency Exchange Rate']['5. Exchange Rate']) {
          const rate = parseFloat(exchangeData['Realtime Currency Exchange Rate']['5. Exchange Rate']);
          if (!isNaN(rate)) {
            usdToEurRate = rate;
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
        } else {
          console.log('Invalid exchange rate response structure:', exchangeData);
        }
      }
    } catch (error) {
      console.log('Failed to fetch exchange rate, using fallback:', error);
    }

    const results = [];
    const processedSymbols = new Set();

    // Fetch stock prices for each symbol (avoid duplicates)
    for (const symbol of [...new Set(symbols.map(s => s.toUpperCase()))]) {
      if (processedSymbols.has(symbol)) continue;
      processedSymbols.add(symbol);
      
      try {
        // Check cache first (extended to 15 minutes for efficiency)
        const { data: cachedPrice } = await supabase
          .from('stock_prices')
          .select('*')
          .eq('symbol', symbol)
          .gte('last_updated', new Date(Date.now() - 15 * 60 * 1000).toISOString())
          .single();

        if (cachedPrice) {
          console.log(`Using cached price for ${symbol}`);
          results.push({
            symbol: symbol,
            price: cachedPrice.price_eur,
            change: cachedPrice.change_amount,
            changePercent: cachedPrice.change_percent,
            lastUpdated: cachedPrice.last_updated
          });
          continue;
        }

        console.log(`Fetching fresh data for ${symbol}`);

        // Fetch from Alpha Vantage
        const response = await fetch(
          `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
        );

        if (!response.ok) {
          console.error(`Alpha Vantage API error: ${response.status} for ${symbol}`);
          continue; // Skip this symbol and continue with others
        }

        const data: AlphaVantageResponse = await response.json();
        
        // Check for rate limit response
        if (data.Note && data.Note.includes('rate limit')) {
          console.warn('Alpha Vantage rate limit reached, using cached data only');
          break; // Stop fetching new data when rate limited
        }
        
        const quote = data['Global Quote'];

        if (!quote || !quote['05. price']) {
          console.warn(`No quote data for ${symbol} - may be due to API limits or invalid symbol`);
          continue;
        }

        const priceUSD = parseFloat(quote['05. price']);
        const changeUSD = parseFloat(quote['09. change']);
        const changePercent = parseFloat(quote['10. change percent'].replace('%', ''));

        const priceEUR = priceUSD * usdToEurRate;
        const changeEUR = changeUSD * usdToEurRate;

        // Cache the result
        await supabase
          .from('stock_prices')
          .upsert({
            symbol: symbol,
            price_usd: priceUSD,
            price_eur: priceEUR,
            change_amount: changeEUR,
            change_percent: changePercent,
            last_updated: new Date().toISOString()
          });

        results.push({
          symbol: symbol,
          price: priceEUR,
          change: changeEUR,
          changePercent: changePercent,
          lastUpdated: new Date().toISOString()
        });

        console.log(`Successfully fetched and cached ${symbol}: €${priceEUR.toFixed(2)}`);

        // Add delay between requests to respect rate limits (increased for better compliance)
        if (symbols.indexOf(symbol.toLowerCase()) < symbols.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay for better rate limit compliance
        }

      } catch (error) {
        console.error(`Error fetching data for ${symbol}:`, error);
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