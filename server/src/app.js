import 'dotenv/config';
import http from 'http';
import cors from 'cors';
import express from 'express';
import jwt from 'jsonwebtoken';
import DataLoader from 'dataloader';
import { ApolloServer } from 'apollo-server-express';
import { AuthenticationError } from 'apollo-server';

import schema from './schema';
import resolvers from './resolvers';
import models, { sequelize } from './models';
import loaders from './loaders';

// react ssr related
import React from 'react';
import { renderToString, renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { ApolloProvider, getDataFromTree } from 'react-apollo';

import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory';
import { HttpLink } from 'apollo-link-http'

import path from 'path';
import fetch from 'node-fetch';
import App from '../../client/src/components/App';

const app = express();

const ssrApp = express();

ssrApp.use(express.static(path.resolve( __dirname, "../../client/build/static")));

app.use(cors());

ssrApp.get('/*', (req, res) => {
  const client = new ApolloClient({
    ssrMode: true,
    link: new HttpLink({
        fetch,
        uri: 'http://localhost:8000/graphql'
    }),
    headers: {
        cookie: req.header('Cookie'),
    },
    cache: new InMemoryCache(),
  });

  const context = {};
  const Application = (
      <ApolloProvider client={client}>
          <StaticRouter context={context} location={req.url}>
              <App />
          </StaticRouter>
      </ApolloProvider>
  );

  getDataFromTree(Application).then(() => {
      const content = renderToString(Application);
      const initialState = client.extract();
      const html = <Html content={content} state={initialState} />;

      res.status(200);
      res.send(`<!DOCTYPE html>\n${renderToStaticMarkup(html)}`);
      res.end();
  });
})

const getMe = async req => {
  const token = req.headers['x-token'];

  if (token) {
    try {
      return await jwt.verify(token, process.env.SECRET);
    } catch (e) {
      throw new AuthenticationError(
        'Your session expired. Sign in again.',
      );
    }
  }
};

const server = new ApolloServer({
  typeDefs: schema,
  resolvers,
  formatError: error => {
    const message = error.message
      .replace('SequelizeValidationError: ', '')
      .replace('Validation error: ', '');

    return {
      ...error,
      message,
    };
  },
  context: async ({ req, connection }) => {
    if (connection) {
      return {
        models,
      };
    }

    if (req) {
      const me = await getMe(req);

      return {
        models,
        me,
        secret: process.env.SECRET,
        loaders: {
          user: new DataLoader(keys =>
            loaders.user.batchUsers(keys, models),
          ),
        },
      };
    }
  },
});

server.applyMiddleware({ app, path: '/graphql' });

const httpServer = http.createServer(app);
server.installSubscriptionHandlers(httpServer);

const isTest = !!process.env.TEST_DATABASE;
const isProduction = !!process.env.DATABASE_URL;
const port = process.env.PORT || 8000;

sequelize.sync({ force: isTest || isProduction }).then(async () => {
  if (isTest || isProduction) {
    createUsersWithMessages(new Date());
  }
  
  httpServer.listen(port, () => {
    console.log('Apollo Server on http://localhost:' + port + '/graphql');
  });

  ssrApp.listen(3000, () => {
    console.log('app is running on port 3000!')
  })
});

const createUsersWithMessages = async date => {
  await models.User.create(
    {
      username: 'rwieruch',
      email: 'hello@robin.com',
      password: 'rwieruch',
      role: 'ADMIN',
      messages: [
        {
          text: 'Published the Road to learn React',
          createdAt: date.setSeconds(date.getSeconds() + 1),
        },
      ],
    },
    {
      include: [models.Message],
    },
  );

  await models.User.create(
    {
      username: 'ddavids',
      email: 'hello@david.com',
      password: 'ddavids',
      messages: [
        {
          text: 'Happy to release a GraphQL in React tutorial',
          createdAt: date.setSeconds(date.getSeconds() + 1),
        },
        {
          text: 'A complete React with Apollo and GraphQL Tutorial',
          createdAt: date.setSeconds(date.getSeconds() + 1),
        },
      ],
    },
    {
      include: [models.Message],
    },
  );
};


const Html = ({ content, state }) => {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="theme-color" content="#000000" />
        <link rel="stylesheet" type="text/css" href="/styles.css" />
        <title>React App</title>
      </head>
      <body>
        <noscript>
          You need to enable JavaScript to run this app.
        </noscript>
        <div id="root" dangerouslySetInnerHTML={{ __html: content }}></div>
        <script dangerouslySetInnerHTML={{
            __html: `window.__APOLLO_STATE__=${JSON.stringify(state).replace(/</g, '\\u003c')};`,
        }} />
        <script type="text/javascript" src="./js/main.0354a3c9.js"></script>
      </body>
    </html>
  );
}