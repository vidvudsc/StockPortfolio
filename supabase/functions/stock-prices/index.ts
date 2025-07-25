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
    const body = await req.json();
    const symbols = body.symbols ? body.symbols.split(',') : [];
    
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
        const rate = parseFloat(exchangeData['Realtime Currency Exchange Rate']['5. Exchange Rate']);
        if (!isNaN(rate)) {
          usdToEurRate = rate;
          
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

    // Fetch stock prices for each symbol
    for (const symbol of symbols) {
      try {
        // Check cache first (5 minutes)
        const { data: cachedPrice } = await supabase
          .from('stock_prices')
          .select('*')
          .eq('symbol', symbol.toUpperCase())
          .gte('last_updated', new Date(Date.now() - 5 * 60 * 1000).toISOString())
          .single();

        if (cachedPrice) {
          results.push({
            symbol: symbol.toUpperCase(),
            price: cachedPrice.price_eur,
            change: cachedPrice.change_amount,
            changePercent: cachedPrice.change_percent,
            lastUpdated: cachedPrice.last_updated
          });
          continue;
        }

        // Fetch from Alpha Vantage
        const response = await fetch(
          `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
        );

        if (!response.ok) {
          console.error(`Failed to fetch data for ${symbol}`);
          continue;
        }

        const data: AlphaVantageResponse = await response.json();
        const quote = data['Global Quote'];

        if (!quote || !quote['05. price']) {
          console.error(`No quote data for ${symbol}`);
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
            symbol: symbol.toUpperCase(),
            price_usd: priceUSD,
            price_eur: priceEUR,
            change_amount: changeEUR,
            change_percent: changePercent,
            last_updated: new Date().toISOString()
          });

        results.push({
          symbol: symbol.toUpperCase(),
          price: priceEUR,
          change: changeEUR,
          changePercent: changePercent,
          lastUpdated: new Date().toISOString()
        });

        // Rate limiting: wait 200ms between requests (free tier allows 25/day, 5/minute)
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`Error fetching data for ${symbol}:`, error);
      }
    }

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