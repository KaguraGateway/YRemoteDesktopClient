import { Button, Grid, Typography } from "@material-ui/core";
import { TextField } from "@material-ui/core";
import { Container, CssBaseline, makeStyles } from "@material-ui/core";
import React from "react";
import YRemotePlayer, {YRemotePlayerComponent} from "../component/YRemotePlayer/YRemotePlayer";

const useStyles = makeStyles((theme) => ({
    paper: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      '&[hidden]': {
          display: "none"
      }
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
    playerContainer: {
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
    }
  }));


interface MeetProps {
    hidden: boolean;
    token: string;
    setTabId: React.Dispatch<React.SetStateAction<number>>;
    setPlayerRef: (ref: YRemotePlayerComponent) => void;
}

export default function Meet(props: MeetProps) {
    const classess = useStyles();

    return (
        <div className={classess.paper} hidden={props.hidden}>
            <div className={classess.playerContainer}>
                <YRemotePlayer token={props.token} setPlayerRef={props.setPlayerRef}></YRemotePlayer>
            </div>
        </div>
    );
}