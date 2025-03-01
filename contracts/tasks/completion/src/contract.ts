// Find all our documentation at https://docs.near.org
import { NearBindgen, near, call, view } from 'near-sdk-js';

// Simple task type
type Task = {
  id: number;
  taskId: string;
  evidence: string;
  result: string;
  status: number;
  user: string;
};

@NearBindgen({})
class HelloNear {
  greeting: string = 'Hello';
  validator: string = '';
  tasks: Task[] = [];
  nextId: number = 1;

  static schema = {
    greeting: 'string',
    validator: 'string',
    tasks: 'array',
    nextId: 'number'
  };

  @view({})
  get_greeting(): string {
    return this.greeting;
  }

  @call({})
  set_greeting({ greeting }: { greeting: string }): void {
    near.log(`Saving greeting ${greeting}`);
    this.greeting = greeting;
  }
  
  @call({})
  set_validator({ validator }: { validator: string }): void {
    this.validator = validator;
    near.log(`Validator set to ${validator}`);
  }
  
  @view({})
  get_validator(): string {
    return this.validator;
  }
  
  @call({})
  register_task({ taskId, evidence }: { taskId: string; evidence: string }): number {
    const user = near.predecessorAccountId();
    const id = this.nextId++;
    
    const task: Task = {
      id,
      taskId,
      evidence,
      result: "",
      status: 0, // 0 = registered
      user
    };
    
    this.tasks.push(task);
    near.log(`Task registered with ID: ${id}`);
    return id;
  }
  
  @view({})
  get_all_tasks(): Task[] {
    return this.tasks;
  }
}