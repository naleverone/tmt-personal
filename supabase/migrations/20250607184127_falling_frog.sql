/*
  # Fix Store References and Schema Issues

  1. Schema Changes
    - Add proper store_id column to tasks table as UUID
    - Add proper store_id column to task_evidence table as UUID
    - Add foreign key constraints
    - Update existing data to use proper UUIDs

  2. Data Migration
    - Migrate existing store references to use UUIDs
    - Update task_evidence to reference proper store

  3. Security
    - Update RLS policies to work with new schema
*/

-- First, let's add the store_id column to tasks table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'store_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN store_id uuid;
  END IF;
END $$;

-- Add store_id column to task_evidence table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_evidence' AND column_name = 'store_id'
  ) THEN
    ALTER TABLE task_evidence ADD COLUMN store_id uuid;
  END IF;
END $$;

-- Create a mapping function to convert store names to UUIDs
-- This assumes the 'store' column in tasks contains store names
UPDATE tasks 
SET store_id = stores.id 
FROM stores 
WHERE tasks.store = stores.name 
AND tasks.store_id IS NULL;

-- For any tasks that don't have a matching store name, try to use the first store
UPDATE tasks 
SET store_id = (SELECT id FROM stores LIMIT 1)
WHERE store_id IS NULL;

-- Update task_evidence to reference the same store as its task
UPDATE task_evidence 
SET store_id = tasks.store_id
FROM tasks 
WHERE task_evidence.task_id::text = tasks.id::text
AND task_evidence.store_id IS NULL;

-- Make store_id NOT NULL after data migration
ALTER TABLE tasks ALTER COLUMN store_id SET NOT NULL;

-- Add foreign key constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'tasks_store_id_fkey'
  ) THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_store_id_fkey 
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'task_evidence_store_id_fkey'
  ) THEN
    ALTER TABLE task_evidence ADD CONSTRAINT task_evidence_store_id_fkey 
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update RLS policies for tasks table
DROP POLICY IF EXISTS "Enable read access for all users" ON tasks;
DROP POLICY IF EXISTS "Enable update access for all users" ON tasks;
DROP POLICY IF EXISTS "Users can read assigned tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their tasks" ON tasks;

-- Enable RLS on tasks table
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create comprehensive RLS policies for tasks
CREATE POLICY "Admins can manage all tasks"
  ON tasks
  FOR ALL
  TO authenticated
  USING ((jwt() ->> 'role'::text) = 'Administrador'::text)
  WITH CHECK ((jwt() ->> 'role'::text) = 'Administrador'::text);

CREATE POLICY "Users can read tasks for their store"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (
    store_id IN (
      SELECT store_id FROM users WHERE auth_id = auth.uid()
    )
    OR (jwt() ->> 'role'::text) = ANY (ARRAY['Administrador'::text, 'Jefe de tienda'::text])
  );

CREATE POLICY "Users can update their assigned tasks"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (
    assigned_user_auth_id = auth.uid()
    OR (jwt() ->> 'role'::text) = ANY (ARRAY['Administrador'::text, 'Jefe de tienda'::text])
  )
  WITH CHECK (
    assigned_user_auth_id = auth.uid()
    OR (jwt() ->> 'role'::text) = ANY (ARRAY['Administrador'::text, 'Jefe de tienda'::text])
  );

CREATE POLICY "Supervisors and admins can create tasks"
  ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK ((jwt() ->> 'role'::text) = ANY (ARRAY['Administrador'::text, 'Jefe de tienda'::text]));

-- Update RLS policies for task_evidence
ALTER TABLE task_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage evidence for their store tasks"
  ON task_evidence
  FOR ALL
  TO authenticated
  USING (
    store_id IN (
      SELECT store_id FROM users WHERE auth_id = auth.uid()
    )
    OR (jwt() ->> 'role'::text) = 'Administrador'::text
  )
  WITH CHECK (
    store_id IN (
      SELECT store_id FROM users WHERE auth_id = auth.uid()
    )
    OR (jwt() ->> 'role'::text) = 'Administrador'::text
  );