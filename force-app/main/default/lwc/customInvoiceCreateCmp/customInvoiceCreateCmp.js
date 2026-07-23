import { LightningElement, track, wire, api } from 'lwc';
import customQuoteCMP from 'c/customQuoteCMP';
import { NavigationMixin } from 'lightning/navigation';
import Toast from 'lightning/toast';
import getCountryPicklistValues from '@salesforce/apex/customInvoiceCreateController.getCountryPicklistValues';
import getStatePicklistValues from '@salesforce/apex/customInvoiceCreateController.getStatePicklistValues';
import getmasterTemplate from '@salesforce/apex/customInvoiceCreateController.getmasterTemplate';
import getAdminConfig from '@salesforce/apex/AdminSettingController.getAdminConfig';
import createInvoiceRecord from '@salesforce/apex/customInvoiceCreateController.createInvoiceRecord';
import createInvoiceFromQuote from '@salesforce/apex/customInvoiceCreateController.createInvoiceFromQuote';
import updateInvoiceRecord from '@salesforce/apex/customInvoiceCreateController.updateInvoiceRecord';
import getQuoteDetails from '@salesforce/apex/customInvoiceCreateController.getQuoteDetails';
import getInvoiceDetails from '@salesforce/apex/customInvoiceCreateController.getInvoiceDetails';
import createQuoteWithChildren from '@salesforce/apex/customInvoiceCreateController.createQuoteWithChildren';
import repriceInvoiceLineItems from '@salesforce/apex/ProductConfigurationController.repriceInvoiceLineItems';
import getInvoiceSectionData from '@salesforce/apex/ProductConfigurationController.getInvoiceSectionData';

export default class CustomQuoteCreateCmp extends NavigationMixin(LightningElement) {
    @api parentId;
    @api recordId;
    @api objectApiName;
    @track isEditable;
    @track createdInvoiceId = '';
    @track invoiceName;
    @track expirationDate;
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
    @track errorMessage = '';

    @track currentStep = 1;
    @track isFirstStep = true;
    @track isSecondStep = false;
    @track isThirdStep = false;
    @track layoutAvailabel = false;
    @track selectedValue = '';
    @track options = [];
    @track lineEditorKey = 1;
    loaded = false;
    isFromQuote = true;
    pageSize = 5;
    currentPage = 1;

    statusOptions = [
        { label: 'Draft', value: 'Draft' },
        { label: 'Needs Review', value: 'Needs Review' },
        { label: 'In Review', value: 'In Review' },
        { label: 'Approved', value: 'Approved' },
        { label: 'Rejected', value: 'Rejected' },
        { label: 'Presented', value: 'Presented' },
        { label: 'Accepted', value: 'Accepted' },
        { label: 'Denied', value: 'Denied' }
    ];

    taxModeOptions = [
        { label: 'Tax Exclusive', value: 'Tax Exclusive' },
        { label: 'Tax Inclusive', value: 'Tax Inclusive' }
    ];

    @track billingAddress = {
        street: '',
        city: '',
        province: '',
        postalCode: '',
        country: ''
    };

    @track shippingAddress = {
        street: '',
        city: '',
        province: '',
        postalCode: '',
        country: ''
    };

    @track previousValues = {
        invoiceName: '',
        expirationDate: '',
        status: '',
        tax: ''
    };

    @track countryOptions = [];
    @track billingProvinceOptions = [];
    @track shippingProvinceOptions = [];
    @track priceBookId = '';
    @track priceBookOptions = [];
    @track isAutoCreatingInvoice = false;
    @track invoiceSections = [];
    @track invoiceSummary = null;
    @track taxEnabled = false;
    @track taxMode = 'Tax Exclusive';
    @track sourceQuoteName = '';

    @track selectedCountryForBilling = '';
    @track selectedCountryForShipping = '';
    currentLayoutId = '';
    @track isEditingLines = false;
    @track linkOpportunity = false;

    handleEditLines() {

    this._savedSnapshot = {

        invoiceName: this.invoiceName,
        expirationDate: this.expirationDate,
        status: this.status,
        tax: this.tax,
        taxEnabled: this.taxEnabled,
        taxMode: this.taxMode,
        billingAddress: { ...this.billingAddress },
        shippingAddress: { ...this.shippingAddress },

        invoiceSections: JSON.parse(JSON.stringify(this.invoiceSections))
    };

    this.isEditingLines = true;
}

handleCloseEditor() {

    if (this._savedSnapshot) {

        this.invoiceName = this._savedSnapshot.invoiceName;
        this.expirationDate = this._savedSnapshot.expirationDate;
        this.status = this._savedSnapshot.status;
        this.tax = this._savedSnapshot.tax;
        this.taxEnabled = this._savedSnapshot.taxEnabled;
        this.taxMode = this._savedSnapshot.taxMode;

        this.billingAddress = { ...this._savedSnapshot.billingAddress };
        this.shippingAddress = { ...this._savedSnapshot.shippingAddress };

        this.invoiceSections = JSON.parse(
            JSON.stringify(this._savedSnapshot.invoiceSections)
        );

        this._savedSnapshot = null;
    }

    this.isEditingLines = false;

    
    this.lineEditorKey = this.lineEditorKey + 1;
}
    get formattedTax() {
    return this.invoiceSummary?.tax ? this.invoiceSummary.tax + '%' : '';
} 
    get totalPages() {
        return Math.ceil(this.options.length / this.pageSize);
    }

    get paginatedOptions() {
        const start = (this.currentPage - 1) * this.pageSize;
        return this.options.slice(start, start + this.pageSize);
    }

    get isFirstPage() {
        return this.currentPage === 1;
    }

    get isLastPage() {
        return this.currentPage === this.totalPages;
    }

    handleRadioChange(event) {
        this.selectedValue = event.target.value;
        this.options = this.options.map(opt => ({
            ...opt,
            checked: opt.value === this.selectedValue
        }));
    }

    handleNext() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
        }
    }

    handlePrev() {
        if (this.currentPage > 1) {
            this.currentPage--;
        }
    }

    @wire(getCountryPicklistValues)
    wiredCountries({ error, data }) {
        if (data) {
            this.countryOptions = data.map(country => ({
                label: country.label,
                value: country.value
            }));
        } else if (error) {
        }
    }

    connectedCallback() {
        this.loaded = true;

        if (this.shouldAutoCreateInvoice) {
            this.isFirstStep = false;
            this.isSecondStep = false;
            this.isThirdStep = false;
            this.isAutoCreatingInvoice = true;
            this.autoCreateInvoiceFromQuote();
            return;
        }

        this.getQuoteDetailsFromApex();
        this.loadConfig();
    }

    loadConfig() {
        getAdminConfig()
            .then(adminResult => {
                this.linkOpportunity = adminResult.QuoteForce__Link_With_Opportunity__c === true;
            })
            .catch(error => {
                this.showToast('Error', error.body?.message || 'Failed to load admin config', 'error');
            });
    }

    getQuoteDetailsFromApex() {
        const targetInvoiceId = this.activeInvoiceId;

        if (targetInvoiceId) {
            return getInvoiceDetails({ recordId: targetInvoiceId })
                .then(result => {
                    if (result) {
                        this.isFirstStep = false;
                        this.isSecondStep = false;
                        this.isThirdStep = true;
                        this.currentStep = 2;
                        this.isEditable = true;
                        this.isEditingLines = true;

                        this.layoutName        = result.QuoteForce__Layout_Name__c;
                        this.currentLayoutId   = result.QuoteForce__LayoutId__c || '';
                        this.layoutAvailabel   = !!this.layoutName;

                        this.invoiceName       = result.Name || '';
                        this.expirationDate    = result.QuoteForce__Expiration_Date__c || '';
                        this.status            = result.QuoteForce__Status__c || '';
                        this.tax               = result.QuoteForce__Tax__c || '';
                        this.taxEnabled        = result.QuoteForce__Tax_Enabled__c === true;
                        this.taxMode           = result.QuoteForce__Tax_Mode__c || 'Tax Exclusive';
                        this.priceBookId       = result.QuoteForce__Price_Book__c || '';
                        this.sourceQuoteName   = result.QuoteForce__Quotes_Name__c || result.Name || '';

                        this.billingAddress = {
                            street:     result.QuoteForce__Bill_to__Street__s || result.QuoteForce__Bill_To__Street__s || '',
                            city:       result.QuoteForce__Bill_to__City__s || result.QuoteForce__Bill_To__City__s || '',
                            province:   result.QuoteForce__Bill_to__StateCode__s || result.QuoteForce__Bill_To__StateCode__s || '',
                            postalCode: result.QuoteForce__Bill_to__PostalCode__s || result.QuoteForce__Bill_To__PostalCode__s || '',
                            country:    result.QuoteForce__Bill_to__CountryCode__s || result.QuoteForce__Bill_To__CountryCode__s || ''
                        };

                        this.shippingAddress = {
                            street:     result.QuoteForce__Ship_To__Street__s || '',
                            city:       result.QuoteForce__Ship_To__City__s || '',
                            province:   result.QuoteForce__Ship_To__StateCode__s || '',
                            postalCode: result.QuoteForce__Ship_To__PostalCode__s || '',
                            country:    result.QuoteForce__Ship_To__CountryCode__s || ''
                        };

                        this.primeAddressProvinceOptions();
                        this.syncInvoiceSummary();
                    }
                })
                .then(() => {
                    this.getmasterTemplateRadioGroup();
                    return this.loadInvoiceSections();
                })
                .catch(error => {
                    this.showToast('Error', error.body?.message || 'Failed to load invoice details', 'error');
                    this.loaded = false;
                });
        }

        if (!this.parentId) {
            this.loaded = false;
            return Promise.resolve();
        }

        return getQuoteDetails({ recordId: this.parentId })
            .then(result => {
                if (result) {
                    this.layoutName      = result.QuoteForce__Layout_Name__c;
                    this.currentLayoutId = result.QuoteForce__LayoutId__c || '';
                    this.layoutAvailabel = !!this.layoutName;

                    this.invoiceName     = result.Name || '';
                    this.sourceQuoteName = result.Name || '';
                    this.expirationDate  = result.QuoteForce__Expiration_Date__c || '';
                    this.status          = result.QuoteForce__Status__c || '';
                    this.tax             = result.QuoteForce__Tax__c || '';
                    this.taxEnabled      = result.QuoteForce__Tax_Enabled__c === true;
                    this.taxMode         = result.QuoteForce__Tax_Mode__c || 'Tax Exclusive';
                    this.priceBookId     = result.QuoteForce__Price_Book__c || '';
                    this.firstname       = result.QuoteForce__First_Name__c || '';
                    this.lastname        = result.QuoteForce__Last_Name__c || '';
                    this.streetaddress   = result.QuoteForce__Street_Address__c || '';
                    this.city            = result.QuoteForce__City__c || '';
                    this.state           = result.QuoteForce__State_Province__c || '';
                    this.zipcode         = result.QuoteForce__Zip_code_Postal_code__c || '';
                    this.letterFromOwner = result.QuoteForce__Letter_from_the_owner__c || '';
                    this.pdate           = result.QuoteForce__Date__c || '';

                    this.billingAddress = {
                        street:     result.QuoteForce__Bill_To__Street__s || result.QuoteForce__Bill_to__Street__s || '',
                        city:       result.QuoteForce__Bill_To__City__s || result.QuoteForce__Bill_to__City__s || '',
                        province:   result.QuoteForce__Bill_To__StateCode__s || result.QuoteForce__Bill_to__StateCode__s || '',
                        postalCode: result.QuoteForce__Bill_To__PostalCode__s || result.QuoteForce__Bill_to__PostalCode__s || '',
                        country:    result.QuoteForce__Bill_To__CountryCode__s || result.QuoteForce__Bill_to__CountryCode__s || ''
                    };

                    this.shippingAddress = {
                        street:     result.QuoteForce__Ship_To__Street__s || '',
                        city:       result.QuoteForce__Ship_To__City__s || '',
                        province:   result.QuoteForce__Ship_To__StateCode__s || '',
                        postalCode: result.QuoteForce__Ship_To__PostalCode__s || '',
                        country:    result.QuoteForce__Ship_To__CountryCode__s || ''
                    };

                    this.primeAddressProvinceOptions();
                    this.syncInvoiceSummary();
                }
            })
            .then(() => {
                this.getmasterTemplateRadioGroup();
            })
            .catch(error => {
                this.loaded = false;
            });
    }

    formatAddress(address) {
        const values = [
            address?.street,
            address?.city,
            address?.province,
            address?.postalCode,
            address?.country
        ].filter(value => !!value);

        return values.length ? values.join(', ') : 'Not provided';
    }

    loadInvoiceSections() {
        if (!this.activeInvoiceId) {
            this.invoiceSections = [];
            return Promise.resolve();
        }

        return getInvoiceSectionData({ invoiceId: this.activeInvoiceId })
            .then(result => {
                this.invoiceSections = (result || []).map((section, sectionIndex) => ({
                    id: section.sectionId || `section_${sectionIndex}`,
                    name: section.sectionName || `Section ${sectionIndex + 1}`,
                    notes: section.notes || '',
                    itemCount: (section.lineItems || []).length,
                    lineItems: (section.lineItems || []).map((lineItem, lineIndex) => ({
                        id: lineItem.itemId || `${section.sectionId}_${lineIndex}`,
                        productName: lineItem.productName || 'Unnamed Product',
                        productCode: lineItem.productCode || '',
                        quantity: Number(lineItem.quantity) || 0,
                        price: Number(lineItem.price) || 0,
                        lineTotal: Number(lineItem.lineTotal) || ((Number(lineItem.quantity) || 0) * (Number(lineItem.price) || 0)),
                        unitOfMeasurement: lineItem.unitOfMeasurement || ''
                    }))
                }));
            })
            .catch(error => {
                this.invoiceSections = [];
            });
    }

    get shouldAutoCreateInvoice() {
        return !!this.parentId && !this.recordId;
    }
    get currencySymbol() {
    // pricebook label se symbol extract karo — existing pattern same as quotesEditCmp
    if (this.priceBookId) {
        const selectedPb = (this.priceBookOptions || []).find(
            pb => pb.value === this.priceBookId
        );
        if (selectedPb) {
            const match = selectedPb.label.match(/\(([^)]+)\)/);
            if (match) return match[1];
        }
    }
    return '$';
}

    async autoCreateInvoiceFromQuote() {
        this.isAutoCreatingInvoice = true;
        try {
            const invoiceId = await createInvoiceFromQuote({ quoteId: this.parentId });
            this.createdInvoiceId = invoiceId;
            this.recordId = invoiceId;

            const layoutId = await createQuoteWithChildren({
                quoteId: this.parentId,
                invoiceId: invoiceId
            });
            this.currentLayoutId = layoutId || this.currentLayoutId;
            this.selectedValue   = this.currentLayoutId;

            await this.getQuoteDetailsFromApex();
            this.isAutoCreatingInvoice = false;

        } catch (error) {
            this.loaded = false;
            this.isAutoCreatingInvoice = false;
            this.isFirstStep = true;
            this.showToast('Error', error.body?.message || 'Failed to create invoice from quote.', 'error');
        }
    }

    async openInvoiceWorkspace() {
        if (!this.activeInvoiceId) {
            this.loaded = false;
            this.isAutoCreatingInvoice = false;
            this.isFirstStep = true;
            return;
        }

        this.isFirstStep     = false;
        this.isSecondStep    = false;
        this.isThirdStep     = true;
        this.currentStep     = 2;
        this.isEditable      = true;
        this.isEditingLines  = true;

        this.loaded = false;
        this.isAutoCreatingInvoice = false;
    }

    getmasterTemplateRadioGroup() {
        this.loaded  = true;
        this.options = [];

        getmasterTemplate({ templateName: this.layoutName })
            .then(data => {
                if (data && data.length) {
                    const template = data[0];
                    this.selectedValue = template.Id;
                    this.options = [{
                        value:   template.Id,
                        label:   template.QuoteForce__Layout_Name__c,
                        checked: true
                    }];
                    this.layoutAvailabel = true;
                }
                this.loaded = false;
            })
            .catch(error => {
                this.loaded = false;
            });
    }

    fetchBillingProvinceOptions(countryCode) {
        getStatePicklistValues({ countryCode })
            .then(result => {
                this.billingProvinceOptions = result;
            })
            .catch(error => {
                this.billingProvinceOptions = [];
            });
    }

    fetchShippingProvinceOptions(countryCode) {
        getStatePicklistValues({ countryCode })
            .then(result => {
                this.shippingProvinceOptions = result;
            })
            .catch(error => {
                this.shippingProvinceOptions = [];
            });
    }

    primeAddressProvinceOptions() {
        if (this.billingAddress.country) {
            this.fetchBillingProvinceOptions(this.billingAddress.country);
        }
        if (this.shippingAddress.country) {
            this.fetchShippingProvinceOptions(this.shippingAddress.country);
        }
    }

    handleBillToProvinceChange(event) {
        this.billingAddress.province = event.detail.value;
    }

    handleShipToProvinceChange(event) {
        this.shippingAddress.province = event.detail.value;
    }

    handleBillToAddressChange(event) {
        const { street, city, postalCode, province, country } = event.detail;
        const previousCountry = this.billingAddress.country;
        this.billingAddress = { ...this.billingAddress, street, city, postalCode, province, country };

        if (country && country !== previousCountry) {
            this.fetchBillingProvinceOptions(country);
        }
        this.syncInvoiceSummary();
    }

    handleShipToAddressChange(event) {
        const { street, city, postalCode, province, country } = event.detail;
        const previousCountry = this.shippingAddress.country;
        this.shippingAddress = { ...this.shippingAddress, street, city, postalCode, province, country };

        if (country && country !== previousCountry) {
            this.fetchShippingProvinceOptions(country);
        }
        this.syncInvoiceSummary();
    }

    handleInputChange(event) {
        const field = event.target.dataset.field;

        if (field === 'taxEnabled') {
            this.taxEnabled = event.target.checked;
            if (!this.taxEnabled) {
                this.tax = '';
            }
            this.syncInvoiceSummary();
            return;
        }

        this[field] = event.target.value;
        this.syncInvoiceSummary();
    }

    handleTaxModeChange(event) {
        this.taxMode = event.detail.value || 'Tax Exclusive';
        this.syncInvoiceSummary();
    }

    handleSectionChange(event) {
        this.invoiceSections = (event.detail?.sections || [])
            .filter(section => section.products && section.products.length > 0)
            .map((section, sectionIndex) => ({
                id: section.id || `section_${sectionIndex}`,
                name: section.title || `Section ${sectionIndex + 1}`,
                notes: section.notes || '',
                itemCount: (section.products || []).length,
                lineItems: (section.products || []).map((product, productIndex) => ({
                    id: product.id || `${section.id}_${productIndex}`,
                    productName: product.productName || 'Unnamed Product',
                    productCode: product.productCode || '',
                    quantity: Number(product.Quantity) || 0,
                    price: Number(product.Price) || 0,
                    lineTotal: Number(product.lineTotal) || 0,
                    unitOfMeasurement: product.MeasurementType || ''
                }))
            }));
    }

    syncInvoiceSummary() {
        this.invoiceSummary = {
            name:           this.invoiceName || '',
            status:         this.status || '',
            expirationDate: this.expirationDate || '',
            billTo:         this.formatAddress(this.billingAddress),
            shipTo:         this.formatAddress(this.shippingAddress),
            taxEnabled:     this.taxEnabled,
            taxMode:        this.taxMode,
            tax:            this.tax
        };
    }

    saveAndNext() {
        this.loaded = true;

        if (!this.invoiceName) {
            this.showToast('Error', 'Invoice Name is required field.', 'error');
            this.loaded = false;
            return;
        }
        if (!this.expirationDate) {
            this.showToast('Error', 'Expiration Date is required field.', 'error');
            this.loaded = false;
            return;
        }
        if (!this.status) {
            this.showToast('Error', 'Status is required field.', 'error');
            this.loaded = false;
            return;
        }
        if (this.taxEnabled && (this.tax === '' || this.tax === null || this.tax === undefined)) {
            this.showToast('Error', 'Tax value is required when tax is enabled.', 'error');
            this.loaded = false;
            return;
        }

        this.isEditable = false;
        const invoiceObj = this.buildInvoicePayload();
        const existingId = this.createdInvoiceId || this.recordId;

        if (!existingId) {
            createInvoiceRecord({ invoiceWrapMap: invoiceObj })
                .then(result => {
                    this.createdInvoiceId = result;
                    this.recordId         = result;
                    this.showToast('Success', 'Invoice record created successfully!', 'success');

                    const openEditor = () => {
                        this.isFirstStep  = false;
                        this.isSecondStep = false;
                        this.isThirdStep  = true;
                        this.currentStep  = 2;
                        this.loaded       = false;
                    };

                    if (this.parentId) {
                        createQuoteWithChildren({ quoteId: this.parentId, invoiceId: result })
                            .then(layoutId => {
                                this.currentLayoutId = layoutId || this.currentLayoutId;
                                this.selectedValue   = this.currentLayoutId;
                                openEditor();
                            })
                            .catch(error => {
                                this.loaded = false;
                                this.showToast('Error', error.body?.message || 'Failed to sync invoice from quote', 'error');
                            });
                    } else {
                        openEditor();
                    }
                })
                .catch(error => {
                    this.loaded = false;
                    this.showToast('Error', 'Failed to create invoice record.', 'error');
                });

        } else {
            this.isEditable   = true;
            invoiceObj.Id     = existingId;
            updateInvoiceRecord({ invoiceWrapMap: invoiceObj })
                .then(result => {
                    this.createdInvoiceId = result;
                    this.showToast('Success', 'Invoice record updated successfully!', 'success');
                    return this.openInvoiceWorkspace();
                })
                .catch(error => {
                    this.showToast('Error', 'Failed to update invoice record.', 'error');
                    this.loaded = false;
                });
        }
    }

    async handleSave() {
        if (!this.activeInvoiceId) return;

        if (this.taxEnabled && (this.tax === '' || this.tax === null || this.tax === undefined)) {
            this.showToast('Error', 'Tax value is required when tax is enabled.', 'error');
            return;
        }

        this.loaded = true;
        try {
            const invoiceObj = this.buildInvoicePayload();
            invoiceObj.Id    = this.activeInvoiceId;
            await updateInvoiceRecord({ invoiceWrapMap: invoiceObj });

            this.isEditingLines  = false;
            this._savedSnapshot  = null;
            this.showToast('Success', 'Invoice updated successfully!', 'success');

            this[NavigationMixin.Navigate]({
                type: 'standard__recordPage',
                attributes: {
                    recordId:   this.activeInvoiceId,
                    actionName: 'view'
                }
            });

            try {
                if (this.refs && this.refs.lineEditor && typeof this.refs.lineEditor.loadSectionData === 'function') {
                    await this.refs.lineEditor.loadSectionData();
                }
            } catch (refError) {
            }

            await this.loadInvoiceSections();

            await this.getQuoteDetailsFromApex().catch(err => {
            });

        } catch (error) {
            this.showToast('Error', error.body?.message || 'Failed to save invoice.', 'error');
        } finally {
            this.loaded = false;
        }
    }

    async handleRepriceLines() {
        if (!this.activeInvoiceId) return;

        this.loaded = true;
        try {
            await repriceInvoiceLineItems({ invoiceId: this.activeInvoiceId });

            try {
                if (this.refs && this.refs.lineEditor && typeof this.refs.lineEditor.loadSectionData === 'function') {
                    await this.refs.lineEditor.loadSectionData();
                }
            } catch (refError) {
            }

            await this.loadInvoiceSections();

            this.showToast('Success', 'Invoice lines repriced successfully.', 'success');
        } catch (error) {
            this.showToast('Error', error.body?.message || 'Failed to reprice invoice lines.', 'error');
        } finally {
            this.loaded = false;
        }
    }

    showToast(title, message, variant) {
        Toast.show({
            label:   title,
            message: message,
            mode:    'dismissible',
            variant: variant
        }, this);
    }

    handleSecondPrevious() {
        this.isFirstStep  = true;
        this.isSecondStep = false;
        this.isThirdStep  = false;
        this.currentStep  = 1;
    }

    handlePrevious() {
        this.isFirstStep  = true;
        this.isSecondStep = false;
        this.isThirdStep  = false;
        this.currentStep  = 1;

        if (this.createdInvoiceId) {
            this.recordId = this.createdInvoiceId;
        }
    }

    handleCancel() {
        history.back();
    }

    resetForm() {
        this.invoiceName    = '';
        this.expirationDate = '';
        this.status         = '';
        this.tax            = '';
        this.billingAddress = {
            street: '', city: '', province: '', postalCode: '', country: ''
        };
        this.shippingAddress = {
            street: '', city: '', province: '', postalCode: '', country: ''
        };
        this.successMessage   = '';
        this.errorMessage     = '';
        this.currentStep      = 1;
        this.isFirstStep      = true;
        this.isSecondStep     = false;
        this.isThirdStep      = false;
        this.createdInvoiceId = '';
        this._savedSnapshot   = null;
    }

    finalizeQuote() {
        this.successMessage = 'Quote has been successfully created!';
        this.errorMessage   = '';
        this.resetForm();
    }

    handelnextpage() {
        this.isFirstStep  = false;
        this.isSecondStep = false;
        this.isThirdStep  = true;
        this.currentStep  = 2;
        this.loaded       = false;
    }

    get activeInvoiceId() {
        return this.createdInvoiceId || this.recordId || null;
    }

    buildInvoicePayload() {
        const billing  = JSON.parse(JSON.stringify(this.billingAddress));
        const shipping = JSON.parse(JSON.stringify(this.shippingAddress));

        const payload = {
            Name:                             this.invoiceName,
            QuoteForce__Expiration_Date__c:   this.expirationDate,
            QuoteForce__Status__c:            this.status,
            QuoteForce__Tax_Enabled__c:       this.taxEnabled,
            QuoteForce__Tax_Mode__c:          this.taxEnabled ? this.taxMode : 'Tax Exclusive',
            QuoteForce__Tax__c:               this.taxEnabled && this.tax !== '' ? Number(this.tax) : null,
            QuoteForce__Bill_to__Street__s:       billing.street,
            QuoteForce__Bill_to__City__s:         billing.city,
            QuoteForce__Bill_to__StateCode__s:    billing.province,
            QuoteForce__Bill_to__PostalCode__s:   billing.postalCode,
            QuoteForce__Bill_to__CountryCode__s:  billing.country,
            QuoteForce__Ship_To__Street__s:       shipping.street,
            QuoteForce__Ship_To__City__s:         shipping.city,
            QuoteForce__Ship_To__StateCode__s:    shipping.province,
            QuoteForce__Ship_To__PostalCode__s:   shipping.postalCode,
            QuoteForce__Ship_To__CountryCode__s:  shipping.country,

            // ✅ __c TEXT fields use kar — __s bilkul nahi
            QuoteForce__Street_Address__c:        billing.street,
            QuoteForce__City__c:                  billing.city,
            QuoteForce__State_Province__c:        billing.province,
            QuoteForce__Zip_code_Postal_code__c:  billing.postalCode,
            QuoteForce__Customer_Country__c:      billing.country,


            QuoteForce__First_Name__c:            this.firstname,
            QuoteForce__Last_Name__c:             this.lastname,
            QuoteForce__Letter_from_the_owner__c: this.letterFromOwner,
            QuoteForce__Date__c:                  this.pdate
        };

        if (this.parentId) {
            payload.QuoteForce__Quotes__c = this.parentId;
        }
        if (this.sourceQuoteName) {
            payload.QuoteForce__Quotes_Name__c = this.sourceQuoteName;
        }
        if (this.priceBookId) {
            payload.QuoteForce__Price_Book__c = this.priceBookId;
        }

        return payload;
    }

    get allowCatalogManagement() { return false; }
    get allowStructureChanges()  { return false; }
    get allowDeleteActions()     { return false; }

    get hasInvoiceSections() {
        return this.invoiceSections && this.invoiceSections.length > 0;
    }

    get sectionCount() {
        return this.invoiceSections ? this.invoiceSections.length : 0;
    }

    get productCount() {
        return (this.invoiceSections || []).reduce(
            (total, section) => total + (section.lineItems ? section.lineItems.length : 0),
            0
        );
    }

    get invoiceSubtotal() {
        return (this.invoiceSections || []).reduce(
            (summary, section) => summary + (section.lineItems || []).reduce(
                (sectionTotal, lineItem) =>
                    sectionTotal + (Number(lineItem.lineTotal) || ((Number(lineItem.quantity) || 0) * (Number(lineItem.price) || 0))),
                0
            ),
            0
        );
    }

    get invoiceTaxAmount() {
        const taxPercent = Number(this.tax) || 0;
        if (!this.taxEnabled || taxPercent <= 0) return 0;
        return (this.invoiceSubtotal * taxPercent) / 100;
    }

    get invoiceAmount() {
        return this.invoiceSubtotal + this.invoiceTaxAmount;
    }

    get formattedInvoiceAmount() {
        return new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2
        }).format(this.invoiceAmount || 0);
    }

    get showTaxFields() {
        return this.taxEnabled;
    }
    get isProductDropdownDisabled() {
        return true;
    }
    openPDF() {
        window.open('/apex/QuoteForce__standardController?id=' + this.activeInvoiceId);
    }

    @track isEmailModalOpen = false;

    handleOpenModal() {
        this.isEmailModalOpen = true;
    }

    handleCloseModal() {
        this.isEmailModalOpen = false;
    }

    @track isModalVisible = false;
    modalTitle = 'Preview';
    iframeSourceUrl;

async handleOpenModalPdf() {
    if (!this.activeInvoiceId) {
        this.showToast('Error', 'Invoice Id is missing for preview.', 'error');
        return;
    }

    const taxValue = (this.taxEnabled && this.tax !== '' && this.tax !== null) 
                     ? Number(this.tax) 
                     : 0;

    console.log('=== PDF DEBUG ===');
    console.log('activeInvoiceId:', this.activeInvoiceId);
    console.log('taxEnabled:', this.taxEnabled);
    console.log('tax:', this.tax);
    console.log('taxValue being sent:', taxValue);
    console.log('iframeSourceUrl:', '/apex/QuoteForce__standardController?id=' + this.activeInvoiceId + '&tax=' + taxValue);

    const sym = encodeURIComponent(this.currencySymbol || '$');
this.iframeSourceUrl = '/apex/QuoteForce__standardController?id=' + this.activeInvoiceId 
                       + '&tax=' + taxValue
                       + '&currencySymbol=' + sym;
    this.isModalVisible = true;
}
    handleCloseModalPdf() {
        this.isModalVisible = false;
        this.iframeSourceUrl = null;
    }
    async quoteHandleSave() {

    this.loaded = true;

    try {

        // sirf child component ka existing save button click karwa do
        const saveBtn = this.template.querySelector(
            'c-quote-edit-detail-cmp lightning-button.saveBtn'
        );

        if (saveBtn) {
            saveBtn.click();
        }

        await this.loadInvoiceSections();

        this.isEditingLines = false;
        this._savedSnapshot = null;

        this.showToast(
            'Success',
            'Generated sections updated successfully!',
            'success'
        );

    } catch (error) {

        console.error('quoteHandleSave ERROR => ', error);

        this.showToast(
            'Error',
            error?.body?.message || error?.message || 'Failed to save generated sections',
            'error'
        );

    } finally {

        this.loaded = false;
    }
}
}