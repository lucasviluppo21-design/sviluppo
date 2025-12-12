export interface WorkoutCard {
  title: string;
  date: string;
  time?: string;
  abbonamentoEndDate?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  signupDate: string;
  status: string;
  phone?: string;
  avatarUrl?: string;
  personalNotes?: string;
  birthDate?: string;
  gender?: string;
  address?: string;
  city?: string;
  provincia?: string;
  cap?: string;
  subscriptionEnd?: string;
  cards?: WorkoutCard[];
  schedaEnd?: string; 
  tesseraEnd?: string; // <--- questa
}