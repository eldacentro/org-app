export type OutingPDFItem = {
  id: string;
  date: string;         // YYYY/MM/DD
  dayLabel: string;     // Ej: "Martes 5"
  time: string;         // Ej: "10:00"
  location: string;     // Ej: "Salón del Reino"
  brotherName: string;  // Ej: "Juan Pérez" o "Sin asignar"
  isAssigned: boolean;
  isCancelled: boolean;
};

export type WeekPDFData = {
  weekOf: string;
  weekLabel: string;
  outings: OutingPDFItem[];
};

export type OutingsPDFProps = {
  monthName: string;
  cong_name: string;
  weeks: WeekPDFData[];
  updatedAt?: string;
  lastModifiedBy?: string;
};
