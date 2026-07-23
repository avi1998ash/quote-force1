import { LightningElement, api } from 'lwc';
import sendInvoicePdf from '@salesforce/apex/EmailClass.sendInvoicePdf';
import { CloseActionScreenEvent } from 'lightning/actions';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class InvoicePreview extends LightningElement {

    @api recordId;

    toEmail  = '';
    ccEmail  = '';
    bccEmail = '';
    subject  = 'Invoice';
    body     = 'Please find attached invoice.';

    // Inline error messages shown below each field
    toEmailError  = '';
    ccEmailError  = '';
    bccEmailError = '';

    // Disables buttons and changes Send label while request is in flight
    isLoading = false;

    // Shows "Sending..." on the button while loading
    get sendButtonLabel() {
        return this.isLoading ? 'Sending...' : 'Send';
    }

    // Change handlers — clear the field error as soon as user types
    handleToChange(e)      { this.toEmail  = e.target.value; this.toEmailError  = ''; }
    handleCcChange(e)      { this.ccEmail  = e.target.value; this.ccEmailError  = ''; }
    handleBccChange(e)     { this.bccEmail = e.target.value; this.bccEmailError = ''; }
    handleSubjectChange(e) { this.subject  = e.target.value; }
    handleBodyChange(e)    { this.body     = e.target.value; }

    // Frontend email format validator — runs before calling Apex
    isValidEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
        return regex.test(email.trim());
    }

    // Returns array of invalid addresses from a comma-separated string
    getInvalidEmails(emailStr) {
        if (!emailStr || emailStr.trim() === '') return [];
        return emailStr.split(',')
            .map(e => e.trim())
            .filter(e => e !== '' && !this.isValidEmail(e));
    }

    handleSendEmail() {

        // Reset all inline errors before re-validating
        this.toEmailError  = '';
        this.ccEmailError  = '';
        this.bccEmailError = '';

        let hasError = false;

        // To field — blank check
        if (!this.toEmail || this.toEmail.trim() === '') {
            this.toEmailError = 'To address cannot be empty. Please enter at least one email address.';
            hasError = true;
        } else {
            const invalidTo = this.getInvalidEmails(this.toEmail);
            if (invalidTo.length > 0) {
                this.toEmailError = `Invalid email address: ${invalidTo.join(', ')}. Please enter a valid email address.`;
                hasError = true;
            }
        }

        // CC field — format check (only if provided)
        if (this.ccEmail && this.ccEmail.trim() !== '') {
            const invalidCc = this.getInvalidEmails(this.ccEmail);
            if (invalidCc.length > 0) {
                this.ccEmailError = `Invalid email address: ${invalidCc.join(', ')}. Please enter a valid email address.`;
                hasError = true;
            }
        }

        // BCC field — format check (only if provided)
        if (this.bccEmail && this.bccEmail.trim() !== '') {
            const invalidBcc = this.getInvalidEmails(this.bccEmail);
            if (invalidBcc.length > 0) {
                this.bccEmailError = `Invalid email address: ${invalidBcc.join(', ')}. Please enter a valid email address.`;
                hasError = true;
            }
        }

        // Stop here if any frontend validation failed — no Apex call needed
        if (hasError) return;

        this.isLoading = true;

        sendInvoicePdf({
            invoiceId : this.recordId,
            toEmail   : this.toEmail,
            ccEmail   : this.ccEmail,
            bccEmail  : this.bccEmail,
            subject   : this.subject,
            body      : this.body
        })
        .then(result => {
            this.isLoading = false;

            if (result.isSuccess) {
                // Success — show green toast and close modal
                this.dispatchEvent(new ShowToastEvent({
                    title   : 'Email Sent Successfully!',
                    message : result.message,
                    variant : 'success'
                }));
                this.dispatchEvent(new CloseActionScreenEvent());

            } else {
                // Apex returned error — show inline or as toast depending on field
                const msg = result.message || 'Something went wrong. Please try again.';

                if (msg.toLowerCase().includes('to:')) {
                    this.toEmailError = msg;
                } else if (msg.toLowerCase().includes('cc:')) {
                    this.ccEmailError = msg;
                } else if (msg.toLowerCase().includes('bcc:')) {
                    this.bccEmailError = msg;
                } else {
                    // General error — sticky toast, user must dismiss
                    this.dispatchEvent(new ShowToastEvent({
                        title   : 'Email Failed',
                        message : msg,
                        variant : 'error',
                        mode    : 'sticky'
                    }));
                }
            }
        })
        .catch(error => {
            // Unexpected crash — network failure or unhandled Apex exception
            this.isLoading = false;
            const msg = error?.body?.message || 'An unexpected error occurred. Please try again.';
            this.dispatchEvent(new ShowToastEvent({
                title   : 'Error',
                message : msg,
                variant : 'error',
                mode    : 'sticky'
            }));
        });
    }

    handleCancel() {
        this.dispatchEvent(new CloseActionScreenEvent());
    }
}