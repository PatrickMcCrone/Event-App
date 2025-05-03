-- First, drop the existing events table if it exists
DROP TABLE IF EXISTS events CASCADE;

-- Create the events table with the correct structure
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'conference',
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Add constraints to ensure end date/time is after start date/time
    CHECK (end_date >= start_date),
    CHECK (
        (end_date > start_date) OR 
        (end_date = start_date AND end_time > start_time)
    )
);

-- Create an index on created_by for better join performance
CREATE INDEX idx_events_created_by ON events(created_by);

-- Create an index on start_date and start_time for better sorting performance
CREATE INDEX idx_events_dates ON events(start_date, start_time);

-- Update event_subscriptions table to reference events instead of conferences
ALTER TABLE event_subscriptions
    DROP CONSTRAINT IF EXISTS event_subscriptions_conference_id_fkey,
    DROP COLUMN IF EXISTS conference_id,
    ADD COLUMN IF NOT EXISTS event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    ADD UNIQUE(user_id, event_id);

-- Update notifications table to reference events instead of conferences
ALTER TABLE notifications
    DROP CONSTRAINT IF EXISTS notifications_conference_id_fkey,
    DROP COLUMN IF EXISTS conference_id,
    ADD COLUMN IF NOT EXISTS event_id INTEGER REFERENCES events(id) ON DELETE CASCADE; 