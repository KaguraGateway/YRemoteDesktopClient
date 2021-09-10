import { CircularProgress, IconButton, makeStyles, TextField } from "@material-ui/core";
import PropTypes from 'prop-types';
import { Theme } from '@material-ui/core/styles';
import React from "react";
import ComputerIcon from '@material-ui/icons/Computer';
import FullscreenIcon from '@material-ui/icons/Fullscreen';
import FullscreenExitIcon from '@material-ui/icons/FullscreenExit';
import CallEndIcon from '@material-ui/icons/CallEnd';
import { Typography } from "@material-ui/core";
import clsx from "clsx";
import { FullScreenAPI } from "./FullScreenAPI";
import withStyles, { StyledComponentProps, StyleRules, WithStyles } from "@material-ui/styles/withStyles";
import { createStyles } from "@material-ui/styles";
import { ApiEndpoint } from "../../app";
import VolumeUpIcon from '@material-ui/icons/VolumeUp';
import VolumeOffIcon from '@material-ui/icons/VolumeOff';
import * as ebml from "ts-ebml";


// デコーダを生成
const EbmlDecorder = new ebml.Decoder();

// スタイル
const styles = (theme: Theme) : StyleRules => createStyles({
    remotePlayerContainer: {
        width: "100%",
        height: "100%",
        display: "block"
    },
    html5VideoPlayer: {
        width: "100%",
        height: "100%",
        position: "relative"
    },
    html5VideoContainer: {
        widht: "100%",
        height: "100%",
    },
    html5MainPlayer: {
        width: "100%",
        height: "100%",
    },
    html5PlayerControllerContainer: {
        position: "absolute",
        bottom: 0,
        width: "100%",
        height: "100px",
        opacity: 0
    },
    html5PlayerController: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center"
    },
    html5PlayerControllerBtns: {
        display: "flex",
        flexDirection: "row"
    },
    controllerBtn: {
        background: "#9090f6",
        padding: "24px",
        '&:not(:last-child)': {
            marginRight: "12px"
        }
    },
    infoContainer: {
        position: "absolute",
        top: 0,
        right: 0,
        width: "300px",
        height: "300px",
        margin: "12px",
        background: "rgba(0, 0, 0, 0.6)",
        color: "#fff",
        opacity: 0
    },
    infoInner: {
        padding: "8px"
    },
    infoWrap: {
        '&:not(:last-child)': {
            marginBottom: "4px"
        }
    },
    circularContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        display: "flex",
        width: "100%",
        height: "100%",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center"
    },
    circularInner: {
        display: "flex",
        flexDirection: "row"
    },
    onHover: {
        opacity: 1,
        transition: "opacity .1s cubic-bezier(0.4,0,1,1)"
    }
});


interface YRemotePlayerProps extends WithStyles<typeof styles> {
    token: string;
    setPlayerRef: (ref: YRemotePlayerComponent) => void
}
interface YRemotePlayerState {
    videoSrc: string;
    isEndedLoading: boolean;
    isFullScreen: boolean;
    isHover: boolean;
    videoWidth: number;
    videoHeight: number;
    isMuted: boolean;
    connectionLatency: number;
}

export class YRemotePlayerComponent extends React.Component<YRemotePlayerProps, YRemotePlayerState> {
    ws: WebSocket | null = null;
    mediaSource: MediaSource | null = null;
    sourceBuffer: SourceBuffer | null = null;
    isOpenWebSocket = false;
    mediaStream: MediaStream | null = null;
    mediaRecorder: any = null;
    autoHideTimer: NodeJS.Timeout | null = null;
    playerContainerRef: React.RefObject<HTMLDivElement>;
    playerVideoRef: React.RefObject<HTMLVideoElement>;
    // 最後にPINGした時間
    lastPingSentTime: number = 0;
    // 初期化セグメントを読み込んでいるか
    isLoadedInitSegment = false;
    /** Bufferの更新更新中か */
    isBufferUpdating = false;

    /** バッファする時間（ms） */
    bufferScale = 250;

    constructor(props: YRemotePlayerProps) {
        super(props);

        this.props.setPlayerRef(this);

        this.playerVideoRef = React.createRef<HTMLVideoElement>();
        this.playerContainerRef = React.createRef<HTMLDivElement>();

        this.state = {
            videoSrc: "",
            isEndedLoading: false,
            isFullScreen: false,
            isHover: false,
            videoWidth: 0,
            videoHeight: 0,
            isMuted: false,
            connectionLatency: 0
        }
    }

    appendBuffer(buffer: ArrayBuffer) {
        // NULLチェック
        if(this.sourceBuffer == null)
            throw new Error("SourceBuffer is null.");

        // 追加中なら再追加を15ミリ秒後に試す
        if(this.isBufferUpdating) {
            // 15ミリ秒待つ
            setTimeout(() => this.appendBuffer(buffer), 15);
            return;
        }

        // セグメント追加中に
        this.isBufferUpdating = true;

        // セグメント追加
        try {
            this.sourceBuffer.appendBuffer(new Uint8Array(buffer));
        } catch(e) {
            console.error(e);
        }

        // 追加完了
        this.isBufferUpdating = false;
    }

    connectWebSocket() {
        // まだ開いてるなら閉じる
        if (this.ws != null && this.ws.readyState === WebSocket.OPEN)
            this.ws.close();

        // WebSocketを開く
        const tempWs = new WebSocket(ApiEndpoint.ws);
        // バイナリ設定
        tempWs.binaryType = "arraybuffer";

        // WebSocketが開かれた
        tempWs.addEventListener("open", () => {
            console.log("open");
            this.isOpenWebSocket = true;
            this.ws = tempWs;

            // PINGを送信する
            this.ping();

            // MediaSourceを準備
            this.initMediaSource();
            // 参加リクエストを送る
            this.sendWebSocket(JSON.stringify({
                "op": 1,
                "token": this.props.token
            }));

            // PINGインターバル
            const pingInterval = setInterval(() => {
                if(this.ws == null || this.ws.readyState !== WebSocket.OPEN) {
                    clearInterval(pingInterval);
                    return;
                }

                // PINGを送信する
                this.ping();
            }, 10000);
        });
        // Serverからメッセージが来た
        tempWs.addEventListener("message", (event) => {
            //console.log(event);

            // 文字列
            if (typeof event.data === "string") {
                try {
                    const obj = JSON.parse(event.data);

                    switch (obj.op) {
                        case 2:
                            // State変更
                            this.setState({isEndedLoading: true});
                            break;
                        // PONG
                        case 7:
                            this.setState({
                                connectionLatency: (new Date()).getTime() - this.lastPingSentTime
                            });
                            break;
                    }
                } catch (e) {
                    console.log(e);
                }
            } else {
                if (this.sourceBuffer != null) {
                    // まだ初期化セグメントが読み込まれていない場合
                    if(!this.isLoadedInitSegment) {
                        // 初期化セグメントか解析
                        const ebmlElm = EbmlDecorder.decode(event.data);
                        if(ebmlElm.length > 0)
                            console.log(ebmlElm[0].name);
                        // 解析
                        if(ebmlElm.length > 0 && ebmlElm[0] != null && ebmlElm[0].name === "EBML") {
                            // 初期化済みに
                            this.isLoadedInitSegment = true;
                            // 初期化した
                            this.sendWebSocket(JSON.stringify({"op": 5}));
                        }
                        // 初期化セグメントじゃなかった
                        else {
                            return;
                        }
                    }

                    // セグメントを追加する
                    this.appendBuffer(event.data);

                    console.log(`[buffered] ${this.sourceBuffer.buffered}`);
                    if(this.sourceBuffer.buffered.length > 0) {
                        console.log(`[buffered.start] ${this.sourceBuffer.buffered.start(this.sourceBuffer.buffered.length - 1)}`);
                        console.log(`[buffered.end] ${this.sourceBuffer.buffered.end(this.sourceBuffer.buffered.length - 1)}`);
                    }
                    console.log(`[buffered.length] ${this.sourceBuffer.buffered.length}`);
                }
            }
        });
        // WebSocketが閉じられた
        tempWs.addEventListener("close", (e) => {
            console.log(e);
            this.isOpenWebSocket = false;
        });
    }

    private ping() {
        if(this.ws != null && this.ws.readyState === WebSocket.OPEN) {
            this.lastPingSentTime = (new Date()).getTime();
            this.sendWebSocket(JSON.stringify({"op": 6}));
        }
    }

    private sendWebSocket(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
        if(this.ws != null && this.ws.readyState === WebSocket.OPEN)
            this.ws.send(data);
    }

    private closeWebSocket() {
        if(this.ws != null && this.ws.readyState === WebSocket.OPEN)
            this.ws.close();
        if(this.mediaRecorder != null)
            this.mediaRecorder.stop();
    }


    private initMediaSource() {
        // MediaSourceを生成
        this.mediaSource = new MediaSource();
        // VideoURLをセット
        this.setState({videoSrc: window.URL.createObjectURL(this.mediaSource)});

        const handleOpenSource = () => {
            if(this.mediaSource == null)
                throw new Error("this.mediaSource is null");

            this.mediaSource.removeEventListener("sourceopen", handleOpenSource);
            // ソースBufferを追加
            this.sourceBuffer = this.mediaSource.addSourceBuffer("video/webm; codecs=vp9,opus");

            // イベント
            // this.sourceBuffer.addEventListener("updateend", () => {
            //     this.isBufferUpdating = false;
            // });
            // this.sourceBuffer.addEventListener("updatestart", () => {
            //     this.isBufferUpdating = true;
            // });
        }
        // ソースオープンまで待つ
        this.mediaSource.addEventListener("sourceopen", handleOpenSource);
    }



    private async handleClickShareBtn() {
        ///@ts-ignore
        navigator.mediaDevices.getDisplayMedia({ video: { width: 1920, height: 1080, frameRate: 60 }, audio: {sampleSize: {ideal: 24}, sampleRate: {ideal: 48000},  channelCount: {ideal: 2}, autoGainControl: false, noiseSuppression: false, echoCancellation: false} })
            .then((stream: MediaStream) => {
                this.mediaStream = stream;

                // @ts-ignore
                this.mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm; codecs=vp9,opus", audioBitsPerSecond: 128000, videoBitsPerSecond : 5000000 });

                this.mediaRecorder.addEventListener("dataavailable", async (event: any) => {
                    //console.log(event);
                    // WebSocketで送る
                    this.sendWebSocket(new Uint8Array(await event.data.arrayBuffer()));
                });

                this.mediaRecorder.start(this.bufferScale);
            });
    };
    private handleClickFullScreen() {
        if (this.playerContainerRef.current != null)
            FullScreenAPI.request(this.playerContainerRef.current);
    };
    private handleClickEndFullScreen() {
        FullScreenAPI.exit();
    };
    private handleClickEndRemote() {
        this.closeWebSocket();
    };
    private handleClickVolumeOn() {
        if(this.playerVideoRef.current != null) {
            this.playerVideoRef.current.muted = false;

            this.setState({
                isMuted: this.playerVideoRef.current.muted
            });
        }
    }
    private handleClickVolumeOff() {
        if(this.playerVideoRef.current != null) {
            this.playerVideoRef.current.muted = true;

            this.setState({
                isMuted: this.playerVideoRef.current.muted
            });
        }
    }

    private onMouseMove() {
        // 表示
        this.setState({ isHover: true });
        // タイマー解除
        if(this.autoHideTimer != null) {
            clearTimeout(this.autoHideTimer);
        }
        // タイマー開始
        this.autoHideTimer = setTimeout(() => {
            this.setState({ isHover: false });
        }, 5000);
    }

    componentDidMount() {
        document.addEventListener("fullscreenchange", () => {
            if(document.fullscreenElement) {
                this.setState({isFullScreen: true});
            } else {
                this.setState({isFullScreen: false});
            }
        });
    }

    private onVideoWaiting() {
        if(this.sourceBuffer == null || this.playerVideoRef.current == null || this.sourceBuffer.buffered.length <= 0)
            return;

        if(this.sourceBuffer.buffered.end(this.sourceBuffer.buffered.length - 1) - this.playerVideoRef.current.currentTime > 5) {
            this.playerVideoRef.current.currentTime = this.sourceBuffer.buffered.start(this.sourceBuffer.buffered.length - 1);
        }
    }

    private onLoadedMetaData() {
        if(this.playerVideoRef.current == null)
            return;

        this.setState({
            videoWidth: this.playerVideoRef.current.videoWidth,
            videoHeight: this.playerVideoRef.current.videoHeight
        });
    }

    render() {
        const {classes} = this.props;

        return (
            <div className={classes.remotePlayerContainer} onMouseMove={this.onMouseMove.bind(this)} ref={this.playerContainerRef}>
                <div className={classes.html5VideoPlayer}>
                    <div className={classes.html5VideoContainer}>
                        <video autoPlay preload="auto" className={classes.html5MainPlayer} id="watchPlayer" src={this.state.videoSrc}
                            ref={this.playerVideoRef}
                            onLoadedMetadata={this.onLoadedMetaData.bind(this)}
                            onWaiting={this.onVideoWaiting.bind(this)}
                        ></video>
                    </div>
                    <div className={clsx(classes.infoContainer, { [classes.onHover]: this.state.isHover })}>
                        <div className={clsx(classes.infoInner)}>
                            <div className={classes.infoWrap}>
                                <Typography component="h3" variant="body1">会議トークン</Typography>
                                <Typography component="span" variant="body1">{this.props.token}</Typography>
                            </div>
                            <div className={classes.infoWrap}>
                                <Typography component="h3" variant="body1">解像度</Typography>
                                <Typography component="span" variant="body1">{`${this.state.videoWidth}x${this.state.videoHeight}`}</Typography>
                            </div>
                            <div className={classes.infoWrap}>
                                <Typography component="h3" variant="body1">接続遅延</Typography>
                                <Typography component="span" variant="body1">{`${this.state.connectionLatency}`} ms</Typography>
                            </div>
                            <div className={classes.infoWrap}>
                                <Typography component="h3" variant="body1">バッファ</Typography>
                                <TextField onChange={(e) => {
                                    if(e.target.value != null && !isNaN(Number(e.target.value))) {
                                        this.bufferScale = Number(e.target.value);
                                        console.log(this.bufferScale);
                                    }
                                }}></TextField>
                            </div>
                        </div>
                    </div>
                    <div className={classes.circularContainer} style={{display: (this.state.isEndedLoading ? "none" : "")}}>
                        <div className={classes.circularInner}>
                            <CircularProgress />
                        </div>
                    </div>
                    <div className={clsx(classes.html5PlayerControllerContainer, { [classes.onHover]: this.state.isHover })}>
                        <div className={classes.html5PlayerController}>
                            <div className={classes.html5PlayerControllerBtns}>
                                <IconButton className={classes.controllerBtn} onClick={this.handleClickShareBtn.bind(this)}>
                                    <ComputerIcon></ComputerIcon>
                                </IconButton>
                                <IconButton className={classes.controllerBtn} onClick={this.handleClickFullScreen.bind(this)} style={{display: (this.state.isFullScreen ? "none": "")}}>
                                    <FullscreenIcon></FullscreenIcon>
                                </IconButton>
                                <IconButton className={classes.controllerBtn} onClick={this.handleClickEndFullScreen.bind(this)} style={{display: (this.state.isFullScreen ? "": "none")}}>
                                    <FullscreenExitIcon></FullscreenExitIcon>
                                </IconButton>
                                <IconButton className={classes.controllerBtn} onClick={this.handleClickVolumeOff.bind(this)} style={{display: (this.state.isMuted ? "none": "")}}>
                                    <VolumeUpIcon></VolumeUpIcon>
                                </IconButton>
                                <IconButton className={classes.controllerBtn} onClick={this.handleClickVolumeOn.bind(this)} style={{display: (this.state.isMuted ? "": "none")}}>
                                    <VolumeOffIcon></VolumeOffIcon>
                                </IconButton>
                                <IconButton className={classes.controllerBtn} onClick={this.handleClickEndRemote.bind(this)}>
                                    <CallEndIcon></CallEndIcon>
                                </IconButton>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default withStyles(styles)(YRemotePlayerComponent);