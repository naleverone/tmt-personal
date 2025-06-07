// src/types.ts

export interface User {
    id: number;
    name: string;
    email: string;
    store_id: number; // Changed from string to number
    role: 'supervisor' | 'employee' | 'admin' | string;
    auth_id: string; // UUID de Supabase Auth
}

// Note: The 'employee' role is displayed as 'Vendedor' in the interface.

export interface Store {
    id: number;
    name: string;
    external_id: number;
    street_name: string;
    street_number: string;
    additional_info?: string;
    city: string;
    state: string;
}

export interface RecurrencePattern {
    type: 'daily' | 'weekly' | 'monthly';
    interval?: number; // e.g., every 2 weeks
    daysOfWeek?: number[]; // 0-6 for Sunday-Saturday
    dayOfMonth?: number; // 1-31
    endDate?: string; // When the recurrence ends
}

export interface Task {
    id: number;
    name: string;
    description?: string;
    store_id: number; // Changed: single store ID instead of stores array
    task_group_uuid?: string; // Added: UUID to group related tasks for admins
    /**
     * @deprecated Use `assigned_user_auth_id` instead.
     */
    assigned_user_id?: number;
    assigned_user_name?: string;
    /** Primary identifier of the assigned user (Supabase Auth ID) */
    assigned_user_auth_id?: string;
    due_date?: string;
    priority?: 'Urgente' | 'Rutinaria' | string;
    status?: 'Pendiente' | 'OK' | string;
    task_type?: string;
    evidence_image_url?: string | null;
    is_recurring?: boolean;
    recurrence_pattern?: RecurrencePattern;
}

export interface TaskEvidence {
    id: number | string;
    task_id: number;
    url: string;
    uploaded_by_auth_id: string;
    created_at: string;
}

// New interface for grouped tasks (admin view)
export interface GroupedTask {
    id: string; // task_group_uuid or individual task id
    name: string;
    description?: string;
    store_ids: number[]; // Array of store IDs for grouped tasks
    store_names: string[]; // Array of store names for display
    assigned_user_auth_id?: string;
    assigned_user_name?: string;
    due_date?: string;
    priority?: 'Urgente' | 'Rutinaria' | string;
    status?: 'Pendiente' | 'OK' | string; // Consolidated status for grouped tasks
    task_type?: string;
    evidence_image_url?: string | null;
    is_recurring?: boolean;
    recurrence_pattern?: RecurrencePattern;
    task_group_uuid?: string;
    individual_tasks: Task[]; // Array of individual task instances
    is_grouped: boolean; // True if this represents multiple tasks
}