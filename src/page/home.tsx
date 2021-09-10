import { Button, Grid, Typography } from "@material-ui/core";
import { TextField } from "@material-ui/core";
import { Container, CssBaseline, makeStyles } from "@material-ui/core";
import React from "react";
import { ApiEndpoint } from "../app";
import { YRemotePlayerComponent } from "../component/YRemotePlayer/YRemotePlayer";

const useStyles = makeStyles((theme) => ({
    paper: {
      marginTop: theme.spacing(8),
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
  }));

type HomeProps = {
    hidden: boolean;
    setTabId: React.Dispatch<React.SetStateAction<number>>;
    setToken: React.Dispatch<React.SetStateAction<string>>;
    playerRef: YRemotePlayerComponent | null;
}

async function submitCreateMeet() {
    const res = await fetch(ApiEndpoint.createMeet, {
        method: "GET"
    });

    return res.json();
}

export default function Home(props: HomeProps) {
    const classess = useStyles();

    const [isOpenJoinMeet, setIsOpenJoinMeet] = React.useState(false);

    const handleClickJoinMeet = () => {
        setIsOpenJoinMeet(true);
    }
    const handleClickBackFromJoinMeet = () => {
        setIsOpenJoinMeet(false);
    }

    const [meetToken, setMeetToken] = React.useState("");
    const handleChangeMeetToken = (event: React.ChangeEvent<HTMLInputElement>) => {
        setMeetToken(event.target.value);
        props.setToken(event.target.value);
    };
    const handleClickJoinMeetSubmit = () => {
        if(props.playerRef == null)
            throw new Error("props.playerRef is null");

        props.setToken(meetToken);
        props.playerRef.connectWebSocket();
        props.setTabId(1);
    };

    const handleClickCreateMeetSubmit = async() => {
        if(props.playerRef == null)
            throw new Error("props.playerRef is null");

        const res: ICreateMeet = await submitCreateMeet();
        props.setToken(res.token);
        props.playerRef.connectWebSocket();
        props.setTabId(1);
    };

    return (
        <div className={classess.paper} hidden={props.hidden}>
            <Typography component="h1" variant="h5">会議をはじめましょう</Typography>
            <div className={classess.form} hidden={isOpenJoinMeet}>
                <Grid container>
                    <Grid item xs={6}>
                        <Button fullWidth color="primary" className={classess.submit} onClick={handleClickJoinMeet}>会議に参加する</Button>
                    </Grid>
                    <Grid item xs={6}>
                        <Button fullWidth color="primary" className={classess.submit} onClick={handleClickCreateMeetSubmit}>会議を作成する</Button>
                    </Grid>
                </Grid>
            </div>
            <div className={classess.form} hidden={!isOpenJoinMeet}>
                <Grid container>
                    <Grid item xs={12}>
                        <TextField label="会議トークン" fullWidth value={meetToken} onChange={handleChangeMeetToken}></TextField>
                    </Grid>
                    <Grid item xs={12}>
                        <Button fullWidth color="primary" className={classess.submit} onClick={handleClickBackFromJoinMeet}>戻る</Button>
                        <Button fullWidth color="primary" className={classess.submit} onClick={handleClickJoinMeetSubmit}>参加する</Button>
                    </Grid>
                </Grid>
            </div>
        </div>
    );
}