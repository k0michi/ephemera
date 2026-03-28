export interface ISchedulerJob {
  readonly name: string;

  run(signal: AbortSignal): Promise<void>;
}

export interface ISchedulerService {
  get signal(): AbortSignal;

  register(job: ISchedulerJob, ticker: AsyncIterableIterator<number>): void;

  shutdown(): Promise<void>;
}

export class SchedulerService implements ISchedulerService {
  private readonly controller = new AbortController();
  private readonly runningTasks = new Set<Promise<void>>();

  get signal(): AbortSignal {
    return this.controller.signal;
  }

  register(job: ISchedulerJob, ticker: AsyncIterableIterator<number>): void {
    const taskPromise = this.runLoop(job, ticker);

    this.runningTasks.add(taskPromise);
    taskPromise.finally(() => this.runningTasks.delete(taskPromise));
  }

  private async runLoop(job: ISchedulerJob, ticker: AsyncIterableIterator<number>) {
    const { signal } = this.controller;

    try {
      for await (const tickTime of ticker) {
        if (signal.aborted) break;

        console.log(`[SchedulerService] Running job "${job.name}" at ${new Date(tickTime).toISOString()}`);

        try {
          await job.run(signal);
        } catch (error) {
          console.error(`[SchedulerService] Job "${job.name}" failed:`, error);
        }
      }
    } catch (error) {
      if (!signal.aborted) {
        console.error(`[SchedulerService] Ticker for "${job.name}" crashed:`, error);
      }
    }
  }

  async shutdown(): Promise<void> {
    this.controller.abort();
    await Promise.allSettled(this.runningTasks);
  }
}