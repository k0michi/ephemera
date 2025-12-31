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

export type CreatePostSignal = [
  CreatePostSignalPayload, // payload
  string // signature
];

//
// Client
//

export interface ExportedKeyPair {
  publicKey: string;
  privateKey: string;
}

//
// API requests and responses
//

export type ApiRequest = {};

export interface ApiResponse {
  error?: string;
}

// POST /api/v1/post
export interface PostRequest extends ApiRequest {
  post: CreatePostSignal;
}

export interface PostResponse extends ApiResponse {
}

// GET /api/v1/posts
export interface GetPostsRequest extends ApiRequest {
  cursor?: string;
  limit?: string;
}

export interface GetPostsResponse extends ApiResponse {
  posts: CreatePostSignal[];
  nextCursor: string | null;
}