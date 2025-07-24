-- Enable the vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the face_embeddings table
CREATE TABLE public.face_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID REFERENCES public.missing_persons(id) ON DELETE CASCADE,
    embedding VECTOR(128), -- Assuming a 128-dimension embedding
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for the new table
ALTER TABLE public.face_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Police can manage face embeddings" ON public.face_embeddings
FOR ALL TO authenticated
USING (true);

CREATE POLICY "Relatives can view embeddings for their reported persons" ON public.face_embeddings
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.missing_persons
        WHERE missing_persons.id = face_embeddings.person_id
        AND missing_persons.reporter_id = auth.uid()
    )
);