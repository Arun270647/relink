import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Get all images from the dataset-images bucket
    const { data: imageFiles, error: listError } = await supabase.storage
      .from('dataset-images')
      .list();

    if (listError) {
      console.error('Error listing images from dataset-images:', listError);
      throw listError;
    }

    if (!imageFiles || imageFiles.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No images to process." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Process each image
    for (const imageFile of imageFiles) {
      const { data: { publicUrl } } = supabase.storage
        .from('dataset-images')
        .getPublicUrl(imageFile.name);

      // The personId should be derived from the image name.
      // We'll look for a person with a matching name.
      const personName = imageFile.name.split('.')[0];

      const { data: person, error: personError } = await supabase
        .from('missing_persons')
        .select('id')
        .eq('name', personName)
        .single();

      if (personError || !person) {
        console.log(`Could not find a person named '${personName}'. Skipping.`);
        continue;
      }

      const personId = person.id;

      // Check if an embedding already exists for this image
      const { data: existingEmbedding, error: selectError } = await supabase
        .from('face_embeddings')
        .select('id')
        .eq('image_url', publicUrl)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        console.error(`Error checking for existing embedding for ${publicUrl}:`, selectError);
        continue;
      }

      if (existingEmbedding) {
        console.log(`Embedding already exists for ${publicUrl}. Skipping.`);
        continue;
      }

      // Generate and store the embedding
      const embedding = await generateFaceEmbedding(publicUrl);
      const { error: insertError } = await supabase
        .from('face_embeddings')
        .insert({
          person_id: personId,
          embedding: embedding,
          image_url: publicUrl,
        });

      if (insertError) {
        console.error(`Error inserting embedding for ${publicUrl}:`, insertError);
      } else {
        console.log(`Successfully stored embedding for ${publicUrl}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Backfill complete." }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Backfill error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});