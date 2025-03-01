import { NearBindgen, near, call, view, initialize, LookupMap, Vector } from 'near-sdk-js';

// Enum for task status
export const TaskStatus = {
  Registered: 0,
  Verified: 1
};

// Task completion class
class TaskCompletion {
  constructor(id, taskId, evidence, user) {
    this.id = id;
    this.status = TaskStatus.Registered;
    this.taskId = taskId;
    this.evidence = evidence;
    this.result = "";
    this.user = user;
  }
}

@NearBindgen({})
class TaskCompletionContract {
  constructor() {
    this.owner = "";
    this.verifier = null;
    this.taskCompletions = new LookupMap("tc");
    this.taskIds = new Vector("ids");
    this.nextId = 1;
  }

  @initialize({})
  init({ ownerId }) {
    this.owner = ownerId;
  }

  // Owner methods
  @call({})
  setOwner({ newOwner }) {
    this.assertOwner();
    this.owner = newOwner;
  }

  @view({})
  getOwner() {
    return this.owner;
  }

  @call({})
  setVerifier({ verifier }) {
    this.assertOwner();
    this.verifier = verifier;
  }

  @view({})
  getVerifier() {
    return this.verifier;
  }

  // Task completion methods
  @call({})
  register({ taskId, evidence }) {
    const user = near.predecessorAccountId();
    const id = this.nextId;
    this.nextId += 1;

    const taskCompletion = new TaskCompletion(id, taskId, evidence, user);
    
    this.taskCompletions.set(id.toString(), taskCompletion);
    this.taskIds.push(id);

    near.log(`Task registered with ID: ${id}`);
    return id;
  }

  @call({})
  verify({ id, result }) {
    this.assertVerifier();
    
    const taskCompletion = this.getTaskCompletionById(id);
    
    if (taskCompletion.status !== TaskStatus.Registered) {
      throw new Error("Task must be in Registered status");
    }

    taskCompletion.status = TaskStatus.Verified;
    taskCompletion.result = result;

    this.taskCompletions.set(id.toString(), taskCompletion);
    
    near.log(`Task verified with ID: ${id}`);
    return id;
  }

  // View methods
  @view({})
  getTaskCompletion({ id }) {
    return this.taskCompletions.get(id.toString());
  }

  @view({})
  getLatestTaskCompletions({ limit }) {
    const total = this.taskIds.length;
    const start = total > limit ? total - limit : 0;
    const end = total;
    
    const result = [];
    for (let i = start; i < end; i++) {
      const id = this.taskIds.get(i);
      const task = this.taskCompletions.get(id.toString());
      result.push(task);
    }
    
    return result;
  }

  @view({})
  getTaskCompletionsPage({ fromIndex, limit }) {
    const total = this.taskIds.length;
    const from = Math.min(fromIndex, total);
    const to = Math.min(from + limit, total);
    
    const result = [];
    for (let i = from; i < to; i++) {
      const id = this.taskIds.get(i);
      const task = this.taskCompletions.get(id.toString());
      result.push(task);
    }
    
    return result;
  }

  // Helper methods
  assertOwner() {
    if (near.predecessorAccountId() !== this.owner) {
      throw new Error("Only the owner can call this method");
    }
  }

  assertVerifier() {
    if (this.verifier) {
      if (near.predecessorAccountId() !== this.verifier) {
        throw new Error("Only the verifier can call this method");
      }
    } else {
      this.assertOwner(); // If no verifier is set, only owner can verify
    }
  }

  getTaskCompletionById(id) {
    const task = this.taskCompletions.get(id.toString());
    if (!task) {
      throw new Error("Task completion not found");
    }
    return task;
  }
} 