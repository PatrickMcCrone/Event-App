-- Create event_subscriptions table
CREATE TABLE IF NOT EXISTS event_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conference_id INTEGER NOT NULL REFERENCES conferences(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, conference_id)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conference_id INTEGER NOT NULL REFERENCES conferences(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add timezone column to events table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'timezone'
    ) THEN
        ALTER TABLE events 
        ADD COLUMN timezone VARCHAR(50) NOT NULL DEFAULT 'America/New_York';
    END IF;
END $$;

-- Update event_admins table to support chair role
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_admins') THEN
        -- Add CHECK constraint for role
        ALTER TABLE event_admins
        DROP CONSTRAINT IF EXISTS event_admins_role_check,
        ADD CONSTRAINT event_admins_role_check CHECK (role IN ('admin', 'chair'));
    END IF;
END $$;

-- Update event_participants table to support chair, presenter, and attendee roles
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_participants') THEN
        -- Add role column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'event_participants' 
            AND column_name = 'role'
        ) THEN
            ALTER TABLE event_participants
            ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'attendee';
        END IF;

        -- Add CHECK constraint for role
        ALTER TABLE event_participants
        DROP CONSTRAINT IF EXISTS event_participants_role_check,
        ADD CONSTRAINT event_participants_role_check CHECK (role IN ('chair', 'presenter', 'attendee'));
    END IF;
END $$; 