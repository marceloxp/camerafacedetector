class MessageBox {
    constructor(elementId) {
        this.element = document.getElementById(elementId);
        this.currentText = '';
    }

    show(message) {
        if (message !== this.currentText) {
            this.element.textContent = message;
        }
        this.element.style.display = 'flex';
        this.currentText = message;
    }

    hide() {
        this.element.style.display = 'none';
        this.currentText = '';
    }
}

window.box = new MessageBox('status');
