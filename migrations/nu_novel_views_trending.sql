-- 1. Add total_views column to nu_novels
ALTER TABLE nu_novels ADD COLUMN IF NOT EXISTS total_views INTEGER DEFAULT 0;

-- 2. Create nu_novel_views table for 15-day tracking
CREATE TABLE IF NOT EXISTS nu_novel_views (
    novel_id UUID REFERENCES nu_novels(id) ON DELETE CASCADE,
    view_date DATE NOT NULL DEFAULT CURRENT_DATE,
    view_count INTEGER DEFAULT 1,
    PRIMARY KEY (novel_id, view_date)
);

-- Index for fast trending queries
CREATE INDEX IF NOT EXISTS idx_nu_novel_views_date ON nu_novel_views(view_date);

-- 3. RPC to safely increment view
CREATE OR REPLACE FUNCTION increment_novel_view(p_novel_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Upsert daily record
    INSERT INTO nu_novel_views (novel_id, view_date, view_count)
    VALUES (p_novel_id, CURRENT_DATE, 1)
    ON CONFLICT (novel_id, view_date) 
    DO UPDATE SET view_count = nu_novel_views.view_count + 1;

    -- Increment global counter
    UPDATE nu_novels SET total_views = total_views + 1
    WHERE id = p_novel_id;
END;
$$;

-- 4. RPC to fetch top trending novels (last 15 days)
CREATE OR REPLACE FUNCTION get_trending_novels_15d(limit_val INT DEFAULT 5)
RETURNS SETOF nu_novels
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT n.*
    FROM nu_novels n
    JOIN (
        SELECT novel_id, SUM(view_count) as total_recent_views
        FROM nu_novel_views
        WHERE view_date >= CURRENT_DATE - INTERVAL '15 days'
        GROUP BY novel_id
    ) v ON n.id = v.novel_id
    WHERE n.status != 'draft'
    ORDER BY v.total_recent_views DESC, n.total_views DESC
    LIMIT limit_val;
END;
$$;
