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

export type CreatePostSignalPayload = [
  Version, // version
  Host, // host
  Author, // author
  Timestamp, // created_at
  'create_post', // type
  [string] // body
];

export type PostSignal = [
  Hash, // payloadHash
  CreatePostSignalPayload, // payload
  string // payloadSignature
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