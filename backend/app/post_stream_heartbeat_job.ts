import type PostStreamController from "./post_stream_controller.js";
import type { ISchedulerJob } from "./scheduler_service.js";

export default class PostStreamHeartbeatJob implements ISchedulerJob {
  name = 'post_stream_heartbeat';

  constructor(private postStreamController: PostStreamController) { }

  async run(signal: AbortSignal): Promise<void> {
    this.postStreamController.pingClients();
  }
}
