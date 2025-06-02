// src/types.ts

export interface User {
    id: number;
    name: string;
    email: string;
    store: string;
    role: 'supervisor' | 'employee' | 'admin' | string;
    auth_id: string; // Nuevo: UUID de Supabase Auth
}

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
    /**
     * Stores associated with this task. Each entry is a store name or ID
     * depending on how the backend is configured.
     */
    stores?: string[];
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

