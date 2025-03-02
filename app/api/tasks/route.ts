import { NextResponse } from 'next/server';
import { taskData } from '@/app/data/mockTasks';

export async function GET() {
  try {
    // Return the task data as JSON
    return NextResponse.json(taskData);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
} 