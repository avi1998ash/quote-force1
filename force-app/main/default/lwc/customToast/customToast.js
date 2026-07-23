import { LightningElement, api, track } from 'lwc';
export default class CustomToast extends LightningElement {
    @api title = 'Success!';
    @api message = 'Your request was successful.';
    @api type = 'success'; // success, error, warning, info
    @track visible = true;

    connectedCallback() {
        setTimeout(() => {
            this.fadeOut();
        }, 4000);
    }

    get typeClass() {
        return `toast-${this.type}`;
    }

    get iconName() {
        switch (this.type) {
            case 'success': return 'utility:success';
            case 'error': return 'utility:error';
            case 'warning': return 'utility:warning';
            default: return 'utility:info';
        }
    }

    closeToast() {
        this.fadeOut();
    }

    fadeOut() {
        const el = this.template.querySelector('.custom-toast');
        el.classList.remove('fade-in');
        el.classList.add('fade-out');

        setTimeout(() => {
            this.visible = false;
        }, 300);
    }
}