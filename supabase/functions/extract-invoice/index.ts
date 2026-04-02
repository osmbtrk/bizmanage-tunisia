import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bytes = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(bytes)));
    const mimeType = file.type || "image/jpeg";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an invoice data extractor. Extract the following fields from the invoice image/document and return them as a JSON object. If a field is not found, use null.

Fields to extract:
- supplier_name: string (the supplier/vendor name)
- invoice_number: string (the invoice number/reference)
- date: string (invoice date in YYYY-MM-DD format)
- due_date: string | null (due date in YYYY-MM-DD format)
- total_ht: number | null (total before tax)
- tva_amount: number | null (tax amount)
- total_ttc: number (total including tax)
- tva_rate: number | null (TVA percentage, e.g. 19)
- items: array of { product_name: string, quantity: number, unit_price: number, tva_rate: number }

Return ONLY a valid JSON object, no markdown, no explanation.`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract invoice data from this document:" },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_invoice_data",
              description: "Extract structured invoice data from a document",
              parameters: {
                type: "object",
                properties: {
                  supplier_name: { type: "string" },
                  invoice_number: { type: "string" },
                  date: { type: "string", description: "YYYY-MM-DD format" },
                  due_date: { type: ["string", "null"] },
                  total_ht: { type: ["number", "null"] },
                  tva_amount: { type: ["number", "null"] },
                  total_ttc: { type: "number" },
                  tva_rate: { type: ["number", "null"] },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        product_name: { type: "string" },
                        quantity: { type: "number" },
                        unit_price: { type: "number" },
                        tva_rate: { type: "number" }
                      },
                      required: ["product_name", "quantity", "unit_price", "tva_rate"]
                    }
                  }
                },
                required: ["supplier_name", "total_ttc"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_invoice_data" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez dans un moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits AI épuisés." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erreur d'extraction AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    
    let extractedData;
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall) {
      extractedData = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: try parsing from content
      const content = result.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse extraction result");
      }
    }

    return new Response(JSON.stringify(extractedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-invoice error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
