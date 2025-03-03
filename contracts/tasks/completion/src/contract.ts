// Find all our documentation at https://docs.near.org
import { NearBindgen, near, call, view, UnorderedMap } from 'near-sdk-js';

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
  tasks: UnorderedMap<Task> = new UnorderedMap<Task>("t");
  nextId: number = 1;

  static schema = {
    greeting: 'string',
    validator: 'string',
    tasks: { class: UnorderedMap, value: 'object' },
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
    
    this.tasks.set(id.toString(), task);
    near.log(`Task registered with ID: ${id}`);
    
    // Add NEAR AI HUB event log to trigger AI verification
    const aiHubLog = {
      standard: "nearai",
      version: "0.1.0",
      event: "run_agent",
      data: [
        {
          message: `run verification for task ${id}`,
          agent: "commchain.near/completions/latest",
          max_iterations: null,
          thread_id: null,
          env_vars: null,
          signer_id: user,
          referral_id: null,
          amount: "0"
        }
      ]
    };
    
    near.log(`EVENT_JSON:${JSON.stringify(aiHubLog)}`);
    
    return id;
  }
  
  @call({})
  validate_task({ id, result }: { id: number; result: string }): void {
    // Check if caller is the validator
    if (this.validator === "") {
      near.log("No validator has been set");
      return;
    }
    
    if (near.predecessorAccountId() !== this.validator) {
      near.log("Only the validator can validate tasks");
      return;
    }
    
    // Get the task
    const taskId = id.toString();
    const task = this.tasks.get(taskId);
    
    if (!task) {
      near.log(`Task with ID ${id} not found`);
      return;
    }
    
    if (task.status !== 0) {
      near.log("Task must be in REGISTERED status");
      return;
    }
    
    // Update the task
    task.status = 1; // 1 = verified
    task.result = result;
    this.tasks.set(taskId, task);
    
    near.log(`Task ${id} validated with result: ${result}`);
  }
  
  @view({})
  get_all_tasks(): Task[] {
    return this.tasks.toArray().map(([_, task]) => task);
  }
  
  @view({})
  get_task({ id }: { id: number }): Task | null {
    return this.tasks.get(id.toString()) || null;
  }
}