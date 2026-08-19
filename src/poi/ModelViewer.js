import {
    Application,
    Asset,
    Entity,
    Color,
    FILLMODE_FILL_WINDOW,
    RESOLUTION_AUTO
} from 'playcanvas';

export class ModelViewer {
    constructor(container) {
        this.container = container;
        this.app = null;
        this.camera = null;
        this.entity = null;
        this.asset = null;

        this.rotationY = 0;
        this.rotationX = 0;
        this.distance = 3;

        this.dragging = false;
        this.lastX = 0;
        this.lastY = 0;

        this._pointerDown = this._pointerDown.bind(this);
        this._pointerMove = this._pointerMove.bind(this);
        this._pointerUp = this._pointerUp.bind(this);
        this._wheel = this._wheel.bind(this);
    }

    async load(url) {
        this.container.innerHTML = '';

        const canvas = document.createElement('canvas');
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.display = 'block';
        canvas.style.touchAction = 'none';

        this.container.appendChild(canvas);

        this.app = new Application(canvas, {
            graphicsDeviceOptions: {
                antialias: true,
                alpha: true
            }
        });

        this.app.setCanvasFillMode(FILLMODE_FILL_WINDOW);
        this.app.setCanvasResolution(RESOLUTION_AUTO);
        this.app.start();

        this.app.scene.ambientLight = new Color(0.8, 0.8, 0.8);

        this.camera = new Entity('poi-camera');
        this.camera.addComponent('camera', {
            clearColor: new Color(0.05, 0.05, 0.05)
        });

        this.camera.setPosition(0, 0, this.distance);
        this.app.root.addChild(this.camera);

        return new Promise((resolve, reject) => {
            this.asset = new Asset(
                'poi-model',
                'container',
                { url }
            );

            this.app.assets.add(this.asset);

            this.asset.ready((asset) => {
                try {
                    this.entity = asset.resource.instantiateRenderEntity();

                    this.entity.setLocalPosition(0, 0, 0);
                    this.entity.setLocalEulerAngles(
                        this.rotationX,
                        this.rotationY,
                        0
                    );

                    this.app.root.addChild(this.entity);

                    this._bindEvents();

                    resolve(this.entity);
                } catch (error) {
                    reject(error);
                }
            });

            this.asset.on('error', (error) => {
                reject(error);
            });

            this.app.assets.load(this.asset);
        });
    }

    _bindEvents() {
        this.container.addEventListener(
            'pointerdown',
            this._pointerDown
        );

        window.addEventListener(
            'pointermove',
            this._pointerMove
        );

        window.addEventListener(
            'pointerup',
            this._pointerUp
        );

        this.container.addEventListener(
            'wheel',
            this._wheel,
            { passive: false }
        );
    }

    _pointerDown(event) {
        this.dragging = true;
        this.lastX = event.clientX;
        this.lastY = event.clientY;

        this.container.setPointerCapture?.(event.pointerId);
    }

    _pointerMove(event) {
        if (!this.dragging || !this.entity) return;

        const dx = event.clientX - this.lastX;
        const dy = event.clientY - this.lastY;

        this.rotationY += dx * 0.7;
        this.rotationX += dy * 0.3;

        this.rotationX = Math.max(
            -80,
            Math.min(80, this.rotationX)
        );

        this.entity.setLocalEulerAngles(
            this.rotationX,
            this.rotationY,
            0
        );

        this.lastX = event.clientX;
        this.lastY = event.clientY;
    }

    _pointerUp() {
        this.dragging = false;
    }

    _wheel(event) {
        event.preventDefault();

        this.distance += event.deltaY * 0.002;

        this.distance = Math.max(
            1.5,
            Math.min(6, this.distance)
        );

        if (this.camera) {
            this.camera.setPosition(
                0,
                0,
                this.distance
            );
        }
    }

    destroy() {
        this.container.removeEventListener(
            'pointerdown',
            this._pointerDown
        );

        window.removeEventListener(
            'pointermove',
            this._pointerMove
        );

        window.removeEventListener(
            'pointerup',
            this._pointerUp
        );

        this.container.removeEventListener(
            'wheel',
            this._wheel
        );

        if (this.entity) {
            this.entity.destroy();
            this.entity = null;
        }

        if (this.asset && this.app) {
            this.app.assets.remove(this.asset);
            this.asset = null;
        }

        if (this.app) {
            this.app.destroy();
            this.app = null;
        }

        this.camera = null;
        this.container.innerHTML = '';
    }
}
