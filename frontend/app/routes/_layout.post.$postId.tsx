import Client from "@ephemera/shared/lib/client";
import NullableHelper from "@ephemera/shared/lib/nullable_helper";
import PostUtil from "@ephemera/shared/lib/post_util";
import Post from "components/post";
import { useLoaderData } from "react-router";

import type { Route } from "./+types/_layout.post.$postId";

export async function loader({ params }: Route.LoaderArgs) {
  const host = NullableHelper.unwrap(process.env.EPHEMERA_HOST);
  const backendHost = NullableHelper.unwrap(process.env.EPHEMERA_BACKEND_HOST);
  const client = new Client({ host: host, baseUrl: `http://${backendHost}` });
  const post = await client.getPost(params.postId);

  return {
    host: host,
    post: post
  };
}

function truncate(str: string, maxWeightedLength: number): string {
  const weightedLength = PostUtil.weightedLength(str);

  if (weightedLength <= maxWeightedLength) {
    return str;
  }

  return PostUtil.weightedSubstring(str, 0, maxWeightedLength) + "...";
}

export function meta({ loaderData }: Route.MetaArgs) {
  const author = loaderData.post[0][1][1];
  const postContent = loaderData.post[0][2];

  return [
    { title: `@${author}: "${truncate(postContent, 32)}" | Ephemera@${loaderData.host}` },
  ];
}

export default function PostPage() {
  const loaderData = useLoaderData<typeof loader>();

  return (
    <Post post={loaderData.post} />
  );
}