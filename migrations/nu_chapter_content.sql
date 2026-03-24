-- Tabel untuk menyimpan konten chapter (asli + terjemahan)
CREATE TABLE IF NOT EXISTS nu_chapter_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novel_id UUID REFERENCES nu_novels(id) ON DELETE CASCADE,
    chapter_number INTEGER NOT NULL,
    chapter_title TEXT,
    source_url TEXT,
    content_original TEXT,
    content_translated TEXT,
    word_count_original INTEGER DEFAULT 0,
    word_count_translated INTEGER DEFAULT 0,
    translation_status TEXT DEFAULT 'pending' CHECK (translation_status IN ('pending', 'translating', 'done', 'failed')),
    translated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (novel_id, chapter_number)
);

CREATE INDEX idx_chapter_content_novel ON nu_chapter_content(novel_id);
CREATE INDEX idx_chapter_content_status ON nu_chapter_content(translation_status);
