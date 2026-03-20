# Ephemera

**Ephemera** is a PKI-oriented distributed bulletin board system.

## Features

- PKI-based user identity and post signing
- Cross-server timeline with image and video attachments
- Easy self-hosting with Docker

## Quick Start

### Requirements

- [Docker](https://www.docker.com/)

### Setup

Run interactive setup script:

```sh
docker compose run --build --rm manager -e /app/.env
```

This command creates and saves your configuration in `.env`.

### Start the server

```sh
docker compose up -d --build
```

### Stop the Server

```sh
docker compose down
```

## License

MIT License