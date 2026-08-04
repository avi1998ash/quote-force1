import { LightningElement, track, wire, api } from 'lwc';
import Toast from 'lightning/toast';
import { getObjectInfo, getPicklistValues } from 'lightning/uiObjectInfoApi';

import QUOTE_OBJECT    from '@salesforce/schema/Quotes__c';
import BILL_TO_COUNTRY from '@salesforce/schema/Quotes__c.Bill_To__c';
import BILL_TO_STATE   from '@salesforce/schema/Quotes__c.Bill_To__c';
import getPdfPageUrl from '@salesforce/apex/customQuoteCreateController.getPdfPageUrl';
// import getCountryPicklistValues from '@salesforce/apex/customQuoteCreateController.getCountryPicklistValues';
// import getStatePicklistValues  from '@salesforce/apex/customQuoteCreateController.getStatePicklistValues';
import getmasterTemplate   from '@salesforce/apex/customQuoteCreateController.getmasterTemplate';
import updateQuotesRecord  from '@salesforce/apex/customQuoteCreateController.updateQuotesRecord';
import getQuoteDetails     from '@salesforce/apex/customQuoteCreateController.getQuoteDetails';
import saveAsNewVersion    from '@salesforce/apex/saveAsNewVersion.saveAsNewVersion';

// =====================================================================
// Logging helper — single point of control for all diagnostic output
// =====================================================================
const LOG_TAG = '[customQuoteEditCmp]';
const log     = (...args) => console.log(LOG_TAG, ...args);
const warn    = (...args) => console.warn(LOG_TAG, ...args);
const err     = (...args) => console.error(LOG_TAG, ...args);

// Extract a readable message from any LWC/Apex error shape
function extractErrorMessage(error) {
    if (!error) return 'Unknown error (no error object)';
    if (typeof error === 'string') return error;
    if (error.body) {
        if (Array.isArray(error.body)) {
            return error.body.map(e => e.message).join(', ');
        }
        if (error.body.message) return error.body.message;
        if (error.body.output && error.body.output.errors) {
            return error.body.output.errors.map(e => e.message).join(', ');
        }
    }
    if (error.message) return error.message;
    try { return JSON.stringify(error); } catch (e) { return String(error); }
}

export default class CustomQuoteEditCmp extends LightningElement {

    @api parentId;
    @api recordId;
    @api objectApiName;
    @track loaded = false;
    @track isEditable;
    @track createdQuoteId = '';
    @track quoteName;
    @track expirationDate;
    @track opportunityId;
    @track status;
    @track tax;
    @track firstname;
    @track lastname;
    @track streetaddress;
    @track city;
    @track zipcode;
    @track state;
    @track letterFromOwner;
    @track layoutName;
    @track pdate;
    @track successMessage = '';
    @track errorMessage   = '';

    @track currentStep      = 1;
    @track isFirstStep      = true;
    @track isAvailable      = false;
    @track isSecondStep     = false;
    @track isThirdStep      = false;
    @track layoutAvailabel  = false;
    @track selectedValue    = '';
    @track options          = [];
    isFromQuote = true;
    pageSize    = 8;
    currentPage = 1;
    recordTypeId;
    allStateValues;
    @track isTemplateLocked = false;  

    statusOptions = [
        { label: 'Draft',         value: 'Draft' },
        { label: 'Needs Review',  value: 'Needs Review' },
        { label: 'In Review',     value: 'In Review' },
        { label: 'Approved',      value: 'Approved' },
        { label: 'Rejected',      value: 'Rejected' },
        { label: 'Presented',     value: 'Presented' },
        { label: 'Accepted',      value: 'Accepted' },
        { label: 'Denied',        value: 'Denied' }
    ];

    @track billingAddress  = { street: '', city: '', province: '', postalCode: '', country: '' };
    @track shippingAddress = { street: '', city: '', province: '', postalCode: '', country: '' };

    @track previousValues = { quoteName: '', expirationDate: '', status: '', tax: '' };

    @track countryOptions          = [];
    @track billingProvinceOptions  = [];
    @track shippingProvinceOptions = [];

    @track selectedCountryForBilling  = '';
    @track selectedCountryForShipping = '';

    // ---- Pagination getters ----
    get totalPages() { return Math.ceil(this.options.length / this.pageSize); }
    get paginatedOptions() {
        const start = (this.currentPage - 1) * this.pageSize;
        return this.options.slice(start, start + this.pageSize);
    }
    get isFirstPage() { return this.currentPage === 1; }
    get isLastPage()  { return this.currentPage === this.totalPages; }

    handleRadioChange(event) {
        log('handleRadioChange — selected:', event.target.value);
        this.selectedValue = event.target.value;
        this.options = this.options.map(opt => ({ ...opt, checked: opt.value === this.selectedValue }));
    }

    handleNext() {
        log('handleNext — currentPage:', this.currentPage, '/', this.totalPages);
        if (this.currentPage < this.totalPages) this.currentPage++;
    }

    handlePrev() {
        log('handlePrev — currentPage:', this.currentPage);
        if (this.currentPage > 1) this.currentPage--;
    }

    // =================================================================
    // WIRES
    // =================================================================

    @wire(getObjectInfo, { objectApiName: QUOTE_OBJECT })
    objectInfo({ data, error }) {
        if (data) {
            log('@wire getObjectInfo SUCCESS — defaultRecordTypeId:', data.defaultRecordTypeId);
            this.recordTypeId = data.defaultRecordTypeId;
        } else if (error) {
            err('@wire getObjectInfo FAILED:', extractErrorMessage(error), error);
        } else {
            log('@wire getObjectInfo pending...');
        }
    }

    @wire(getPicklistValues, { recordTypeId: '$recordTypeId', fieldApiName: BILL_TO_COUNTRY })
    countryValues({ data, error }) {
        if (data) {
            log('@wire countryValues SUCCESS — count:', data.values && data.values.length);
            this.countryOptions = data.values;
        } else if (error) {
            err('@wire countryValues FAILED:', extractErrorMessage(error), error);
        } else {
            log('@wire countryValues pending (recordTypeId:', this.recordTypeId, ')');
        }
    }

    @wire(getPicklistValues, { recordTypeId: '$recordTypeId', fieldApiName: BILL_TO_STATE })
    stateValues({ data, error }) {
        if (data) {
            log('@wire stateValues SUCCESS — count:', data.values && data.values.length);
            this.allStateValues = data;
        } else if (error) {
            err('@wire stateValues FAILED:', extractErrorMessage(error), error);
        } else {
            log('@wire stateValues pending (recordTypeId:', this.recordTypeId, ')');
        }
    }

    // =================================================================
    // LIFECYCLE
    // =================================================================

    connectedCallback() {
        log('connectedCallback — recordId:', this.recordId,
            '| objectApiName:', this.objectApiName,
            '| parentId:', this.parentId);

        if (!this.recordId) {
            err('connectedCallback — recordId is MISSING. LWC will not load record. Check VF page / button URL.');
        }

        this.getQuoteDetailsFromApex();
        this.getmasterTemplateRadioGroup();
    }

    renderedCallback() {
        // One-shot render log to confirm template actually rendered
        if (!this._renderedOnce) {
            this._renderedOnce = true;
            log('renderedCallback — initial render complete. State snapshot:',
                {
                    isFirstStep:  this.isFirstStep,
                    isSecondStep: this.isSecondStep,
                    isThirdStep:  this.isThirdStep,
                    currentStep:  this.currentStep,
                    quoteName:    this.quoteName,
                    status:       this.status
                });
        }
    }

    get quoteAddressStepClass() { return 'qf-progress-item-active'; }
get productSelectionStepClass() { return 'qf-progress-item'; }
get termsStepClass() { return 'qf-progress-item'; }
get previewStepClass() { return 'qf-progress-item'; }

// Header
get userInitials() { return 'JD'; } // replace with real user initials
get currentYear() { return new Date().getFullYear(); }
get quoteStatusBadgeLabel() { return this.status ? this.status.toUpperCase() + ' MODE' : 'DRAFT MODE'; }
// Quote Information fields
@track quoteName = '';
@track relatedOpportunityName = '';
@track expirationDate = '';

handleQuoteInfoChange(event) {
    const field = event.target.dataset.field;
    this[field] = event.detail ? event.detail.value : event.target.value;
}

handleAddressChange(event) {
    const field = event.target.dataset.field;   // street, city, province, postalCode, country
    const type  = event.target.dataset.type;    // billing or shipping
    const value = event.detail ? event.detail.value : event.target.value;

    if (type === 'billing') {
        this.billingAddress = { ...this.billingAddress, [field]: value };
        log('handleAddressChange — billingAddress updated:', { ...this.billingAddress });
    } else if (type === 'shipping') {
        this.shippingAddress = { ...this.shippingAddress, [field]: value };
        log('handleAddressChange — shippingAddress updated:', { ...this.shippingAddress });
    }
}

handleCopyBillingToShipping() {
    this.shippingAddress = { ...this.billingAddress };
    log('handleCopyBillingToShipping — shippingAddress copied from billingAddress:', { ...this.shippingAddress });
}

    // =================================================================
    // APEX CALLS
    // =================================================================

    getQuoteDetailsFromApex() {
        log('getQuoteDetailsFromApex — START — recordId:', this.recordId);

        if (!this.recordId) {
            err('getQuoteDetailsFromApex — ABORTED — recordId is empty.');
            this.showToast('Error', 'Quote Id is missing. Cannot load record.', 'error');
            return;
        }

        this.loaded = true;
        getQuoteDetails({ recordId: this.recordId })
            .then(result => {
                log('getQuoteDetails SUCCESS — raw result:', JSON.parse(JSON.stringify(result || {})));

                if (!result) {
                    warn('getQuoteDetails — result was empty/null');
                    return;
                }

                this.quoteName      = result.Name;
                this.expirationDate = result.QuoteForce__Expiration_Date__c;
                this.status         = result.QuoteForce__Status__c;
                this.tax            = result.QuoteForce__Tax__c;
                this.opportunityId  = result.QuoteForce__Opportunity__c;
                this.isAvailable    = (this.opportunityId !== null && this.opportunityId !== undefined);

                log('getQuoteDetails — basic fields populated:', {
                    quoteName:      this.quoteName,
                    expirationDate: this.expirationDate,
                    status:         this.status,
                    tax:            this.tax,
                    opportunityId:  this.opportunityId
                });

                // Bill To address
                this.billingAddress.street     = result.QuoteForce__Bill_To__Street__s;
                this.billingAddress.city       = result.QuoteForce__Bill_To__City__s;
                this.billingAddress.province   = result.QuoteForce__Bill_To__StateCode__s;
                this.billingAddress.postalCode = result.QuoteForce__Bill_To__PostalCode__s;
                this.billingAddress.country    = result.QuoteForce__Bill_To__CountryCode__s;
                log('getQuoteDetails — billingAddress populated:', { ...this.billingAddress });

                // Ship To address
                this.shippingAddress.street     = result.QuoteForce__Ship_To__Street__s;
                this.shippingAddress.city       = result.QuoteForce__Ship_To__City__s;
                this.shippingAddress.province   = result.QuoteForce__Ship_To__StateCode__s;
                this.shippingAddress.postalCode = result.QuoteForce__Ship_To__PostalCode__s;
                this.shippingAddress.country    = result.QuoteForce__Ship_To__CountryCode__s;
                log('getQuoteDetails — shippingAddress populated:', { ...this.shippingAddress });

                // Auto load billing provinces if country already present
                if (this.billingAddress.country && this.allStateValues) {
                    const key = this.allStateValues.controllerValues[this.billingAddress.country];
                    this.billingProvinceOptions =
                        this.allStateValues.values.filter(s => s.validFor.includes(key));
                    log('getQuoteDetails — billing provinces loaded:', this.billingProvinceOptions.length);
                } else {
                    log('getQuoteDetails — billing provinces NOT loaded. country:',
                        this.billingAddress.country, '| allStateValues ready:', !!this.allStateValues);
                }

                // Auto load shipping provinces if country already present
                if (this.shippingAddress.country && this.allStateValues) {
                    const key = this.allStateValues.controllerValues[this.shippingAddress.country];
                    this.shippingProvinceOptions =
                        this.allStateValues.values.filter(s => s.validFor.includes(key));
                    log('getQuoteDetails — shipping provinces loaded:', this.shippingProvinceOptions.length);
                } else {
                    log('getQuoteDetails — shipping provinces NOT loaded. country:',
                        this.shippingAddress.country, '| allStateValues ready:', !!this.allStateValues);
                }

                this.selectedValue = result.QuoteForce__LayoutId__c;
                log('getQuoteDetails — selectedValue (LayoutId):', this.selectedValue);

                this.options = this.options.map(opt => ({
                    ...opt,
                    checked: opt.value === this.selectedValue
                }));

                this.layoutAvailabel = !(result.QuoteForce__LayoutId__c == null
                                       || result.QuoteForce__LayoutId__c === '');
                log('getQuoteDetails — layoutAvailabel:', this.layoutAvailabel);
            })
            .catch(error => {
                const msg = extractErrorMessage(error);
                err('getQuoteDetails FAILED:', msg, error);
                this.showToast('Error', 'Failed to load quote: ' + msg, 'error');
            })
            .finally(() => {
                this.loaded = false;
            });
    }

    getmasterTemplateRadioGroup() {
        log('getmasterTemplateRadioGroup — START');

        this.loaded = true;
        getmasterTemplate()
            .then(data => {
                log('getmasterTemplate SUCCESS — count:', data && data.length);

                data.forEach(element => {
                    this.options = [...this.options, {
                        value:   element.Id,
                        label:   element.QuoteForce__Layout_Name__c,
                        checked: (element.Id === this.selectedValue)
                    }];
                });

                log('getmasterTemplate — options now:', this.options.length);

                if (this.layoutAvailabel === false) {
                    const defaultOption = data.find(el => el.QuoteForce__IsDefault__c === true);
                    if (defaultOption) {
                        log('getmasterTemplate — applying default layout:', defaultOption.Id);
                        this.selectedValue = defaultOption.Id;
                        this.options = this.options.map(opt => ({
                            ...opt,
                            checked: opt.value === this.selectedValue
                        }));
                    } else {
                        warn('getmasterTemplate — no default layout found in result');
                    }
                }
            })
            .catch(error => {
                const msg = extractErrorMessage(error);
                err('getmasterTemplate FAILED:', msg, error);
                this.showToast('Error', 'Failed to load templates: ' + msg, 'error');
            })
            .finally(() => {
                this.loaded = false;
            });
    }

        get isTemplateDisabled() {
        return this.layoutAvailabel || this.isTemplateLocked;
    }

    // =================================================================
    // ADDRESS HANDLERS
    // =================================================================

    handleBillToProvinceChange(event) {
        log('handleBillToProvinceChange:', event.detail.value);
        this.billingAddress.province = event.detail.value;
    }

    handleShipToProvinceChange(event) {
        log('handleShipToProvinceChange:', event.detail.value);
        this.shippingAddress.province = event.detail.value;
    }

    handleBillToAddressChange(event) {
        log('handleBillToAddressChange — incoming:', JSON.parse(JSON.stringify(event.detail || {})));

        const { street, city, postalCode, province, country } = event.detail;
        const previousCountry = this.billingAddress.country;
        this.billingAddress = { ...this.billingAddress, street, city, postalCode, province, country };

        if (country && country !== previousCountry && this.allStateValues) {
            const key = this.allStateValues.controllerValues[country];
            this.billingProvinceOptions =
                this.allStateValues.values.filter(s => s.validFor.includes(key));
            log('handleBillToAddressChange — billing provinces refreshed for', country,
                '— count:', this.billingProvinceOptions.length);
        }
    }

    handleShipToAddressChange(event) {
        log('handleShipToAddressChange — incoming:', JSON.parse(JSON.stringify(event.detail || {})));

        const { street, city, postalCode, province, country } = event.detail;
        const previousCountry = this.shippingAddress.country;
        this.shippingAddress = { ...this.shippingAddress, street, city, postalCode, province, country };

        if (country && country !== previousCountry && this.allStateValues) {
            const key = this.allStateValues.controllerValues[country];
            this.shippingProvinceOptions =
                this.allStateValues.values.filter(s => s.validFor.includes(key));
            log('handleShipToAddressChange — shipping provinces refreshed for', country,
                '— count:', this.shippingProvinceOptions.length);
        }
    }

    handleInputChange(event) {
        const field = event.target.dataset.field;
        log('handleInputChange —', field, '=', event.target.value);
        this[field] = event.target.value;
    }

    // =================================================================
    // SAVE FLOW
    // =================================================================

    saveAndNext() {
        log('saveAndNext — START. Validating required fields...');

        if (!this.quoteName) {
            warn('saveAndNext — validation FAILED: quoteName missing');
            this.showToast('Error', 'Quote Name is required field.', 'error');
            return;
        }
        if (!this.expirationDate) {
            warn('saveAndNext — validation FAILED: expirationDate missing');
            this.showToast('Error', 'Expiration Date is required field.', 'error');
            return;
        }
        if (!this.status) {
            warn('saveAndNext — validation FAILED: status missing');
            this.showToast('Error', 'Status is required field.', 'error');
            return;
        }

        this.isEditable = true;

        const quoteObj = {
            'Name':                                this.quoteName,
            'QuoteForce__Expiration_Date__c':      this.expirationDate,
            'QuoteForce__Status__c':               this.status,
            'QuoteForce__Tax__c':                  this.tax,
            'QuoteForce__Bill_To__Street__s':      this.billingAddress.street,
            'QuoteForce__Bill_To__City__s':        this.billingAddress.city,
            'QuoteForce__Bill_To__StateCode__s':   this.billingAddress.province,
            'QuoteForce__Bill_To__PostalCode__s':  this.billingAddress.postalCode,
            'QuoteForce__Bill_To__CountryCode__s': this.billingAddress.country,
            'QuoteForce__Ship_To__Street__s':      this.shippingAddress.street,
            'QuoteForce__Ship_To__City__s':        this.shippingAddress.city,
            'QuoteForce__Ship_To__StateCode__s':   this.shippingAddress.province,
            'QuoteForce__Ship_To__PostalCode__s':  this.shippingAddress.postalCode,
            'QuoteForce__Ship_To__CountryCode__s': this.shippingAddress.country,
            'Id':                                  this.recordId
        };

        log('saveAndNext — calling updateQuotesRecord with payload:', quoteObj);

        this.loaded = true;
        updateQuotesRecord({ quoteWrapMap: quoteObj })
            .then(result => {
                log('updateQuotesRecord SUCCESS — returned Id:', result);
                this.createdQuoteId = result;
                this.isFirstStep    = false;
                this.isSecondStep   = true;
                this.currentStep++;
                log('saveAndNext — advanced to step:', this.currentStep);
                this.showToast('Success', 'Quote record updated successfully!', 'success');
            })
            .catch(error => {
                const msg = extractErrorMessage(error);
                err('updateQuotesRecord FAILED:', msg, error);
                this.showToast('Error', 'Failed to update quote record: ' + msg, 'error');
            })
            .finally(() => {
                this.loaded = false;
            });
    }

    handleSaveAsDraft() {
        log('handleSaveAsDraft — START. Saving quote with status Draft.');

        if (!this.quoteName) {
            warn('handleSaveAsDraft — validation FAILED: quoteName missing');
            this.showToast('Error', 'Quote Name is required field.', 'error');
            return;
        }

        const quoteObj = {
            'Name':                                this.quoteName,
            'QuoteForce__Expiration_Date__c':      this.expirationDate,
            'QuoteForce__Status__c':               'Draft',
            'QuoteForce__Tax__c':                  this.tax,
            'QuoteForce__Bill_To__Street__s':      this.billingAddress.street,
            'QuoteForce__Bill_To__City__s':        this.billingAddress.city,
            'QuoteForce__Bill_To__StateCode__s':   this.billingAddress.province,
            'QuoteForce__Bill_To__PostalCode__s':  this.billingAddress.postalCode,
            'QuoteForce__Bill_To__CountryCode__s': this.billingAddress.country,
            'QuoteForce__Ship_To__Street__s':      this.shippingAddress.street,
            'QuoteForce__Ship_To__City__s':        this.shippingAddress.city,
            'QuoteForce__Ship_To__StateCode__s':   this.shippingAddress.province,
            'QuoteForce__Ship_To__PostalCode__s':  this.shippingAddress.postalCode,
            'QuoteForce__Ship_To__CountryCode__s': this.shippingAddress.country,
            'Id':                                  this.recordId
        };

        log('handleSaveAsDraft — calling updateQuotesRecord with payload:', quoteObj);

        this.loaded = true;
        updateQuotesRecord({ quoteWrapMap: quoteObj })
            .then(result => {
                log('handleSaveAsDraft — updateQuotesRecord SUCCESS — returned Id:', result);
                this.status = 'Draft';
                this.showToast('Success', 'Quote saved as draft successfully!', 'success');
            })
            .catch(error => {
                const msg = extractErrorMessage(error);
                err('handleSaveAsDraft — updateQuotesRecord FAILED:', msg, error);
                this.showToast('Error', 'Failed to save draft: ' + msg, 'error');
            })
            .finally(() => {
                this.loaded = false;
            });
    }

    handleSave() {
        log('handleSave — delegating to quoteForm.updateQuote()');
        try {
            this.refs.quoteForm.updateQuote();
        } catch (e) {
            err('handleSave — refs.quoteForm missing or updateQuote threw:', e);
        }
    }

    handleSaveAsNewVersion() {
        log('handleSaveAsNewVersion — recordId:', this.recordId);

        const targetId = this.recordId;
        if (!targetId) {
            err('handleSaveAsNewVersion — recordId missing');
            alert('Error: Quotes__c Record ID missing.');
            return;
        }

        this.loaded = true;
        saveAsNewVersion({ currentQuoteId: targetId })
            .then(newId => {
                log('saveAsNewVersion SUCCESS — newId:', newId);

                this.recordId       = newId;
                this.createdQuoteId = newId;

                this.getQuoteDetailsFromApex();

                
                this.isTemplateLocked = true;

                if (this.refs.quoteForm) {
                    this.refs.quoteForm.updateQuote(newId);
                } else {
                    warn('saveAsNewVersion — quoteForm ref not found');
                }

                this.showToast('Success', 'New version created successfully!', 'success');
            })
            .catch(error => {
                const msg = extractErrorMessage(error);
                err('saveAsNewVersion FAILED:', msg, error);
                alert('Clone failed: ' + msg);
            })
            .finally(() => {
                this.loaded = false;
            });
    }

    showToast(title, message, variant) {
        log('showToast —', variant, '|', title, '|', message);
        Toast.show({ label: title, message: message, mode: 'dismissible', variant: variant }, this);
    }

    handleSecondPrevious() {
        log('handleSecondPrevious');
        this.isSecondStep = true;
        this.isThirdStep  = false;
        this.isFirstStep  = false;
    }

    handlePrevious() {
        log('handlePrevious — back to step 1');
        this.isFirstStep  = true;
        this.isSecondStep = false;
        this.currentStep--;
        this.recordId = this.createdQuoteId;
    }

    handleCancel() {
        log('handleCancel');
        history.back();
    }

    resetForm() {
        log('resetForm');
        this.quoteName       = '';
        this.expirationDate  = '';
        this.status          = '';
        this.tax             = '';
        this.billingAddress  = { street: '', city: '', province: '', postalCode: '', country: '' };
        this.shippingAddress = { street: '', city: '', province: '', postalCode: '', country: '' };
        this.successMessage  = '';
        this.errorMessage    = '';
        this.currentStep     = 1;
        this.isFirstStep     = true;
        this.isSecondStep    = false;
        this.isThirdStep     = false;
    }

    finalizeQuote() {
        log('finalizeQuote');
        this.successMessage = 'Quote has been successfully created!';
        this.errorMessage   = '';
        this.resetForm();
    }

    handelnextpage() {
        log('handelnextpage — selectedValue:', this.selectedValue);
        if (this.selectedValue == '') {
            warn('handelnextpage — no template selected');
            this.showToast('Quote Template Is Required', 'Please Choose a Quote Template', 'error');
            return;
        }
        this.isThirdStep  = true;
        this.isSecondStep = false;
    }

    /*openPDF() {
        log('openPDF — recordId:', this.recordId);
        window.open('/apex/quotePDFpage?id=' + this.recordId);
    }*/
   /* openPDF() {
    const quoteId = this.createdQuoteId || this.recordId;
    log('openPDF — createdQuoteId:', this.createdQuoteId, '| recordId:', this.recordId, '| using quoteId:', quoteId);
    window.open('/apex/QuoteForce__quotePDFpage?id=' + quoteId);
}
*/
    // ---------------- EMAIL ----------------

    @track isEmailModalOpen = false;
    handleOpenModal()  { log('handleOpenModal');  this.isEmailModalOpen = true;  }
    handleCloseModal() { log('handleCloseModal'); this.isEmailModalOpen = false; }

    @track isModalVisible = false;
    modalTitle = 'Preview';
    iframeSourceUrl;

   /* handleOpenModalPdf() {
        log('handleOpenModalPdf — recordId:', this.recordId);
        this.iframeSourceUrl = '/apex/quotePDFpage?id=' + this.recordId;
        this.isModalVisible  = true;
    }
*/
async handleOpenModalPdf() {
    const quoteId = this.createdQuoteId || this.recordId;
    log('handleOpenModalPdf — quoteId:', quoteId);

    if (!quoteId) {
        warn('handleOpenModalPdf — quoteId missing');
        this.showToast('Error', 'Quote ID missing. Please save first.', 'error');
        return;
    }

    this.loaded = true;
    try {
        try {
            if (this.refs.quoteForm?.updateQuoteAndWait) {
                await this.refs.quoteForm.updateQuoteAndWait();
            }
        } catch (error) {
            err('handleOpenModalPdf — updateQuoteAndWait failed:', error);
        }


        try {
            const url = await getPdfPageUrl({ quoteId: quoteId });
            this.iframeSourceUrl = url;
        } catch (error) {
            err('handleOpenModalPdf — getPdfPageUrl failed, using fallback:', error);
            this.iframeSourceUrl = '/apex/quotePDFpage?id=' + quoteId;
        }

        log('handleOpenModalPdf — iframeSourceUrl:', this.iframeSourceUrl);
        this.isModalVisible = true;
    } finally {
        this.loaded = false;
    }
}

    handleCloseModalPdf() {
        log('handleCloseModalPdf');
        this.isModalVisible  = false;
        this.iframeSourceUrl = null;
    }
}