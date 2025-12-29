export type ApiRequest = {};

export interface ApiResponse {
  error?: string;
}

export type Version = 0;
export type Author = string;
/**
 * Unix timestamp in milliseconds.
 */
export type Timestamp = number;
export type Host = string;
export type Hash = string;
export type ContentType = string;
export type Dimension = {
  width: number;
  height: number;
};

export type SignalHeader = [
  Host, // host
  Author, // author
  Timestamp, // created_at
  string // type
];

export type SignalBody = unknown;

export type SignalFooter = unknown;

export type SignalPayload = [
  Version, // version
  SignalHeader, // header
  SignalBody, // body
  SignalFooter // footer
];

export type Signal = [
  SignalPayload, // payload
  string // signature
];

// create_post signal

export type CreatePostSignalHeader = [
  Host, // host
  Author, // author
  Timestamp, // created_at
  'create_post' // type
];

export type CreatePostSignalBody = string;

export type CreatePostSignalFooter = [];

export type CreatePostSignalPayload = [
  Version, // version
  CreatePostSignalHeader, // header
  CreatePostSignalBody, // body
  CreatePostSignalFooter // footer
];

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
  cursor: string | null;
  limit?: number;
}

export interface GetPostsResponse extends ApiResponse {
  posts: PostSignal[];
  cursor: string | null;
}