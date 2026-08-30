/**
 * TourState — estado del recorrido.
 *
 * Contiene únicamente los datos necesarios para guardar y restaurar
 * la posición y orientación del visitante.
 *
 * No conoce PlayCanvas ni el DOM.
 */
export class TourState {

    constructor({
        distance = 0,
        yaw = 0,
        pitch = 0,
        eyeHeight = 0
    } = {}) {
        this.distance = distance;
        this.yaw = yaw;
        this.pitch = pitch;
        this.eyeHeight = eyeHeight;
    }

    getState() {
        return {
            distance: this.distance,
            yaw: this.yaw,
            pitch: this.pitch,
            eyeHeight: this.eyeHeight
        };
    }

    setState({
        distance = 0,
        yaw = 0,
        pitch = 0,
        eyeHeight = 0
    } = {}) {
        this.distance = distance;
        this.yaw = yaw;
        this.pitch = pitch;
        this.eyeHeight = eyeHeight;
    }
}