export class InputManager {
    constructor(callbacks) {
        this.onLeft = callbacks.onLeft;
        this.onRight = callbacks.onRight;
        this.onJump = callbacks.onJump;
        this.onSlide = callbacks.onSlide;

        this.bindKeys();
        this.bindTouch();
    }

    bindKeys() {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a') this.onLeft();
            if (e.key === 'ArrowRight' || e.key === 'd') this.onRight();
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') this.onJump();
            if (e.key === 'ArrowDown' || e.key === 's') this.onSlide();
        });
    }

    bindTouch() {
        const btnLeft = document.getElementById('btn-left');
        const btnRight = document.getElementById('btn-right');
        const btnJump = document.getElementById('btn-jump');
        const btnSlide = document.getElementById('btn-slide');

        if (btnLeft) btnLeft.onclick = () => this.onLeft();
        if (btnRight) btnRight.onclick = () => this.onRight();
        if (btnJump) btnJump.onclick = () => this.onJump();
        if (btnSlide) btnSlide.onclick = () => this.onSlide();
    }
}