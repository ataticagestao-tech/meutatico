export type CalendarSourceType = "task" | "ticket" | "event"
export type CalendarEventType = "meeting" | "reminder" | "deadline" | "other"
export type CalendarView = "month" | "week" | "day"

export interface CalendarItem {
  id: string
  title: string
  description?: string
  source_type: CalendarSourceType
  start_date: string
  end_date: string
  all_day: boolean
  status?: string
  priority?: string
  client_id?: string
  client_name?: string
  assigned_user_id?: string
  assigned_user_name?: string
  location?: string
  meet_link?: string
  google_event_id?: string
  sync_source?: "local" | "google"
}

export interface CalendarEventCreateRequest {
  title: string
  description?: string
  type: CalendarEventType
  start_date: string
  end_date: string
  all_day?: boolean
  client_id?: string
  assigned_user_id?: string
  location?: string
  meet_link?: string
}

export interface CalendarEventUpdateRequest {
  title?: string
  description?: string
  type?: CalendarEventType
  start_date?: string
  end_date?: string
  all_day?: boolean
  client_id?: string
  assigned_user_id?: string
  location?: string
  meet_link?: string
}
