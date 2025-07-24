import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FaceEmbeddingRequest {
  personId: string;
  imageUrl: string;
}

// This function simulates generating a face embedding from an image.
// In a real implementation, you would use a proper face recognition model.
async function generateFaceEmbedding(imageUrl: string): Promise<number[]> {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 150));
  
  // In a real implementation, you would:
  // 1. Download the image
  // 2. Use a library like face-api.js, dlib, or a cloud service (e.g., AWS Rekognition)
  //    to detect a face and extract a 128-d or 512-d embedding vector.
  
  // For this simulation, we generate a random 128-dimension vector.
  const embedding = Array.from({ length: 128 }, () => Math.random() * 2 - 1);
  
  console.log(`Generated embedding for image: ${imageUrl}`);
  return embedding;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { personId, imageUrl }: FaceEmbeddingRequest = await req.json();
    
    if (!personId || !imageUrl) {
      throw new Error("Missing personId or imageUrl in the request.");
    }

    console.log(`Generating face embedding for person: ${personId}`);
    console.log(`Image URL: ${imageUrl}`);

    // Generate the face embedding
    const embedding = await generateFaceEmbedding(imageUrl);

    // Store the new embedding in the database
    const { data, error: insertError } = await supabase
      .from('face_embeddings')
      .insert({
        person_id: personId,
        embedding: embedding,
        image_url: imageUrl,
      });

    if (insertError) {
      console.error('Error inserting face embedding:', insertError);
      throw insertError;
    }

    console.log(`Successfully stored new face embedding for person: ${personId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Face embedding generated and stored successfully.",
        embeddingId: data?.[0]?.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Face embedding generation error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});