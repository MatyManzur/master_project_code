CREATE TABLE reports (
  id SERIAL PRIMARY KEY,
  location geometry(Point, 4326) NOT NULL,
  image_name TEXT UNIQUE NOT NULL,
  report_uuid TEXT UNIQUE NOT NULL,
  state VARCHAR(255) DEFAULT 'new' NOT NULL,
  reported_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NULL,
  processing_time INTERVAL DEFAULT NULL,
  image_size INTEGER DEFAULT NULL,
  address TEXT DEFAULT NULL,
  description TEXT DEFAULT NULL
);

CREATE INDEX reports_location_gix
  ON reports
  USING GIST (location);

CREATE INDEX reports_image_name_idx ON reports(image_name);
CREATE INDEX reports_report_uuid_idx ON reports(report_uuid);

CREATE OR REPLACE FUNCTION insert_report(
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    image_name TEXT,
    report_uuid TEXT,
    address TEXT DEFAULT NULL,
    description TEXT DEFAULT NULL,
    report_state VARCHAR DEFAULT 'new',
    report_date TIMESTAMPTZ DEFAULT NOW()
) RETURNS INTEGER AS $$
DECLARE
    new_id INTEGER;
BEGIN
    INSERT INTO reports (location, image_name, report_uuid, state, reported_at, address, description)
    VALUES (
        ST_SetSRID(ST_MakePoint(lon, lat), 4326),
        image_name,
        report_uuid,
        report_state,
        report_date,
        address,
        description
    )
    RETURNING id INTO new_id;
    RETURN new_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION process_report(
    image_name TEXT,
    processing_time INTERVAL,
    image_size INTEGER,
    report_state VARCHAR DEFAULT 'processed'
) RETURNS VOID AS $$
BEGIN
    UPDATE reports
    SET state = report_state,
        processed_at = NOW(),
        processing_time = process_report.processing_time,
        image_size = process_report.image_size
    WHERE reports.image_name = process_report.image_name;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE objects (
  id SERIAL PRIMARY KEY,
  report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  x1 INTEGER NOT NULL,
  x2 INTEGER NOT NULL,
  y1 INTEGER NOT NULL,
  y2 INTEGER NOT NULL,
  healthy_score FLOAT NOT NULL,
  damaged_score FLOAT NOT NULL
);

CREATE INDEX objects_report_id_idx ON objects(report_id);

CREATE OR REPLACE FUNCTION insert_object_by_image_name(
  image_name TEXT,
  x1 INTEGER,
  x2 INTEGER,
  y1 INTEGER,
  y2 INTEGER,
  healthy_score FLOAT,
  damaged_score FLOAT
) RETURNS INTEGER AS $$
DECLARE
  report_id INTEGER;
  new_object_id INTEGER;
BEGIN
  SELECT id INTO report_id FROM reports WHERE reports.image_name = insert_object_by_image_name.image_name LIMIT 1;
  IF report_id IS NULL THEN
    RAISE EXCEPTION 'No report found with image_name: %', image_name;
  END IF;

  INSERT INTO objects (report_id, x1, x2, y1, y2, healthy_score, damaged_score)
  VALUES (report_id, x1, x2, y1, y2, healthy_score, damaged_score)
  RETURNING id INTO new_object_id;

  RETURN new_object_id;
END;
$$ LANGUAGE plpgsql;

