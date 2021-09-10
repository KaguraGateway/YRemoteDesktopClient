import { Button, Grid, Typography } from "@material-ui/core";
import { TextField } from "@material-ui/core";
import { Container, CssBaseline, makeStyles } from "@material-ui/core";
import React from "react";
import ReactDOM from "react-dom";
import {YRemotePlayerComponent} from "./component/YRemotePlayer/YRemotePlayer";
import Home from "./page/home";
import Meet from "./page/meet";
import * as Sentry from "@sentry/react";

Sentry.init({
    dsn: "https://1bd1ba73c3aa4a339912d60162ecebc8@o286165.ingest.sentry.io/5835104",
});

const isDev = process.env.NODE_ENV === "development";
export const ApiEndpoint = {
    ws: (isDev ? "ws://localhost:8000/" : "wss://remote.aikaserver.jp/api/v1/ws"),
    createMeet: (isDev ? "http://localhost:8000/api/v1/createMeet" : "https://remote.aikaserver.jp/api/v1/createMeet")
};


const useStyles = makeStyles((theme) => ({
    paper: {
      marginTop: theme.spacing(8),
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    },
    avatar: {
      margin: theme.spacing(1),
      backgroundColor: theme.palette.secondary.main,
    },
    form: {
      width: '100%', // Fix IE 11 issue.
      marginTop: theme.spacing(3),
    },
    submit: {
      margin: theme.spacing(3, 0, 2),
    },
  }));

export default function App() {
    const classess = useStyles();

    const [tabId, setTabId] = React.useState(0);
    const [token, setToken] = React.useState("");
    const [remotePlayerRef, setRemotePlayerRef] = React.useState<YRemotePlayerComponent | null>(null);

    return (
        <Container component="main" maxWidth="xs">
            <CssBaseline></CssBaseline>
            <Home setTabId={setTabId} setToken={setToken} hidden={tabId !== 0} playerRef={remotePlayerRef}></Home>
            <Meet setTabId={setTabId} token={token} hidden={tabId !== 1} setPlayerRef={(ref: YRemotePlayerComponent) => {setRemotePlayerRef(ref);}}></Meet>
        </Container>
    );
}

ReactDOM.render(<App></App>, document.getElementById("root"));