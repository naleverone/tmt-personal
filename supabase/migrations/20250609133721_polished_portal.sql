/*
  # Fix Database Schema for Store References

  1. Schema Changes
    - Add store_id (uuid) column to tasks table
    - Add store_id (uuid) column to task_evidence table
    - Migrate data from old store (text) column to new store_id (uuid) column
    - Add foreign key constraints

  2. Security
    - Enable RLS on tasks and task_evidence tables
    - Add policies for proper access control based on user roles and store associations
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

-- Drop ALL existing policies on tasks table to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for all users" ON tasks;
DROP POLICY IF EXISTS "Enable update access for all users" ON tasks;
DROP POLICY IF EXISTS "Users can read assigned tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their tasks" ON tasks;
DROP POLICY IF EXISTS "Admins and store managers can create tasks" ON tasks;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON tasks;
DROP POLICY IF EXISTS "Admins can manage all tasks" ON tasks;
DROP POLICY IF EXISTS "Supervisors can manage tasks for their store" ON tasks;
DROP POLICY IF EXISTS "Users can read and update their assigned tasks" ON tasks;

-- Enable RLS on tasks table
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create comprehensive RLS policies for tasks
CREATE POLICY "Admins can manage all tasks"
  ON tasks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.auth_id = auth.uid() 
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.auth_id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Supervisors can manage tasks for their store"
  ON tasks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.auth_id = auth.uid() 
      AND users.role = 'supervisor'
      AND users.store_id = tasks.store_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.auth_id = auth.uid() 
      AND users.role = 'supervisor'
      AND users.store_id = tasks.store_id
    )
  );

CREATE POLICY "Users can read and update their assigned tasks"
  ON tasks
  FOR ALL
  TO authenticated
  USING (
    assigned_user_auth_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.auth_id = auth.uid() 
      AND users.store_id = tasks.store_id
    )
  )
  WITH CHECK (
    assigned_user_auth_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.auth_id = auth.uid() 
      AND users.role IN ('admin', 'supervisor')
    )
  );

-- Update RLS policies for task_evidence
ALTER TABLE task_evidence ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on task_evidence to avoid conflicts
DROP POLICY IF EXISTS "Users can manage evidence for their store tasks" ON task_evidence;
DROP POLICY IF EXISTS "Users can manage evidence for accessible tasks" ON task_evidence;

CREATE POLICY "Users can manage evidence for accessible tasks"
  ON task_evidence
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.auth_id = auth.uid() 
      AND (
        users.role = 'admin'
        OR users.store_id = task_evidence.store_id
      )
    )
    OR uploaded_by_auth_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.auth_id = auth.uid() 
      AND (
        users.role = 'admin'
        OR users.store_id = task_evidence.store_id
      )
    )
    OR uploaded_by_auth_id = auth.uid()
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_store_id ON tasks(store_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_user_auth_id ON tasks(assigned_user_auth_id);
CREATE INDEX IF NOT EXISTS idx_task_evidence_store_id ON task_evidence(store_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_store_id ON users(store_id);