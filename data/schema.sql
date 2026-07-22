PRAGMA foreign_keys = ON;

CREATE TABLE source_documents (
    id INTEGER PRIMARY KEY,
    relative_path TEXT NOT NULL UNIQUE,
    sha256 TEXT NOT NULL,
    byte_size INTEGER NOT NULL CHECK (byte_size > 0),
    format TEXT NOT NULL,
    application TEXT,
    page_count INTEGER,
    imported_at TEXT NOT NULL
);

CREATE TABLE collections (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    city TEXT,
    province TEXT,
    country_code TEXT NOT NULL DEFAULT 'CN'
);

CREATE TABLE themes (
    id INTEGER PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE forms (
    id INTEGER PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE materials (
    id INTEGER PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE techniques (
    id INTEGER PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE artworks (
    id INTEGER PRIMARY KEY,
    catalog_no INTEGER NOT NULL UNIQUE CHECK (catalog_no > 0),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    theme_id INTEGER REFERENCES themes(id),
    form_id INTEGER REFERENCES forms(id),
    material_id INTEGER REFERENCES materials(id),
    technique_id INTEGER REFERENCES techniques(id),
    subtype_label TEXT,
    period_code TEXT NOT NULL,
    period_label TEXT NOT NULL,
    period_raw TEXT NOT NULL,
    summary_period_raw TEXT NOT NULL,
    width_value NUMERIC NOT NULL CHECK (width_value > 0),
    height_value NUMERIC NOT NULL CHECK (height_value > 0),
    dimension_unit TEXT NOT NULL DEFAULT 'cm',
    dimension_unit_verified INTEGER NOT NULL DEFAULT 0 CHECK (dimension_unit_verified IN (0, 1)),
    dimension_raw TEXT NOT NULL,
    collection_id INTEGER NOT NULL REFERENCES collections(id),
    description TEXT NOT NULL,
    summary_theme_raw TEXT NOT NULL,
    summary_form_raw TEXT NOT NULL,
    table_category_raw TEXT NOT NULL,
    summary_collection_raw TEXT NOT NULL,
    table_collection_raw TEXT NOT NULL,
    source_document_id INTEGER NOT NULL REFERENCES source_documents(id),
    source_record_index INTEGER NOT NULL,
    source_page INTEGER NOT NULL,
    image_count INTEGER NOT NULL CHECK (image_count > 0),
    editorial_status TEXT NOT NULL DEFAULT 'needs_review'
        CHECK (editorial_status IN ('needs_review', 'reviewed', 'published')),
    source_fields_json TEXT NOT NULL CHECK (json_valid(source_fields_json)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE artwork_aliases (
    id INTEGER PRIMARY KEY,
    artwork_id INTEGER NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
    alias TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'description',
    UNIQUE (artwork_id, alias)
);

CREATE TABLE artwork_images (
    id INTEGER PRIMARY KEY,
    artwork_id INTEGER NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('primary', 'part-1', 'part-2', 'detail')),
    sort_order INTEGER NOT NULL CHECK (sort_order > 0),
    storage_provider TEXT NOT NULL DEFAULT 'local',
    storage_path TEXT NOT NULL UNIQUE,
    public_url TEXT,
    source_block_index INTEGER NOT NULL UNIQUE,
    source_stream_offset INTEGER NOT NULL,
    source_block_bytes INTEGER NOT NULL CHECK (source_block_bytes > 0),
    source_payload_offset INTEGER NOT NULL,
    byte_size INTEGER NOT NULL CHECK (byte_size > 0),
    sha256 TEXT NOT NULL,
    format TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    pixel_width INTEGER NOT NULL CHECK (pixel_width > 0),
    pixel_height INTEGER NOT NULL CHECK (pixel_height > 0),
    color_mode TEXT,
    frame_count INTEGER NOT NULL DEFAULT 1 CHECK (frame_count > 0),
    alt_text TEXT,
    copyright_status TEXT NOT NULL DEFAULT 'unknown',
    UNIQUE (artwork_id, sort_order)
);

CREATE TABLE artwork_references (
    id INTEGER PRIMARY KEY,
    artwork_id INTEGER NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
    citation TEXT NOT NULL,
    url TEXT,
    note TEXT
);

CREATE TABLE data_issues (
    id INTEGER PRIMARY KEY,
    artwork_id INTEGER REFERENCES artworks(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    issue_code TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error')),
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'wont_fix')),
    UNIQUE (artwork_id, field_name, issue_code, message)
);

CREATE INDEX idx_artworks_theme ON artworks(theme_id);
CREATE INDEX idx_artworks_form ON artworks(form_id);
CREATE INDEX idx_artworks_period ON artworks(period_code);
CREATE INDEX idx_artwork_images_artwork ON artwork_images(artwork_id, sort_order);
CREATE INDEX idx_data_issues_status ON data_issues(status, severity);

CREATE VIRTUAL TABLE artworks_fts USING fts5(
    title,
    description,
    content='artworks',
    content_rowid='id',
    tokenize='trigram'
);

CREATE TRIGGER artworks_ai AFTER INSERT ON artworks BEGIN
    INSERT INTO artworks_fts(rowid, title, description)
    VALUES (new.id, new.title, new.description);
END;

CREATE TRIGGER artworks_ad AFTER DELETE ON artworks BEGIN
    INSERT INTO artworks_fts(artworks_fts, rowid, title, description)
    VALUES ('delete', old.id, old.title, old.description);
END;

CREATE TRIGGER artworks_au AFTER UPDATE ON artworks BEGIN
    INSERT INTO artworks_fts(artworks_fts, rowid, title, description)
    VALUES ('delete', old.id, old.title, old.description);
    INSERT INTO artworks_fts(rowid, title, description)
    VALUES (new.id, new.title, new.description);
END;
