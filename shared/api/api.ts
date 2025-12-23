export interface ApiRequest {
}

export interface ApiResponse {
  error?: string;
}

export type Version = 0;
export type Author = string;
export type Timestamp = string;
export type Host = string;
export type Hash = string;
export type ContentType = string;
export type Dimension = {
  width: number;
  height: number;
};

export type SignalPayload<Header, Body, Footer> = [
  Version, // version
  Header, // header
  Body, // body
  Footer // footer
];

export type Signal<Payload> = [
  Payload, // payload
  string // signature
];

export type CreatePostSignalHeader = [
  Host, // host
  Author, // author
  Timestamp, // created_at
  'create_post' // type
];

export type CreatePostSignalBody = string;

export type CreatePostSignalFooter = [];

export type CreatePostSignalPayload = SignalPayload<
  CreatePostSignalHeader,
  CreatePostSignalBody,
  CreatePostSignalFooter
>;

export type PostSignal = [
  CreatePostSignalPayload, // payload
  string // signature
];

// POST /api/v1/post
export interface PostRequest extends ApiRequest {
  post: PostSignal;
}

export interface PostResponse extends ApiResponse {
}

// GET /api/v1/posts
export interface GetPostsRequest extends ApiRequest {
}

export interface GetPostsResponse extends ApiResponse {
  posts: PostSignal[];
}