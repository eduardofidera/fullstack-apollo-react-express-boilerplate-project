import React from 'react';

import { Switch, Route } from "react-router-dom";

import Navigation from '../Navigation';
import LandingPage from '../Landing';
import SignUpPage from '../SignUp';
import SignInPage from '../SignIn';
import AccountPage from '../Account';
import AdminPage from '../Admin';
import withSession from '../Session/withSession';

import * as routes from '../../constants/routes';

const App = ({ session, refetch }) => (
    <div>
      <Navigation session={session} />

      <hr />

      <Switch>
        <Route
          exact
          path={routes.LANDING}
          component={() => <LandingPage />}
        />
        <Route
          exact
          path={routes.SIGN_UP}
          component={() => <SignUpPage refetch={refetch} />}
        />
        <Route
          exact
          path={routes.SIGN_IN}
          component={() => <SignInPage refetch={refetch} />}
        />
        <Route
          exact
          path={routes.ACCOUNT}
          component={() => <AccountPage />}
        />
        <Route
          exact
          path={routes.ADMIN}
          component={() => <AdminPage />}
        />

      </Switch>
    </div>
);

export default withSession(App);
