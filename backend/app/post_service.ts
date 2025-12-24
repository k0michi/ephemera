import { Repository } from "typeorm";
import { Post } from "./entity/post.js";
import type { PostSignal, Version } from "@ephemera/shared/api/api.js";
import SignalCrypto from "@ephemera/shared/lib/signal_crypto.js";
import Hex from "@ephemera/shared/lib/hex.js";
import type Config from "./config.js";
import NullableHelper from "@ephemera/shared/lib/nullable_helper.js";

export interface IPostService {
  create(signal: PostSignal): Promise<void>;
  find(): Promise<PostSignal[]>;
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
    post.createdAt = String(signal[0][1][2]);
    await this.postRepo.save(post);
  }

  static unwrapVersion(version: number): Version {
    if (version === 0) {
      return 0;
    } else {
      throw new Error(`Unsupported version: ${version}`);
    }
  }

  async find(): Promise<PostSignal[]> {
    const signals = (await this.postRepo.find({
      order: {
        createdAt: "DESC",
      },
    })).map((post) => {
      return [
        [
          PostService.unwrapVersion(NullableHelper.unwrap(post.version)),
          [
            NullableHelper.unwrap(post.host),
            NullableHelper.unwrap(post.author),
            NullableHelper.unwrap(Number(post.createdAt)),
            "create_post",
          ],
          NullableHelper.unwrap(post.content),
          NullableHelper.unwrap(post.footer),
        ],
        NullableHelper.unwrap(post.signature),
      ] satisfies PostSignal;
    });

    console.log(signals[0]);
    return signals;
  }
}