# MML Playground

This project implements a minimal 3d 'playground' powered by
[MML (Metaverse Markup Language)](https://mml.io/). It serves as a great starting point to create
your own end-to-end live, multiplayer experience using the the unique, real-time nature of MML.

It can be easily deployed to environments that support Node.js and expose ports to the internet.

<img src="https://raw.githubusercontent.com/mml-io/mml-playground/main/Playground.png">

## Main features

- Multiple players can connect to the playground and interact with it in real time.

- The MML-based playground showcases example MML documents in the defined slots.

- Players can showcase their own MML creations by adding them via their WebSocket URL to any
  available slots on the playground.

- Players can interact with any of the showcased documents simultaneously.

- It's very easy to deploy and get started with.

## Project structure:

The project is broken down into four independent packages.

- `server`: creates the main server which serves the page and handles all WebSocket connections.
  Additionally, it runs the main MML document, `playground.html`, and all documents within the
  `examples` directory.

- `web`: implements the browser-based 3d experience by utilizing the `core` package.

- `core`: includes all common functionality such as controlling the character, composing the whole
  scene and managing rendering.

- `character-network`: provides an implementation of a WebSocket server that synchronizes character
  positions across all connected clients.

## Adding more MML documents

The `server/examples` directory contains the MML documents that are loaded in the playground by
default.

To add a new example, simply create a new HTML file, such as `new-example.html` inside the
`examples` directory. The server will automatically detect it and make it available at
`ws://localhost:8080/examples/new-example.html`. You can then copy this WebSocket URL and add it to
a free slot.

## Run on CodeSandbox

Click the button below to create a new sandbox on CodeSandbox.io.

[![Edit mml-playground on CodeSandbox](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/p/sandbox/4zf432)

Once your sandbox is initialized, select the 'start: 8080' tab to view the running playground.

## Running locally

Making sure you have Node.js installed, run the following from the root of the repository:

```bash
npm install
npm run iterate
```

Once the server is running, open `http://localhost:8080` in your browser.
