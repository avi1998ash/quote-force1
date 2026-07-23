import { LightningElement , track, api } from "lwc";
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import sendEmailController from "@salesforce/apex/EmailClass.sendEmailController";
export default class EmailLwc extends LightningElement {
     loaded = false;
      toAddress = [];
    ccAddress = [];
    subject = "";
    body = "";
    @track files = [];
    @api recordId;

    wantToUploadFile = false;
    noEmailError = false;
    invalidEmails = false;

    toggleFileUpload() {
        this.wantToUploadFile = !this.wantToUploadFile;
    }

    handleUploadFinished(event) {
        const uploadedFiles = event.detail.files;
        this.files = [...this.files, ...uploadedFiles];
        this.wantToUploadFile = false;
    }

    handleRemove(event) {
        const index = event.target.dataset.index;
        this.files.splice(index, 1);
    }

    handleToAddressChange(event) {
        this.toAddress = event.detail.selectedValues;
    }

    handleCcAddressChange(event) {
        this.ccAddress = event.detail.selectedValues;
    }

    handleSubjectChange(event) {
        this.subject = event.target.value;
    }

    handleBodyChange(event) {
        this.body = event.detail.value;
    }

    validateEmails(emailAddressList) {
        let areEmailsValid;
        if(emailAddressList.length > 1) {
            areEmailsValid = emailAddressList.reduce((accumulator, next) => {
                const isValid = this.validateEmail(next);
                return accumulator && isValid;
            });
        }
        else if(emailAddressList.length > 0) {
            areEmailsValid = this.validateEmail(emailAddressList[0]);
        }
        return areEmailsValid;
    }

    validateEmail(email) {
        console.log("In VE");
        const res = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()s[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        console.log("res", res);
        return res.test(String(email).toLowerCase());
    }

    handleReset() {
        this.toAddress = [];
        this.ccAddress = [];
        this.subject = "";
        this.body = "";
        this.files = [];
        this.template.querySelectorAll("c-email-input").forEach((input) => input.reset());
    }

    handleSendEmail() {
        this.loaded = true;
        this.noEmailError = false;
        this.invalidEmails = false;
        if (![...this.toAddress, ...this.ccAddress].length > 0) {
            this.noEmailError = true;
             this.loaded = false;
            return;
        }
        
        if (!this.validateEmails([...this.toAddress, ...this.ccAddress])) {
            this.invalidEmails = true;
             this.loaded = false;
            return;
        }

        let emailDetails = {
            toAddress: this.toAddress,
            ccAddress: this.ccAddress,
            subject: this.subject,
            body: this.body
        };

        console.log("this.recordId - - - -:",this.recordId);
        sendEmailController({ emailDetailStr: JSON.stringify(emailDetails),  recordId: this.recordId})
            .then(() => {
                this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Email sent successfully!',
                    variant: 'success'
                })
            );
                console.log("Email Sent Sucessfully");
                 this.loaded = false;
                this.closeModal();
            })
            .catch((error) => {
                 this.loaded = false;
                console.error("Error in sendEmailController:", error);
            });
    }

    closeModal() {
        // Dispatch custom event to notify parent
        const closeEvent = new CustomEvent('closemodal');
        this.dispatchEvent(closeEvent);
         this.loaded = false;
    }
}