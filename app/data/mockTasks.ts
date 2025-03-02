// Task interface
export interface Task {
  id: string;
  name: string;
  location: string;
  coordinates: [number, number];
  instructions: string;
  ai_verification_instructions: string | null;
  human_verification_instructions: string | null;
  template: "PHOTO" | "COUNT" | "PHOTO_AND_COUNT" | "CHECK";
  can_open: boolean;
  participants: number;
  urgency: number;
  commander: string;
  reward_usdc: number | null;
  reward_unit: number | null;
}

// Sample task data
export const taskData: Task[] = [
  {
    id: "task-1",
    name: "Demine Bakhmut region",
    location: "Bakhmut, Eastern Ukraine",
    coordinates: [48.5977, 37.9974],
    instructions: "Clear mines from residential areas",
    ai_verification_instructions: "Analyze photos for demining evidence. Respond with only one number. Respond with count of mines if demining confirmed or '0' if inconclusive/missed.",
    human_verification_instructions: "Verify clearance reports from team",
    template: "PHOTO_AND_COUNT",
    can_open: true,
    participants: 6,
    urgency: 6,
    commander: "deminer.near",
    reward_usdc: 200,
    reward_unit: 10
  },
  {
    id: "task-2",
    name: "Medical supplies to Kharkiv",
    location: "Kharkiv, Ukraine",
    coordinates: [49.9935, 36.2304],
    instructions: "Deliver emergency medical supplies",
    ai_verification_instructions: null,
    human_verification_instructions: "Confirm delivery with recipients. ",
    template: "PHOTO",
    can_open: true,
    participants: 4,
    urgency: 8,
    commander: "medic-team.near",
    reward_usdc: 50,
    reward_unit: 1
  },
  {
    id: "task-3",
    name: "Repair water station",
    location: "Donetsk region",
    coordinates: [48.0159, 37.8028],
    instructions: "Repair damaged water infrastructure",
    ai_verification_instructions: "Analyze photo to check if it depicts a small cabin with kitchen or water tank. Respond with only one number. Respond with '1' if inside of a cabin or '0' if no cabin is visible.",
    human_verification_instructions: null,
    template: "PHOTO",
    can_open: true,
    participants: 8,
    urgency: 5,
    commander: "engineer.near",
    reward_usdc: 500,
    reward_unit: 1
  },
  {
    id: "task-4",
    name: "Evacuate civilians",
    location: "Zaporizhzhia region",
    coordinates: [47.8388, 35.1396],
    instructions: "Assist in civilian evacuation from conflict zone. ",
    ai_verification_instructions: null,
    human_verification_instructions: null,
    template: "COUNT",
    can_open: true,
    participants: 12,
    urgency: 9,
    commander: "evacuation-team.near",
    reward_usdc: null,
    reward_unit: null
  },
  {
    id: "task-5",
    name: "Conduct drone hit",
    location: "Eastern front",
    coordinates: [48.5432, 38.1234],
    instructions: "Deploy drone to target enemy equipment",
    ai_verification_instructions: "Analyze footage for strike confirmation by: 1) Detecting explosion signature and blast radius, 2) Identifying target equipment before and after strike, 3) Assessing structural damage patterns consistent with successful hit, 4) Verifying timestamp and geolocation metadata. Respond with only one number. Respond with '1' if hit confirmed or '0' if inconclusive/missed.",
    human_verification_instructions: null,
    template: "PHOTO",
    can_open: true,
    participants: 3,
    urgency: 10,
    commander: "drone-squad.near",
    reward_usdc: 100,
    reward_unit: 1
  }
];

// Function to get task by ID
export function getTaskById(id: string): Task | undefined {
  return taskData.find(task => task.id === id);
} 