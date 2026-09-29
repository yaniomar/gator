# Gator

Gator is a TypeScript CLI RSS feed aggregator.

It allows multiple local users to:

- Register and log in
- Add RSS feeds
- Follow and unfollow feeds
- Aggregate RSS posts into PostgreSQL
- Browse recent posts from followed feeds
- Run a long-running feed aggregation loop

## Requirements

To run Gator, you need:

- Node.js 22.15.0
- npm
- PostgreSQL
- A local PostgreSQL database
- Git

This project uses:

- TypeScript
- Drizzle ORM
- PostgreSQL
- fast-xml-parser
- tsx

## Setup

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/gator.git
cd gator
