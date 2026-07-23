import { LightningElement, track, wire, api } from 'lwc';
import customQuoteCMP from 'c/customQuoteCMP';
import Toast from 'lightning/toast';
import getCountryPicklistValues from '@salesforce/apex/customQuoteCreateController.getCountryPicklistValues';
import getStatePicklistValues from '@salesforce/apex/customQuoteCreateController.getStatePicklistValues';
import getPdfPageUrl from '@salesforce/apex/customQuoteCreateController.getPdfPageUrl';
import getmasterTemplate from '@salesforce/apex/customQuoteCreateController.getmasterTemplate';
import getAdminConfig from '@salesforce/apex/AdminSettingController.getAdminConfig';
import createQuotesRecord from '@salesforce/apex/customQuoteCreateController.createQuotesRecord';
import getAddressFromAccount from '@salesforce/apex/customQuoteCreateController.getAddressFromAccount';
import updateQuotesRecord from '@salesforce/apex/customQuoteCreateController.updateQuotesRecord';
import getQuoteDetails from '@salesforce/apex/customQuoteCreateController.getQuoteDetails';
import createQuoteWithChildren from '@salesforce/apex/customQuoteCreateController.createQuoteWithChildren';
import listPriceBooks from '@salesforce/apex/ProductConfigureController.listPriceBooks';
import repriceQuoteLineItems from '@salesforce/apex/ProductConfigurationController.repriceQuoteLineItems';

export default class CustomQuoteCreateCmp extends LightningElement {
    @api parentId;
    @api recordId;
    @api objectApiName;
    @track isEditable
    @track createdQuoteId = '';
    @track quoteName;
    @track expirationDate;
    @track status;
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
    loaded = false;
    isFromQuote = true;
    pageSize = 8;
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
        quoteName: '',
        expirationDate: '',
        status: '',
    };

    @track countryOptions = [];
    @track billingProvinceOptions = [];
    @track shippingProvinceOptions = [];
    @track priceBookId = '';
    @track priceBookOptions = [];

    @track selectedCountryForBilling = '';
    @track selectedCountryForShipping = '';
    currentLayoutId = '';

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

        this.options = this.options.map(opt => {
            return {
                ...opt,
                checked: opt.value === this.selectedValue
            };
        });
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


    // Fetch Country Picklist Values
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


    this.getQuoteDetailsFromApex()
        .then(() => this.getmasterTemplateRadioGroup())
        .finally(() => {

            this.loadConfig();

            if (this.currencyType) {
                this.loadPriceBookOptions();
            }
        });

    }

    @track linkOpportunity = false;

    loadConfig() {
        getAdminConfig()
            .then(adminResult => {

                // Checkbox values direct Boolean hoti hain
                this.linkOpportunity = adminResult.QuoteForce__Link_With_Opportunity__c === true;
                if (!this.currencyType && adminResult.QuoteForce__Currency__c) {
                    this.currencyType = adminResult.QuoteForce__Currency__c;
                }
                this.loadPriceBookOptions();


                if (adminResult.QuoteForce__Fecth_Address_From_Account__c === true && this.parentId) {
                    getAddressFromAccount({ recordId: this.parentId })
                        .then(parentResult => {
                            this.billingAddress.street = parentResult.Account.BillingAddress.street;
                            this.billingAddress.city = parentResult.Account.BillingAddress.city;
                            this.billingAddress.province = parentResult.Account.BillingAddress.state;
                            this.billingAddress.postalCode = parentResult.Account.BillingAddress.postalCode;
                            this.billingAddress.country = parentResult.Account.BillingAddress.country;

                            // Example: Ship To address
                            this.shippingAddress.street = parentResult.Account.ShippingAddress.street;
                            this.shippingAddress.city = parentResult.Account.ShippingAddress.city;
                            this.shippingAddress.province = parentResult.Account.ShippingAddress.state;
                            this.shippingAddress.postalCode = parentResult.Account.ShippingAddress.postalCode;
                            this.shippingAddress.country = parentResult.Account.ShippingAddress.country;
                        })
                        .catch(error => {
                            // this.showToast('Error', error.body.message, 'error');
                        });
                }
            })
            .catch(error => {
                this.showToast('Error', error.body.message, 'error');
            });
    }


    getQuoteDetailsFromApex() {
        if (!this.recordId) {
            return Promise.resolve();
        }

        return getQuoteDetails({ recordId: this.recordId })
            .then(result => {
                if (result) {
                    this.quoteName = result.Name;
                    this.expirationDate = result.QuoteForce__Expiration_Date__c;
                    this.status = result.QuoteForce__Status__c;

                    // Example: Bill To address
                    this.billingAddress.street = result.QuoteForce__Bill_To__Street__s;
                    this.billingAddress.city = result.QuoteForce__Bill_To__City__s;
                    this.billingAddress.province = result.QuoteForce__Bill_To__StateCode__s;
                    this.billingAddress.postalCode = result.QuoteForce__Bill_To__PostalCode__s;
                    this.billingAddress.country = result.QuoteForce__Bill_To__CountryCode__s;
                    this.currencyType = result.QuoteForce__Currency__c;

                    // Example: Ship To address
                    this.shippingAddress.street = result.QuoteForce__Ship_To__Street__s;
                    this.shippingAddress.city = result.QuoteForce__Ship_To__City__s;
                    this.shippingAddress.province = result.QuoteForce__Ship_To__StateCode__s;
                    this.shippingAddress.postalCode = result.QuoteForce__Ship_To__PostalCode__s;
                    this.shippingAddress.country = result.QuoteForce__Ship_To__CountryCode__s;
                    this.currentLayoutId = result.QuoteForce__LayoutId__c || '';
                    this.selectedValue = result.QuoteForce__LayoutId__c || result.QuoteForce__Layout_Name__c;
                    this.priceBookId = result.QuoteForce__Price_Book__c || '';

                    this.options = this.options.map(opt => {
                        return {
                            ...opt,
                            checked: opt.value === this.selectedValue
                        };
                    });

                    if (result.QuoteForce__Layout_Name__c == '') {
                        this.layoutAvailabel = false;
                    }
                    else {
                        this.layoutAvailabel = true;
                    }
                    this.loaded = false;
                }
                this.loaded = false;
            })
            .catch(error => {
                this.loaded = false;
            });
    }


    getmasterTemplateRadioGroup() {
        this.loaded = true;
        getmasterTemplate()
            .then(data => {
                data.map(element => {
                    this.options = [...this.options, {
                        value: element.Id,
                        label: element.QuoteForce__Layout_Name__c,
                        checked: (element.Id === this.selectedValue)
                    }]

                });

                const shouldApplyTemplate = !this.currentLayoutId || this.currentLayoutId !== this.selectedValue;

                if (shouldApplyTemplate) {
                    if (this.layoutAvailabel === false) {
                        let defaultOption = data.find(el => el.QuoteForce__IsDefault__c === true);
                        if (defaultOption) {
                            this.selectedValue = defaultOption.Id;
                            this.options = this.options.map(opt => {
                                return {
                                    ...opt,
                                    checked: opt.value === this.selectedValue
                                };
                            });
                        }
                    }
                    this.loaded = false;
                }

            })
            .catch(error => {
                this.loaded = false;
            });
    }


    // Fetch State/Province Picklist Values based on the selected country for Billing Address
    fetchBillingProvinceOptions(countryCode) {
        getStatePicklistValues({ countryCode })
            .then((result) => {
                this.billingProvinceOptions = result;
                this.billingAddress.province = '';
            })
            .catch((error) => {
                this.billingProvinceOptions = [];
            });
    }

    fetchShippingProvinceOptions(countryCode) {
        getStatePicklistValues({ countryCode })
            .then((result) => {
                this.shippingProvinceOptions = result;
                this.shippingAddress.province = '';
            })
            .catch((error) => {
                this.shippingProvinceOptions = [];
            });
    }

    // Update Billing Address on Province Change
    handleBillToProvinceChange(event) {
        this.billingAddress.province = event.detail.value;
    }

    // Update Shipping Address on Province Change
    handleShipToProvinceChange(event) {
        this.shippingAddress.province = event.detail.value;
    }

    handleBillToAddressChange(event) {
        const { street, city, postalCode, province, country } = event.detail;

        // Check if country changed
        const previousCountry = this.billingAddress.country;
        this.billingAddress = { ...this.billingAddress, street, city, postalCode, province, country };

        if (country && country !== previousCountry) {
            this.fetchBillingProvinceOptions(country);
        }
    }

    handleShipToAddressChange(event) {
        const { street, city, postalCode, province, country } = event.detail;

        const previousCountry = this.shippingAddress.country;
        this.shippingAddress = { ...this.shippingAddress, street, city, postalCode, province, country };

        if (country && country !== previousCountry) {
            this.fetchShippingProvinceOptions(country);
        }
    }

    handleInputChange(event) {
        const field = event.target.dataset.field;
        this[field] = event.target.type === 'checkbox' ? event.target.checked : event.detail.value ?? event.target.value;
        
    }

    loadPriceBookOptions() {
        listPriceBooks({
            searchKey: '',
            currencyFilter: this.currencyType,
            activeOnly: true
        })

        .then(result => {
            this.priceBookOptions = (result || []).map(record => ({
                label: record.QuoteForce__Currency__c
                    ? `${record.Name} (${record.QuoteForce__Currency__c})`
                    : record.Name,
                value: record.Id
            }));
        })

        .catch(error => {
        });
    }


    handlePriceBookChange(event) {
        this.priceBookId = event.detail.value || '';
    }

    saveAndNext() {
        this.loaded = true;

        if (!this.quoteName) {
            this.showToast('Error', 'Quote Name is required field.', 'error');
            this.loaded = false;
            return;
        } else if (!this.expirationDate) {
            this.showToast('Error', 'Expiration Date is required field.', 'error');
            this.loaded = false;
            return;
        } else if (!this.status) {
            this.showToast('Error', 'Status is required field.', 'error');
            this.loaded = false;
            return;
        } else if (!this.currencyType) {
            this.showToast('Error', 'Currency is required field.', 'error');
            this.loaded = false;
            return;
        }
        
        this.isEditable = false;
        if (this.recordId == undefined) {
            const billToStateCode = (this.billingAddress.province && this.billingAddress.province.length === 2) ? this.billingAddress.province : null;
            const shipToStateCode = (this.shippingAddress.province && this.shippingAddress.province.length === 2) ? this.shippingAddress.province : null;
            var quoteObj = {
                'Name': this.quoteName,
                'QuoteForce__Expiration_Date__c': this.expirationDate,
                'QuoteForce__Status__c': this.status,
                'QuoteForce__Currency__c': this.currencyType,
                // Bill To
                'QuoteForce__Bill_To__Street__s': this.billingAddress.street || null,
                'QuoteForce__Bill_To__City__s': this.billingAddress.city || null,
                'QuoteForce__Bill_To__StateCode__s': billToStateCode,
                'QuoteForce__Bill_To__PostalCode__s': this.billingAddress.postalCode || null,
                'QuoteForce__Bill_To__CountryCode__s': this.billingAddress.country || null,
                // Ship To
                'QuoteForce__Ship_To__Street__s': this.shippingAddress.street || null,
                'QuoteForce__Ship_To__City__s': this.shippingAddress.city || null,
                'QuoteForce__Ship_To__StateCode__s': shipToStateCode,
                'QuoteForce__Ship_To__PostalCode__s': this.shippingAddress.postalCode || null,
                'QuoteForce__Ship_To__CountryCode__s': this.shippingAddress.country || null,
                // Other Fields
                'QuoteForce__First_Name__c': this.firstname,
                'QuoteForce__Last_Name__c': this.lastname,
                'QuoteForce__Street_Address__c': this.streetaddress,
                'QuoteForce__City__c': this.city,
                'QuoteForce__State_Province__c': this.state,
                'QuoteForce__Zip_code_Postal_code__c': this.zipcode,
                'QuoteForce__Letter_from_the_owner__c': this.letterFromOwner,
                'QuoteForce__Date__c': this.pdate,
                'QuoteForce__Opportunity__c': (this.linkOpportunity == true) ? this.parentId : '',
                'QuoteForce__Price_Book__c': this.priceBookId || null
            };
            console.log('country code ' + quoteObj.QuoteForce__Bill_To__CountryCode__s + ' state code ' + quoteObj.QuoteForce__Bill_To__StateCode__s);
            if (!quoteObj.QuoteForce__Bill_To__CountryCode__s) {
                quoteObj.QuoteForce__Bill_To__CountryCode__s = null;
            }
            if (!quoteObj.QuoteForce__Bill_To__StateCode__s) {
                quoteObj.QuoteForce__Bill_To__StateCode__s = null;
            }
            if (!quoteObj.QuoteForce__Ship_To__CountryCode__s) {
                quoteObj.QuoteForce__Ship_To__CountryCode__s = null;
            }
            if (!quoteObj.QuoteForce__Ship_To__StateCode__s) {
                quoteObj.QuoteForce__Ship_To__StateCode__s = null;
            }
            createQuotesRecord({
                quoteWrapMap: quoteObj
            })
                .then(result => {
                    this.createdQuoteId = result;
                    this.recordId = this.createdQuoteId;
                    this.showToast('Success', 'Quote record created successfully!', 'success');

                    // move to next step
                    this.isFirstStep = false;
                    this.isSecondStep = true;
                    this.currentStep++;
                    this.loaded = false;
                })
                .catch(error => {
                    this.loaded = false;
                    this.showToast('Error', 'Failed to create quote record.', 'error');
                });

        }
        else {
            this.isEditable = true;
            var quoteObj = {
                'Name': this.quoteName,
                'QuoteForce__Expiration_Date__c': this.expirationDate,
                'QuoteForce__Status__c': this.status,
                'QuoteForce__Currency__c': this.currencyType,
                'QuoteForce__Bill_To__Street__s': this.billingAddress.street,
                'QuoteForce__Bill_To__City__s': this.billingAddress.city,
                'QuoteForce__Bill_To__StateCode__s': this.billingAddress.province,
                'QuoteForce__Bill_To__PostalCode__s': this.billingAddress.postalCode,
                'QuoteForce__Bill_To__CountryCode__s': this.billingAddress.country,
                'QuoteForce__Ship_To__Street__s': this.shippingAddress.street,
                'QuoteForce__Ship_To__City__s': this.shippingAddress.city,
                'QuoteForce__Ship_To__StateCode__s': this.shippingAddress.province,
                'QuoteForce__Ship_To__PostalCode__s': this.shippingAddress.postalCode,
                'QuoteForce__Ship_To__CountryCode__s': this.shippingAddress.country,
                'QuoteForce__First_Name__c': this.firstname,
                'QuoteForce__Last_Name__c': this.lastname,
                'QuoteForce__Street_Address__c': this.streetaddress,
                'QuoteForce__City__c': this.city,
                'QuoteForce__State_Province__c': this.state,
                'QuoteForce__Zip_code_Postal_code__c': this.zipcode,
                'QuoteForce__Letter_from_the_owner__c': this.letterFromOwner,
                'QuoteForce__Date__c': this.pdate,
                'Id': this.recordId,
                'QuoteForce__Price_Book__c': this.priceBookId || null
            }
            updateQuotesRecord({
                quoteWrapMap: quoteObj
            })
                .then(result => {
                    this.createdQuoteId = result;
                    // move to next step
                    this.isFirstStep = false;
                    this.isSecondStep = true;
                    this.currentStep++;
                    this.showToast('Success', 'Quote record updated successfully!', 'success');
                    this.loaded = false;
                })
                .catch(error => {
                    this.showToast('Error', 'Failed to update quote record.', 'error');
                    this.loaded = false;
                });
        }

    }

   handleSave() {
    try {
        this.refs.quoteForm.updateQuote();
    } catch(error) {
    }
}

    async handleRepriceLines() {
        if (!this.activeQuoteId) {
            return;
        }
        this.loaded = true;
        try {
            await repriceQuoteLineItems({ quoteId: this.activeQuoteId });
            if (this.refs.quoteForm?.refreshLinePricing) {
                await this.refs.quoteForm.refreshLinePricing();
            }
            this.showToast('Success', 'Quote lines repriced successfully.', 'success');
        } catch (error) {
            this.showToast('Error', error.body?.message || 'Failed to reprice quote lines.', 'error');
        } finally {
            this.loaded = false;
        }
    }



    showToast(title, message, variant) {
        Toast.show({
            label: title,
            message: message,
            mode: 'dismissible',
            variant: variant
        }, this);
    }

    handleSecondPrevious() {
        this.isSecondStep = true;
        this.isThirdStep = false;
        this.isFirstStep = false;
    }


    // Go back to the first step
    handlePrevious() {
        this.isFirstStep = true;
        this.isSecondStep = false;
        this.currentStep--;
        this.recordId = this.createdQuoteId;
    }

    handleCancel() {
        history.back();
    }

    resetForm() {
        this.quoteName = '';
        this.expirationDate = '';
        this.status = '';
        this.billingAddress = {
            street: '',
            city: '',
            province: '',
            postalCode: '',
            country: ''
        };
        this.shippingAddress = {
            street: '',
            city: '',
            province: '',
            postalCode: '',
            country: ''
        };
        this.successMessage = '';
        this.errorMessage = '';
        this.currentStep = 1;
        this.isFirstStep = true;
        this.isSecondStep = false;
        this.isThirdStep = false;
    }


    finalizeQuote() {
        this.successMessage = 'Quote has been successfully created!';
        this.errorMessage = '';
        this.resetForm();
    }


    async handelnextpage() {
          console.log('### STEP2 handelnextpage currencyType =>', this.currencyType);
    console.log('### STEP2 activeQuoteId =>', this.activeQuoteId);
        this.loaded = true;

        if (this.selectedValue == '') {
            this.showToast('Quote Template Is Required', 'Please Choose a Quote Template', 'error');
            this.loaded = false;
            return;
        }

        const targetQuoteId = this.activeQuoteId;
        const shouldApplyTemplate = !this.currentLayoutId || this.currentLayoutId !== this.selectedValue;

        if (shouldApplyTemplate) {
            try {
                await createQuoteWithChildren({
                    mtId: this.selectedValue,
                    quoteId: targetQuoteId
                });
                this.layoutAvailabel = true;
                this.currentLayoutId = this.selectedValue;
            } catch (error) {
                this.loaded = false;
                this.showToast('Error', 'Failed to create quote record.', 'error');
                return;
            }
        }

        this.isThirdStep = true;
        this.isSecondStep = false;
        this.loaded = false;
    }


   openPDF() {
        window.open('/apex/quotePDFpage?id=' + this.activeQuoteId);
    }
 
    //----------EMAIL ----

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

    // Open the modal and set iframe source
  /*  handleOpenModalPdf() {
        console.log(
    'Preview JSON => ',
    JSON.stringify(this.ElementList));
        console.log('createdQuoteId => ', this.createdQuoteId);
        console.log('recordId => ', this.recordId);
        console.log('activeQuoteId => ', this.activeQuoteId);
        this.iframeSourceUrl = '/apex/quotePDFpage?id=' + this.activeQuoteId;
        this.isModalVisible = true;
    }
  */
 async handleOpenModalPdf() {
    this.loaded = true;
    try {
        if (this.refs.quoteForm?.updateQuoteAndWait) {
            await this.refs.quoteForm.updateQuoteAndWait();
        }
    } catch (error) {}
    try {
        const url = await getPdfPageUrl({ quoteId: this.activeQuoteId });
        console.log('CREATE FLOW URL:', url);
        this.iframeSourceUrl = url;
    } catch (error) {
        this.iframeSourceUrl = '/apex/quotePDFpage?id=' + this.activeQuoteId;
    }
    this.isModalVisible = true;
    this.loaded = false;
}
 
    handleCloseModalPdf() {
        this.isModalVisible = false;
        this.iframeSourceUrl = null;
    }

    @track currencyType = '';

    currencyOptions = [
        { label: 'USD ($)', value: 'USD' },
        { label: 'INR (Rs)', value: 'INR' },
        { label: 'EUR (€)', value: 'EUR' },
        { label: 'GBP (£)', value: 'GBP' }
    ];

    get activeQuoteId() {
        return this.createdQuoteId || this.recordId;
    }

    handleCurrencyChange(event) {
        this.currencyType = event.detail.value;
          console.log('### STEP1 currencyType set =>', this.currencyType);

        this.priceBookId = '';
        this.priceBookOptions = [];

        this.loadPriceBookOptions();
    }
}