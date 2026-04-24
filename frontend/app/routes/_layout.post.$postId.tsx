import type { PeerManifest } from "@ephemera/shared/api/api";
import ServerIdenticon from "components/server_identicon";
import { Link, useLoaderData } from "react-router";
import { Card, ListGroup } from "react-bootstrap";
import { useReader } from "lib/store";
import { useEffect, useState } from "react";
import type { Route } from "./+types/_layout.post.$postId";
import { EphemeraStore } from "~/store";
import Client from "@ephemera/shared/lib/client";
import NullableHelper from "@ephemera/shared/lib/nullable_helper";
import Post from "components/post";
import PostUtil from "@ephemera/shared/lib/post_util";

export async function loader({ params }: Route.LoaderArgs) {
  const host = NullableHelper.unwrap(process.env.EPHEMERA_HOST);
  const backendHost = NullableHelper.unwrap(process.env.EPHEMERA_BACKEND_HOST);
  const client = new Client({ host: host, baseUrl: `http://${backendHost}` });
  const post = await client.getPost(params.postId);

  return {
    host: process.env.EPHEMERA_HOST,
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