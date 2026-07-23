import { api, LightningElement, track, wire } from 'lwc';
import getLayouts from '@salesforce/apex/createMasterTemplateRecord.getLayouts';
import getLayoutSearch from '@salesforce/apex/createMasterTemplateRecord.getLayoutSearch';
import makeDefault from '@salesforce/apex/createMasterTemplateRecord.makeDefault';
import deleteLayout from '@salesforce/apex/createMasterTemplateRecord.deleteLayout';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import SectionDeleteCancel from '@salesforce/apex/ProductConfigurationController.SectionDeleteCancel';
import lightningConfirm from 'lightning/confirm';
import { refreshApex } from '@salesforce/apex';


export default class QuotivoIConfigCmp extends LightningElement {
    @track templateList = [];
    @track isModalOpen = false;
    @track recordId;
    @track templateType = '';
    @track showMessageTemplate = false;


    get showMessageTemplate() {
    return !this.layouts || this.layouts.length === 0;
}


    // Handler to open the modal
    handleCreateTemplate() {
        this.recordId = null;
        this.isModalOpen = true;
        this.templateType = 'Create Template';
    }

    // Handler to close the modal
    handleModalClose() {
        this.isModalOpen = false;
        console.log('OUTPUT : close modal ');
        SectionDeleteCancel()
            .then(data => {
                console.log('data : ', data);
            })
            .catch(err => {
                console.error('[loadSectionData] Error:', err);
            });
        this.refreshLayouts(); // Ensures list refreshes when modal is closed
    }

    handleEdit(event) {
        this.recordId = event.currentTarget.dataset.id;
        if (this.recordId) {
            this.isModalOpen = true;
            this.templateType = 'Edit Template';
        } else {
            this.showToast('Error', 'Failed to retrieve layout ID for editing', 'error');
        }
    }

    // Handler to close the modal
    handleEditModalClose() {
        this.isModalOpen = false;
        this.refreshLayouts();
    }

    @track layouts = [];
    @track isLoading = true;
    @track hasError = false;

    @track wiredLayoutsResult; // Holds the wired result for refreshApex

    @wire(getLayouts)
    wiredLayouts(result) {
        this.wiredLayoutsResult = result; // Store the result for refreshApex
        if (result.data) {
            this.layouts = result.data;
            this.hasError = false;
        } else if (result.error) {
            this.hasError = true;
            this.showToast('Error', 'Failed to load layouts', 'error');
        }
    }



    handleSearchChange(event) {
        const searchTerm = event.target.value;
        if (searchTerm) {
            getLayoutSearch({ searchKey: searchTerm })
                .then(result => {
                    this.showMessageTemplate = result.length == 0 ? true : false;
                    this.layouts = result;
                })
                .catch(error => {
                    this.showMessageTemplate = true;
                });
        } else {
            getLayouts()
                .then(result => {
                    this.showMessageTemplate = result.length == 0 ? true : false;
                    this.layouts = result;
                })
                .catch(error => {
                    this.showMessageTemplate = true;
                });
        }
    }

    @api
    async refreshLayouts() {
        this.isLoading = true;
        try {
            await refreshApex(this.wiredLayoutsResult);
            // this.showToast('Success', 'Layout list refreshed successfully', 'success');
        } catch (error) {
            this.showToast('Error', 'Failed to refresh layout list', 'error');
        } finally {
            this.isLoading = false;
        }
    }

    // Lifecycle hook that runs when the component is inserted into the DOM
    layoutRefreshData;

    connectedCallback() {

        this.loadLayouts();
    }

    // Method to load layouts from the Apex controller
    loadLayouts() {
        this.isLoading = true;
        this.layoutRefreshData = getLayouts()
        getLayouts()
            .then(result => {
                this.layouts = result;
                this.isLoading = false;
                this.hasError = false;
            })
            .catch(error => {
                this.isLoading = false;
                this.hasError = true;
                this.showToast('Error', 'Failed to load layouts', 'error');
            });
    }

    @track makeDefaultWarning = false;
    @track makeDefaultLayoutId = '';

    handleConfirm(event) {
        const layoutId = event.target.dataset.id;

        if (!layoutId) {
            this.showToast('Error', 'No layout ID found', 'error');
            return;
        } else {
            this.makeDefaultWarning = true;
            this.makeDefaultLayoutId = layoutId;
        }
    }

    makeDefaultWarningCancel() {
        this.makeDefaultWarning = false;
    }

    // Method to handle the "Make Default" button click
    handleMakeDefault() {
        this.isLoading = true;
        makeDefault({ layoutId: this.makeDefaultLayoutId })
            .then(() => {
                this.makeDefaultLayoutId = '';
                this.makeDefaultWarning = false;
                this.showToast('Success', 'Layout set as default', 'success');
                this.refreshLayouts();
            })
            .catch(error => {
                console.error('Failed to set layout as default:', error);
                this.showToast('Error', error.body ? error.body.message : 'Failed to set default layout', 'error');
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    @track deleteTemplate = false;
    @track selectedDeletRecord = false;

    deleteTemplateCancel() {
        this.deleteTemplate = false;
    }

    handleClikDelete(event) {
        this.selectedDeletRecord = event.currentTarget.dataset.id;
        console.log('IdddddddddselectedDeletRecord - -- :' + this.selectedDeletRecord)
        this.deleteTemplate = true;
    }


    handleDelete() {
        const layoutId = this.selectedDeletRecord;
        this.isLoading = true;

        // Find the layout object in the layouts array using the ID
        const layoutToDelete = this.layouts.find(layout => layout.Id === layoutId);

        // Check if layout exists and is marked as the default layout
      /*  if (layoutToDelete && layoutToDelete.QuoteForce__IsDefault__c) {
            this.showToast('Error', 'The default layout cannot be deleted.', 'error');
            this.isLoading = false; // Stop loading state
            return; // Prevent the delete action
        }*/

        // Proceed with the delete action if the layout is not default
        deleteLayout({ layoutId })
            .then(() => {
                this.showToast('Success', 'Template successfully deleted!', 'success');
                // Remove the deleted layout from the list
                this.layouts = this.layouts.filter(layout => layout.Id !== layoutId);
                this.isLoading = false; // Stop loading state after deletion
                this.deleteTemplateCancel();
            })
            .catch(error => {
                console.log('error : ', JSON.stringify(error));
                this.showToast('Error', 'Failed to delete layout or associated files', 'error');
                this.isLoading = false; // Stop loading state in case of error
            });
    }

    // Method to handle creating a new template (placeholder logic)
    handleNewTemplate() {
        this.loadLayouts();
    }

    // Utility method to show toast notifications
    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({
                title,
                message,
                variant
            })
        );
    }
}