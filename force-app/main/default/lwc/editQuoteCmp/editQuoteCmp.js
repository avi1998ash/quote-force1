import { LightningElement, api, wire, track } from 'lwc';
import customQuoteCMP from 'c/customQuoteCMP';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getCountryPicklistValues from '@salesforce/apex/customQuoteCreateController.getCountryPicklistValues';
import getStatePicklistValues from '@salesforce/apex/customQuoteCreateController.getStatePicklistValues';
import getmasterTemplate from '@salesforce/apex/customQuoteCreateController.getmasterTemplate';

export default class EditQuoteCmp extends LightningElement {
     @api recordId;
    @track loaded = false;
    @track quoteName;
    @track expirationDate;
    @track status;
    @track tax;

    @track successMessage = '';
    @track errorMessage = '';

    @track currentStep = 1;
    @track isFirstStep = true;
    @track isSecondStep = false;
    @track isThirdStep = false;
    @track selectedValue = '';
    @track options = [];



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
        tax: ''
    };

    @track countryOptions = [];
    @track billingProvinceOptions = [];
    @track shippingProvinceOptions = [];

    @track selectedCountryForBilling = '';
    @track selectedCountryForShipping = '';



    // Fetch Country Picklist Values
    @wire(getCountryPicklistValues)
    wiredCountries({ error, data }) {
        if (data) {
            this.countryOptions = data.map(country => ({
                label: country.label,
                value: country.value
            }));
        } else if (error) {
            console.error(error);
        }
    }

    connectedCallback() {
        this.getmasterTemplateRadioGroup();
        console.log('templetid....', this.templateId);

    }

    getmasterTemplateRadioGroup() {
        this.loaded = true;
        getmasterTemplate()
            .then(data => {
                console.log('Data - - - -:', data);
                data.map(element => {
                    this.options = [...this.options, {
                        value: element.Id,
                        label: element.QuoteForce__Layout_Name__c
                    }]
                  
                });
                console.log('this.selectedValue : ',this.selectedValue);
                  data.forEach(element => {
                    
                    if(element.QuoteForce__IsDefault__c == true){
                        this.selectedValue =  element.Id;
                    }
                  });

            })
            .catch(error => {
                console.error(error);
            })
            .finally(() => {
                this.loaded = false;
            });
    }

    // Fetch State/Province Picklist Values based on the selected country for Billing Address
    handleBillToCountryChange(event) {
        const countryValue = event.detail.value;
        this.billingAddress.country = countryValue;

        getStatePicklistValues({ country: countryValue })
            .then(data => {
                this.billingProvinceOptions = data.map(state => ({
                    label: state.label,
                    value: state.value
                }));
            })
            .catch(error => {
                console.error(error);
            });
    }

    // Fetch State/Province Picklist Values based on the selected country for Shipping Address
    handleShipToCountryChange(event) {
        const countryValue = event.detail.value;
        this.shippingAddress.country = countryValue;

        getStatePicklistValues({ country: countryValue })
            .then(data => {
                this.shippingProvinceOptions = data.map(state => ({
                    label: state.label,
                    value: state.value
                }));
            })
            .catch(error => {
                console.error(error);
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
        const { street, city, postalCode } = event.detail;
        this.billingAddress = { ...this.billingAddress, street, city, postalCode };
    }

    handleShipToAddressChange(event) {
        const { street, city, postalCode } = event.detail;
        this.shippingAddress = { ...this.shippingAddress, street, city, postalCode };
    }

    handleInputChange(event) {
        const field = event.target.dataset.field;
        this[field] = event.target.value;
    }

    /*saveAndNext() {
        const quoteNameInput = this.template.querySelector('lightning-input[data-field="quoteName"]');
        const expirationDateInput = this.template.querySelector('lightning-input[data-field="expirationDate"]');
        const statusInput = this.template.querySelector('lightning-combobox[data-field="status"]');

        const isQuoteNameValid = quoteNameInput.reportValidity();
        const isExpirationDateValid = expirationDateInput.reportValidity();
        const isStatusValid = statusInput.reportValidity();

        // Proceed only if all required fields are valid
        if (isQuoteNameValid && isExpirationDateValid && isStatusValid) {

            // Check if values have changed
            const hasValuesChanged = !(
                this.quoteName === this.previousValues.quoteName &&
                this.expirationDate === this.previousValues.expirationDate &&
                this.status === this.previousValues.status &&
                this.tax === this.previousValues.tax
            );

            if (!hasValuesChanged) {
                // No changes but still allow navigation
                this.showToast('Info', 'No values were changed. The record is already updated.', 'info');
            } else {
                // Values changed, proceed with save and show success
                this.showToast('Success', 'Record saved successfully!', 'success');

                // Save the current values as the previous values
                this.previousValues = {
                    quoteName: this.quoteName,
                    expirationDate: this.expirationDate,
                    status: this.status,
                    tax: this.tax
                };
            }

            // Move to the second step whether or not values changed
            this.isFirstStep = false;
            this.isSecondStep = true;
            this.currentStep++;

        } else {
            // Show error toast if required fields are missing
            this.showToast('Error', 'Please fill in all required fields.', 'error');
        }
    }*/

    saveAndNext(){
        console.log('Call save : ');
        console.log('##-- OUTPUT-- quoteName--: : ',this.quoteName);
        console.log('##-- OUTPUT-- expirationDate--: : ',this.expirationDate);
        console.log('##-- OUTPUT-- status--: : ',this.status);
        console.log('##-- OUTPUT-- tax--: : ',this.tax);
        console.log('##-- OUTPUT-- selectedValue--: : ',this.selectedValue);
        console.log('##-- OUTPUT-- this.billingAddress--: : ',JSON.stringify(this.billingAddress));
        console.log('##-- OUTPUT-- this.billingAddress--: : ',this.billingAddress.street);
        console.log('##-- OUTPUT-- this.billingAddress--: : ',this.billingAddress.city);
        console.log('##-- OUTPUT-- this.billingAddress--: : ',this.billingAddress.province);
        console.log('##-- OUTPUT-- this.shippingAddress--: : ',JSON.stringify(this.shippingAddress));
    }

    showToast(title, message, variant) {
        const toastEvent = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant
        });
        this.dispatchEvent(toastEvent);
    }


    // Go back to the first step
    handlePrevious() {
        this.isFirstStep = true;
        this.isSecondStep = false;
        this.currentStep--;
    }

    handleCancel() {
        this.resetForm();
    }

    resetForm() {
        this.quoteName = '';
        this.expirationDate = '';
        this.status = '';
        this.tax = '';
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
         this.isThirdStep =false;
    }


    finalizeQuote() {
        this.successMessage = 'Quote has been successfully created!';
        this.errorMessage = '';
        this.resetForm();
    }


    // @track isModalOpen = false;
    // @track recordId;

    handelnextpage() {
        this.isThirdStep = true;
        this.isSecondStep = false;
    }


   


    handleRadioChange(event) {

        this.selectedValue = event.target.value;
    }
}