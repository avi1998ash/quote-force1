import { LightningElement, track } from 'lwc';
import getAdminConfig from '@salesforce/apex/AdminSettingController.getAdminConfig';
import saveAdminConfig from '@salesforce/apex/AdminSettingController.saveAdminConfig';
import deleteCompanyLogo from '@salesforce/apex/AdminSettingController.deleteCompanyLogo';
import saveFileUrl from '@salesforce/apex/AdminSettingController.saveFileUrl';
import clearFileUrl from '@salesforce/apex/AdminSettingController.clearFileUrl';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class AdminConfiguration extends LightningElement {
   fileUrlDefaults = {
    QuoteForce__Company_Logo_URL__c: null,
    QuoteForce__Signature_URL__c: null,
    QuoteForce__Default_Warranty__c: null,
    QuoteForce__Default_Terms_Conditions__c: null
};
    currencyOptions = [
        { label: '($) USD', value: 'USD' },
        { label: '(Rs) INR', value: 'INR' },
        { label: '(EUR) EUR', value: 'EUR' },
        { label: '(GBP) GBP', value: 'GBP' }
    ];

    @track configRecord = {};
    @track isDeleteModalOpen = false;
    @track deleteModalTitle = '';
    @track deleteModalMessage = '';
    _pendingDeleteTarget = null;
    @track selectedCheckboxes = [];
    @track logoUrl;
    @track signatureUrl;
    @track warrantyUrl;
    @track termsUrl;
    @track isModalOpen = false;
    @track modalFileUrl;
    @track modalTitle;
    @track modalIsImg = false;

    loaded = false;
    isEditMode = false;

    checkboxOptions = [
        { label: 'Letter Of Owner', value: 'QuoteForce__Active_Letter_Of_Owner__c' },
        { label: 'Quote Details', value: 'QuoteForce__Active_Quote_Details__c' },
        { label: 'Terms and Conditions', value: 'QuoteForce__Active_Terms_and_Conditions__c' },
        { label: 'Title', value: 'QuoteForce__Active_Title__c' },
        { label: 'Warranty', value: 'QuoteForce__Active_Warranty__c' }
    ];

    connectedCallback() {
        this.loadConfig();
    }

    fieldApiName(fieldName) {
        return fieldName;
    }

    getField(record, fieldName) {
        if (!record) {
            return undefined;
        }
        const namespacedField = this.fieldApiName(fieldName);
        return record[fieldName] !== undefined ? record[fieldName] : record[namespacedField];
    }

    setField(fieldName, value) {
        this.configRecord = {
            ...this.configRecord,
            [fieldName]: value
        };
    }

    toggleEdit() {
        this.isEditMode = !this.isEditMode;
        this.loadConfig();
    }

    loadConfig() {
        this.loaded = true;

        return getAdminConfig()
            .then((result) => {
                this.configRecord = this.normalizeConfigRecord(result);

                this.logoUrl = this.getField(this.configRecord, 'QuoteForce__Company_Logo_URL__c');
                this.signatureUrl = this.getField(this.configRecord, 'QuoteForce__Signature_URL__c');
                this.warrantyUrl = this.getField(this.configRecord, 'QuoteForce__Default_Warranty__c');
                this.termsUrl = this.getField(this.configRecord, 'QuoteForce__Default_Terms_Conditions__c');

                this.selectedCheckboxes = this.checkboxOptions
                    .filter((opt) => this.getField(this.configRecord, opt.value))
                    .map((opt) => opt.value);
            })
            .catch((error) => {
                this.showToast('Error', error.body?.message || 'Failed to load configuration', 'error');
            })
            .finally(() => {
                this.loaded = false;
            });
    }

    handleInputChange(event) {
        const field = event.target.label;
        switch (field) {
            case 'Name':
                this.setField('Name', event.target.value);
                break;
            case 'Phone':
                this.setField('QuoteForce__Phone__c', event.target.value);
                break;
            case 'Email':
                this.setField('QuoteForce__Email__c', event.target.value);
                break;
            case 'Link With Opportunity':
                this.setField('QuoteForce__Link_With_Opportunity__c', event.target.checked);
                break;
            case 'Fetch Address From Account':
                this.setField('QuoteForce__Fecth_Address_From_Account__c', event.target.checked);
                break;
            case 'Street Address':
                this.setField('QuoteForce__Street__c', event.target.value);
                break;
            case 'City':
                this.setField('QuoteForce__City__c', event.target.value);
                break;
            case 'Postal Code':
                this.setField('QuoteForce__Postal_Code__c', event.target.value);
                break;
            case 'State':
                this.setField('QuoteForce__State_Province__c', event.target.value);
                break;
            case 'Country':
                this.setField('QuoteForce__Country__c', event.target.value);
                break;
            case 'Invoice Terms & Conditions':
                this.setField('QuoteForce__Invoice_Terms_Condition__c', event.target.value);
                break;
            case 'Notes':
                this.setField('QuoteForce__Notes__c', event.target.value);
                break;
            default:
                break;
        }
    }

    get displayName() {
        return this.configRecord?.Name ? this.configRecord.Name : '';
    }

    handleCheckboxChange(event) {
        this.selectedCheckboxes = event.detail.value;
        this.checkboxOptions.forEach((opt) => {
            this.setField(opt.value, this.selectedCheckboxes.includes(opt.value));
        });
    }

   async handleSave() {
    const nameInput  = this.template.querySelector('[data-field="name"]');
    const phoneInput = this.template.querySelector('[data-field="phone"]');
    const emailInput = this.template.querySelector('[data-field="email"]');

    const missing = [];

    if (!nameInput?.value?.trim()) {
        nameInput.setCustomValidity('Name is required.');
        nameInput.reportValidity();
        missing.push('Name');
    } else {
        nameInput.setCustomValidity('');
        nameInput.reportValidity();
    }

    if (!phoneInput?.value?.trim()) {
        phoneInput.setCustomValidity('Phone is required.');
        phoneInput.reportValidity();
        missing.push('Phone');
    } else {
        phoneInput.setCustomValidity('');
        phoneInput.reportValidity();
    }

    if (!emailInput?.value?.trim()) {
        emailInput.setCustomValidity('Email is required.');
        emailInput.reportValidity();
        missing.push('Email');
    } else {
        emailInput.setCustomValidity('');
        emailInput.reportValidity();
    }

   if (missing.length > 0) {
    const title = missing.length === 1
        ? 'Required Field is Missing'
        : 'Required Fields are Missing';
    const message = missing.join(', ') + ' ' + (missing.length === 1 ? 'is' : 'are') + ' required.';
    this.showToast(title, message, 'error');
    return;
}

    this.loaded = true;

    try {
        const result = await saveAdminConfig({ config: this.buildSavePayload() });

        this.configRecord = this.normalizeConfigRecord(result);

        this.logoUrl      = this.getField(this.configRecord, 'QuoteForce__Company_Logo_URL__c');
        this.signatureUrl = this.getField(this.configRecord, 'QuoteForce__Signature_URL__c');
        this.warrantyUrl  = this.getField(this.configRecord, 'QuoteForce__Default_Warranty__c');
        this.termsUrl     = this.getField(this.configRecord, 'QuoteForce__Default_Terms_Conditions__c');

        this.showToast('Success', 'Configuration saved', 'success');
        this.isEditMode = false;

    } catch (error) {
        console.error('handleSave error:', JSON.stringify(error));

        let message = 'Failed to save configuration';

        if (typeof error === 'string') {
            message = error;
        } else if (error?.body?.message) {
            message = error.body.message;
        } else if (error?.body?.pageErrors?.length > 0) {
            message = error.body.pageErrors.map(e => e.message).join(', ');
        } else if (error?.body?.fieldErrors) {
            message = Object.values(error.body.fieldErrors)
                .flat()
                .map(e => e.message)
                .join(', ');
        } else if (error?.message) {
            message = error.message;
        }

        this.showToast('Error', message, 'error');

    } finally {
        this.loaded = false;
    }
}

handleLogoUpload(event) {
    const documentId = event.detail.files[0]?.documentId;
    if (!documentId) return;

    this.loaded = true;
    saveFileUrl({ fieldName: this.fieldApiName('QuoteForce__Company_Logo_URL__c'), documentId })
        .then(() => { this.loadConfig(); })
        .catch((error) => {
            this.showToast('Error', error.body?.message || 'Failed to upload logo', 'error');
            this.loaded = false;
        });
}

handleWarrantyUpload(event) {
    const documentId = event.detail.files[0]?.documentId;
    if (!documentId) return;

    this.loaded = true;
    saveFileUrl({ fieldName: this.fieldApiName('QuoteForce__Default_Warranty__c'), documentId })
        .then(() => { this.loadConfig(); })
        .catch((error) => {
            this.showToast('Error', error.body?.message || 'Failed to upload warranty', 'error');
            this.loaded = false;
        });
}

handleSignatureUpload(event) {
    const documentId = event.detail.files[0]?.documentId;
    if (!documentId) return;

    this.loaded = true;
    saveFileUrl({ fieldName: this.fieldApiName('QuoteForce__Signature_URL__c'), documentId })
        .then(() => { this.loadConfig(); })
        .catch((error) => {
            this.showToast('Error', error.body?.message || 'Failed to upload signature', 'error');
            this.loaded = false;
        });
}

handleTermsUpload(event) {
    const documentId = event.detail.files[0]?.documentId;
    if (!documentId) return;

    this.loaded = true;
    saveFileUrl({ fieldName: this.fieldApiName('QuoteForce__Default_Terms_Conditions__c'), documentId })
        .then(() => { this.loadConfig(); })
        .catch((error) => {
            this.showToast('Error', error.body?.message || 'Failed to upload terms', 'error');
            this.loaded = false;
        });
}

openDeleteConfirm(target, title, message) {
    this._pendingDeleteTarget = target;
    this.deleteModalTitle = title;
    this.deleteModalMessage = message;
    this.isDeleteModalOpen = true;
}

closeDeleteModal() {
    this.isDeleteModalOpen = false;
    this._pendingDeleteTarget = null;
}

confirmDelete() {
    this.isDeleteModalOpen = false;
    switch (this._pendingDeleteTarget) {
        case 'logo':       this.handleDeleteLogo();      break;
        case 'warranty':   this.handleDeleteWarranty();  break;
        case 'terms':      this.handleDeleteTerms();     break;
        case 'signature':  this.handleDeleteSignature(); break;
        default: break;
    }
    this._pendingDeleteTarget = null;
}

// Replace existing onclick handlers with these openers:
openDeleteLogo()      { this.openDeleteConfirm('logo',      'Delete Company Logo',      'Are you sure you want to delete the company logo?'); }
openDeleteWarranty()  { this.openDeleteConfirm('warranty',  'Delete Warranty',          'Are you sure you want to delete the warranty?'); }
openDeleteTerms()     { this.openDeleteConfirm('terms',     'Delete Terms & Conditions','Are you sure you want to delete the terms & conditions?'); }
openDeleteSignature() { this.openDeleteConfirm('signature', 'Delete Signature',         'Are you sure you want to delete the signature?'); }

    handleDeleteLogo() {
        this.loaded = true;

        deleteCompanyLogo()
            .then(() => {
                this.loadConfig();
            })
            .catch((error) => {
                this.showToast('Error', error.body?.message || 'Failed to delete logo', 'error');
                this.loaded = false;
            });
    }

    handleDeleteWarranty() {
        this.loaded = true;

        clearFileUrl({ fieldName: this.fieldApiName('QuoteForce__Default_Warranty__c') })
            .then(() => {
                this.loadConfig();
            })
            .catch((error) => {
                this.showToast('Error', error.body?.message || 'Failed to delete warranty', 'error');
                this.loaded = false;
            });
    }

    handleDeleteSignature() {
        this.loaded = true;

        clearFileUrl({ fieldName: this.fieldApiName('QuoteForce__Signature_URL__c') })
            .then(() => {
                this.loadConfig();
            })
            .catch((error) => {
                this.showToast('Error', error.body?.message || 'Failed to delete signature', 'error');
                this.loaded = false;
            });
    }

    handleDeleteTerms() {
        this.loaded = true;

        clearFileUrl({ fieldName: this.fieldApiName('QuoteForce__Default_Terms_Conditions__c') })
            .then(() => {
                this.loadConfig();
            })
            .catch((error) => {
                this.showToast('Error', error.body?.message || 'Failed to delete terms', 'error');
                this.loaded = false;
            });
    }


    handleViewLogo() {
        this.modalFileUrl = this.logoUrl;
        this.modalTitle = 'Company Logo';
        this.isModalOpen = true;
        this.modalIsImg = true;
    }

    handleViewWarranty() {
        this.modalFileUrl = this.warrantyUrl;
        this.modalTitle = 'Warranty';
        this.isModalOpen = true;
        this.modalIsImg = false;
    }

    handleViewSignature() {
        this.modalFileUrl = this.signatureUrl;
        this.modalTitle = 'Signature';
        this.isModalOpen = true;
        this.modalIsImg = true;
    }

    handleViewTerms() {
        this.modalFileUrl = this.termsUrl;
        this.modalTitle = 'Terms & Conditions';
        this.isModalOpen = true;
        this.modalIsImg = false;
    }

    closeModal() {
        this.isModalOpen = false;
        this.modalFileUrl = null;
        this.modalTitle = null;
    }

    handleCurrencyChange(event) {
        this.setField('QuoteForce__Currency__c', event.detail.value);
    }

    get defaultTaxRuleLabel() {
        return this.configRecord?.QuoteForce__Default_Tax_Rule__r?.Name || this.getField(this.configRecord, 'Default_Tax_Rule__c') || 'Not set';
    }

    get taxDisplayModeLabel() {
        return this.getField(this.configRecord, 'QuoteForce__Tax_Display_Mode__c') || 'Not set';
    }

    get defaultTaxCountryLabel() {
        return this.getField(this.configRecord, 'QuoteForce__Default_Tax_Country__c') || 'Not set';
    }

    get companyGstinLabel() {
        return this.getField(this.configRecord, 'QuoteForce__Company_GSTIN__c') || 'Not set';
    }

    get formattedAddress() {
        if (!this.configRecord) {
            return '';
        }

        const parts = [
            this.getField(this.configRecord, 'QuoteForce__Street__c'),
            this.getField(this.configRecord, 'QuoteForce__City__c'),
            this.getField(this.configRecord, 'QuoteForce__State_Province__c'),
            this.getField(this.configRecord, 'QuoteForce__Postal_Code__c'),
            this.getField(this.configRecord, 'QuoteForce__Country__c')
        ];

        return parts.filter((part) => part).join(', ');
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    normalizeConfigRecord(result) {
        const normalized = {
            ...this.fileUrlDefaults,
            ...(result || {})
        };
        Object.keys(result || {}).forEach((key) => {
            const localKey = key;
            if (normalized[localKey] === undefined) {
                normalized[localKey] = result[key];
            }
        });
        return normalized;
    }

    buildSavePayload() {
        const payload = {};
        Object.keys(this.configRecord || {}).forEach((key) => {
            payload[key] = this.configRecord[key];
        });
        return payload;
    }
}