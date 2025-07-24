import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImageMatchingRequest {
  imageUrl: string;
}

interface MatchResult {
  person_id: string;
  similarity: number;
  image_url: string;
}

// This function simulates generating a face embedding from an image.
async function generateFaceEmbedding(imageUrl: string): Promise<number[]> {
  await new Promise(resolve => setTimeout(resolve, 150));
  const embedding = Array.from({ length: 128 }, () => Math.random() * 2 - 1);
  console.log(`Generated embedding for image: ${imageUrl}`);
  return embedding;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { imageUrl }: ImageMatchingRequest = await req.json();
    if (!imageUrl) {
      throw new Error("Missing imageUrl in the request.");
    }

    console.log(`Starting image matching for URL: ${imageUrl}`);

    // 1. Generate an embedding for the input image
    const queryEmbedding = await generateFaceEmbedding(imageUrl);

    // 2. Query the database for similar embeddings
    const { data: matchResults, error: rpcError } = await supabase.rpc(
      'find_similar_faces',
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.6, // Lowered threshold for better matching with simulated embeddings
        match_count: 5,
      }
    );

    if (rpcError) {
      console.error('Error calling find_similar_faces RPC:', rpcError);
      throw rpcError;
    }

    console.log(`Found ${matchResults?.length || 0} potential matches.`);

    // 3. Format and return the results
    const matches: MatchResult[] = matchResults?.map((result: any) => ({
      person_id: result.person_id,
      similarity: result.similarity,
      image_url: result.image_url,
    })) || [];

    return new Response(
      JSON.stringify({
        success: true,
        matches,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Image matching error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        matches: [],
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});