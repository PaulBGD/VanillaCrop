const defaults: CropOptions = {
    minWidth: 10,
    minHeight: 10,
    closeCrop: 5,
    cornerCrop: 10
};

class VanillaCrop {

    private crop: HTMLDivElement;

    private leftCrop: number = 0;
    private topCrop: number = 0;
    private bottomCrop: number = 0;
    private rightCrop: number = 0;

    private lastCoords: MouseCoords = { x: 0, y: 0 };
    private dragging: MousePosition = MousePosition.OUTSIDE;
    private initialDrag: MouseCoords = { x: 0, y: 0 };

    constructor(public container: HTMLDivElement, public image: HTMLImageElement, public options?: CropOptions) {
        this.options = this.options || {};
        for (let property in defaults) {
            if (!this.options[property]) {
                this.options[property] = defaults[property];
            }
        }

        this.crop = document.createElement('div');
        this.crop.style.boxSizing = 'border-box';
        this.crop.style.border = '3px dashed #222';
        this.crop.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
        this.crop.style.position = 'relative';

        this.container.style['userSelect'] = this.container.style.msUserSelect = this.container.style.webkitUserSelect = this.container.style['mozUserSelect'] = 'none';

        if (image.complete) {
            this.updateImage();
        } else {
            image.addEventListener('load', () => this.updateImage());
        }

        this.container.appendChild(this.crop);

        document.body.addEventListener('pointermove', this._onHover); // handle cursor
        this.crop.addEventListener('pointerdown', this._onDown); // handle resizing and moving
        document.body.addEventListener('pointerup', this._onUp); // reset stuff
        document.body.addEventListener('pointerleave', this._onUp); // reset stuff

        // ios
        document.body.addEventListener('touchmove', this._onHover); // handle cursor
        this.crop.addEventListener('touchstart', this._onDown); // handle resizing and moving
        document.body.addEventListener('touchup', this._onUp); // reset stuff
        document.body.addEventListener('touchleave', this._onUp); // reset stuff
    }
    
    private updateImage() {
        this.bottomCrop = this.image.offsetHeight;
        this.rightCrop = this.image.offsetWidth;
        this.crop.style.marginTop = -(this.image.offsetHeight + 3) + 'px';
        this.updateCrop();
    }

    private updateCrop() {
        this.crop.style.top = this.topCrop + 'px';
        this.crop.style.left = this.leftCrop + 'px';
        this.crop.style.width = (this.rightCrop - this.leftCrop) + 'px';
        this.crop.style.height = (this.bottomCrop - this.topCrop) + 'px';
        console.log(this.image.offsetHeight, this.image.offsetWidth);
    }

    private _onDown = (event: MouseEvent) => {
        console.log('down', MousePosition[this.getMousePosition(event.clientX || event.pageX, event.clientY || event.pageY)]);
        this.dragging = this.getMousePosition(event.clientX || event.pageX, event.clientY || event.pageY);
        this.initialDrag = this.lastCoords;
    };

    private _onUp = (event: MouseEvent) => {
        this.dragging = MousePosition.OUTSIDE; // reset
    };

    private _onHover = (event: MouseEvent) => {
        this.lastCoords = this.getRelativeCoords({ x: event.clientX || event.pageX, y: event.clientY || event.pageY });

        let position: MousePosition;
        if (this.dragging !== MousePosition.OUTSIDE) {
            // we're in the middle of a drag
            position = this.dragging;
            switch (position) {
                // todo middle
                case MousePosition.MIDDLE:
                    const changeX = this.lastCoords.x - this.initialDrag.x;
                    const changeY = this.lastCoords.y - this.initialDrag.y;
                    this.initialDrag = this.lastCoords;

                    if (!this.canResize(MousePosition.TOP, this.topCrop + changeY)
                        || !this.canResize(MousePosition.LEFT, this.leftCrop + changeX)
                        || !this.canResize(MousePosition.BOTTOM, this.bottomCrop + changeY)
                        || !this.canResize(MousePosition.RIGHT, this.rightCrop + changeX)) {
                        return; // cannot move here
                    }
                    this.topCrop += changeY;
                    this.bottomCrop += changeY;
                    this.leftCrop += changeX;
                    this.rightCrop += changeX;
                    // console.log(changeX, chang?eY);
                    break;
                case MousePosition.TOP:
                    this.topCrop = Math.max(Math.min(this.lastCoords.y, this.bottomCrop - this.options.minHeight), 0);
                    break;
                case MousePosition.BOTTOM:
                    this.bottomCrop = Math.min(Math.max(this.lastCoords.y, this.topCrop + this.options.minHeight), this.image.offsetHeight);
                    break;
                case MousePosition.LEFT:
                    this.leftCrop = Math.max(Math.min(this.lastCoords.x, this.rightCrop - this.options.minWidth), 0);
                    break;
                case MousePosition.RIGHT:
                    this.rightCrop = Math.min(Math.max(this.lastCoords.x, this.leftCrop + this.options.minWidth), this.image.offsetWidth);
                    break;
            }
            this.updateCrop();
        } else {
            position = this.getMousePosition(event.clientX || event.pageX, event.clientY || event.pageY);
        }

        switch (position) {
            case MousePosition.MIDDLE:
                document.body.style.cursor = 'move';
                break;
            case MousePosition.TOP:
            case MousePosition.BOTTOM:
                document.body.style.cursor = 'row-resize';
                break;
            case MousePosition.LEFT:
            case MousePosition.RIGHT:
                document.body.style.cursor = 'col-resize';
                break;
            // todo.. diagonals
            // case MousePosition.TOP_RIGHT:
            // case MousePosition.BOTTOM_LEFT:
            //     document.body.style.cursor = 'nesw-resize';
            //     break;
            // case MousePosition.TOP_LEFT:
            // case MousePosition.BOTTOM_RIGHT:
            //     document.body.style.cursor = 'nwse-resize';
                break;
            default:
                document.body.style.cursor = '';
        }
        if (position !== MousePosition.OUTSIDE) {
            event.preventDefault();
            return false;
        }
    };

    private canResize(position: MousePosition, change: number): boolean {
        switch (position) {
            case MousePosition.TOP:
                return change >= 0 && change < this.bottomCrop - this.options.minHeight;
            case MousePosition.BOTTOM:
                return change <= this.image.offsetHeight && change > this.topCrop + this.options.minHeight;
            case MousePosition.LEFT:
                return change >= 0 && change < this.rightCrop - this.options.minWidth;
            case MousePosition.RIGHT:
                return change <= this.image.offsetWidth && change > this.leftCrop + this.options.minWidth;
        }
        throw new Error('Cannot calculate resize position for ' + MousePosition[position]);
    }

    private getRelativeCoords(coords: MouseCoords): MouseCoords {
        const rect: ClientRect = this.image.getBoundingClientRect();
        return {
            x: coords.x - rect.left,
            y: coords.y - rect.top
        };
    }

    private getMousePosition(x: number, y: number): MousePosition {
        const relativeCoords = this.getRelativeCoords({ x, y });
        const relativeX: number = relativeCoords.x;
        const relativeY: number = relativeCoords.y;
        
        // check if inside the crop
        if (relativeX >= this.leftCrop && relativeX <= this.rightCrop && relativeY >= this.topCrop && relativeY <= this.bottomCrop) {
            const distToLeft = relativeX - this.leftCrop;
            const distToTop = relativeY - this.topCrop;
            const distToRight = this.rightCrop - relativeX;
            const distToBottom = this.bottomCrop - relativeY;

            if (distToLeft < this.options.closeCrop) {
                if (distToTop < this.options.cornerCrop) {
                    // top left
                    return MousePosition.TOP_LEFT;
                } else if (distToBottom < this.options.cornerCrop) {
                    // bottom left
                    return MousePosition.BOTTOM_LEFT;
                }
                return MousePosition.LEFT;
            } else if (distToTop < this.options.closeCrop) {
                if (distToLeft < this.options.cornerCrop) {
                    // top left
                    return MousePosition.TOP_LEFT;
                } else if (distToRight < this.options.cornerCrop) {
                    // top right
                    return MousePosition.TOP_RIGHT;
                }
                return MousePosition.TOP;
            } else if (distToRight < this.options.closeCrop) {
                if (distToTop < this.options.cornerCrop) {
                    // top right
                    return MousePosition.TOP_RIGHT;
                } else if (distToBottom < this.options.cornerCrop) {
                    // bottom right
                    return MousePosition.BOTTOM_RIGHT;
                }
                return MousePosition.RIGHT;
            } else if (distToBottom < this.options.closeCrop) {
                if (distToLeft < this.options.cornerCrop) {
                    // bottom left
                    return MousePosition.BOTTOM_LEFT;
                } else if (distToRight < this.options.cornerCrop) {
                    // bottom right
                    return MousePosition.BOTTOM_RIGHT;
                }
                return MousePosition.BOTTOM;
            } else {
                // in the middle!
                return MousePosition.MIDDLE;
            }
        }
        return MousePosition.OUTSIDE;
    }
}

enum MousePosition {
    TOP, LEFT, BOTTOM, RIGHT, TOP_LEFT, TOP_RIGHT, BOTTOM_LEFT, BOTTOM_RIGHT, MIDDLE, OUTSIDE
}

interface MouseCoords {
    x: number;
    y: number;
}

export interface CropOptions {
    minWidth?: number;
    minHeight?: number;
    closeCrop?: number;
    cornerCrop?: number;
}

if (!exports) {
    var exports = {}; // fake a module system if there is none
}
export default VanillaCrop; // for es6
exports['VanillaCrop'] = VanillaCrop; // for es5
window['VanillaCrop'] = VanillaCrop; // for no module system
