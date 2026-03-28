import type { IAttachmentService } from "./attachment_service.js";
import type { ISchedulerJob } from "./scheduler_service.js";

export default class AttachmentCleanerJob implements ISchedulerJob {
  name = 'attachment_cleaner';

  constructor(private attachmentService: IAttachmentService) { }

  async run(): Promise<void> {
    await this.attachmentService.removeOrphans();
    await this.attachmentService.removeUnlinkedFiles();
  }
}