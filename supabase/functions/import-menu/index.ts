import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportedProduct {
  name: string;
  description: string;
  price: number;
  image_url: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL do cardápio é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching menu from URL:', url);

    // Fetch the page content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch URL:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ error: 'Não foi possível acessar o cardápio. Verifique se o link está correto.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await response.text();
    console.log('HTML length:', html.length);

    const products: ImportedProduct[] = [];

    // Try to extract JSON-LD structured data first (most reliable)
    const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    if (jsonLdMatches) {
      for (const match of jsonLdMatches) {
        try {
          const jsonContent = match.replace(/<script[^>]*>|<\/script>/gi, '');
          const data = JSON.parse(jsonContent);
          
          if (data['@type'] === 'Menu' && data.hasMenuSection) {
            for (const section of data.hasMenuSection) {
              if (section.hasMenuItem) {
                for (const item of section.hasMenuItem) {
                  products.push({
                    name: item.name || '',
                    description: item.description || '',
                    price: item.offers?.price || 0,
                    image_url: item.image || ''
                  });
                }
              }
            }
          }
          
          if (data['@type'] === 'ItemList' && data.itemListElement) {
            for (const item of data.itemListElement) {
              if (item.item) {
                products.push({
                  name: item.item.name || '',
                  description: item.item.description || '',
                  price: item.item.offers?.price || 0,
                  image_url: item.item.image || ''
                });
              }
            }
          }
        } catch (e) {
          console.log('Failed to parse JSON-LD:', e);
        }
      }
    }

    // If no products from JSON-LD, try extracting from HTML patterns
    if (products.length === 0) {
      // iFood pattern - try to find product data in script tags
      const scriptMatches = html.match(/<script[^>]*>[\s\S]*?window\.__APOLLO_STATE__\s*=\s*({[\s\S]*?});?\s*<\/script>/i);
      if (scriptMatches) {
        try {
          const apolloData = JSON.parse(scriptMatches[1]);
          for (const key of Object.keys(apolloData)) {
            if (key.startsWith('Item:') || key.startsWith('Product:')) {
              const item = apolloData[key];
              if (item.name && item.price !== undefined) {
                products.push({
                  name: item.name,
                  description: item.description || item.details || '',
                  price: typeof item.price === 'number' ? item.price / 100 : parseFloat(item.price) || 0,
                  image_url: item.image || item.logoUrl || ''
                });
              }
            }
          }
        } catch (e) {
          console.log('Failed to parse Apollo state:', e);
        }
      }

      // Try to find Next.js/React hydration data
      const nextDataMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
      if (nextDataMatch) {
        try {
          const nextData = JSON.parse(nextDataMatch[1]);
          const findProducts = (obj: any, depth = 0): void => {
            if (depth > 10) return;
            if (!obj || typeof obj !== 'object') return;
            
            if (Array.isArray(obj)) {
              for (const item of obj) {
                findProducts(item, depth + 1);
              }
            } else {
              // Check if this looks like a product
              if (obj.name && (obj.price !== undefined || obj.unitPrice !== undefined || obj.originalPrice !== undefined)) {
                const price = obj.price || obj.unitPrice || obj.originalPrice || 0;
                products.push({
                  name: obj.name,
                  description: obj.description || obj.details || '',
                  price: typeof price === 'number' ? (price > 1000 ? price / 100 : price) : parseFloat(price) || 0,
                  image_url: obj.image || obj.imageUrl || obj.logoUrl || ''
                });
              }
              
              for (const key of Object.keys(obj)) {
                findProducts(obj[key], depth + 1);
              }
            }
          };
          
          findProducts(nextData);
        } catch (e) {
          console.log('Failed to parse Next.js data:', e);
        }
      }
    }

    // If still no products, try generic HTML parsing
    if (products.length === 0) {
      // Try to find product cards in common patterns
      const productPatterns = [
        // Pattern for dish cards
        /<div[^>]*class="[^"]*dish[^"]*"[^>]*>[\s\S]*?<h[23][^>]*>([^<]+)<\/h[23]>[\s\S]*?<p[^>]*>([^<]*)<\/p>[\s\S]*?R\$\s*([\d,\.]+)/gi,
        // Pattern for item cards
        /<article[^>]*>[\s\S]*?<h[234][^>]*>([^<]+)<\/h[234]>[\s\S]*?(?:<p[^>]*>([^<]*)<\/p>)?[\s\S]*?R\$\s*([\d,\.]+)/gi,
      ];

      for (const pattern of productPatterns) {
        let match;
        while ((match = pattern.exec(html)) !== null) {
          const price = parseFloat(match[3].replace('.', '').replace(',', '.'));
          if (!isNaN(price) && match[1]) {
            products.push({
              name: match[1].trim(),
              description: match[2]?.trim() || '',
              price: price,
              image_url: ''
            });
          }
        }
      }
    }

    // Remove duplicates
    const uniqueProducts = products.filter((product, index, self) => 
      index === self.findIndex(p => p.name === product.name)
    );

    console.log('Found products:', uniqueProducts.length);

    if (uniqueProducts.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Não foi possível extrair produtos deste cardápio. Tente copiar o link diretamente da página do restaurante no iFood/99food.',
          products: [] 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ products: uniqueProducts }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing menu:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao processar o cardápio. Tente novamente.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
