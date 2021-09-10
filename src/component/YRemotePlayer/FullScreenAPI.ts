

export class FullScreenAPI {
    static isCurrent() {
        return (document.fullscreenElement) ? true : false;
    }

    static getChangeEventName() {
        if(document.fullscreenEnabled) {
            return "fullscreenchange";
        }

        return null;
    }

    /**
     * FullScreen要求
     * @param {HTMLElement} element
     */
    static request(element: HTMLElement) {
        if(document.fullscreenEnabled) {
            element.requestFullscreen();
        }
    }
    /**
     * FullScreen解除
     */

    static exit() {
        if(!FullScreenAPI.isCurrent()) return true;

        if(document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}