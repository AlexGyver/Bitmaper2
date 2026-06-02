export class WorkerCancelledError extends Error {
    constructor() {
        super('Cancelled');
        this.name = 'WorkerCancelledError';
    }
}

export class WorkerRunner {
    constructor(worker) {
        this.worker = worker;

        this.nextId = 1;
        this.running = null;
        this.pending = null;
        this.disposed = false;

        this.worker.onmessage = event => {
            this.handleMessage(event.data);
        };

        this.worker.onerror = event => {
            this.fail(new Error(event.message || 'Worker error'));
        };

        this.worker.onmessageerror = () => {
            this.fail(new Error('Worker message error'));
        };
    }

    get isRunning() {
        return !!this.running;
    }

    get hasPending() {
        return !!this.pending;
    }

    busy() {
        if (this.disposed) {
            return Promise.reject(new Error('WorkerRunner is disposed'));
        }

        if (!this.running) {
            return Promise.resolve();
        }

        this.cancelPending();

        return new Promise((resolve, reject) => {
            this.pending = {
                resolve,
                reject
            };
        });
    }

    run(payload = {}) {
        if (this.disposed) {
            return Promise.reject(new Error('WorkerRunner is disposed'));
        }

        if (this.running) {
            return Promise.reject(new Error('WorkerRunner is already running'));
        }

        const id = this.nextId++;

        return new Promise((resolve, reject) => {
            this.running = {
                id,
                resolve,
                reject
            };

            this.worker.postMessage({
                id,
                payload
            });
        });
    }

    handleMessage(message) {
        const task = this.running;

        if (!task) {
            return;
        }

        if (!message || message.id !== task.id) {
            return;
        }

        this.running = null;

        if (message.type === 'done') {
            task.resolve(message.result);
            this.resolvePending();
            return;
        }

        if (message.type === 'error') {
            task.reject(message.error);
            this.resolvePending();
            return;
        }

        task.reject(new Error(`Unknown worker message type: ${message.type}`));
        this.resolvePending();
    }

    resolvePending() {
        if (!this.pending) {
            return;
        }

        const pending = this.pending;
        this.pending = null;

        pending.resolve();
    }

    cancelPending() {
        if (!this.pending) {
            return;
        }

        const pending = this.pending;
        this.pending = null;

        pending.reject(new WorkerCancelledError());
    }

    fail(error) {
        if (this.running) {
            this.running.reject(error);
            this.running = null;
        }

        if (this.pending) {
            this.pending.reject(error);
            this.pending = null;
        }
    }

    dispose() {
        if (this.disposed) {
            return;
        }

        this.cancelPending();

        if (this.running) {
            this.running.reject(new WorkerCancelledError());
            this.running = null;
        }

        this.worker.terminate();
        this.worker = null;
        this.disposed = true;
    }
}