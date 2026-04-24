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

export async function loader({ params }: Route.LoaderArgs) {
  const backendHost = NullableHelper.unwrap(process.env.EPHEMERA_BACKEND_HOST);
  const client = new Client(backendHost);
  const post = await client.getPost(params.postId);

  return {
    host: process.env.EPHEMERA_HOST,
    post: post
  };
}

export function meta({ loaderData }: Route.MetaArgs) {
  return [
    { title: `Servers | Ephemera@${loaderData.host}` },
  ];
}

export default function PostPage() {
  const loaderData = useLoaderData<typeof loader>();

  return (
    <Post post={loaderData.post} />
  );
}