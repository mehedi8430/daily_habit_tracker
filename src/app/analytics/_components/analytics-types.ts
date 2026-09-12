export type AnalyticsView = "month" | "week" | "year";

export interface TimeWorkedPoint {
  date?: string;
  month?: string;
  week?: string;
  full: string;
  hours: number;
  mins: number;
}