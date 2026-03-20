import NullableHelper from "@ephemera/shared/lib/nullable_helper";
import type { Route } from "./+types/_layout.post.$index";
import { getPostResponseSchema } from "@ephemera/shared/api/api_schema";
import { useLoaderData } from "react-router";
import Post from "components/post";

export async function loader({ request, params }: Route.LoaderArgs) {
  const index = params.index;
  const backendHost = NullableHelper.unwrap(process.env.EPHEMERA_BACKEND_HOST);

  const post = getPostResponseSchema.parse(
    await (await fetch(`http://${backendHost}/api/v1/posts/${index}`)).json()
  ).post;

  return {
    post,
  };
}

export default function PostPage() {
  const data = useLoaderData<typeof loader>();

  return (
    <Post post={data.post} />
  );
}