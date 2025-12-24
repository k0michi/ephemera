import { Repository } from "typeorm";
import { Post } from "./entity/post.js";
import type { PostSignal } from "@ephemera/shared/api/api.js";
import SignalCrypto from "@ephemera/shared/lib/signal_crypto.js";
import Hex from "@ephemera/shared/lib/hex.js";
import type Config from "./config.js";

export interface IPostService {
  create(signal: PostSignal): Promise<void>;
}

export default class PostService implements IPostService {
  private config: Config;
  private postRepo: Repository<Post>;

  constructor(config: Config, postRepo: Repository<Post>) {
    this.postRepo = postRepo;
    this.config = config;
  }

  async create(signal: PostSignal) {
    // TODO: validation here

    const post = new Post();
    const digest = await SignalCrypto.digest(signal[0]);
    post.id = Hex.fromUint8Array(digest);
    post.version = signal[0][0];
    post.host = signal[0][1][0];
    post.author = signal[0][1][1];
    post.content = signal[0][2];
    post.footer = signal[0][3];
    post.signature = signal[1];
    post.createdAt = signal[0][1][2];
    await this.postRepo.save(post);
  }
}