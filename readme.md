# Ephemera

**Ephemera** is a bulletin board system powered by PKI (Public Key Infrastructure).

## Quick Start

### Requirements

- [Docker](https://www.docker.com/)

### Setup

1. Open `docker-compose.yml` and set `EPHEMERA_HOST` to your hostname or IP address:

```yaml
environment:
  - EPHEMERA_HOST=your-host.example.com
```

### Start the Application

```sh
docker compose up -d --build
```

## License

MIT License