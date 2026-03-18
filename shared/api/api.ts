export type Version = 0;
export type Author = string;
/**
 * Unix timestamp in milliseconds.
 */
export type Timestamp = number;
export type Host = string;
export type Hash = string;
export type ContentType = string;

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

export type ServerVersion = 0;

export type ServerSignalHeader = [
  Host, // host
  Timestamp, // created_at
  string // type
];

export type ServerSignalBody = unknown;

export type ServerSignalFooter = unknown;

export type ServerSignalPayload = [
  ServerVersion, // version
  ServerSignalHeader, // header
  ServerSignalBody, // body
  ServerSignalFooter // footer
];

export type ServerSignal = [
  ServerSignalPayload, // payload
  string // signature
];

//
// Attachments
//

export type Attachment = [
  'attachment', // footer_type
  ContentType, // type
  Hash, // id
];

//
// create_post signal
//

export type CreatePostSignalHeader = [
  Host, // host
  Author, // author
  Timestamp, // created_at
  'create_post' // type
];

export type CreatePostSignalBody = string;

export type CreatePostSignalFooter = Attachment[];

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
// delete_post signal
//

export type DeletePostSignalHeader = [
  Host, // host
  Author, // author
  Timestamp, // created_at
  'delete_post' // type
];

export type DeletePostSignalBody = [
  Hash // post_id
];

export type DeletePostSignalFooter = [];

export type DeletePostSignalPayload = [
  Version, // version
  DeletePostSignalHeader, // header
  DeletePostSignalBody, // body
  DeletePostSignalFooter // footer
];

export type DeletePostSignal = [
  DeletePostSignalPayload, // payload
  string // signature
];

//
// relay signal
//

export type RelaySignalHeader = [
  Host, // host
  Timestamp, // created_at
  'relay' // type
];

export type RelaySignalBody = Signal;

export type RelaySignalFooter = [];

export type RelaySignalPayload = [
  Version, // version
  RelaySignalHeader, // header
  RelaySignalBody, // body
  RelaySignalFooter // footer
];

export type RelaySignal = [
  RelaySignalPayload, // payload
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
  author?: string;
}

export interface GetPostsResponse extends ApiResponse {
  posts: CreatePostSignal[];
  nextCursor: string | null;
}

// DELETE /api/v1/post
export interface DeletePostRequest extends ApiRequest {
  post: DeletePostSignal;
}

export interface DeletePostResponse extends ApiResponse {
}

// GET /api/v1/peer
export interface GetPeerRequest extends ApiRequest {
}

export interface PeerManifest {
  implementation: {
    name: string;
    version: string;
  };
  host: string;
  publicKey: string;
}

export interface GetPeerResponse extends ApiResponse, PeerManifest {
}