export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Sun=0 ... Sat=6

export interface TimeSlot {
  open: string;
  close: string;
}

export interface ScheduleEntry {
  day: DayOfWeek;
  slots: TimeSlot[];
  note?: string;
}

export interface FoodShelter {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  distanceMiles: number;
  schedule: ScheduleEntry[];
  mealTimes?: string;
  eligibility: string;
  contact?: string;
  website?: string;
  notes?: string;
}

export interface FoodDetectionItem {
  name: string;
  quantity: string;
  details?: string;
}

export interface FoodDetection {
  items: FoodDetectionItem[];
}

export type UploadedImage = {
  id: string;
  dataUrl: string;
  caption?: string;
  createdAt: number;
  analysis?: FoodDetection;
};
