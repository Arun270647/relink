-- Create a function to find similar faces
CREATE OR REPLACE FUNCTION find_similar_faces(
    query_embedding VECTOR(128),
    match_threshold FLOAT,
    match_count INT
)
RETURNS TABLE (
    person_id UUID,
    similarity FLOAT,
    image_url TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        fe.person_id,
        1 - (fe.embedding <=> query_embedding) AS similarity,
        fe.image_url
    FROM
        public.face_embeddings fe
    WHERE
        1 - (fe.embedding <=> query_embedding) > match_threshold
    ORDER BY
        similarity DESC
    LIMIT
        match_count;
END;
$$;