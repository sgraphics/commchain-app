use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::{UnorderedMap, Vector};
use near_sdk::{env, near_bindgen, AccountId, PanicOnDefault, Promise, BorshStorageKey};
use near_sdk::serde::{Deserialize, Serialize};

#[derive(BorshStorageKey, BorshSerialize)]
pub enum StorageKey {
    TaskCompletions,
    TaskIds,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone)]
#[serde(crate = "near_sdk::serde")]
pub enum TaskStatus {
    Registered,
    Verified,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct TaskCompletion {
    id: u64,
    status: TaskStatus,
    task_id: String,
    evidence: String,
    result: String,
    user: AccountId,
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct TaskCompletionContract {
    owner: AccountId,
    verifier: Option<AccountId>,
    task_completions: UnorderedMap<u64, TaskCompletion>,
    task_ids: Vector<u64>,
    next_id: u64,
}

#[near_bindgen]
impl TaskCompletionContract {
    #[init]
    pub fn new(owner_id: AccountId) -> Self {
        Self {
            owner: owner_id,
            verifier: None,
            task_completions: UnorderedMap::new(StorageKey::TaskCompletions),
            task_ids: Vector::new(StorageKey::TaskIds),
            next_id: 1,
        }
    }

    // Owner methods
    pub fn set_owner(&mut self, new_owner: AccountId) {
        self.assert_owner();
        self.owner = new_owner;
    }

    pub fn get_owner(&self) -> AccountId {
        self.owner.clone()
    }

    pub fn set_verifier(&mut self, verifier: AccountId) {
        self.assert_owner();
        self.verifier = Some(verifier);
    }

    pub fn get_verifier(&self) -> Option<AccountId> {
        self.verifier.clone()
    }

    // Task completion methods
    pub fn register(&mut self, task_id: String, evidence: String) -> u64 {
        let user = env::predecessor_account_id();
        let id = self.next_id;
        self.next_id += 1;

        let task_completion = TaskCompletion {
            id,
            status: TaskStatus::Registered,
            task_id,
            evidence,
            result: String::new(),
            user,
        };

        self.task_completions.insert(&id, &task_completion);
        self.task_ids.push(&id);

        id
    }

    pub fn verify(&mut self, id: u64, result: String) -> u64 {
        self.assert_verifier();
        
        let mut task_completion = self.get_task_completion_by_id(id);
        assert!(
            matches!(task_completion.status, TaskStatus::Registered),
            "Task must be in Registered status"
        );

        task_completion.status = TaskStatus::Verified;
        task_completion.result = result;

        self.task_completions.insert(&id, &task_completion);
        id
    }

    // View methods
    pub fn get_task_completion(&self, id: u64) -> Option<TaskCompletion> {
        self.task_completions.get(&id)
    }

    pub fn get_latest_task_completions(&self, limit: u64) -> Vec<TaskCompletion> {
        let total = self.task_ids.len();
        let start = if total > limit { total - limit } else { 0 };
        let end = total;
        
        (start..end)
            .map(|i| self.task_completions.get(&self.task_ids.get(i).unwrap()).unwrap())
            .collect()
    }

    pub fn get_task_completions_page(&self, from_index: u64, limit: u64) -> Vec<TaskCompletion> {
        let total = self.task_ids.len();
        let from = from_index.min(total);
        let to = (from + limit).min(total);
        
        (from..to)
            .map(|i| self.task_completions.get(&self.task_ids.get(i).unwrap()).unwrap())
            .collect()
    }

    // Helper methods
    fn assert_owner(&self) {
        assert_eq!(
            env::predecessor_account_id(),
            self.owner,
            "Only the owner can call this method"
        );
    }

    fn assert_verifier(&self) {
        if let Some(verifier) = &self.verifier {
            assert_eq!(
                env::predecessor_account_id(),
                *verifier,
                "Only the verifier can call this method"
            );
        } else {
            self.assert_owner(); // If no verifier is set, only owner can verify
        }
    }

    fn get_task_completion_by_id(&self, id: u64) -> TaskCompletion {
        self.task_completions.get(&id).expect("Task completion not found")
    }
} 