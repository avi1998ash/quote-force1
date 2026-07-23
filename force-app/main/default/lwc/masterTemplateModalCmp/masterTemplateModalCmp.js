import { LightningElement, api, track } from 'lwc';
import uploadImagesAndUpdateRecord from '@salesforce/apex/MasterTemplateController.uploadImagesAndUpdateRecord';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import CreateMasterLayout from '@salesforce/apex/createMasterTemplateRecord.CreateMasterLayout';
import getLayoutRecord from '@salesforce/apex/createMasterTemplateRecord.getLayoutRecord';
import UpdateMasterLayout from '@salesforce/apex/createMasterTemplateRecord.UpdateMasterLayout';
import deleteFile from '@salesforce/apex/createMasterTemplateRecord.deleteFile';


export default class MasterTemplateModalCmp extends LightningElement {
    @api recordId; // The Id of the Master_Template__c record
    @api templateType;
    imageUrl;
    primaryImage;
    secondaryImage;
    selectedRecordId = '';
    fileTypes = ['.jpg', '.png', '.jpeg'];
    @track loaded = false; // true while async Apex work is running
    @track fieldValues = {}; // Stores fields to update

    @track layoutName = '';
    @track letterForm = '';
    @track zipCode = '';
    @track stateProvince = '';
    @track city = '';
    @track streetAddress = '';
    @track lastName = '';
    @track firstName = '';
    @track date = '';
    @track primaryImage = '';
    @track secondaryImage = '';

    @track PrimaryAvailableBool = false;
    @track PrimaryUploadedFilesUrl = [];
    @track noImageAvail = false;
    fileDataPrimary;

    @track SecondaryAvailableBool = false;
    @track SecondaryUploadedFilesUrl = [];
    fileDataSecondary;

    @track primaryImageUrl = '';
    @track secondaryImageUrl = '';
    @track primaryContentDocumentId;
    @track secondaryContentDocumentId;

   async handleSave() {
    this.loaded = true;
    try {
        await this.template
            .querySelector('c-custom-quote-c-m-p')
            .handleSaveTeamplate();

       /* this.showToast(
            'Success',
            'Master Template created and saved successfully.',
            'success'
        );
*/
        this.dispatchEvent(new CustomEvent('refreshlist'));

    } catch (error) {
        console.error('Master Template Save Error:', error);

        this.showToast(
            'Error',
            error?.body?.message || 'Unable to save Master Template.',
            'error'
        );
    } finally {
        this.loaded = false;
    }
}
    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
        });
        this.dispatchEvent(event);
    }

    // Close modal
    handleClose() {
        this.closeModal();
    }

    closeModal() {
        const closeEvent = new CustomEvent('close');
        this.dispatchEvent(closeEvent);
    }
    async handleUpdate() {
    this.loaded = true;
    try {

        const mstLayoutObj = {
            Id: this.recordId,
            ...this.fieldValues
        };

        await UpdateMasterLayout({
            mstLayoutObj: mstLayoutObj
        });

        this.showToast(
            'Success',
            'Master Template updated successfully.',
            'success'
        );

        this.dispatchEvent(new CustomEvent('refreshlist'));

    } catch (error) {
        console.error('Update Error:', error);

        this.showToast(
            'Error',
            error?.body?.message || 'Unable to update Master Template.',
            'error'
        );
    } finally {
        this.loaded = false;
    }
}
async handleDelete(contentDocumentId) {
    this.loaded = true;
    try {
        await deleteFile({
            contentDocumentId: contentDocumentId
        });

        this.showToast(
            'Success',
            'File deleted successfully.',
            'success'
        );

    } catch (error) {
        console.error('Delete Error:', error);

        this.showToast(
            'Error',
            error?.body?.message || 'Unable to delete file.',
            'error'
        );
    } finally {
        this.loaded = false;
    }
}
}