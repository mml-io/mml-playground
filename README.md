# MML Playground

This project implements a minimal 3d 'playground' powered by
[MML (Metaverse Markup Language)](https://mml.io/) and the [(MML) 3D Web Experience](https://github.com/mml-io/3d-web-experience) project. It serves as a great starting point to create
your own end-to-end live, multiplayer experience using the the unique, real-time nature of MML.

It can be easily deployed to environments that support Node.js and expose ports to the internet.

<img src="https://raw.githubusercontent.com/mml-io/mml-playground/main/Playground.png">

## Main features

- Multiple players can connect to the playground and interact with it in real time.

- The MML-based playground showcases example MML documents in the defined slots.

- Players can showcase their own MML creations by adding them via their WebSocket URL to any
  available slots on the playground.

- Players can interact with any of the showcased documents simultaneously.

## Project structure:

The project contains the following packages:

- [`server`](./packages/server): an ExpressJS server which serves the page and handles all WebSocket connections using the `@mml-io/3d-web-experience-server` package from [(MML) 3D Web Experience](https://github.com/mml-io/3d-web-experience).
  - Additionally, it runs the main MML document, `playground.html`, and all documents within the
  [`server/examples`](./packages/server/examples) directory.
- [`web-client`](./packages/web-client): implements the browser-based 3d experience by using the `@mml-io/3d-web-experience-client` package from [(MML) 3D Web Experience](https://github.com/mml-io/3d-web-experience).

## Adding more MML documents

The [`server/examples`](./packages/server/examples) directory contains the MML documents that are loaded in the playground by
default.

To add a new example, simply create a new HTML file, such as `new-example.html` inside the
`examples` directory. The server will automatically detect it and make it available at
`ws://localhost:8080/examples/new-example.html`. You can then copy this WebSocket URL and add it to
a free slot.

## Run on CodeSandbox

Click the button below to create a new sandbox on CodeSandbox.io (It might take a minute or two to install dependencies).

[![Edit mml-playground on CodeSandbox](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/p/github/mml-io/mml-playground)

## Running locally

Making sure you have Node.js installed, run the following from the root of the repository:

```bash
npm install
npm run iterate
```

Once the server is running, open `http://localhost:8080` in your browser.
